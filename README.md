# Strava Auto-Kudos 👍

A Node.js application designed to intelligently automate giving kudos to Strava activities based on configurable rules.

[![Docker Image CI](https://github.com/aexel90/strava_kudos/actions/workflows/docker-image.yml/badge.svg)](https://github.com/aexel90/strava_kudos/actions/workflows/docker-image.yml)

## ✨ Features

- **Smart Activity Filtering**: Configure rules based on activity type, distance, time, and name patterns
- **Dry Run Mode**: Preview actions without actually sending kudos
- **Professional Logging**: Winston-based logging with timestamps, colors, and automatic sensitive data redaction
- **Multiple Config Formats**: Supports both JSON and YAML configuration files
- **Modular Architecture**: Clean ES6 modules for easy maintenance and extension
- **Docker Ready**: Optimized Dockerfile with multi-layer caching and dual Docker Compose setups
- **Security First**: 30-second HTTP timeouts, cookie redaction, and read-only volume mounts
- **Debug Logging**: Detailed verbose mode showing filtering decisions and statistics
- **CLI Interface**: Simple command-line options with built-in help system

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Configuration**
   Copy and edit one of the example config files:
   ```bash
   cp config.json.example config.json
   # OR
   cp config.yaml.example config.yaml
   ```

3. **Test with Dry Run**
   ```bash
   node main.js --dry-run --verbose
   ```

4. **Run for Real**
   ```bash
   node main.js
   ```

## ⚙️ Configuration

### Required Fields

- **`stravaSessionCookie`**: Your Strava session cookie (find this in your browser's developer tools)
- **`athleteId`**: Your Strava athlete ID (number)

### Optional Fields

- **`ignoreAthletes`**: Array of athlete IDs to never give kudos to
- **`kudoRules`**: Object containing filtering rules:
  - **`minDistance`**: Minimum distance by activity type (e.g., `{"Run": 5, "Ride": 20}`)
  - **`minTime`**: Minimum duration in minutes by activity type (e.g., `{"Run": 30, "Ride": 60}`)
  - **`activityNames`**: Array of regex patterns for activity names that always get kudos
- **`rateLimiting`**: Object containing rate limiting configuration:
  - **`minDelayMs`**: Minimum delay between requests in milliseconds (default: 1000)
  - **`maxDelayMs`**: Maximum delay between requests in milliseconds (default: 1000)

### Configuration File Priority

The app looks for config files in this order:
1. `config.json`
2. `config.yaml` 
3. `config.yml`

**Note**: If multiple config files exist, the app will use the first one found in the priority order above and log which file it's using. Only one config file will actually be loaded.

### Example JSON Configuration

```json
{
  "stravaSessionCookie": "ab12cd34ef56gh78ij90kl12mn34op56",
  "athleteId": "12345678",
  "ignoreAthletes": ["87654321", "11223344"],
  "kudoRules": {
    "minDistance": {
      "Run": 5,
      "Ride": 20,
      "Walk": 2
    },
    "minTime": {
      "Run": 30,
      "Ride": 60,
      "Walk": 15
    },
    "activityNames": [
      "race|marathon|competition",
      "birthday.*run",
      "charity"
    ]
  },
  "rateLimiting": {
    "minDelayMs": 800,
    "maxDelayMs": 2000
  }
}
```

### Example YAML Configuration

```yaml
stravaSessionCookie: "ab12cd34ef56gh78ij90kl12mn34op56"
athleteId: "12345678"
ignoreAthletes:
  - "87654321" # Max Mustermann
  - "11223344" # Sarah Mustermann
kudoRules:
  minDistance:
    Run: 5
    Ride: 20
    Walk: 2
  minTime:
    Run: 30
    Ride: 60
    Walk: 15
  activityNames:
    - "race|marathon|competition"
    - "birthday.*run"
    - "charity"
rateLimiting:
  minDelayMs: 800
  maxDelayMs: 2000
```

## 🖥️ Command Line Options

```bash
node main.js [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `-d, --dry-run` | Preview actions without sending kudos | `node main.js --dry-run` |
| `-v, --verbose` | Enable detailed logging with debug output | `node main.js --verbose` |
| `-h, --help` | Show help message | `node main.js --help` |

### Usage Examples

```bash
# Preview what would happen with detailed logs
node main.js --dry-run --verbose

# Send kudos to all qualifying activities
node main.js

# Run with detailed logging (shows filtering decisions)
node main.js --verbose

# Use npm script
npm start -- --dry-run --verbose
```

## 🐳 Docker Usage

### Prerequisites

Before using Docker, ensure you have a configuration file:

```bash
# Create config.yaml from example (recommended)
cp config.yaml.example config.yaml
# Edit config.yaml with your actual values

# OR create config.json from example
cp config.json.example config.json
# Edit config.json with your actual values
```

### Using Docker Compose

The project includes two Docker Compose services:

- **`strava_kudos`**: Uses pre-built image from GitHub Container Registry (recommended)
- **`strava_kudos_local`**: Builds image locally from current source code

```bash
# Run with GitHub Container Registry image (recommended)
docker compose up -d strava_kudos

# Build and run local image (for development/testing)
docker compose up -d --build strava_kudos_local

# View logs in real-time
docker compose logs -f strava_kudos

# View logs from specific service
docker compose logs -f strava_kudos_local

# Stop services
docker compose down
```

### Using Docker directly

```bash
# Pull pre-built image
docker pull ghcr.io/aexel90/strava_kudos:main

# Run with config.yaml (default mount location)
docker run -v $(pwd)/config.yaml:/app/config.yaml:ro ghcr.io/aexel90/strava_kudos:main

# Run with config.json
docker run -v $(pwd)/config.json:/app/config.json:ro ghcr.io/aexel90/strava_kudos:main

# Build local image
docker build -t strava-kudos-local .

# Run locally built image
docker run -v $(pwd)/config.yaml:/app/config.yaml:ro strava-kudos-local

# Run with dry-run mode (override default verbose flag)
docker run -v $(pwd)/config.yaml:/app/config.yaml:ro ghcr.io/aexel90/strava_kudos:main node main.js --dry-run --verbose
```

### Docker Configuration

#### Default Behavior
- **Config file**: Both services mount `config.yaml` by default
- **Logging**: Containers run with verbose logging (`-v` flag) by default
- **Restart policy**: Containers restart on failure (max 2 attempts)
- **Security**: Config files are mounted as read-only (`:ro` flag)

#### Service Details
- **`strava_kudos`**: 
  - Uses `ghcr.io/aexel90/strava_kudos:main` image
  - Always up-to-date with latest releases
  - Faster startup (no build time)

- **`strava_kudos_local`**: 
  - Builds from local Dockerfile
  - Uses your current source code
  - Useful for development and testing changes

### Troubleshooting

#### Common Issues

1. **"No configuration file found"**
   ```bash
   # Ensure you have config.yaml in project root
   ls -la config.yaml
   
   # Or create from example
   cp config.yaml.example config.yaml
   ```

2. **Permission denied errors**
   ```bash
   # Check file permissions
   chmod 644 config.yaml
   ```

3. **Container exits immediately**
   ```bash
   # Check logs for errors
   docker compose logs strava_kudos
   
   # Run in dry-run mode for testing
   docker compose run --rm strava_kudos node main.js --dry-run --verbose
   ```

4. **Using different config file**
   ```bash
   # Edit docker-compose.yml to mount config.json instead
   volumes:
     - ./config.json:/app/config.json:ro
   ```

## 🏗️ Project Structure

```
strava_kudos/
├── main.js                    # Main application entry point
├── src/                       # Modular source code
│   ├── config.js             # Configuration loading and validation
│   ├── stravaClient.js       # Strava API client with timeout handling
│   ├── filters.js            # Activity filtering logic with debug logging
│   ├── logger.js             # Winston-based logging with redaction
│   └── cli.js                # Command-line interface parsing
├── config.json.example       # Example JSON configuration
├── config.yaml.example       # Example YAML configuration
├── package.json              # Dependencies: winston, js-yaml, html-entities
├── Dockerfile                # Optimized multi-layer Docker build
├── docker-compose.yml        # Dual service setup (registry + local)
└── README.md
```

## 🔧 Development

### Architecture

The application follows a **modular ES6 architecture**:

- **`main.js`**: Orchestrates the application flow and coordinates modules
- **`src/config.js`**: Handles configuration loading, validation, and normalization
- **`src/stravaClient.js`**: HTTP client with 30-second timeouts and error handling
- **`src/filters.js`**: Activity filtering with detailed debug logging and statistics
- **`src/logger.js`**: Winston-based logging with timestamp, colors, and sensitive data redaction
- **`src/cli.js`**: Command-line argument parsing and help system

### Dependencies

- **`winston@^3.11.0`**: Professional logging with colors and timestamps
- **`js-yaml@^4.1.0`**: YAML configuration file support
- **`html-entities@^2.5.2`**: HTML entity decoding for Strava responses

## 📋 Troubleshooting

### Common Issues

1. **"No configuration file found"**
   - Ensure you have `config.json`, `config.yaml`, or `config.yml` in the project root

2. **"No activities found"**
   - Check that your session cookie is valid
   - Ensure you're following accounts with recent activities

3. **Network timeouts**
   - The app includes 30-second timeouts by default
   - Check your internet connection

### Getting Your Session Cookie

1. Open Strava in your browser and log in
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies → https://www.strava.com
4. Find the `_strava4_session` cookie and copy its value (use as `stravaSessionCookie` in config)