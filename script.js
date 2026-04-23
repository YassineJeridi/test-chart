// ============================================================
//  CONFIGURATION
// ============================================================
const BOT_TOKEN     = '8793653888:AAGx1Uz6KpcSR9ANTxQ5sywonfPWWVNrEdk';
const CHAT_ID       = '7127263879';
const API           = `https://api.telegram.org/bot${BOT_TOKEN}`;
const POLL_INTERVAL = 1500; // 1.5 seconds — fast but not spammy

// ============================================================
//  STATE
// ============================================================
let myId         = '';
let friendId     = '';
let pollTimer    = null;
let lastUpdateId = 0;
let isPolling    = false;

// ============================================================
//  DOM
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    const els = {
        myIdInput:         document.getElementById('my-id-input'),
        friendIdInput:     document.getElementById('friend-id-input'),
        startBtn:          document.getElementById('start-btn'),
        setupScreen:       document.getElementById('setup-screen'),
        chatScreen:        document.getElementById('chat-screen'),
        chatTitle:         document.getElementById('chat-title'),
        messagesContainer: document.getElementById('messages-container'),
        messageInput:      document.getElementById('message-input'),
        sendBtn:           document.getElementById('send-btn'),
        disconnectBtn:     document.getElementById('disconnect-btn'),
        statusDot:         document.getElementById('status-dot')
    };

    // --------------------------------------------------------
    //  START — Sync offset first, THEN open chat
    // --------------------------------------------------------
    els.startBtn.onclick = () => {
        myId     = els.myIdInput.value.trim().toLowerCase();
        friendId = els.friendIdInput.value.trim().toLowerCase();

        if (!myId)     return alert('Please enter your ID');
        if (!friendId) return alert("Please enter your friend's ID");

        els.startBtn.innerText = 'Connecting...';
        els.startBtn.disabled  = true;

        // Step 1: Get the LATEST update ID so we skip all historical messages
        fetch(`${API}/getUpdates?limit=1&offset=-1`)
        .then(r => r.json())
        .then(data => {
            // FIX: Set lastUpdateId to the most recent message in Telegram
            if (data.ok && data.result.length > 0) {
                lastUpdateId = data.result[data.result.length - 1].update_id;
            }

            // Step 2: Now open the chat
            els.setupScreen.style.display = 'none';
            els.chatScreen.style.display  = 'flex';
            els.chatTitle.innerText       = `Chatting with: ${friendId}`;
            els.statusDot.classList.add('status-ready');
            els.startBtn.innerText        = 'Start Chat';
            els.startBtn.disabled         = false;

            addMessage('Chat ready. Say something!', 'msg-system');

            // Step 3: Start polling for new messages
            isPolling = true;
            schedulePoll(els);
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

        // Show the message immediately on sender's screen
        addMessage(text, 'msg-you');
        els.messageInput.value = '';

        const payload = `FROM:${myId}|TO:${friendId}|MSG:${text}`;

        fetch(`${API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: payload })
        })
        .then(r => r.json())
        .then(data => {
            if (!data.ok) alert('Failed to send. Check your bot token.');
        })
        .catch(() => alert('Network error. Are you connected?'));
    }

    els.sendBtn.onclick = sendMessage;
    els.messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // --------------------------------------------------------
    //  DISCONNECT
    // --------------------------------------------------------
    els.disconnectBtn.onclick = () => {
        isPolling = false;
        clearTimeout(pollTimer);
        els.chatScreen.style.display    = 'none';
        els.setupScreen.style.display   = 'flex';
        els.messagesContainer.innerHTML = '';
        els.statusDot.classList.remove('status-ready');
        lastUpdateId = 0;
    };

    // --------------------------------------------------------
    //  POLLING — Recursive setTimeout prevents overlapping calls
    // --------------------------------------------------------
    function schedulePoll(els) {
        if (!isPolling) return;
        pollTimer = setTimeout(() => {
            fetchMessages(els).finally(() => schedulePoll(els));
        }, POLL_INTERVAL);
    }

    function fetchMessages(els) {
        return fetch(`${API}/getUpdates?offset=${lastUpdateId + 1}&limit=10`)
        .then(r => r.json())
        .then(data => {
            if (!data.ok || data.result.length === 0) return;

            data.result.forEach(update => {
                // Always advance offset to avoid re-reading
                if (update.update_id > lastUpdateId) {
                    lastUpdateId = update.update_id;
                }

                const text = update.message?.text || '';
                if (!text.startsWith('FROM:')) return;

                const parts = text.split('|');
                const from  = parts[0]?.replace('FROM:', '').trim();
                const to    = parts[1]?.replace('TO:', '').trim();
                const msg   = parts[2]?.replace('MSG:', '').trim();

                // Show only messages TO me FROM my friend
                if (to === myId && from === friendId) {
                    addMessage(msg, 'msg-friend');
                }
            });
        })
        .catch(err => console.warn('Poll failed:', err));
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