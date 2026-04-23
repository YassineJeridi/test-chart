// ============================================================
//  CONFIGURATION — Your Telegram bot credentials
// ============================================================
const BOT_TOKEN = '8793653888:AAGx1Uz6KpcSR9ANTxQ5sywonfPWWVNrEdk';
const CHAT_ID   = '7127263879';
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;
const POLL_INTERVAL = 3000; // Check for new messages every 3 seconds

// ============================================================
//  STATE
// ============================================================
let myId        = '';
let friendId    = '';
let pollTimer   = null;
let lastUpdateId = 0; // Tracks the last processed Telegram message

// ============================================================
//  DOM ELEMENTS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    const els = {
        myIdInput:      document.getElementById('my-id-input'),
        friendIdInput:  document.getElementById('friend-id-input'),
        startBtn:       document.getElementById('start-btn'),
        setupScreen:    document.getElementById('setup-screen'),
        chatScreen:     document.getElementById('chat-screen'),
        chatTitle:      document.getElementById('chat-title'),
        messagesContainer: document.getElementById('messages-container'),
        messageInput:   document.getElementById('message-input'),
        sendBtn:        document.getElementById('send-btn'),
        disconnectBtn:  document.getElementById('disconnect-btn'),
        statusDot:      document.getElementById('status-dot')
    };

    // --------------------------------------------------------
    //  START CHAT
    // --------------------------------------------------------
    els.startBtn.onclick = () => {
        myId     = els.myIdInput.value.trim().toLowerCase();
        friendId = els.friendIdInput.value.trim().toLowerCase();

        if (!myId)     return alert('Please enter your ID');
        if (!friendId) return alert('Please enter your friend\'s ID');

        // Switch screens
        els.setupScreen.style.display = 'none';
        els.chatScreen.style.display  = 'flex';
        els.chatTitle.innerText = `Chatting with: ${friendId}`;
        els.statusDot.classList.add('status-ready');

        addMessage('Chat started. Waiting for messages...', 'msg-system');

        // Start polling for incoming messages
        startPolling(els);
    };

    // --------------------------------------------------------
    //  SEND MESSAGE
    // --------------------------------------------------------
    function sendMessage() {
        const text = els.messageInput.value.trim();
        if (!text) return;

        // Format: FROM:myId|TO:friendId|MSG:text
        const payload = `FROM:${myId}|TO:${friendId}|MSG:${text}`;

        fetch(`${API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: payload })
        })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                addMessage(text, 'msg-you');
                els.messageInput.value = '';
            } else {
                alert('Failed to send message. Check your bot token.');
            }
        })
        .catch(() => alert('Network error. Are you connected to the internet?'));
    }

    els.sendBtn.onclick = sendMessage;
    els.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // --------------------------------------------------------
    //  DISCONNECT
    // --------------------------------------------------------
    els.disconnectBtn.onclick = () => {
        clearInterval(pollTimer);
        els.chatScreen.style.display  = 'none';
        els.setupScreen.style.display = 'flex';
        els.messagesContainer.innerHTML = '';
        els.statusDot.classList.remove('status-ready');
        lastUpdateId = 0;
    };

    // --------------------------------------------------------
    //  POLLING — Check Telegram every 3 seconds
    // --------------------------------------------------------
    function startPolling(els) {
        pollTimer = setInterval(() => {
            fetchMessages(els);
        }, POLL_INTERVAL);
    }

    function fetchMessages(els) {
        // Only fetch updates after the last one we already processed
        const url = lastUpdateId > 0
            ? `${API}/getUpdates?offset=${lastUpdateId + 1}`
            : `${API}/getUpdates`;

        fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.ok || data.result.length === 0) return;

            data.result.forEach(update => {
                // Always advance the offset so we don't re-read old messages
                if (update.update_id > lastUpdateId) {
                    lastUpdateId = update.update_id;
                }

                const text = update.message?.text || '';

                // Parse the message format: FROM:xxx|TO:yyy|MSG:zzz
                if (!text.startsWith('FROM:')) return;

                const parts = text.split('|');
                const from  = parts[0]?.replace('FROM:', '').trim();
                const to    = parts[1]?.replace('TO:', '').trim();
                const msg   = parts[2]?.replace('MSG:', '').trim();

                // Only show messages that are addressed TO me and FROM my friend
                if (to === myId && from === friendId) {
                    addMessage(msg, 'msg-friend');
                }
            });
        })
        .catch(err => console.error('Polling error:', err));
    }

    // --------------------------------------------------------
    //  UI HELPER
    // --------------------------------------------------------
    function addMessage(text, typeClass) {
        const div = document.createElement('div');
        div.className = `message ${typeClass}`;
        div.innerText = text;
        els.messagesContainer.appendChild(div);
        els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    }

});