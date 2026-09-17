const form = document.querySelector('#auth-form');
const tabs = document.querySelectorAll('.tab');
const submitButton = document.querySelector('#submit-button');
const status = document.querySelector('#status');
let mode = 'login';

tabs.forEach((tab) => tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    tabs.forEach((item) => item.classList.toggle('active', item === tab));
    submitButton.textContent = mode === 'login' ? 'Log in' : 'Create account';
    status.textContent = '';
}));

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    status.className = 'status';
    status.textContent = 'Connecting...';
    const formData = new FormData(form);

    try {
        const response = await fetch(`/api/${mode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Request failed.');
        status.classList.add('success');
        status.textContent = mode === 'login' ? `Welcome back, ${result.username}.` : result.message;
        if (mode === 'login') setTimeout(() => { window.location.href = 'index.html'; }, 500);
        else form.reset();
    } catch (error) {
        status.classList.add('error');
        status.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});
