// ============================================================
//  CONFIGURATION
// ============================================================
const BOT_TOKEN = '8793653888:AAGx1Uz6KpcSR9ANTxQ5sywonfPWWVNrEdk';
const CHAT_ID   = '7127263879';
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;
const POLL_INTERVAL = 3000;

// ============================================================
//  STATE
// ============================================================
let myId         = '';
let friendId     = '';
let pollTimer    = null;
let lastUpdateId = 0;

// ============================================================
//  DOM
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    const els = {
        myIdInput:          document.getElementById('my-id-input'),
        friendIdInput:      document.getElementById('friend-id-input'),
        startBtn:           document.getElementById('start-btn'),
        setupScreen:        document.getElementById('setup-screen'),
        chatScreen:         document.getElementById('chat-screen'),
        chatTitle:          document.getElementById('chat-title'),
        messagesContainer:  document.getElementById('messages-container'),
        messageInput:       document.getElementById('message-input'),
        sendBtn:            document.getElementById('send-btn'),
        disconnectBtn:      document.getElementById('disconnect-btn'),
        statusDot:          document.getElementById('status-dot')
    };

    // --------------------------------------------------------
    //  START CHAT — First sync offset, THEN start polling
    // --------------------------------------------------------
    els.startBtn.onclick = () => {
        myId     = els.myIdInput.value.trim().toLowerCase();
        friendId = els.friendIdInput.value.trim().toLowerCase();

        if (!myId)     return alert('Please enter your ID');
        if (!friendId) return alert('Please enter your friend\'s ID');

        els.startBtn.innerText    = 'Connecting...';
        els.startBtn.disabled     = true;

        // FIX: Get the latest update ID FIRST before opening the chat
        // This ensures we only receive NEW messages, not old ones
        fetch(`${API}/getUpdates`)
        .then(res => res.json())
        .then(data => {
            if (data.ok && data.result.length > 0) {
                // Set lastUpdateId to the most recent message so we skip all old ones
                const updates = data.result;
                lastUpdateId = updates[updates.length - 1].update_id;
            }

            // Now safe to open the chat
            els.setupScreen.style.display = 'none';
            els.chatScreen.style.display  = 'flex';
            els.chatTitle.innerText       = `Chatting with: ${friendId}`;
            els.statusDot.classList.add('status-ready');
            els.startBtn.innerText        = 'Start Chat';
            els.startBtn.disabled         = false;

            addMessage('Chat started. Waiting for messages...', 'msg-system');
            startPolling(els);
        })
        .catch(() => {
            alert('Could not connect to Telegram. Check your internet.');
            els.startBtn.innerText = 'Start Chat';
            els.startBtn.disabled  = false;
        });
    };

    // --------------------------------------------------------
    //  SEND MESSAGE
    // --------------------------------------------------------
    function sendMessage() {
        const text = els.messageInput.value.trim();
        if (!text) return;

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
        els.chatScreen.style.display    = 'none';
        els.setupScreen.style.display   = 'flex';
        els.messagesContainer.innerHTML = '';
        els.statusDot.classList.remove('status-ready');
        lastUpdateId = 0;
    };

    // --------------------------------------------------------
    //  POLLING
    // --------------------------------------------------------
    function startPolling(els) {
        pollTimer = setInterval(() => fetchMessages(els), POLL_INTERVAL);
    }

    function fetchMessages(els) {
        fetch(`${API}/getUpdates?offset=${lastUpdateId + 1}`)
        .then(res => res.json())
        .then(data => {
            if (!data.ok || data.result.length === 0) return;

            data.result.forEach(update => {
                if (update.update_id > lastUpdateId) {
                    lastUpdateId = update.update_id;
                }

                const text = update.message?.text || '';
                if (!text.startsWith('FROM:')) return;

                const parts = text.split('|');
                const from  = parts[0]?.replace('FROM:', '').trim();
                const to    = parts[1]?.replace('TO:', '').trim();
                const msg   = parts[2]?.replace('MSG:', '').trim();

                // Only show messages addressed TO me FROM my friend
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