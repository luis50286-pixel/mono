let currentUser = "";

// Referencia al nodo de mensajes en Firebase Realtime Database
const messagesRef = database.ref('messages');

// 1. Unirse al chat
function login() {
    const userIn = document.getElementById('username').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (userIn !== "") {
        currentUser = userIn;
        
        // Ocultar pantalla de login y mostrar la interfaz de chat
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('user-display').innerText = `Usuario: ${currentUser}`;

        // Empezar a escuchar mensajes de Firebase
        listenForMessages();
    } else {
        errorMsg.style.display = 'block';
    }
}

function handleLoginKeyPress(event) {
    if (event.key === 'Enter') {
        login();
    }
}

// 2. Enviar mensaje a Firebase
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText !== "") {
        // En lugar de dibujarlo localmente, lo enviamos a Firebase
        messagesRef.push({
            user: currentUser,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            input.value = ""; // Limpia el campo solo si se envió con éxito
        }).catch((error) => {
            console.error("Error al enviar el mensaje:", error);
        });
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 3. Recibir mensajes de Firebase en tiempo real
function listenForMessages() {
    const messagesContainer = document.getElementById('chat-messages');

    // 'child_added' escucha tanto los mensajes antiguos como los nuevos que van llegando
    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        
        const messageDiv = document.createElement('div');
        
        // Determina si el mensaje es propio (sent) o de alguien más (received)
        const isSentByMe = data.user === currentUser;
        messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');
        
        messageDiv.innerHTML = `
            <span class="user-name">${escapeHTML(data.user)}</span>
            <div class="text">${escapeHTML(data.text)}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// 4. Limpia caracteres especiales (Seguridad)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
