const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos
app.use(express.static('public'));

// Almacenar usuarios conectados
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('Nuevo cliente conectado');
    
    // ID único para cada cliente
    const clientId = Date.now().toString();
    let username = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    username = data.username;
                    clients.set(clientId, { ws, username });
                    
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
                    // Difundir mensaje a todos
                    broadcast({
                        type: 'message',
                        username: username,
                        message: data.message,
                        timestamp: new Date().toISOString()
                    });
                    break;
                    
                case 'typing':
                    // Notificar que el usuario está escribiendo
                    broadcast({
                        type: 'typing',
                        username: username,
                        isTyping: data.isTyping
                    }, clientId);
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });
    
    ws.on('close', () => {
        if (username) {
            clients.delete(clientId);
            broadcast({
                type: 'system',
                message: `${username} ha salido del chat`,
                timestamp: new Date().toISOString()
            });
            broadcastUserList();
        }
        console.log('Cliente desconectado');
    });
    
    ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
    });
});

// Función para difundir mensajes a todos los clientes
function broadcast(data, excludeClientId = null) {
    const message = JSON.stringify(data);
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
        }
    });
}

// Función para enviar lista de usuarios
function broadcastUserList() {
    const usernames = Array.from(clients.values()).map(client => client.username);
    broadcast({
        type: 'userList',
        users: usernames
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
