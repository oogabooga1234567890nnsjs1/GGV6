const profileForm = document.querySelector('#profile-form');
const displayNameInput = document.querySelector('#display-name');
const bioInput = document.querySelector('#bio');
const colorInput = document.querySelector('#avatar-color');
const colorValue = document.querySelector('#color-value');
const nameStyleInput = document.querySelector('#name-style');
const avatarStyleInput = document.querySelector('#avatar-style');
const bannerStyleInput = document.querySelector('#banner-style');
const chatColorInput = document.querySelector('#chat-color');
const avatar = document.querySelector('#avatar');
const previewName = document.querySelector('#preview-name');
const previewUsername = document.querySelector('#preview-username');
const previewBio = document.querySelector('#preview-bio');
const creditCount = document.querySelector('#credit-count');
const levelCount = document.querySelector('#level-count');
const experienceBar = document.querySelector('#experience-bar');
const experienceLabel = document.querySelector('#experience-label');
const profileStatus = document.querySelector('#profile-status');
const creditsStatus = document.querySelector('#credits-status');
const saveButton = document.querySelector('#save-button');
const claimButton = document.querySelector('#claim-button');
let catalog;

function applyVisual(element, item) {
    element.classList.remove('generated-cosmetic');
    ['--cosmetic-primary', '--cosmetic-secondary', '--cosmetic-background'].forEach((property) => element.style.removeProperty(property));
    if (!item?.visual) return;
    element.classList.add('generated-cosmetic');
    element.style.setProperty('--cosmetic-primary', item.visual.primary);
    element.style.setProperty('--cosmetic-secondary', item.visual.secondary);
    element.style.setProperty('--cosmetic-background', item.visual.background);
}

function setOptions(input, items, ownedIds, selectedId) {
    const safeItems = Array.isArray(items) ? items : [];
    const ownedSet = new Set(Array.isArray(ownedIds) ? ownedIds : []);
    input.replaceChildren(...safeItems.filter((item) => ownedSet.has(item.id)).map((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.label} · ${item.rarity}`;
        return option;
    }));
    input.value = selectedId || (safeItems[0] ? safeItems[0].id : '');
}

function populateCosmeticOptions(cosmeticCatalog, profile) {
    catalog = cosmeticCatalog;
    setOptions(nameStyleInput, catalog.nameStyles, profile.inventory.nameStyles, profile.equipped.nameStyle);
    setOptions(avatarStyleInput, catalog.avatarStyles, profile.inventory.avatarStyles, profile.equipped.avatarStyle);
    setOptions(bannerStyleInput, catalog.bannerStyles, profile.inventory.bannerStyles, profile.equipped.bannerStyle);
    const chatColors = Array.isArray(catalog.chatColors) ? catalog.chatColors : [{ id: 'classic', label: 'Classic White', rarity: 'common' }];
    setOptions(chatColorInput, chatColors, profile.inventory.chatColors || ['classic'], profile.equipped.chatColor || 'classic');
}

function renderName(name, style) {
    previewName.replaceChildren();
    if (style === 'galaxy') {
        [...name].forEach((character, index) => {
            const letter = document.createElement('span');
            letter.className = 'galaxy-letter';
            letter.textContent = character === ' ' ? '\u00a0' : character;
            letter.dataset.char = character === ' ' ? '\u00a0' : character;
            letter.style.setProperty('--letter-index', index);
            previewName.appendChild(letter);
        });
        return;
    }
    if (style !== 'glitch') {
        previewName.textContent = name;
        return;
    }
    [...name].forEach((character, index) => {
        const letter = document.createElement('span');
        letter.className = 'glitch-letter';
        letter.textContent = character === ' ' ? '\u00a0' : character;
        letter.dataset.char = character === ' ' ? '\u00a0' : character;
        letter.style.setProperty('--letter-index', index);
        previewName.appendChild(letter);
    });
}

function renderProfile(profile) {
    const nameItem = catalog?.nameStyles.find((item) => item.id === profile.equipped.nameStyle);
    const avatarItem = catalog?.avatarStyles.find((item) => item.id === profile.equipped.avatarStyle);
    const bannerItem = catalog?.bannerStyles.find((item) => item.id === profile.equipped.bannerStyle);
    displayNameInput.value = profile.displayName;
    bioInput.value = profile.bio;
    colorInput.value = profile.avatarColor;
    colorValue.textContent = profile.avatarColor;
    avatar.className = `avatar ${avatarItem?.className || `avatar-${profile.equipped.avatarStyle}`}`;
    applyVisual(avatar, avatarItem);
    avatar.textContent = profile.displayName.charAt(0).toUpperCase();
    avatar.style.setProperty('--avatar-color', profile.avatarColor);
    previewName.className = `profile-name ${nameItem?.className || `name-${profile.equipped.nameStyle}`}`;
    applyVisual(previewName, nameItem);
    const previewPanel = document.querySelector('.preview-panel');
    previewPanel.className = `preview-panel ${bannerItem?.className || `banner-${profile.equipped.bannerStyle}`}`;
    applyVisual(previewPanel, bannerItem);
    renderName(profile.displayName, profile.equipped.nameStyle);
    previewUsername.textContent = `@${profile.username}`;
    previewBio.textContent = profile.bio || 'Your bio will appear here.';
    creditCount.textContent = profile.credits.toLocaleString();
    levelCount.textContent = profile.level;
    experienceBar.style.width = `${profile.levelProgress}%`;
    experienceLabel.textContent = `${profile.experienceIntoLevel} / ${profile.experienceToNextLevel} XP`;
    const claimedToday = profile.lastCreditClaim === new Date().toISOString().slice(0, 10);
    claimButton.disabled = claimedToday;
    claimButton.textContent = claimedToday ? 'Claimed today' : 'Claim +25';
}

function updateCosmeticPreview() {
    if (!catalog) return;
    const nameStyle = nameStyleInput.value;
    const avatarStyle = avatarStyleInput.value;
    const bannerStyle = bannerStyleInput.value;
    const nameItem = catalog.nameStyles.find((item) => item.id === nameStyle);
    const avatarItem = catalog.avatarStyles.find((item) => item.id === avatarStyle);
    const bannerItem = catalog.bannerStyles.find((item) => item.id === bannerStyle);
    avatar.className = `avatar ${avatarItem?.className || `avatar-${avatarStyle}`}`;
    applyVisual(avatar, avatarItem);
    avatar.textContent = displayNameInput.value.charAt(0).toUpperCase();
    avatar.style.setProperty('--avatar-color', colorInput.value);
    previewName.className = `profile-name ${nameItem?.className || `name-${nameStyle}`}`;
    applyVisual(previewName, nameItem);
    renderName(displayNameInput.value, nameStyle);
    const previewPanel = document.querySelector('.preview-panel');
    previewPanel.className = `preview-panel ${bannerItem?.className || `banner-${bannerStyle}`}`;
    applyVisual(previewPanel, bannerItem);
}

async function loadProfile() {
    const response = await fetch('/api/store', { cache: 'no-store' });
    if (response.status === 401) return window.location.replace('auth.html');
    if (!response.ok) throw new Error('Could not load profile.');
    const result = await response.json();
    populateCosmeticOptions(result.cosmetics, result.profile);
    renderProfile(result.profile);
}

colorInput.addEventListener('input', () => {
    colorValue.textContent = colorInput.value;
    avatar.style.setProperty('--avatar-color', colorInput.value);
});

[nameStyleInput, avatarStyleInput, bannerStyleInput, chatColorInput].forEach((input) => {
    input.addEventListener('change', updateCosmeticPreview);
});

displayNameInput.addEventListener('input', updateCosmeticPreview);

profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    profileStatus.className = 'status';
    profileStatus.textContent = 'Saving...';
    try {
        const response = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                displayName: displayNameInput.value,
                bio: bioInput.value,
                avatarColor: colorInput.value,
                nameStyle: nameStyleInput.value,
                avatarStyle: avatarStyleInput.value,
                bannerStyle: bannerStyleInput.value,
                chatColor: chatColorInput.value
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save profile.');
        renderProfile(result);
        profileStatus.classList.add('success');
        profileStatus.textContent = 'Profile saved.';
    } catch (error) {
        profileStatus.classList.add('error');
        profileStatus.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});

claimButton.addEventListener('click', async () => {
    claimButton.disabled = true;
    creditsStatus.className = 'status';
    creditsStatus.textContent = 'Claiming...';
    try {
        const response = await fetch('/api/credits/claim', { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not claim credits.');
        renderProfile(result);
        creditsStatus.classList.add('success');
        creditsStatus.textContent = '25 credits added.';
    } catch (error) {
        creditsStatus.classList.add('error');
        creditsStatus.textContent = error.message;
        claimButton.disabled = false;
    }
});

loadProfile().catch((error) => {
    profileStatus.classList.add('error');
    profileStatus.textContent = error.message;
});
