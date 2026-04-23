// Ensure everything runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements
    const screens = { setup: document.getElementById('setup-screen'), chat: document.getElementById('chat-screen') };
    const els = {
        myId: document.getElementById('my-id'), friendId: document.getElementById('friend-id'),
        connectBtn: document.getElementById('connect-btn'), sendBtn: document.getElementById('send-btn'),
        msgInput: document.getElementById('message-input'), msgContainer: document.getElementById('messages-container'),
        statusDot: document.getElementById('status-dot')
    };

    // Initialize PeerJS with Google STUN servers for better connectivity
    const peer = new Peer({
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    }); 
    
    let chatConnection;

    // 1. PeerJS generated our ID
    peer.on('open', (id) => {
        els.myId.innerText = id;
        els.connectBtn.disabled = false;
        els.statusDot.classList.add('status-ready');
    });

    // 2. Global Error handling
    peer.on('error', (err) => {
        alert(`Network Error: ${err.type}. Check your connection.`);
        resetConnectButton();
        console.error(err);
    });

    // 3. Listen for incoming connections
    peer.on('connection', (conn) => {
        chatConnection = conn;
        chatConnection.on('open', () => openChatInterface());
    });

    // 4. Initiate connection to friend
    els.connectBtn.onclick = () => {
        const friendId = els.friendId.value.trim();
        if (!friendId) return alert("Please enter an ID");
        
        els.connectBtn.innerText = "Connecting...";
        els.connectBtn.disabled = true;
        
        // Connect reliably
        chatConnection = peer.connect(friendId, { reliable: true });
        
        // Timeout handling for strict firewalls
        const connectionTimeout = setTimeout(() => {
            if (screens.chat.style.display !== 'flex') {
                alert("Connection timed out! A firewall or VPN is blocking the P2P connection.");
                resetConnectButton();
            }
        }, 10000);
        
        chatConnection.on('open', () => {
            clearTimeout(connectionTimeout); // Cancel timeout
            openChatInterface();
        });

        chatConnection.on('error', (err) => {
            alert("Connection failed: " + err);
            resetConnectButton();
        });
    };

    function resetConnectButton() {
        els.connectBtn.innerText = "Connect";
        els.connectBtn.disabled = false;
    }

    // 5. Open chat UI and setup message listeners
    function openChatInterface() {
        screens.setup.style.display = 'none';
        screens.chat.style.display = 'flex';
        addMessage("Connected to peer securely.", 'msg-system');

        chatConnection.on('data', (data) => {
            addMessage(data, 'msg-friend');
        });
        
        chatConnection.on('close', () => {
            addMessage("Friend disconnected.", 'msg-system');
            els.msgInput.disabled = true;
            els.sendBtn.disabled = true;
        });
    }

    // 6. Send message logic
    function sendMessage() {
        const text = els.msgInput.value.trim();
        if (!text) return;

        chatConnection.send(text);
        addMessage(text, 'msg-you');
        els.msgInput.value = '';
    }

    els.sendBtn.onclick = sendMessage;
    els.msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Event listener for copying ID
    els.myId.addEventListener('click', () => {
        const idText = els.myId.innerText;
        if (idText === "Generating...") return;
        navigator.clipboard.writeText(idText).then(() => {
            alert("ID Copied to clipboard!");
        });
    });

    // UI Helper: Render message bubble
    function addMessage(text, typeClass) {
        const div = document.createElement('div');
        div.className = `message ${typeClass}`;
        div.innerText = text;
        els.msgContainer.appendChild(div);
        els.msgContainer.scrollTop = els.msgContainer.scrollHeight; // Auto-scroll
    }
});