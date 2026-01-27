let ws = null;
let username = '';
let typingTimeout = null;

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const userList = document.getElementById('user-list');
const typingIndicator = document.getElementById('typing-indicator');

// Conectar al servidor WebSocket
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Conectado al servidor');
        // Enviar nombre de usuario al servidor
        ws.send(JSON.stringify({
            type: 'join',
            username: username
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onclose = () => {
        console.log('Desconectado del servidor');
        showLoginScreen();
    };
    
    ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        alert('Error de conexión. Por favor, intenta nuevamente.');
    };
}

// Manejar mensajes recibidos
function handleMessage(data) {
    switch(data.type) {
        case 'message':
            displayMessage(data.username, data.message, data.timestamp, false);
            break;
            
        case 'system':
            displaySystemMessage(data.message);
            break;
            
        case 'userList':
            updateUserList(data.users);
            break;
            
        case 'typing':
            handleTypingIndicator(data.username, data.isTyping);
            break;
    }
}

// Mostrar mensaje en el chat
function displayMessage(user, message, timestamp, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
    
    const time = new Date(timestamp).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-username">${user}</div>
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Mostrar mensaje del sistema
function displaySystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Actualizar lista de usuarios
function updateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `🟢 ${escapeHtml(user)}`;
        userList.appendChild(userDiv);
    });
}

// Manejar indicador de escritura
let currentlyTyping = new Set();

function handleTypingIndicator(user, isTyping) {
    if (isTyping) {
        currentlyTyping.add(user);
    } else {
        currentlyTyping.delete(user);
    }
    
    if (currentlyTyping.size > 0) {
        const users = Array.from(currentlyTyping);
        let text = '';
        if (users.length === 1) {
            text = `${users[0]} está escribiendo`;
        } else if (users.length === 2) {
            text = `${users[0]} y ${users[1]} están escribiendo`;
        } else {
            text = `${users.length} personas están escribiendo`;
        }
        
        typingIndicator.querySelector('.typing-text').textContent = text;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// Enviar mensaje
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (message && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            message: message
        }));
        
        // Mostrar mensaje propio
        displayMessage(username, message, new Date().toISOString(), true);
        
        messageInput.value = '';
        
        // Notificar que dejó de escribir
        ws.send(JSON.stringify({
            type: 'typing',
            isTyping: false
        }));
    }
}

// Manejar evento de escritura
function handleTyping() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'typing',
            isTyping: true
        }));
        
        // Limpiar timeout anterior
        clearTimeout(typingTimeout);
        
        // Después de 2 segundos sin escribir, notificar que dejó de escribir
        typingTimeout = setTimeout(() => {
            ws.send(JSON.stringify({
                type: 'typing',
                isTyping: false
            }));
        }, 2000);
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar pantalla de login
function showLoginScreen() {
    loginContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
    messagesContainer.innerHTML = '';
    userList.innerHTML = '';
}

// Mostrar pantalla de chat
function showChatScreen() {
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    messageInput.focus();
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    
    if (username) {
        showChatScreen();
        connect();
    } else {
        alert('Por favor ingresa un nombre de usuario');
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', handleTyping);

leaveBtn.addEventListener('click', () => {
    if (ws) {
        ws.close();
    }
    showLoginScreen();
});

// Enfocar en el input de username al cargar
usernameInput.focus();
