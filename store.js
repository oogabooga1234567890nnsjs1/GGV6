const boxGrid = document.querySelector('#box-grid');
const creditCount = document.querySelector('#credit-count');
const storeStatus = document.querySelector('#store-status');
const dropPanel = document.querySelector('#drop-panel');
const dropPreview = document.querySelector('#drop-preview');
const dropName = document.querySelector('#drop-name');
const dropType = document.querySelector('#drop-type');
let profile;
let catalog;

function formatType(type) {
    return type.replace('Styles', '').replace('Style', ' style');
}

function renderGlitchText(element, text) {
    element.replaceChildren();
    [...text].forEach((character, index) => {
        const letter = document.createElement('span');
        letter.className = 'glitch-letter';
        letter.textContent = character === ' ' ? '\u00a0' : character;
        letter.dataset.char = letter.textContent;
        letter.style.setProperty('--letter-index', index);
        element.appendChild(letter);
    });
}

function applyDropVisual(element, drop) {
    if (!drop.visual) return;
    element.classList.add('generated-cosmetic');
    element.style.setProperty('--cosmetic-primary', drop.visual.primary);
    element.style.setProperty('--cosmetic-secondary', drop.visual.secondary);
    element.style.setProperty('--cosmetic-background', drop.visual.background);
}

function renderBoxes(boxes) {
    boxGrid.replaceChildren(...boxes.map((box) => {
        const card = document.createElement('article');
        card.className = `box-card box-${box.id}`;
        const title = document.createElement('div');
        title.className = 'box-title';
        title.innerHTML = `<span>${box.tier}</span><h2>${box.label}</h2>`;
        const description = document.createElement('p');
        description.textContent = 'Contains a random name, avatar, or banner cosmetic.';
        const odds = document.createElement('ul');
        odds.className = 'odds-list';
        box.drops.forEach((drop) => {
            const item = ['cursedCrate', 'corruptedCrate'].includes(drop.type) ? drop : catalog[drop.type].find((entry) => entry.id === drop.id);
            const row = document.createElement('li');
            row.innerHTML = `<span><b>${item.label}</b><small>${drop.rarity}</small></span><strong>${drop.odds}%</strong>`;
            odds.appendChild(row);
        });
        const button = document.createElement('button');
        button.className = 'open-button';
        button.type = 'button';
        button.dataset.cost = box.cost;
        button.textContent = `Open for ${box.cost} credits`;
        button.addEventListener('click', () => purchaseBox(box, button));
        card.append(title, description, odds, button);
        return card;
    }));
}

function renderProfile(nextProfile) {
    profile = nextProfile;
    creditCount.textContent = profile.credits.toLocaleString();
    document.querySelectorAll('.open-button').forEach((button) => {
        button.disabled = profile.credits < Number(button.dataset.cost);
    });
}

async function purchaseBox(box, button) {
    button.disabled = true;
    storeStatus.className = 'status';
    storeStatus.textContent = 'Opening...';
    try {
        const response = await fetch('/api/store/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boxId: box.id })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not open box.');
        renderProfile(result.profile);
        dropPreview.className = `drop-preview ${result.drop.className}`;
        applyDropVisual(dropPreview, result.drop);
        dropPreview.textContent = result.drop.label.charAt(0);
        if (result.drop.items) renderGlitchText(dropName, result.drop.label);
        else dropName.textContent = result.drop.label;
        dropType.textContent = result.drop.items
            ? `${result.drop.rarity} bundle unlocked: ${result.drop.items.map((item) => item.label).join(', ')}`
            : `${result.drop.rarity} ${formatType(result.drop.type)} cosmetic`;
        dropPanel.hidden = false;
        storeStatus.classList.add('success');
        storeStatus.textContent = `${box.label} opened.`;
    } catch (error) {
        storeStatus.classList.add('error');
        storeStatus.textContent = error.message;
        button.disabled = false;
    }
}

async function loadStore() {
    const response = await fetch('/api/store', { cache: 'no-store' });
    if (response.status === 401) return window.location.replace('auth.html');
    if (!response.ok) throw new Error('Could not load the store.');
    const result = await response.json();
    catalog = result.cosmetics;
    renderBoxes(result.boxes);
    renderProfile(result.profile);
}

loadStore().catch((error) => {
    storeStatus.classList.add('error');
    storeStatus.textContent = error.message;
});
