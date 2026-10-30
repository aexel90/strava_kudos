async function makeRequest(options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(`https://${options.hostname}${options.path}`, {
            method: options.method,
            headers: options.headers,
            signal: controller.signal,
        });

        if (!res.ok) {
            throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { statusCode: res.status });
        }

        return await res.text();
    } catch (e) {
        if (e.name === 'AbortError') throw new Error(`Request timeout after ${timeout}ms`);
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

async function getCsrfToken(cookieValue, timeout) {
    const options = {
        hostname: 'www.strava.com',
        path: '/dashboard?dashboard_next=1',
        method: 'GET',
        headers: { Cookie: cookieValue },
    };

    const html = await makeRequest(options, timeout);
    const nextData = parseNextData(html);
    const sessionData = nextData?.props?.pageContextPreload?.sessionData || [];
    const csrfEntry = sessionData.find((s) => s.key === '_csrf_token');

    if (!csrfEntry) throw new Error('CSRF Token not found - possibly invalid session cookie');
    return csrfEntry.value;
}

function parseNextData(html) {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
    if (!match) throw new Error('No __NEXT_DATA__ found - possibly invalid session cookie');
    try {
        return JSON.parse(match[1]);
    } catch {
        throw new Error('Failed to parse Strava page data - possibly invalid session cookie');
    }
}

function extractActivitiesFromFeed(feed) {
    return (feed?.entries || []).flatMap((e) => {
        if (e.entity === 'Activity') {
            return {
                ...e.activity,
                activityName: e.activity.activityName?.replace(/\n/g, ' ') || e.activity.activityName,
            };
        }
        if (e.entity === 'GroupActivity') {
            return (e.rowData?.activities || []).map((a) => ({
                ...a,
                activityName: (a.name || a.activityName)?.replace(/\n/g, ' ') || a.activityName,
                id: a.activity_id ?? a.id,
                athlete: { athleteId: a.athlete_id ?? a.athlete?.athleteId, athleteName: a.athlete_name ?? a.athlete?.athleteName },
                kudosAndComments: { hasKudoed: a.has_kudoed ?? a.kudosAndComments?.hasKudoed },
            }));
        }
        return [];
    });
}

export class StravaClient {
    #cookieValue;
    #csrfToken;
    #timeout;

    constructor(cookieValue, csrfToken, timeout) {
        this.#cookieValue = cookieValue;
        this.#csrfToken = csrfToken;
        this.#timeout = timeout;
    }

    static async create(sessionCookie, options = {}) {
        const timeout = options.timeout || 30000;
        const cookieValue = `_strava4_session=${sessionCookie}`;
        const csrfToken = await getCsrfToken(cookieValue, timeout);
        return new StravaClient(cookieValue, csrfToken, timeout);
    }

    async getActivitiesViaDashboard(numEntries = 60) {
        const json = await makeRequest({
            hostname: 'www.strava.com',
            path: `/dashboard/feed?num_entries=${numEntries}`,
            method: 'GET',
            headers: {
                Cookie: this.#cookieValue,
                'x-csrf-token': this.#csrfToken,
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }, this.#timeout);

        let feed;
        try {
            feed = JSON.parse(json);
        } catch {
            throw new Error('Unexpected response from Strava - possibly invalid session cookie');
        }
        const activities = extractActivitiesFromFeed(feed);
        if (activities.length === 0) throw new Error('No activities found - check session cookie validity');
        return activities;
    }

    async sendKudos(activityId) {
        return await makeRequest({
            hostname: 'www.strava.com',
            path: `/feed/activity/${activityId}/kudo`,
            method: 'POST',
            headers: { Cookie: this.#cookieValue, 'x-csrf-token': this.#csrfToken },
        }, this.#timeout);
    }
}
