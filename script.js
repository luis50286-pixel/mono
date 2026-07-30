let currentUser = "";
let typingTimeout = null;

const VALID_USERS = {
    "admin1": "Amor/@",
    "admin2": "Amor/@"
};

const messagesRef = database.ref('messages');
const typingRef = database.ref('typing');

// 1. Iniciar Sesión y solicitar permisos
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

        requestNotificationPermissions();

        listenForMessages();
        listenForTyping();
    } else {
        errorMsg.style.display = 'block';
    }
}

// 2. Solicitud de Permisos de Notificación
function requestNotificationPermissions() {
    if (window.AndroidBridge && typeof window.AndroidBridge.requestPermission === 'function') {
        window.AndroidBridge.requestPermission();
    } else if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

// 3. Disparar Notificaciones
function triggerNotification(title, body) {
    if (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function') {
        window.AndroidBridge.showNotification(title, body);
    } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png'
        });
    }
}

// 4. Cerrar Sesión
function logout() {
    if (currentUser) {
        typingRef.child(currentUser).remove();
    }
    currentUser = "";
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
    document.getElementById('chat-messages').innerHTML = '';
}

function handleLoginKeyPress(event) {
    if (event.key === 'Enter') login();
}

// 5. Enviar mensaje de texto
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText !== "") {
        const newMessageRef = messagesRef.push();
        
        newMessageRef.set({
            user: currentUser,
            text: messageText,
            type: 'text',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            readBy: {
                [currentUser]: true
            }
        }).then(() => {
            input.value = "";
            document.getElementById('emoji-picker').style.display = 'none';
            typingRef.child(currentUser).remove();
        });
    }
}

// 6. Subir Fotos / Videos mediante Firebase Storage
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Límite amplio para Firebase Storage (ej. 50 MB)
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`El archivo es muy pesado. Elige una foto o video menor a ${MAX_SIZE_MB}MB.`);
        return;
    }

    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : null);

    if (!fileType) {
        alert("Formato no soportado. Selecciona una imagen o video.");
        return;
    }

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = storage.ref(`chat_media/${fileName}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            // Progreso opcional de subida
        }, 
        (error) => {
            console.error("Error al subir el archivo:", error);
            alert("No se pudo subir la foto o video.");
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                messagesRef.push({
                    user: currentUser,
                    mediaUrl: downloadURL,
                    type: fileType,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    readBy: {
                        [currentUser]: true
                    }
                });
            });
        }
    );

    event.target.value = '';
}

// 7. Emojis
function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex';
}

function addEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// 8. Indicador "Escribiendo..."
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

// Generador de palomitas (✓ o ✓✓)
function renderTicksHTML(data) {
    const readBy = data.readBy || {};
    const readers = Object.keys(readBy).filter(u => u !== data.user);
    const isRead = readers.length > 0;

    return `
        <span class="status-ticks ${isRead ? 'read' : 'sent'}">
            ${isRead ? '✓✓' : '✓'}
        </span>
    `;
}

// 9. Renderizado y escucha de Mensajes
function listenForMessages() {
    const messagesContainer = document.getElementById('chat-messages');

    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        const msgKey = snapshot.key;
        const isSentByMe = data.user === currentUser;

        if (!isSentByMe && (!data.readBy || !data.readBy[currentUser])) {
            messagesRef.child(msgKey).child('readBy').child(currentUser).set(true);
        }

        if (!isSentByMe && document.hidden) {
            const bodyText = data.type === 'text' ? data.text : 'Te ha enviado un archivo multimedia';
            triggerNotification(`Mensaje de ${data.user}`, bodyText);
        }

        const messageDiv = document.createElement('div');
        messageDiv.id = `msg-${msgKey}`;
        messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');

        const timeFormatted = data.timestamp 
            ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '';

        let contentHTML = '';
        if (data.type === 'image') {
            contentHTML = `<img src="${data.mediaUrl}" class="media-preview" alt="Foto adjunta">`;
        } else if (data.type === 'video') {
            contentHTML = `<video src="${data.mediaUrl}" controls class="media-preview"></video>`;
        } else {
            contentHTML = `<div class="text">${escapeHTML(data.text)}</div>`;
        }

        const ticksHTML = isSentByMe ? renderTicksHTML(data) : '';

        messageDiv.innerHTML = `
            <span class="user-name">${escapeHTML(data.user)}</span>
            ${contentHTML}
            <div class="message-meta">
                <span class="time-stamp">${timeFormatted}</span>
                ${ticksHTML}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    messagesRef.on('child_changed', (snapshot) => {
        const data = snapshot.val();
        const msgDiv = document.getElementById(`msg-${snapshot.key}`);
        if (!msgDiv) return;

        const isSentByMe = data.user === currentUser;
        if (isSentByMe) {
            const ticksSpan = msgDiv.querySelector('.status-ticks');
            if (ticksSpan) {
                const readBy = data.readBy || {};
                const readers = Object.keys(readBy).filter(u => u !== data.user);
                if (readers.length > 0) {
                    ticksSpan.className = 'status-ticks read';
                    ticksSpan.innerText = '✓✓';
                }
            }
        }
    });

    messagesRef.on('child_removed', (snapshot) => {
        const msgDiv = document.getElementById(`msg-${snapshot.key}`);
        if (msgDiv) msgDiv.remove();
    });
}

// 10. Vaciar Chat
function clearChat() {
    if (confirm("¿Estás seguro de que deseas borrar todos los mensajes de la sala?")) {
        messagesRef.remove();
    }
}

// 11. Sanitizar HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
