export function parseArgs(args = process.argv) {
    const options = { dryRun: false, verbose: false, help: false };

    for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--dry-run' || arg === '-d') options.dryRun = true;
        else if (arg === '--verbose' || arg === '-v') options.verbose = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    }

    return options;
}

export function showHelp() {
    console.log(`
Strava Kudos Automation Tool

Usage: node main.js [options]

Options:
  -d, --dry-run      Show what would be done without actually sending kudos
  -v, --verbose      Enable verbose logging with detailed activity information
  -h, --help         Show this help message

Examples:
  node main.js --dry-run --verbose    # Preview what would happen
  node main.js                        # Send kudos to all qualifying activities

Configuration:
  Place your configuration in config.yaml (or config.json / config.yml)
  See config.yaml.example for reference
`);
}
