/**
 * Simple HTTP server for testing eye tracking without Live Server interference
 * Usage: node server.js
 * Then open: http://localhost:8080/demo.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

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

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Eye Tracking Demo Server                              ║
║                                                        ║
║  Server running at: http://localhost:${PORT}/           ║
║  Demo page: http://localhost:${PORT}/demo.html         ║
║                                                        ║
║  This server does NOT inject WebSocket code,          ║
║  so it won't interfere with eye tracker connection.   ║
║                                                        ║
║  Press Ctrl+C to stop the server                      ║
╚════════════════════════════════════════════════════════╝
    `);
});