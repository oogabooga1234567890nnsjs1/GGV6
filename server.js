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
const PUBLIC_CHAT_FILE = path.join(DATA_DIR, 'public-chat.json');
const sessions = new Map();
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

const cosmetics = {
    nameStyles: [
        { id: 'default', label: 'Classic', rarity: 'common', className: 'name-default' },
        { id: 'sunset', label: 'Sunset Drive', rarity: 'rare', className: 'name-sunset' },
        { id: 'spectrum', label: 'Spectrum', rarity: 'epic', className: 'name-spectrum' },
        { id: 'prism', label: 'Prism Crown', rarity: 'legendary', className: 'name-prism' },
        { id: 'glitch', label: 'GLITCH//ERROR', rarity: 'godly', className: 'name-glitch' },
        { id: 'void', label: 'VOID//SOVEREIGN', rarity: 'godly', className: 'name-void' },
        { id: 'overclock', label: 'OVERCLOCK//PRIME', rarity: 'godly', className: 'name-overclock' },
        { id: 'corrupted', label: 'CORRUPTED//ROOT', rarity: 'corrupted', className: 'name-corrupted' },
        { id: 'galaxy', label: 'GALAXY//VOYAGER', rarity: 'Owner', className: 'name-galaxy', ownerOnly: true },
        { id: 'orange-green-gradient', label: 'Orange + Green Gradient', rarity: 'Owner', className: 'name-orange-green-gradient', ownerOnly: true },
        { id: 'ascended', label: 'ASCENDED//ORIGIN', rarity: 'ascended', className: 'name-ascended', ownerOnly: true }
    ],
    avatarStyles: [
        { id: 'default', label: 'Core', rarity: 'common', className: 'avatar-core' },
        { id: 'nebula', label: 'Nebula', rarity: 'rare', className: 'avatar-nebula' },
        { id: 'holo', label: 'Hologram', rarity: 'epic', className: 'avatar-holo' },
        { id: 'chromatic', label: 'Chromatic', rarity: 'legendary', className: 'avatar-chromatic' },
        { id: 'glitch', label: 'Broken Signal', rarity: 'godly', className: 'avatar-glitch' },
        { id: 'void', label: 'Void Crown', rarity: 'godly', className: 'avatar-void' },
        { id: 'overclock', label: 'Overclock Core', rarity: 'godly', className: 'avatar-overclock' },
        { id: 'corrupted', label: 'Corrupted Core', rarity: 'corrupted', className: 'avatar-corrupted' },
        { id: 'galaxy', label: 'Galaxy Core', rarity: 'Owner', className: 'avatar-galaxy', ownerOnly: true },
        { id: 'ascended', label: 'Origin Core', rarity: 'ascended', className: 'avatar-ascended', ownerOnly: true }
    ],
    bannerStyles: [
        { id: 'default', label: 'Midnight Grid', rarity: 'common', className: 'banner-default' },
        { id: 'sundown', label: 'Sundown', rarity: 'rare', className: 'banner-sundown' },
        { id: 'hyperdrive', label: 'Hyperdrive', rarity: 'epic', className: 'banner-hyperdrive' },
        { id: 'royalflux', label: 'Royal Flux', rarity: 'legendary', className: 'banner-royalflux' },
        { id: 'glitch', label: 'Dead Pixel Storm', rarity: 'godly', className: 'banner-glitch' },
        { id: 'void', label: 'Event Horizon', rarity: 'godly', className: 'banner-void' },
        { id: 'overclock', label: 'Overclock Grid', rarity: 'godly', className: 'banner-overclock' },
        { id: 'corrupted', label: 'System Collapse', rarity: 'corrupted', className: 'banner-corrupted' },
        { id: 'galaxy', label: 'Galaxy Horizon', rarity: 'Owner', className: 'banner-galaxy', ownerOnly: true },
        { id: 'ascended', label: 'Origin Horizon', rarity: 'ascended', className: 'banner-ascended', ownerOnly: true }
    ],
    chatColors: [
        { id: 'classic', label: 'Classic White', rarity: 'common', visual: { primary: '#edf9ff', secondary: '#d7e7ff' } },
        { id: 'lumen', label: 'Lumen Cyan', rarity: 'rare', visual: { primary: '#70f7ff', secondary: '#4cc9ff' } },
        { id: 'violet', label: 'Violet Pulse', rarity: 'epic', visual: { primary: '#d59cff', secondary: '#8c67ff' } },
        { id: 'sunset', label: 'Sunset Ember', rarity: 'legendary', visual: { primary: '#ffb26d', secondary: '#ff5e7a' } },
        { id: 'mint', label: 'Mint Circuit', rarity: 'legendary', visual: { primary: '#7ef7d8', secondary: '#36dca0' } },
        { id: 'nova', label: 'Nova Glow', rarity: 'mythic', visual: { primary: '#ffd166', secondary: '#ff61d8' } },
        { id: 'spectral', label: 'Spectral Prism', rarity: 'mythic', visual: { primary: '#a7f3ff', secondary: '#c282ff' } },
        { id: 'void', label: 'Void Signal', rarity: 'godly', visual: { primary: '#9ac5ff', secondary: '#7a5cff' } },
        { id: 'corrupted', label: 'Corrupted Fade', rarity: 'corrupted', visual: { primary: '#ff7aa2', secondary: '#5b3cf8' } },
        { id: 'galaxy', label: 'Galaxy Drift', rarity: 'Owner', ownerOnly: true, visual: { primary: '#ffffff', secondary: '#8bd7ff' } },
        { id: 'ascended', label: 'Ascended Aura', rarity: 'ascended', visual: { primary: '#fff0af', secondary: '#87f7ff' }, ownerOnly: true }
    ]
};

const chatColorStyle = (itemId) => {
    const item = cosmeticById('chatColors', itemId);
    if (!item) return '#edf9ff';
    return item.visual?.primary || '#edf9ff';
};

const professionalThemes = [
    ['solaris', 'Solaris', '#ffe28a', '#ff8a5c'],
    ['moonlit', 'Moonlit', '#b8c7ff', '#6f7cff'],
    ['deepsea', 'Deep Sea', '#70f7ff', '#176b9c'],
    ['ember', 'Ember', '#ffb36b', '#e33b5f'],
    ['verdant', 'Verdant', '#b5ff9a', '#20b486'],
    ['lavender', 'Lavender', '#e1b8ff', '#8d6bff'],
    ['tideglass', 'Tideglass', '#b1fff4', '#2cc8ff'],
    ['cinder', 'Cinder', '#ff9a8b', '#501b36'],
    ['polar', 'Polar', '#f1ffff', '#72b8ff'],
    ['honeycomb', 'Honeycomb', '#ffe28a', '#d88a22'],
    ['orchid', 'Orchid', '#ffb6e6', '#a33bce'],
    ['storm', 'Storm', '#9caeff', '#253b75'],
    ['moss', 'Moss', '#d5f59a', '#4f8d4b'],
    ['auric', 'Auric', '#fff3b0', '#aa7422'],
    ['coral', 'Coral', '#ffb0a0', '#e34d74'],
    ['sapphire', 'Sapphire', '#91d7ff', '#3153d8'],
    ['jade', 'Jade', '#a5ffe0', '#16a681'],
    ['ruby', 'Ruby', '#ff9cae', '#a31442'],
    ['amethyst', 'Amethyst', '#edb6ff', '#6f32bd'],
    ['graphite', 'Graphite', '#d2dcf0', '#333b55'],
    ['papaya', 'Papaya', '#ffd18c', '#f0673d'],
    ['arctic', 'Arctic', '#d8fbff', '#4b9fc8'],
    ['meadow', 'Meadow', '#c9ffcf', '#4fbd72'],
    ['ultraviolet', 'Ultraviolet', '#d9b0ff', '#5d27ca'],
    ['magnetic', 'Magnetic', '#ff83d1', '#5e5cff']
];

professionalThemes.forEach(([id, label, primary, secondary]) => {
    const visual = { primary, secondary, background: `linear-gradient(135deg, ${primary}, ${secondary})` };
    cosmetics.nameStyles.push({ id: `${id}-name`, label: `${label} Signal`, rarity: 'mythic', className: 'generated-name', visual });
    cosmetics.avatarStyles.push({ id: `${id}-avatar`, label: `${label} Core`, rarity: 'mythic', className: 'generated-avatar', visual });
    cosmetics.bannerStyles.push({ id: `${id}-banner`, label: `${label} Horizon`, rarity: 'mythic', className: 'generated-banner', visual: { ...visual, background: `linear-gradient(110deg, ${secondary}, #07111f 48%, ${primary})` } });
});

const extraNameThemes = professionalThemes.slice(0, 9);
const extraAvatarThemes = professionalThemes.slice(9, 17);
const extraBannerThemes = professionalThemes.slice(17, 25);
extraNameThemes.forEach(([id, label, primary, secondary]) => cosmetics.nameStyles.push({ id: `${id}-prism`, label: `${label} Prism`, rarity: 'godly', className: 'generated-name', visual: { primary: secondary, secondary: primary, background: `linear-gradient(90deg, ${secondary}, ${primary}, #ffffff, ${secondary})` } }));
extraAvatarThemes.forEach(([id, label, primary, secondary]) => cosmetics.avatarStyles.push({ id: `${id}-halo`, label: `${label} Halo`, rarity: 'godly', className: 'generated-avatar', visual: { primary, secondary, background: `radial-gradient(circle at 35% 25%, #ffffff, ${primary} 20%, ${secondary} 65%, #050713)` } }));
extraBannerThemes.forEach(([id, label, primary, secondary]) => cosmetics.bannerStyles.push({ id: `${id}-matrix`, label: `${label} Matrix`, rarity: 'godly', className: 'generated-banner', visual: { primary, secondary, background: `repeating-linear-gradient(120deg, ${primary} 0 3px, #07111f 4px 17px, ${secondary} 18px 21px)` } }));

const storeBoxes = [
    { id: 'starter', label: 'Starter Box', tier: 'Common', cost: 50, drops: [
        { type: 'nameStyles', id: 'sunset', rarity: 'rare', odds: 55 },
        { type: 'avatarStyles', id: 'nebula', rarity: 'rare', odds: 30 },
        { type: 'bannerStyles', id: 'sundown', rarity: 'rare', odds: 14 },
        { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 1 }
    ] },
    { id: 'neon', label: 'Neon Box', tier: 'Rare', cost: 100, drops: [
        { type: 'nameStyles', id: 'sunset', rarity: 'rare', odds: 55 },
        { type: 'avatarStyles', id: 'nebula', rarity: 'rare', odds: 30 },
        { type: 'bannerStyles', id: 'sundown', rarity: 'rare', odds: 14 },
        { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 1 }
    ] },
    { id: 'holo', label: 'Holo Box', tier: 'Epic', cost: 175, drops: [
        { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 55 },
        { type: 'avatarStyles', id: 'holo', rarity: 'epic', odds: 30 },
        { type: 'bannerStyles', id: 'hyperdrive', rarity: 'epic', odds: 14 },
        { type: 'nameStyles', id: 'prism', rarity: 'legendary', odds: 1 }
    ] },
    { id: 'royal', label: 'Royal Box', tier: 'Legendary', cost: 300, drops: [
        { type: 'nameStyles', id: 'prism', rarity: 'legendary', odds: 45 },
        { type: 'avatarStyles', id: 'chromatic', rarity: 'legendary', odds: 30 },
        { type: 'bannerStyles', id: 'royalflux', rarity: 'legendary', odds: 24 },
        { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 1 }
    ] },
    { id: 'eclipse', label: 'Eclipse Vault', tier: 'Mythic', cost: 600, drops: [
        { type: 'nameStyles', id: 'prism', rarity: 'legendary', odds: 50 },
        { type: 'avatarStyles', id: 'chromatic', rarity: 'legendary', odds: 30 },
        { type: 'bannerStyles', id: 'royalflux', rarity: 'legendary', odds: 19 },
        { type: 'nameStyles', id: 'glitch', rarity: 'godly', odds: 1 }
    ] }
];

storeBoxes.push(
    { id: 'pulse', label: 'Pulse Cache', tier: 'Uncommon', cost: 75, drops: [
        { type: 'nameStyles', id: 'sunset', rarity: 'rare', odds: 50 }, { type: 'avatarStyles', id: 'nebula', rarity: 'rare', odds: 30 }, { type: 'bannerStyles', id: 'sundown', rarity: 'rare', odds: 19 }, { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 1 }
    ] },
    { id: 'prism', label: 'Prism Case', tier: 'Rare', cost: 125, drops: [
        { type: 'nameStyles', id: 'sunset', rarity: 'rare', odds: 50 }, { type: 'avatarStyles', id: 'nebula', rarity: 'rare', odds: 30 }, { type: 'bannerStyles', id: 'sundown', rarity: 'rare', odds: 19 }, { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 1 }
    ] },
    { id: 'vector', label: 'Vector Vault', tier: 'Epic', cost: 200, drops: [
        { type: 'nameStyles', id: 'spectrum', rarity: 'epic', odds: 50 }, { type: 'avatarStyles', id: 'holo', rarity: 'epic', odds: 30 }, { type: 'bannerStyles', id: 'hyperdrive', rarity: 'epic', odds: 19 }, { type: 'nameStyles', id: 'prism', rarity: 'legendary', odds: 1 }
    ] },
    { id: 'phantom', label: 'Phantom Locker', tier: 'Legendary', cost: 350, drops: [
        { type: 'nameStyles', id: 'prism', rarity: 'legendary', odds: 45 }, { type: 'avatarStyles', id: 'chromatic', rarity: 'legendary', odds: 30 }, { type: 'bannerStyles', id: 'royalflux', rarity: 'legendary', odds: 24 }, { type: 'nameStyles', id: 'void', rarity: 'godly', odds: 1 }
    ] },
    { id: 'nova', label: 'Nova Reliquary', tier: 'Mythic', cost: 500, drops: [
        { type: 'nameStyles', id: 'void', rarity: 'godly', odds: 40 }, { type: 'avatarStyles', id: 'void', rarity: 'godly', odds: 30 }, { type: 'bannerStyles', id: 'void', rarity: 'godly', odds: 29 }, { type: 'nameStyles', id: 'overclock', rarity: 'godly', odds: 1 }
    ] },
    { id: 'titan', label: 'Titan Core', tier: 'Mythic', cost: 750, drops: [
        { type: 'nameStyles', id: 'overclock', rarity: 'godly', odds: 40 }, { type: 'avatarStyles', id: 'overclock', rarity: 'godly', odds: 30 }, { type: 'bannerStyles', id: 'overclock', rarity: 'godly', odds: 29 }, { type: 'nameStyles', id: 'glitch', rarity: 'godly', odds: 1 }
    ] },
    { id: 'singularity', label: 'Singularity Vault', tier: 'Godly', cost: 1250, drops: [
        { type: 'nameStyles', id: 'void', rarity: 'godly', odds: 35 }, { type: 'avatarStyles', id: 'overclock', rarity: 'godly', odds: 35 }, { type: 'bannerStyles', id: 'glitch', rarity: 'godly', odds: 29 }, { type: 'nameStyles', id: 'overclock', rarity: 'godly', odds: 1 }
    ] },
    { id: 'relic', label: 'Ancient Relic', tier: 'Godly', cost: 2000, drops: [
        { type: 'nameStyles', id: 'overclock', rarity: 'godly', odds: 35 }, { type: 'avatarStyles', id: 'void', rarity: 'godly', odds: 35 }, { type: 'bannerStyles', id: 'overclock', rarity: 'godly', odds: 29 }, { type: 'nameStyles', id: 'glitch', rarity: 'godly', odds: 1 }
    ] },
    { id: 'godfall', label: 'Godfall Arsenal', tier: 'Godly', cost: 3500, drops: [
        { type: 'nameStyles', id: 'glitch', rarity: 'godly', odds: 34 }, { type: 'avatarStyles', id: 'overclock', rarity: 'godly', odds: 33 }, { type: 'bannerStyles', id: 'void', rarity: 'godly', odds: 32 }, { type: 'nameStyles', id: 'corrupted', rarity: 'corrupted', odds: 1 }
    ] },
    { id: 'infinity', label: 'Infinity Engine', tier: 'Godly', cost: 5000, drops: [
        { type: 'nameStyles', id: 'overclock', rarity: 'godly', odds: 33 }, { type: 'avatarStyles', id: 'glitch', rarity: 'godly', odds: 33 }, { type: 'bannerStyles', id: 'void', rarity: 'godly', odds: 33 }, { type: 'nameStyles', id: 'corrupted', rarity: 'corrupted', odds: 1 }
    ] }
);

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]\n');
if (!fs.existsSync(CHAT_FILE)) fs.writeFileSync(CHAT_FILE, '[]\n');
if (!fs.existsSync(PUBLIC_CHAT_FILE)) fs.writeFileSync(PUBLIC_CHAT_FILE, '[]\n');

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

function readPublicMessages() {
    return JSON.parse(fs.readFileSync(PUBLIC_CHAT_FILE, 'utf8'));
}

function writePublicMessages(messages) {
    const temporaryFile = `${PUBLIC_CHAT_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(messages, null, 2)}\n`);
    fs.renameSync(temporaryFile, PUBLIC_CHAT_FILE);
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

function isStaffUser(username) {
    return username === 'Aidan';
}

function ensureCosmetics(user) {
    if (!user) return;
    user.inventory = user.inventory || { nameStyles: ['default'], avatarStyles: ['default'], bannerStyles: ['default'], chatColors: ['classic'] };
    user.inventory.nameStyles = Array.isArray(user.inventory.nameStyles) && user.inventory.nameStyles.length ? user.inventory.nameStyles : ['default'];
    user.inventory.avatarStyles = Array.isArray(user.inventory.avatarStyles) && user.inventory.avatarStyles.length ? user.inventory.avatarStyles : ['default'];
    user.inventory.bannerStyles = Array.isArray(user.inventory.bannerStyles) && user.inventory.bannerStyles.length ? user.inventory.bannerStyles : ['default'];
    user.inventory.chatColors = Array.isArray(user.inventory.chatColors) && user.inventory.chatColors.length ? user.inventory.chatColors : ['classic'];
    user.equipped = user.equipped || { nameStyle: 'default', avatarStyle: 'default', bannerStyle: 'default', chatColor: 'classic' };
    user.equipped.nameStyle = user.equipped.nameStyle || 'default';
    user.equipped.avatarStyle = user.equipped.avatarStyle || 'default';
    user.equipped.bannerStyle = user.equipped.bannerStyle || 'default';
    user.equipped.chatColor = user.equipped.chatColor || 'classic';
}

function ensureOwnerCosmetics(user) {
    ensureCosmetics(user);
    if (!isStaffUser(user.username)) return;
    Object.entries(cosmetics).forEach(([type, items]) => {
        items.forEach((item) => {
            if (!user.inventory[type].includes(item.id)) user.inventory[type].push(item.id);
        });
    });
}

function experienceForUser(user) {
    const experience = Number.isFinite(user.experience) ? Math.max(0, user.experience) : 0;
    let level = 1;
    let remaining = experience;
    let required = 100;
    while (remaining >= required) {
        remaining -= required;
        level += 1;
        required = level * 100;
    }
    return {
        experience,
        level,
        experienceIntoLevel: remaining,
        experienceToNextLevel: required,
        levelProgress: Math.round((remaining / required) * 100)
    };
}

function addExperience(user, amount) {
    user.experience = (Number.isFinite(user.experience) ? user.experience : 0) + amount;
}

function cosmeticById(type, id) {
    return cosmetics[type].find((item) => item.id === id) || null;
}

function cosmeticFromDrop(drop) {
    if (drop.type === 'cursedCrate' || drop.type === 'corruptedCrate') return drop;
    const item = cosmeticById(drop.type, drop.id);
    return item ? { type: drop.type, ...item, odds: drop.odds } : null;
}

function bundleItemsForDrop(drop) {
    if (drop.type === 'cursedCrate') {
        return [
            { type: 'nameStyles', id: 'glitch' },
            { type: 'avatarStyles', id: 'glitch' },
            { type: 'bannerStyles', id: 'glitch' }
        ];
    }
    if (drop.type === 'corruptedCrate') {
        return [
            { type: 'nameStyles', id: 'corrupted' },
            { type: 'avatarStyles', id: 'corrupted' },
            { type: 'bannerStyles', id: 'corrupted' }
        ];
    }
    return null;
}

function chooseDrop(drops) {
    const roll = Math.random() * drops.reduce((total, drop) => total + drop.odds, 0);
    let cursor = 0;
    for (const drop of drops) {
        cursor += drop.odds;
        if (roll < cursor) return drop;
    }
    return drops[drops.length - 1];
}

function profileForUser(user) {
    ensureOwnerCosmetics(user);
    return {
        username: user.username,
        isOwner: isStaffUser(user.username),
        displayName: user.displayName || user.username,
        bio: user.bio || '',
        avatarColor: user.avatarColor || '#70f7ff',
        credits: Number.isFinite(user.credits) ? user.credits : 100,
        ...experienceForUser(user),
        lastCreditClaim: user.lastCreditClaim || null,
        inventory: user.inventory,
        equipped: user.equipped
    };
}

function userForRequest(request) {
    const username = sessionUser(request);
    if (!username) return null;
    return readUsers().find((user) => user.username === username) || null;
}

function sendProfile(response, user) {
    return sendJson(response, 200, profileForUser(user));
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

const startupUsers = readUsers();
const retiredCosmeticIds = {
    nameStyles: new Set(['aurora']),
    avatarStyles: new Set(['circuit']),
    bannerStyles: new Set(['mintline'])
};
let startupUsersChanged = false;
startupUsers.forEach((user) => {
    const beforeUser = JSON.stringify(user);
    ensureCosmetics(user);
    Object.entries(retiredCosmeticIds).forEach(([type, ids]) => {
        user.inventory[type] = user.inventory[type].filter((id) => !ids.has(id));
    });
    if (isStaffUser(user.username)) ensureOwnerCosmetics(user);
    if (JSON.stringify(user) !== beforeUser) startupUsersChanged = true;
});
if (startupUsersChanged) writeUsers(startupUsers);

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
            users.push({
                username,
                salt,
                passwordHash: hash,
                createdAt: new Date().toISOString(),
                displayName: username,
                bio: '',
                avatarColor: '#70f7ff',
                credits: 100,
                experience: 0,
                lastCreditClaim: null,
                inventory: { nameStyles: ['default'], avatarStyles: ['default'], bannerStyles: ['default'] },
                equipped: { nameStyle: 'default', avatarStyle: 'default', bannerStyle: 'default' }
            });
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
        const user = userForRequest(request);
        return user ? sendProfile(response, user) : sendJson(response, 200, { username: null });
    }

    if (url.pathname === '/api/profile' && request.method === 'GET') {
        const user = userForRequest(request);
        if (!user) return sendJson(response, 401, { error: 'Log in to view your profile.' });
        return sendProfile(response, user);
    }

    if (url.pathname === '/api/profile' && request.method === 'PATCH') {
        const user = userForRequest(request);
        if (!user) return sendJson(response, 401, { error: 'Log in to update your profile.' });
        try {
            const { displayName, bio, avatarColor, nameStyle, avatarStyle, bannerStyle, chatColor } = await readBody(request);
            if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.trim().length > 32) {
                return sendJson(response, 400, { error: 'Display name must be between 1 and 32 characters.' });
            }
            if (typeof bio !== 'string' || bio.trim().length > 160) {
                return sendJson(response, 400, { error: 'Bio must be 160 characters or fewer.' });
            }
            if (typeof avatarColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(avatarColor)) {
                return sendJson(response, 400, { error: 'Choose a valid profile color.' });
            }
            ensureCosmetics(user);
            const requestedStyles = [
                ['nameStyle', 'nameStyles', nameStyle],
                ['avatarStyle', 'avatarStyles', avatarStyle],
                ['bannerStyle', 'bannerStyles', bannerStyle],
                ['chatColor', 'chatColors', chatColor]
            ];
            for (const [field, type, value] of requestedStyles) {
                if (value !== undefined && (typeof value !== 'string' || !user.inventory[type].includes(value))) {
                    return sendJson(response, 400, { error: `You do not own that ${field.replace('Style', ' style').replace('Color', ' color')}.` });
                }
            }
            const users = readUsers();
            const storedUser = users.find((entry) => entry.username === user.username);
            ensureCosmetics(storedUser);
            storedUser.displayName = displayName.trim();
            storedUser.bio = bio.trim();
            storedUser.avatarColor = avatarColor;
            if (nameStyle !== undefined) storedUser.equipped.nameStyle = nameStyle;
            if (avatarStyle !== undefined) storedUser.equipped.avatarStyle = avatarStyle;
            if (bannerStyle !== undefined) storedUser.equipped.bannerStyle = bannerStyle;
            if (chatColor !== undefined) storedUser.equipped.chatColor = chatColor;
            if (!Number.isFinite(storedUser.credits)) storedUser.credits = 100;
            if (!Object.hasOwn(storedUser, 'lastCreditClaim')) storedUser.lastCreditClaim = null;
            writeUsers(users);
            return sendProfile(response, storedUser);
        } catch {
            return sendJson(response, 400, { error: 'Could not update your profile.' });
        }
    }

    if (url.pathname === '/api/credits/claim' && request.method === 'POST') {
        const user = userForRequest(request);
        if (!user) return sendJson(response, 401, { error: 'Log in to claim credits.' });
        const today = new Date().toISOString().slice(0, 10);
        if (user.lastCreditClaim === today) {
            return sendJson(response, 409, { error: 'Daily credits already claimed.', ...profileForUser(user) });
        }
        const users = readUsers();
        const storedUser = users.find((entry) => entry.username === user.username);
        storedUser.credits = (Number.isFinite(storedUser.credits) ? storedUser.credits : 100) + 25;
        addExperience(storedUser, 50);
        storedUser.lastCreditClaim = today;
        writeUsers(users);
        return sendProfile(response, storedUser);
    }

    if (url.pathname === '/api/store' && request.method === 'GET') {
        const user = userForRequest(request);
        if (!user) return sendJson(response, 401, { error: 'Log in to visit the store.' });
        return sendJson(response, 200, { boxes: storeBoxes, cosmetics, profile: profileForUser(user) });
    }

    if (url.pathname === '/api/store/purchase' && request.method === 'POST') {
        const user = userForRequest(request);
        if (!user) return sendJson(response, 401, { error: 'Log in to open mystery boxes.' });
        try {
            const { boxId } = await readBody(request);
            const box = storeBoxes.find((entry) => entry.id === boxId);
            if (!box || ['cursed', 'corrupted'].includes(box.id)) return sendJson(response, 400, { error: 'That mystery box is not available for direct purchase.' });
            ensureCosmetics(user);
            const availableDrops = box.drops.filter((drop) => {
                if (drop.type === 'cursedCrate' || drop.type === 'corruptedCrate') return true;
                return !user.inventory[drop.type].includes(drop.id);
            });
            const dropPool = availableDrops.length ? availableDrops : box.drops;
            if (user.credits < box.cost) {
                return sendJson(response, 400, { error: `You need ${box.cost} credits to open this box.` });
            }
            const drop = cosmeticFromDrop(chooseDrop(dropPool));
            const users = readUsers();
            const storedUser = users.find((entry) => entry.username === user.username);
            ensureCosmetics(storedUser);
            storedUser.credits = (Number.isFinite(storedUser.credits) ? storedUser.credits : 100) - box.cost;
            addExperience(storedUser, 10);
            const bundleItems = bundleItemsForDrop(drop);
            if (bundleItems) {
                bundleItems.forEach((item) => {
                    if (!storedUser.inventory[item.type].includes(item.id)) storedUser.inventory[item.type].push(item.id);
                });
                drop.items = bundleItems.map((item) => ({ type: item.type, ...cosmeticById(item.type, item.id) }));
            } else if (!storedUser.inventory[drop.type].includes(drop.id)) {
                storedUser.inventory[drop.type].push(drop.id);
            }
            writeUsers(users);
            return sendJson(response, 200, { box, drop, profile: profileForUser(storedUser) });
        } catch {
            return sendJson(response, 400, { error: 'Could not open that mystery box.' });
        }
    }

    if (url.pathname === '/api/owner/users' && request.method === 'GET') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use owner controls.' });
        if (!isStaffUser(username)) return sendJson(response, 403, { error: 'Owner controls are restricted to Aidan.' });
        return sendJson(response, 200, {
            users: readUsers().map((user) => profileForUser(user)),
            cosmetics
        });
    }

    if (url.pathname === '/api/owner/grant' && request.method === 'POST') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use owner controls.' });
        if (!isStaffUser(username)) return sendJson(response, 403, { error: 'Owner commands are restricted to Aidan.' });
        try {
            const { username: targetUsername, credits, experience, itemType, itemId } = await readBody(request);
            const creditAmount = credits === undefined || credits === '' ? 0 : Number(credits);
            const experienceAmount = experience === undefined || experience === '' ? 0 : Number(experience);
            if (typeof targetUsername !== 'string' || !targetUsername.trim()) {
                return sendJson(response, 400, { error: 'Choose a user.' });
            }
            if (!Number.isInteger(creditAmount) || creditAmount < 0 || creditAmount > 1_000_000) {
                return sendJson(response, 400, { error: 'Credits must be a whole number from 0 to 1,000,000.' });
            }
            if (!Number.isInteger(experienceAmount) || experienceAmount < 0 || experienceAmount > 1_000_000) {
                return sendJson(response, 400, { error: 'Experience must be a whole number from 0 to 1,000,000.' });
            }
            const cosmetic = itemType && itemId ? cosmeticById(itemType, itemId) : null;
            if ((itemType || itemId) && (!cosmetic || !['nameStyles', 'avatarStyles', 'bannerStyles'].includes(itemType))) {
                return sendJson(response, 400, { error: 'Choose a valid cosmetic.' });
            }
            if (creditAmount === 0 && experienceAmount === 0 && !cosmetic) {
                return sendJson(response, 400, { error: 'Give credits, experience, an item, or a combination.' });
            }
            const users = readUsers();
            const target = users.find((user) => user.username.toLowerCase() === targetUsername.trim().toLowerCase());
            if (!target) return sendJson(response, 404, { error: 'That user does not exist.' });
            ensureCosmetics(target);
            target.credits = (Number.isFinite(target.credits) ? target.credits : 100) + creditAmount;
            addExperience(target, experienceAmount);
            if (cosmetic && !target.inventory[itemType].includes(itemId)) target.inventory[itemType].push(itemId);
            writeUsers(users);
            return sendJson(response, 200, {
                profile: profileForUser(target),
                message: `${creditAmount ? `${creditAmount} credits` : ''}${creditAmount && experienceAmount ? ', ' : ''}${experienceAmount ? `${experienceAmount} XP` : ''}${(creditAmount || experienceAmount) && cosmetic ? ' and ' : ''}${cosmetic ? cosmetic.label : ''} granted to ${target.username}.`
            });
        } catch {
            return sendJson(response, 400, { error: 'Could not run that owner command.' });
        }
    }

    if (url.pathname === '/api/chat' && request.method === 'GET') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use staff chat.' });
        if (!isStaffUser(username)) return sendJson(response, 403, { error: 'Only Aidan can use staff chat.' });
        const after = Number(url.searchParams.get('after')) || 0;
        const messages = readMessages();
        return sendJson(response, 200, { messages: after ? messages.filter((message) => message.id > after) : messages.slice(-100) });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use staff chat.' });
        if (!isStaffUser(username)) return sendJson(response, 403, { error: 'Only Aidan can use staff chat.' });
        try {
            const { text } = await readBody(request);
            const messageText = typeof text === 'string' ? text.trim() : '';
            if (!messageText || messageText.length > 500) {
                return sendJson(response, 400, { error: 'Messages must be between 1 and 500 characters.' });
            }
            const users = readUsers();
            const user = users.find((entry) => entry.username === username);
            ensureCosmetics(user);
            const chatColor = cosmeticById('chatColors', user.equipped.chatColor);
            const message = {
                id: Date.now(),
                username,
                text: messageText,
                color: chatColor ? (chatColor.visual?.primary || '#edf9ff') : '#edf9ff',
                chatColor: user.equipped.chatColor || 'classic',
                createdAt: new Date().toISOString()
            };
            const messages = [...readMessages(), message].slice(-500);
            addExperience(user, 5);
            writeUsers(users);
            writeMessages(messages);
            return sendJson(response, 201, { message });
        } catch {
            return sendJson(response, 400, { error: 'Could not send the message.' });
        }
    }

    if (url.pathname === '/api/public-chat' && request.method === 'GET') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use public chat.' });
        const after = Number(url.searchParams.get('after')) || 0;
        const messages = readPublicMessages();
        return sendJson(response, 200, { messages: after ? messages.filter((message) => message.id > after) : messages.slice(-100) });
    }

    if (url.pathname === '/api/public-chat' && request.method === 'POST') {
        const username = sessionUser(request);
        if (!username) return sendJson(response, 401, { error: 'Log in to use public chat.' });
        try {
            const { text } = await readBody(request);
            const messageText = typeof text === 'string' ? text.trim() : '';
            if (!messageText || messageText.length > 500) {
                return sendJson(response, 400, { error: 'Messages must be between 1 and 500 characters.' });
            }
            const users = readUsers();
            const user = users.find((entry) => entry.username === username);
            ensureCosmetics(user);
            const chatColor = cosmeticById('chatColors', user.equipped.chatColor);
            const message = {
                id: Date.now(),
                username,
                text: messageText,
                color: chatColor ? (chatColor.visual?.primary || '#edf9ff') : '#edf9ff',
                chatColor: user.equipped.chatColor || 'classic',
                createdAt: new Date().toISOString()
            };
            const messages = [...readPublicMessages(), message].slice(-500);
            addExperience(user, 5);
            writeUsers(users);
            writePublicMessages(messages);
            return sendJson(response, 201, { message });
        } catch {
            return sendJson(response, 400, { error: 'Could not send the public message.' });
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
