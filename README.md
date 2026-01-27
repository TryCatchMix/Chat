# Chat en Tiempo Real con WebSockets

Una aplicación de chat en tiempo real construida con Node.js, Express y WebSockets.

## Características

✨ **Chat en tiempo real** - Mensajes instantáneos usando WebSockets
👥 **Múltiples usuarios** - Soporta múltiples usuarios simultáneos
📝 **Indicador de escritura** - Muestra cuando alguien está escribiendo
📋 **Lista de usuarios** - Visualiza quién está conectado
🎨 **Interfaz moderna** - Diseño limpio y responsivo
🔔 **Notificaciones del sistema** - Alertas cuando usuarios entran/salen

## Requisitos Previos

- Node.js (versión 14 o superior)
- npm (viene con Node.js)

## Instalación

1. Instala las dependencias:
```bash
npm install
```

## Uso

1. Inicia el servidor:
```bash
npm start
```

Para desarrollo con auto-reinicio:
```bash
npm run dev
```

2. Abre tu navegador y ve a:
```
http://localhost:3000
```

3. Ingresa tu nombre de usuario y comienza a chatear

4. Abre múltiples pestañas o ventanas para simular varios usuarios

## Estructura del Proyecto

```
chat-websocket-realtime/
├── server.js              # Servidor WebSocket con Express
├── package.json           # Dependencias del proyecto
├── public/
│   ├── index.html        # Interfaz del chat
│   ├── styles.css        # Estilos CSS
│   └── client.js         # Lógica del cliente WebSocket
└── README.md             # Este archivo
```

## Cómo Funciona

### Servidor (server.js)
- Crea un servidor HTTP con Express
- Configura un servidor WebSocket
- Maneja conexiones de clientes
- Difunde mensajes a todos los usuarios conectados
- Gestiona la lista de usuarios activos

### Cliente (client.js)
- Se conecta al servidor WebSocket
- Envía y recibe mensajes en tiempo real
- Muestra indicadores de escritura
- Actualiza la lista de usuarios conectados
- Maneja la interfaz de usuario

### Tipos de Mensajes

El servidor maneja estos tipos de mensajes:

1. **join** - Usuario se une al chat
2. **message** - Mensaje de chat
3. **typing** - Indicador de escritura
4. **system** - Notificaciones del sistema
5. **userList** - Actualización de usuarios conectados

## Personalización

### Cambiar el Puerto

Edita `server.js` o usa una variable de entorno:
```bash
PORT=8080 npm start
```

### Modificar Estilos

Edita `public/styles.css` para cambiar colores, fuentes, etc.

### Agregar Funcionalidades

Algunas ideas para extender el chat:
- Rooms o canales de chat
- Mensajes privados
- Compartir archivos
- Emojis y reacciones
- Historial de mensajes
- Autenticación de usuarios
- Encriptación de mensajes

## Tecnologías Utilizadas

- **Node.js** - Entorno de ejecución
- **Express** - Framework web
- **ws** - Biblioteca WebSocket
- **HTML5/CSS3** - Interfaz de usuario
- **JavaScript** - Lógica del cliente

## Solución de Problemas

### El servidor no inicia
- Verifica que Node.js esté instalado: `node --version`
- Asegúrate de haber ejecutado `npm install`
- Verifica que el puerto 3000 no esté en uso

### No se conecta al WebSocket
- Verifica la consola del navegador para errores
- Asegúrate de que el servidor esté corriendo
- Revisa las reglas del firewall

### Los mensajes no se envían
- Verifica la conexión a Internet
- Revisa la consola del navegador
- Asegúrate de que el WebSocket esté conectado

## Seguridad

Para producción, considera:
- Validación y sanitización de entrada
- Límites de tasa (rate limiting)
- Autenticación de usuarios
- Encriptación SSL/TLS (usar wss://)
- Protección contra XSS (ya implementada con escapeHtml)

## Licencia

MIT
