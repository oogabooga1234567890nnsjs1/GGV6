const messagesElement = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message');
const sendButton = document.querySelector('#send-button');
const connection = document.querySelector('#connection');
const status = document.querySelector('#status');
let lastMessageId = 0;
let loading = false;

function addMessages(messages) {
    messages.forEach((message) => {
        const item = document.createElement('article');
        item.className = 'message';
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        meta.textContent = `${message.username} • ${new Date(message.createdAt).toLocaleString()}`;
        const body = document.createElement('p');
        body.textContent = message.text;
        body.style.color = message.color || '#edf9ff';
        if (message.chatColor === 'galaxy') {
            body.classList.add('chat-galaxy');
            body.dataset.chatText = message.text;
        }
        item.append(meta, body);
        messagesElement.appendChild(item);
        lastMessageId = Math.max(lastMessageId, message.id);
    });
    if (messages.length) messagesElement.scrollTop = messagesElement.scrollHeight;
}

async function loadMessages() {
    if (loading) return;
    loading = true;
    try {
        const response = await fetch(`/api/chat?after=${lastMessageId}`, { cache: 'no-store' });
        if (response.status === 401) return window.location.replace('auth.html');
        if (response.status === 403) return window.location.replace('index.html');
        if (!response.ok) throw new Error('Chat unavailable');
        const result = await response.json();
        if (lastMessageId === 0) messagesElement.replaceChildren();
        addMessages(result.messages);
        connection.textContent = 'Connected';
        connection.className = 'connection online';
    } catch {
        connection.textContent = 'Connection lost. Retrying...';
        connection.className = 'connection offline';
    } finally {
        loading = false;
    }
}

messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    sendButton.disabled = true;
    status.textContent = '';
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not send message.');
        messageInput.value = '';
        addMessages([result.message]);
    } catch (error) {
        status.textContent = error.message;
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
});

loadMessages();
setInterval(loadMessages, 2000);
