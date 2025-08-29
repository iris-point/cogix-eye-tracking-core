/**
 * Simple HTTP server for testing eye tracking without Live Server interference
 * Usage: node server.js
 * Then open: http://localhost:8080/demo.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const HOST = '0.0.0.0'; // Listen on all network interfaces

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`Request for ${req.url}`);
    
    // Default to demo.html if root is requested
    let filePath = req.url === '/' ? '/demo.html' : req.url;
    
    // Handle paths - serve from examples folder or dist folder
    if (filePath.startsWith('/dist/')) {
        filePath = path.join(__dirname, '..', filePath);
    } else {
        filePath = path.join(__dirname, filePath);
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                // Allow CORS for local testing
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

// Function to get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    return addresses;
}

server.listen(PORT, HOST, () => {
    const localIPs = getLocalIPs();
    
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Eye Tracking Demo Server                              ║
║                                                        ║
║  Server running on port ${PORT}                           ║
║                                                        ║
║  Access from this computer:                           ║
║  → http://localhost:${PORT}/demo.html                  ║
║                                                        ║`);
    
    if (localIPs.length > 0) {
        console.log(`║  Access from other devices on the network:            ║`);
        localIPs.forEach(ip => {
            const url = `http://${ip}:${PORT}/demo.html`;
            const padding = ' '.repeat(Math.max(0, 55 - url.length));
            console.log(`║  → ${url}${padding}║`);
        });
        console.log(`║                                                        ║`);
    }
    
    console.log(`║  This server does NOT inject WebSocket code,          ║
║  so it won't interfere with eye tracker connection.   ║
║                                                        ║
║  Note: Make sure your firewall allows port ${PORT}       ║
║  for network access from other devices.               ║
║                                                        ║
║  Press Ctrl+C to stop the server                      ║
╚════════════════════════════════════════════════════════╝
    `);
});