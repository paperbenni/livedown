#!/usr/bin/env bun
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import open from 'open';
import createServer from '../server.js';
import { splitCommandLine } from '../utils.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const argv = minimist(process.argv.slice(2), {
    alias: { h: 'help' }
});
const command = argv._[0];
const filePath = argv._[1];
const server = createServer({
    port: argv.port,
});
async function help() {
    try {
        const helpContent = await fs.readFile(path.join(__dirname, 'usage.txt'), 'utf8');
        console.log(helpContent);
    }
    catch (error) {
        console.error('Error reading help file:', error);
    }
}
function log(message) {
    if (argv.verbose) {
        console.log(`[livedown] ${message}`);
    }
}
async function openBrowser(uri) {
    try {
        const browserOptions = argv.browser ? { app: { name: splitCommandLine(argv.browser) } } : {};
        await open(uri, browserOptions);
    }
    catch (error) {
        console.log(`Cannot open browser, please visit ${server.URI}`);
    }
}
async function startCommand() {
    if (!filePath) {
        await help();
        return;
    }
    try {
        await server.start(filePath);
        if (argv.open) {
            await openBrowser(server.URI);
        }
        log(`Markdown preview started on ${server.URI}`);
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
async function stopCommand() {
    try {
        await server.stop();
        log('Server stopped successfully');
    }
    catch (error) {
        log('Cannot stop the server, is it running?');
    }
}
async function run() {
    switch (command) {
        case 'start':
            await startCommand();
            break;
        case 'stop':
            await stopCommand();
            break;
        default:
            await help();
    }
}
// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Run the CLI
run().catch((error) => {
    console.error('Error running livedown:', error);
    process.exit(1);
});
//# sourceMappingURL=livedown.js.map