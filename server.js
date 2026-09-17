const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat.json');
const sessions = new Map();
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]\n');
if (!fs.existsSync(CHAT_FILE)) fs.writeFileSync(CHAT_FILE, '[]\n');

function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
    const temporaryFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(users, null, 2)}\n`);
    fs.renameSync(temporaryFile, USERS_FILE);
}

function readMessages() {
    return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
}

function writeMessages(messages) {
    const temporaryFile = `${CHAT_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(messages, null, 2)}\n`);
    fs.renameSync(temporaryFile, CHAT_FILE);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

function passwordMatches(password, user) {
    const candidate = crypto.scryptSync(password, user.salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function parseCookies(request) {
    return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
        const separator = part.indexOf('=');
        return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
    }));
}

function sessionUser(request) {
    const sessionId = parseCookies(request).ggv6_session;
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
        if (sessionId) sessions.delete(sessionId);
        return null;
    }
    return session.username;
}

function sendJson(response, status, data, extraHeaders = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
    response.end(JSON.stringify(data));
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (chunk) => {
            body += chunk;
            if (body.length > 10_000) request.destroy();
        });
        request.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
        });
        request.on('error', reject);
    });
}

function validateCredentials(username, password) {
    return typeof username === 'string' && /^[a-zA-Z0-9_]{3,24}$/.test(username)
        && typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function serveStatic(request, response, pathname) {
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(ROOT, `.${requestedPath}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
    }
    const extension = path.extname(filePath);
    const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
    response.writeHead(200, { 'Content-Type': `${contentTypes[extension] || 'application/octet-stream'}; charset=utf-8` });
    fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/api/signup' && request.method === 'POST') {
        try {
            const { username, password } = await readBody(request);
            if (!validateCredentials(username, password)) {
                return sendJson(response, 400, { error: 'Use a username with 3-24 letters, numbers, or underscores and a password of at least 8 characters.' });
            }
            const users = readUsers();
            if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
                return sendJson(response, 409, { error: 'That username is already taken.' });
            }
            const { salt, hash } = hashPassword(password);
            users.push({ username, salt, passwordHash: hash, createdAt: new Date().toISOString() });
            writeUsers(users);
            return sendJson(response, 201, { message: 'Account created. You can now log in.' });
        } catch {
            return sendJson(response, 400, { error: 'Could not create the account.' });
        }
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
        try {
            const { username, password } = await readBody(request);
            const user = readUsers().find((entry) => entry.username.toLowerCase() === String(username || '').toLowerCase());
            if (!user || typeof password !== 'string' || !passwordMatches(password, user)) {
                return sendJson(response, 401, { error: 'Incorrect username or password.' });
            }
            const sessionId = crypto.randomBytes(32).toString('hex');
            sessions.set(sessionId, { username: user.username, expiresAt: Date.now() + SESSION_MAX_AGE });
            return sendJson(response, 200, { username: user.username }, {
                'Set-Cookie': `ggv6_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}`
            });
        } catch {
            return sendJson(response, 400, { error: 'Could not log in.' });
        }
    }

    if (url.pathname === '/api/me' && request.method === 'GET') {
        return sendJson(response, 200, { username: sessionUser(request) });
    }

    if (url.pathname === '/api/chat' && request.method === 'GET') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use staff chat.' });
        const after = Number(url.searchParams.get('after')) || 0;
        const messages = readMessages();
        return sendJson(response, 200, { messages: after ? messages.filter((message) => message.id > after) : messages.slice(-100) });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use staff chat.' });
        try {
            const { text } = await readBody(request);
            const messageText = typeof text === 'string' ? text.trim() : '';
            if (!messageText || messageText.length > 500) {
                return sendJson(response, 400, { error: 'Messages must be between 1 and 500 characters.' });
            }
            const message = { id: Date.now(), username, text: messageText, createdAt: new Date().toISOString() };
            const messages = [...readMessages(), message].slice(-500);
            writeMessages(messages);
            return sendJson(response, 201, { message });
        } catch {
            return sendJson(response, 400, { error: 'Could not send the message.' });
        }
    }

    if (url.pathname === '/api/logout' && request.method === 'POST') {
        const sessionId = parseCookies(request).ggv6_session;
        sessions.delete(sessionId);
        return sendJson(response, 200, { message: 'Logged out.' }, {
            'Set-Cookie': 'ggv6_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
        });
    }

    if (request.method === 'GET') return serveStatic(request, response, url.pathname);
    return sendJson(response, 405, { error: 'Method not allowed.' });
});

server.listen(PORT, HOST, () => {
    console.log(`GGV6 running at http://localhost:${PORT}`);
});
