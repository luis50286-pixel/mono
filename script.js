let currentUser = "";

// Referencia a la colección de mensajes en Firebase Realtime Database
const messagesRef = database.ref('messages');

// 1. Función para unirse al chat
function login() {
    const userIn = document.getElementById('username').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (userIn !== "") {
        currentUser = userIn;
        
        // Ocultar Login y mostrar Chat
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('user-display').innerText = `Usuario: ${currentUser}`;

        // Iniciar la escucha de mensajes en tiempo real una vez autenticado
        listenForMessages();
    } else {
        errorMsg.style.display = 'block';
    }
}

// Entrar al presionar 'Enter' en el campo de usuario
function handleLoginKeyPress(event) {
    if (event.key === 'Enter') {
        login();
    }
}

// 2. Función para ENVIAR mensajes a Firebase
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText !== "") {
        // Guardar mensaje en Firebase Realtime Database
        messagesRef.push({
            user: currentUser,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            // Limpiar el campo de entrada tras enviar con éxito
            input.value = "";
        }).catch((error) => {
            console.error("Error al enviar mensaje:", error);
        });
    }
}

// Enviar mensaje con la tecla Enter
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 3. Función para ESCUCHAR mensajes en tiempo real desde Firebase
function listenForMessages() {
    const messagesContainer = document.getElementById('chat-messages');

    // 'child_added' se dispara por cada mensaje existente y por cada nuevo mensaje en tiempo real
    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        
        // Crear elemento contenedor del mensaje
        const messageDiv = document.createElement('div');
        
        // Verificar si el mensaje fue enviado por el usuario actual o recibido
        const isSentByMe = data.user === currentUser;
        messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');
        
        // Estructura interna del mensaje
        messageDiv.innerHTML = `
            <span class="user-name">${escapeHTML(data.user)}</span>
            <div class="text">${escapeHTML(data.text)}</div>
        `;
        
        // Agregar al chat
        messagesContainer.appendChild(messageDiv);

        // Hacer scroll automáticamente hacia abajo
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// 4. Sanitizador contra ataques XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
