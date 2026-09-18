const http = require('http');

const PROXY_PORT = Number(process.env.PROXY_PORT) || 4100;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 4000;

function forwardRequest(request, response) {
    const headers = { ...request.headers, host: `${TARGET_HOST}:${TARGET_PORT}` };
    const upstream = http.request({
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        method: request.method,
        path: request.url,
        headers
    }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
    });

    upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'GGV6 target is unavailable.' }));
    });

    request.pipe(upstream);
}

const proxy = http.createServer((request, response) => {
    if (request.url === '/__proxy/health') {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({
            status: 'ok',
            target: `http://${TARGET_HOST}:${TARGET_PORT}`,
            fixedTarget: true
        }));
        return;
    }

    forwardRequest(request, response);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`GGV6 safe proxy running at http://localhost:${PROXY_PORT}`);
    console.log(`Fixed target: http://${TARGET_HOST}:${TARGET_PORT}`);
});
