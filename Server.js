const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Almacenar usuarios conectados con mejor estructura
const clients = new Map();

// Generar ID único más robusto
function generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validar y sanitizar nombre de usuario
function sanitizeUsername(username) {
    if (!username || typeof username !== 'string') {
        return null;
    }
    // Eliminar espacios al inicio y final, limitar longitud
    const sanitized = username.trim().substring(0, 20);
    // Validar que no esté vacío después de sanitizar
    return sanitized.length > 0 ? sanitized : null;
}

// Validar mensaje
function validateMessage(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }
    const trimmed = message.trim();
    // Limitar longitud del mensaje a 1000 caracteres
    return trimmed.length > 0 && trimmed.length <= 1000 ? trimmed : null;
}

wss.on('connection', (ws) => {
    console.log('Nuevo cliente conectado');
    
    // ID único para cada cliente
    const clientId = generateClientId();
    let username = null;
    let isAuthenticated = false;
    
    // Timeout para autenticación (30 segundos)
    const authTimeout = setTimeout(() => {
        if (!isAuthenticated) {
            console.log(`Cliente ${clientId} desconectado por timeout de autenticación`);
            ws.close(4001, 'Authentication timeout');
        }
    }, 30000);
    
    ws.on('message', (message) => {
        try {
            // Validar que el mensaje sea parseable
            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                console.error('Mensaje JSON inválido:', e);
                return;
            }
            
            // Validar tipo de mensaje
            if (!data.type || typeof data.type !== 'string') {
                console.error('Tipo de mensaje inválido');
                return;
            }
            
            switch(data.type) {
                case 'join':
                    // Validar y sanitizar username
                    const sanitizedUsername = sanitizeUsername(data.username);
                    
                    if (!sanitizedUsername) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Nombre de usuario inválido'
                        }));
                        return;
                    }
                    
                    // Verificar que el username no esté en uso
                    const usernameExists = Array.from(clients.values())
                        .some(client => client.username === sanitizedUsername);
                    
                    if (usernameExists) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Este nombre de usuario ya está en uso'
                        }));
                        return;
                    }
                    
                    username = sanitizedUsername;
                    isAuthenticated = true;
                    clearTimeout(authTimeout);
                    
                    clients.set(clientId, { ws, username });
                    
                    // Enviar confirmación al usuario
                    ws.send(JSON.stringify({
                        type: 'joined',
                        username: username
                    }));
                    
                    // Notificar a todos que un usuario se unió
                    broadcast({
                        type: 'system',
                        message: `${username} se ha unido al chat`,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Enviar lista de usuarios actualizada
                    broadcastUserList();
                    break;
                    
                case 'message':
                    // Verificar que el usuario esté autenticado
                    if (!isAuthenticated || !username) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Debes unirte al chat primero'
                        }));
                        return;
                    }
                    
                    // Validar mensaje
                    const validMessage = validateMessage(data.message);
                    
                    if (!validMessage) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Mensaje inválido o demasiado largo'
                        }));
                        return;
                    }
                    
                    // Difundir mensaje a todos
                    broadcast({
                        type: 'message',
                        username: username,
                        message: validMessage,
                        timestamp: new Date().toISOString()
                    });
                    break;
                    
                case 'typing':
                    // Verificar autenticación
                    if (!isAuthenticated || !username) {
                        return;
                    }
                    
                    // Validar isTyping es booleano
                    if (typeof data.isTyping !== 'boolean') {
                        return;
                    }
                    
                    // Notificar que el usuario está escribiendo
                    broadcast({
                        type: 'typing',
                        username: username,
                        isTyping: data.isTyping
                    }, clientId);
                    break;
                    
                default:
                    console.log(`Tipo de mensaje desconocido: ${data.type}`);
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error procesando tu mensaje'
            }));
        }
    });
    
    ws.on('close', (code, reason) => {
        clearTimeout(authTimeout);
        
        if (username) {
            clients.delete(clientId);
            broadcast({
                type: 'system',
                message: `${username} ha salido del chat`,
                timestamp: new Date().toISOString()
            });
            broadcastUserList();
        }
        console.log(`Cliente desconectado: ${username || clientId} (código: ${code})`);
    });
    
    ws.on('error', (error) => {
        console.error(`Error en WebSocket (${username || clientId}):`, error);
    });
    
    // Enviar ping periódico para mantener conexión activa
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);
    
    ws.on('pong', () => {
        // Cliente respondió al ping, la conexión está activa
    });
});

// Función para difundir mensajes a todos los clientes
function broadcast(data, excludeClientId = null) {
    const message = JSON.stringify(data);
    const deadClients = [];
    
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId) {
            if (client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.send(message);
                } catch (error) {
                    console.error(`Error enviando mensaje a ${client.username}:`, error);
                    deadClients.push(clientId);
                }
            } else if (client.ws.readyState === WebSocket.CLOSED) {
                deadClients.push(clientId);
            }
        }
    });
    
    // Limpiar clientes muertos
    deadClients.forEach(clientId => {
        const client = clients.get(clientId);
        if (client) {
            console.log(`Limpiando cliente muerto: ${client.username}`);
            clients.delete(clientId);
        }
    });
}

// Función para enviar lista de usuarios
function broadcastUserList() {
    const usernames = Array.from(clients.values())
        .map(client => client.username)
        .filter(username => username); // Filtrar valores nulos
    
    broadcast({
        type: 'userList',
        users: usernames
    });
}

// Manejo de cierre graceful
const gracefulShutdown = () => {
    console.log('Cerrando servidor...');
    
    // Notificar a todos los clientes
    broadcast({
        type: 'system',
        message: 'El servidor se está cerrando...',
        timestamp: new Date().toISOString()
    });
    
    // Cerrar todas las conexiones
    clients.forEach((client) => {
        client.ws.close(1000, 'Server shutting down');
    });
    
    // Cerrar servidor
    server.close(() => {
        console.log('Servidor cerrado correctamente');
        process.exit(0);
    });
    
    // Forzar cierre después de 10 segundos
    setTimeout(() => {
        console.error('Forzando cierre del servidor');
        process.exit(1);
    }, 10000);
};

// Capturar señales de terminación
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Presiona Ctrl+C para detener el servidor');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});
