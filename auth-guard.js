fetch('/api/me', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Session check failed')))
    .then((profile) => {
        const { username, credits, level, isOwner } = profile;
        if (!username) return window.location.replace('auth.html');
        window.ggv6Profile = profile;
        const creditBalance = document.querySelector('#credit-balance');
        if (creditBalance && Number.isFinite(credits)) creditBalance.textContent = `Level ${level} · ${credits.toLocaleString()} credits available`;
        document.querySelectorAll('.owner-only').forEach((element) => {
            const ownerSession = username === 'Aidan' && isOwner === true;
            element.hidden = !ownerSession;
            element.classList.toggle('is-owner', ownerSession);
        });
        window.dispatchEvent(new CustomEvent('ggv6-profile-loaded', { detail: profile }));
    })
    .catch(() => {
        window.location.replace('auth.html');
    });
