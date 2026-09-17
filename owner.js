const grantForm = document.querySelector('#grant-form');
const targetUser = document.querySelector('#target-user');
const targetBalance = document.querySelector('#target-balance');
const creditAmount = document.querySelector('#credit-amount');
const experienceAmount = document.querySelector('#experience-amount');
const cosmeticItem = document.querySelector('#cosmetic-item');
const grantButton = document.querySelector('#grant-button');
const commandStatus = document.querySelector('#command-status');
let users = [];

function updateTargetBalance() {
    const user = users.find((entry) => entry.username === targetUser.value);
    targetBalance.textContent = user ? `Level ${user.level} · ${user.credits.toLocaleString()} credits · ${user.experience} XP` : '';
}

function populateUsers() {
    targetUser.replaceChildren(...users.map((user) => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = `${user.displayName} (@${user.username})`;
        return option;
    }));
    updateTargetBalance();
}

function populateCosmetics(cosmetics) {
    const options = [document.querySelector('#cosmetic-item option')];
    Object.entries(cosmetics).forEach(([type, items]) => {
        const group = document.createElement('optgroup');
        group.label = type.replace('Styles', ' styles');
        items.filter((item) => item.id !== 'default').forEach((item) => {
            const option = document.createElement('option');
            option.value = `${type}:${item.id}`;
            option.textContent = `${item.label} · ${item.rarity}${item.ownerOnly ? ' · owner only' : ''}`;
            group.appendChild(option);
        });
        options.push(group);
    });
    cosmeticItem.replaceChildren(...options);
}

async function loadOwnerTools() {
    const response = await fetch('/api/owner/users', { cache: 'no-store' });
    if (response.status === 401) return window.location.replace('auth.html');
    if (response.status === 403) return window.location.replace('index.html');
    if (!response.ok) throw new Error('Owner tools unavailable.');
    const result = await response.json();
    users = result.users;
    populateUsers();
    populateCosmetics(result.cosmetics);
    document.body.hidden = false;
}

targetUser.addEventListener('change', updateTargetBalance);

grantForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const [itemType, itemId] = cosmeticItem.value ? cosmeticItem.value.split(':') : ['', ''];
    grantButton.disabled = true;
    commandStatus.className = 'status';
    commandStatus.textContent = 'Running command...';
    try {
        const response = await fetch('/api/owner/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: targetUser.value,
                credits: creditAmount.value,
                experience: experienceAmount.value,
                itemType,
                itemId
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Command failed.');
        const userIndex = users.findIndex((user) => user.username === result.profile.username);
        if (userIndex !== -1) users[userIndex] = result.profile;
        updateTargetBalance();
        creditAmount.value = '';
        experienceAmount.value = '';
        cosmeticItem.value = '';
        commandStatus.classList.add('success');
        commandStatus.textContent = result.message;
    } catch (error) {
        commandStatus.classList.add('error');
        commandStatus.textContent = error.message;
    } finally {
        grantButton.disabled = false;
    }
});

loadOwnerTools().catch((error) => {
    commandStatus.classList.add('error');
    commandStatus.textContent = error.message;
});
