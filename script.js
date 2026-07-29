let currentUser = "";
let typingTimeout = null;

const VALID_USERS = {
    "admin1": "Amor/@",
    "admin2": "Amor/@"
};

const messagesRef = database.ref('messages');
const typingRef = database.ref('typing');

// 1. Iniciar Sesión
function login() {
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (VALID_USERS[userIn] && VALID_USERS[userIn] === passIn) {
        currentUser = userIn;
        
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('user-display').innerText = `Usuario: ${currentUser}`;

        errorMsg.style.display = 'none';
        document.getElementById('password').value = "";

        listenForMessages();
        listenForTyping();
    } else {
        errorMsg.style.display = 'block';
    }
}

// 2. Cerrar Sesión
function logout() {
    typingRef.child(currentUser).remove();
    currentUser = "";
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
    document.getElementById('chat-messages').innerHTML = '';
}

function handleLoginKeyPress(event) {
    if (event.key === 'Enter') login();
}

// 3. Enviar mensaje de texto
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText !== "") {
        messagesRef.push({
            user: currentUser,
            text: messageText,
            type: 'text',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            input.value = "";
            document.getElementById('emoji-picker').style.display = 'none';
            typingRef.child(currentUser).remove();
        });
    }
}

// 4. Adjuntar Fotos / Videos (Convertidos a Base64)
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Límite práctico de tamaño (~2MB para Realtime Database)
    if (file.size > 2 * 1024 * 1024) {
        alert("El archivo es muy grande. Elige una foto o video menor a 2MB.");
        return;
    }

    const reader = new FileReader();
    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : null);

    if (!fileType) {
        alert("Formato no soportado. Selecciona una imagen o video.");
        return;
    }

    reader.onload = function(e) {
        const base64Data = e.target.result;
        messagesRef.push({
            user: currentUser,
            mediaUrl: base64Data,
            type: fileType,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    };

    reader.readAsDataURL(file);
    event.target.value = ''; // Limpiar el input
}

// 5. Gestor de Emojis
function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex';
}

function addEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// 6. Indicador de "Escribiendo..."
function handleTyping() {
    if (!currentUser) return;

    typingRef.child(currentUser).set(true);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingRef.child(currentUser).remove();
    }, 2000);
}

function listenForTyping() {
    const indicator = document.getElementById('typing-indicator');
    
    typingRef.on('value', (snapshot) => {
        const usersTyping = snapshot.val() || {};
        const activeTypers = Object.keys(usersTyping).filter(user => user !== currentUser);

        if (activeTypers.length > 0) {
            indicator.innerText = `${activeTypers.join(', ')} está escribiendo...`;
        } else {
            indicator.innerText = '';
        }
    });
}

function handleKeyPress(event) {
    if (event.key === 'Enter') sendMessage();
}

// 7. Renderizado de Mensajes en Tiempo Real
function listenForMessages() {
    const messagesContainer = document.getElementById('chat-messages');

    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        
        const messageDiv = document.createElement('div');
        messageDiv.id = `msg-${snapshot.key}`;
        
        const isSentByMe = data.user === currentUser;
        messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');

        // Formatear Hora
        const timeFormatted = data.timestamp 
            ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '';

        // Definir Contenido (Texto / Foto / Video)
        let contentHTML = '';
        if (data.type === 'image') {
            contentHTML = `<img src="${data.mediaUrl}" class="media-preview" alt="Foto adjunta">`;
        } else if (data.type === 'video') {
            contentHTML = `<video src="${data.mediaUrl}" controls class="media-preview"></video>`;
        } else {
            contentHTML = `<div class="text">${escapeHTML(data.text)}</div>`;
        }

        messageDiv.innerHTML = `
            <span class="user-name">${escapeHTML(data.user)}</span>
            ${contentHTML}
            <span class="time-stamp">${timeFormatted}</span>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    messagesRef.on('child_removed', (snapshot) => {
        const msgDiv = document.getElementById(`msg-${snapshot.key}`);
        if (msgDiv) msgDiv.remove();
    });
}

// 8. Vaciar Chat
function clearChat() {
    if (confirm("¿Estás seguro de que deseas borrar todos los mensajes de la sala?")) {
        messagesRef.remove();
    }
}

// 9. Sanitizar HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
