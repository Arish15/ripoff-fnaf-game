const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Strip query string (e.g. ?v=cache-buster) before resolving the file path
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        if (filePath.endsWith('.mp3')) contentType = 'audio/mpeg';
        if (filePath.endsWith('.ogg')) contentType = 'audio/ogg';
        if (filePath.endsWith('.wav')) contentType = 'audio/wav';
        if (filePath.endsWith('.png')) contentType = 'image/png';
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
        if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
        if (filePath.endsWith('.json')) contentType = 'application/json';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(data);
    });
});

server.listen(8000, () => {
    console.log('Server running on http://localhost:8000');
});