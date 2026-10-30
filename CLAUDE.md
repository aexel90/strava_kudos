# strava-kudos

Automatically sends Strava kudos to activities in the following feed based on configurable rules.

## Running

```bash
node main.js --dry-run --verbose   # preview — ALWAYS use this when testing
node main.js --dry-run             # preview without detail
node main.js                       # sends real kudos
```

**Always test with `--dry-run` first.** Running without it sends real kudos immediately.

## Configuration

`config.yaml` in the project root (not committed). Required fields:

```yaml
stravaSessionCookie: '<value of _strava4_session cookie from browser>'
athleteId: '<your Strava athlete ID>'
ignoreAthletes: []   # athlete IDs to skip
kudoRules:
  minDistance: {}    # activity type → km
  minTime: {}        # activity type → minutes
  activityNames: []  # regex patterns — activities matching these always get kudos
```

The session cookie expires regularly. Get a fresh one from the browser:
DevTools → Application → Cookies → `www.strava.com` → `_strava4_session` → Value.

## Architecture

```
main.js                 entry point, orchestrates flow
src/stravaClient.js     HTTP client + Strava feed parsing
src/filters.js          kudo rule evaluation
src/config.js           config loading + validation
src/cli.js              argument parsing
src/logger.js           winston wrapper
```

### How the Strava client works

1. `StravaClient.create(cookie)` — fetches `/dashboard?dashboard_next=1` (HTML), extracts `_csrf_token` from `__NEXT_DATA__` → `props.pageContextPreload.sessionData`, returns a ready-to-use instance
2. `getActivitiesViaDashboard()` — calls `/dashboard/feed?num_entries=N` (JSON API), returns Activity + GroupActivity entries
3. `sendKudos(activityId)` — POST to `/feed/activity/:id/kudo` with CSRF token

Strava uses Next.js. Feed data lives in `__NEXT_DATA__` on the HTML page and in the `/dashboard/feed` JSON endpoint. The `_csrf_token` is required for the feed API and kudos POST.

## Docker

```bash
docker build -t strava-kudos .
docker run -v $(pwd)/config.yaml:/app/config.yaml strava-kudos
```

## Dependencies

- `js-yaml` — config parsing
- `winston` — logging
- Node.js ≥ 18 required (native `fetch`)
