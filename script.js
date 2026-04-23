document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements
    const screens = { setup: document.getElementById('setup-screen'), chat: document.getElementById('chat-screen') };
    const els = {
        customIdInput: document.getElementById('custom-id-input'), setIdBtn: document.getElementById('set-id-btn'),
        step1: document.getElementById('step-1'), step2: document.getElementById('step-2'), displayMyId: document.getElementById('display-my-id'),
        friendId: document.getElementById('friend-id'), connectBtn: document.getElementById('connect-btn'), 
        sendBtn: document.getElementById('send-btn'), msgInput: document.getElementById('message-input'), 
        msgContainer: document.getElementById('messages-container'), statusDot: document.getElementById('status-dot')
    };

    let peer;
    let chatConnection;

    // 1. Set Custom ID & Initialize PeerJS
    els.setIdBtn.onclick = () => {
        const myCustomId = els.customIdInput.value.trim().toLowerCase();
        if (!myCustomId) return alert("Please enter an ID");

        els.setIdBtn.innerText = "Setting...";
        els.setIdBtn.disabled = true;

        // Initialize PeerJS with the CUSTOM ID
        peer = new Peer(myCustomId, {
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        }); 

        // Successfully registered custom ID
        peer.on('open', (id) => {
            els.step1.style.display = 'none';
            els.step2.style.display = 'block';
            els.displayMyId.innerText = id;
            els.connectBtn.disabled = false;
            els.statusDot.classList.add('status-ready');
        });

        // Error handling (e.g., ID already taken)
        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                alert("That ID is already taken by someone else right now. Choose another.");
            } else {
                alert(`Network Error: ${err.type}`);
            }
            els.setIdBtn.innerText = "Set";
            els.setIdBtn.disabled = false;
            resetConnectButton();
        });

        // Listen for incoming connections
        peer.on('connection', (conn) => {
            chatConnection = conn;
            chatConnection.on('open', () => openChatInterface());
        });
    };

    // 2. Initiate connection to friend
    els.connectBtn.onclick = () => {
        const friendId = els.friendId.value.trim().toLowerCase();
        if (!friendId) return alert("Please enter your friend's ID");
        
        els.connectBtn.innerText = "Connecting...";
        els.connectBtn.disabled = true;
        
        chatConnection = peer.connect(friendId, { reliable: true });
        
        const connectionTimeout = setTimeout(() => {
            if (screens.chat.style.display !== 'flex') {
                alert("Connection timed out! A firewall or VPN is blocking the P2P connection.");
                resetConnectButton();
            }
        }, 10000);
        
        chatConnection.on('open', () => {
            clearTimeout(connectionTimeout);
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

    // 3. Open chat UI and setup message listeners
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

    // 4. Send message logic
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

    // UI Helper: Render message bubble
    function addMessage(text, typeClass) {
        const div = document.createElement('div');
        div.className = `message ${typeClass}`;
        div.innerText = text;
        els.msgContainer.appendChild(div);
        els.msgContainer.scrollTop = els.msgContainer.scrollHeight;
    }
});