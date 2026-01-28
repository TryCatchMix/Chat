let ws = null;
let username = '';
let typingTimeout = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 1000;
let isIntentionalDisconnect = false;

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
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('Conectado al servidor');
            reconnectAttempts = 0;
            
            // Enviar nombre de usuario al servidor
            ws.send(JSON.stringify({
                type: 'join',
                username: username
            }));
            
            // Mostrar mensaje de reconexión si aplica
            if (reconnectAttempts > 0) {
                displaySystemMessage('Reconectado al servidor');
            }
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (error) {
                console.error('Error parseando mensaje:', error);
            }
        };
        
        ws.onclose = (event) => {
            console.log('Desconectado del servidor', event.code, event.reason);
            
            if (!isIntentionalDisconnect) {
                // Intentar reconectar
                attemptReconnect();
            } else {
                showLoginScreen();
            }
        };
        
        ws.onerror = (error) => {
            console.error('Error en WebSocket:', error);
        };
    } catch (error) {
        console.error('Error creando WebSocket:', error);
        displaySystemMessage('Error conectando al servidor');
        attemptReconnect();
    }
}

// Intentar reconexión automática
function attemptReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Backoff exponencial
        
        displaySystemMessage(`Reconectando en ${delay / 1000} segundos... (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
            console.log(`Intento de reconexión ${reconnectAttempts}/${maxReconnectAttempts}`);
            connect();
        }, delay);
    } else {
        displaySystemMessage('No se pudo conectar al servidor. Por favor, recarga la página.');
        enableReconnectButton();
    }
}

// Habilitar botón de reconexión manual
function enableReconnectButton() {
    const reconnectBtn = document.createElement('button');
    reconnectBtn.textContent = 'Reconectar';
    reconnectBtn.style.cssText = 'margin: 10px; padding: 10px 20px; cursor: pointer;';
    reconnectBtn.onclick = () => {
        reconnectBtn.remove();
        reconnectAttempts = 0;
        connect();
    };
    messagesContainer.appendChild(reconnectBtn);
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
            
        case 'error':
            displaySystemMessage(`Error: ${data.message}`);
            // Si es error de nombre duplicado, volver a login
            if (data.message.includes('ya está en uso')) {
                setTimeout(() => showLoginScreen(), 2000);
            }
            break;
            
        case 'joined':
            console.log(`Unido al chat como ${data.username}`);
            break;
            
        default:
            console.log('Tipo de mensaje desconocido:', data.type);
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
            <div class="message-username">${escapeHtml(user)}</div>
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Mostrar mensaje del sistema
function displaySystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll suave al final
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Actualizar lista de usuarios
function updateUserList(users) {
    userList.innerHTML = '';
    
    if (users.length === 0) {
        userList.innerHTML = '<div style="color: #999; font-size: 12px;">Sin usuarios</div>';
        return;
    }
    
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
    
    if (!message) {
        return;
    }
    
    if (message.length > 1000) {
        alert('El mensaje es demasiado largo (máximo 1000 caracteres)');
        return;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            message: message
        }));
        
        // Mostrar mensaje propio
        displayMessage(username, message, new Date().toISOString(), true);
        
        messageInput.value = '';
        
        // Notificar que dejó de escribir
        sendTypingStatus(false);
    } else {
        displaySystemMessage('No estás conectado al servidor');
    }
}

// Enviar estado de escritura
function sendTypingStatus(isTyping) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify({
                type: 'typing',
                isTyping: isTyping
            }));
        } catch (error) {
            console.error('Error enviando estado de escritura:', error);
        }
    }
}

// Manejar evento de escritura
function handleTyping() {
    sendTypingStatus(true);
    
    // Limpiar timeout anterior
    clearTimeout(typingTimeout);
    
    // Después de 2 segundos sin escribir, notificar que dejó de escribir
    typingTimeout = setTimeout(() => {
        sendTypingStatus(false);
    }, 2000);
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
    usernameInput.value = '';
    username = '';
    isIntentionalDisconnect = true;
    
    if (ws) {
        ws.close();
        ws = null;
    }
}

// Mostrar pantalla de chat
function showChatScreen() {
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    messageInput.focus();
}

// Validar nombre de usuario
function validateUsername(name) {
    const trimmed = name.trim();
    
    if (trimmed.length === 0) {
        alert('Por favor ingresa un nombre de usuario');
        return false;
    }
    
    if (trimmed.length > 20) {
        alert('El nombre de usuario debe tener máximo 20 caracteres');
        return false;
    }
    
    return true;
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    const inputUsername = usernameInput.value.trim();
    
    if (!validateUsername(inputUsername)) {
        return;
    }
    
    username = inputUsername;
    isIntentionalDisconnect = false;
    reconnectAttempts = 0;
    showChatScreen();
    connect();
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener('input', handleTyping);

leaveBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres salir del chat?')) {
        isIntentionalDisconnect = true;
        if (ws) {
            ws.close();
        }
        showLoginScreen();
    }
});

// Detectar cuando el usuario cierra la pestaña
window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});

// Detectar cuando la pestaña pierde/gana foco
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pestaña oculta
        sendTypingStatus(false);
    }
});

// Enfocar en el input de username al cargar
usernameInput.focus();
