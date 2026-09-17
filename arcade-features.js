const gameLinks = [...document.querySelectorAll('.game-link')];
const searchInput = document.querySelector('#game-search');
const toolStatus = document.querySelector('#tool-status');
const favoriteCount = document.querySelector('#favorite-count');
const recentGame = document.querySelector('#recent-game');
const sessionTime = document.querySelector('#session-time');
const welcomeLine = document.querySelector('#welcome-line');
const homeProfileName = document.querySelector('#home-profile-name');
const homeProfileUsername = document.querySelector('#home-profile-username');
const homeProfileBio = document.querySelector('#home-profile-bio');
const homeAvatar = document.querySelector('#home-avatar');
const homeProfileBanner = document.querySelector('#home-profile-banner');
const homeLevel = document.querySelector('#home-level');
const homeCredits = document.querySelector('#home-credits');
const homeXpLabel = document.querySelector('#home-xp-label');
const homeXpBar = document.querySelector('#home-xp-bar');
const favoritesKey = 'ggv6-favorites';
const recentKey = 'ggv6-recent-game';

function getFavorites() {
    try { return JSON.parse(localStorage.getItem(favoritesKey) || '[]'); } catch { return []; }
}

function setStatus(message, isError = false) {
    toolStatus.textContent = message;
    toolStatus.className = `tool-status${isError ? ' error' : ''}`;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => { toolStatus.textContent = ''; }, 3000);
}

function renderHomeProfile(profile) {
    welcomeLine.textContent = `Welcome back, ${profile.displayName}. Your arcade is ready.`;
    homeProfileName.textContent = profile.displayName;
    homeProfileUsername.textContent = `@${profile.username}`;
    homeProfileBio.textContent = profile.bio || 'No bio added yet.';
    homeAvatar.className = `home-avatar avatar-${profile.equipped.avatarStyle}`;
    homeAvatar.textContent = profile.displayName.charAt(0).toUpperCase();
    homeProfileBanner.className = `home-profile-banner banner-${profile.equipped.bannerStyle}`;
    homeLevel.textContent = profile.level;
    homeCredits.textContent = profile.credits.toLocaleString();
    homeXpLabel.textContent = `${profile.experienceIntoLevel} / ${profile.experienceToNextLevel} XP`;
    homeXpBar.style.width = `${profile.levelProgress}%`;
}

function updateFavorites() {
    const favorites = getFavorites();
    gameLinks.forEach((link) => {
        const isFavorite = favorites.includes(link.dataset.game);
        link.classList.toggle('is-favorite', isFavorite);
        link.querySelector('.favorite-mark').textContent = isFavorite ? '★' : '☆';
        link.querySelector('.favorite-mark').setAttribute('aria-label', isFavorite ? 'Remove favorite' : 'Add favorite');
    });
    favoriteCount.textContent = `${favorites.length} favorite${favorites.length === 1 ? '' : 's'}`;
}

gameLinks.forEach((link) => {
    link.addEventListener('click', () => {
        localStorage.setItem(recentKey, JSON.stringify({ name: link.dataset.game, href: link.href }));
    });
    link.querySelector('.favorite-mark').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const favorites = getFavorites();
        const index = favorites.indexOf(link.dataset.game);
        if (index === -1) favorites.push(link.dataset.game);
        else favorites.splice(index, 1);
        localStorage.setItem(favoritesKey, JSON.stringify(favorites));
        updateFavorites();
    });
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    gameLinks.forEach((link) => {
        link.hidden = Boolean(query) && !link.dataset.game.toLowerCase().includes(query);
    });
    setStatus(query ? `${gameLinks.filter((link) => !link.hidden).length} game result(s)` : '');
});

document.querySelector('#random-game').addEventListener('click', () => {
    const visibleGames = gameLinks.filter((link) => !link.hidden);
    if (!visibleGames.length) return setStatus('No matching games found.', true);
    const game = visibleGames[Math.floor(Math.random() * visibleGames.length)];
    localStorage.setItem(recentKey, JSON.stringify({ name: game.dataset.game, href: game.href }));
    window.location.href = game.href;
});

document.querySelector('#copy-arcade').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        setStatus('Arcade link copied.');
    } catch {
        setStatus('Copy is unavailable in this browser.', true);
    }
});

document.querySelector('#theme-toggle').addEventListener('click', () => {
    const focusTheme = document.body.classList.toggle('focus-theme');
    localStorage.setItem('ggv6-focus-theme', String(focusTheme));
    setStatus(focusTheme ? 'Focus theme enabled.' : 'Focus theme disabled.');
});

document.querySelector('#motion-toggle').addEventListener('click', () => {
    const reduced = document.body.classList.toggle('reduce-motion');
    localStorage.setItem('ggv6-reduce-motion', String(reduced));
    setStatus(reduced ? 'Motion reduced.' : 'Motion restored.');
});

document.querySelector('#logout-button').addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.replace('auth.html');
    } catch {
        setStatus('Could not log out.', true);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== searchInput) {
        event.preventDefault();
        searchInput.focus();
    }
    if (event.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
        document.querySelector('#random-game').click();
    }
});

const savedRecent = JSON.parse(localStorage.getItem(recentKey) || 'null');
if (savedRecent) recentGame.textContent = `Last played: ${savedRecent.name}`;
if (localStorage.getItem('ggv6-focus-theme') === 'true') document.body.classList.add('focus-theme');
if (localStorage.getItem('ggv6-reduce-motion') === 'true') document.body.classList.add('reduce-motion');
updateFavorites();
sessionTime.textContent = `Signed in ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

window.addEventListener('ggv6-profile-loaded', (event) => {
    renderHomeProfile(event.detail);
});

if (window.ggv6Profile) renderHomeProfile(window.ggv6Profile);
