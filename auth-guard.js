fetch('/api/me', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Session check failed')))
    .then(({ username }) => {
        if (!username) window.location.replace('auth.html');
    })
    .catch(() => {
        window.location.replace('auth.html');
    });
