fetch('/api/me', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Session check failed')))
    .then(({ username, isOwner }) => {
        if (!username) return window.location.replace('auth.html');
        if (!isOwner) return window.location.replace('index.html');
        document.body.hidden = false;
    })
    .catch(() => window.location.replace('auth.html'));
