let currentUser = "";

// Función para unirse al chat con cualquier nombre
function login() {
    const userIn = document.getElementById('username').value.trim();
    const errorMsg = document.getElementById('error-msg');

    // Validar que no deje el nombre en blanco
    if (userIn !== "") {
        currentUser = userIn;
        
        // Ocultar Login y mostrar Chat
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('user-display').innerText = `Usuario: ${currentUser}`;
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

// Función para enviar mensajes
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText !== "") {
        const messagesContainer = document.getElementById('chat-messages');

        // Crear elemento de mensaje
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'sent');
        
        messageDiv.innerHTML = `<span class="user-name">${escapeHTML(currentUser)}</span>${escapeHTML(messageText)}`;
        
        messagesContainer.appendChild(messageDiv);

        // Limpiar el campo de entrada
        input.value = "";

        // Hacer scroll automáticamente al final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Enviar mensaje con la tecla Enter
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Limpia caracteres especiales para evitar inyección de código (XSS)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}