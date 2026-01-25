let documentoEditando = null;

// Verificar autenticación
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        if (!data.authenticated || !data.user || data.user.rol !== 'admin') {
            window.location.href = '/login';
            return;
        }
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement) {
            usernameElement.textContent = data.user.nombre || data.user.username;
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        window.location.href = '/login';
    }
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}

// Tabs
function showTab(tabName, clickedElement) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab seleccionado
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Activar el botón que fue clickeado
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        // Si no se pasó el elemento, buscar el botón correspondiente
        const tabButton = document.querySelector(`[onclick*="showTab('${tabName}'"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
    }
    
    // Cargar datos si es necesario
    if (tabName === 'modelos') {
        cargarModelos();
    } else if (tabName === 'contactos') {
        cargarContactos();
    }
}

// Variables globales para el QR
let qrUrlGlobal = '';
let qrImageDataUrlGlobal = '';
let qrUrlSorteoGlobal = '';
let qrImageSorteoGlobal = '';

// Generar QR
async function generarQR() {
    try {
        const response = await fetch('/api/admin/generar-qr', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('qrAdminContainer');
            if (!container) {
                throw new Error('Contenedor QR no encontrado');
            }
            
            container.innerHTML = '';
            
            new QRCode(container, {
                text: data.url,
                width: 300,
                height: 300,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            qrUrlGlobal = data.url;
            qrImageDataUrlGlobal = data.qr || '';
            const qrUrlText = document.getElementById('qrUrlText');
            const qrUrl = document.getElementById('qrUrl');
            const shareButtons = document.getElementById('shareButtons');
            
            if (qrUrlText) qrUrlText.textContent = data.url;
            if (qrUrl) qrUrl.style.display = 'block';
            if (shareButtons) shareButtons.style.display = 'none';
            
            // Mostrar/ocultar botón de compartir nativo según disponibilidad
            const btnShareNative = document.getElementById('btnShareNative');
            if (btnShareNative) {
                if (navigator.share) {
                    btnShareNative.style.display = 'inline-block';
                } else {
                    btnShareNative.style.display = 'none';
                }
            }
            
            // El botón de compartir en redes siempre está visible
            const btnShareSocial = document.querySelector('.btn-share-social');
            if (btnShareSocial) {
                btnShareSocial.style.display = 'inline-block';
            }
        } else {
            throw new Error(data.message || 'Error generando QR');
        }
    } catch (error) {
        console.error('Error generando QR:', error);
        mostrarMensaje('Error generando QR: ' + error.message, 'error');
    }
}

function copiarQRUrl(event) {
    const qrUrlText = document.getElementById('qrUrlText');
    const url = qrUrlGlobal || (qrUrlText ? qrUrlText.textContent : '');
    
    if (!url) {
        mostrarMensaje('No hay URL para copiar', 'error');
        return;
    }
    
    // Intentar usar la API moderna de clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            const btn = event ? event.target : document.querySelector('.btn-copy');
            const originalText = btn.textContent;
            btn.textContent = '✅ ¡Copiado!';
            btn.style.background = 'var(--success-color)';
            btn.style.borderColor = 'var(--success-color)';
            
            // Mostrar mensaje de éxito
            mostrarMensaje('URL copiada al portapapeles', 'success');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.borderColor = '';
            }, 2000);
        }).catch((err) => {
            console.error('Error copiando:', err);
            // Fallback: usar método antiguo
            copiarQRUrlFallback(url, event);
        });
    } else {
        // Fallback para navegadores antiguos
        copiarQRUrlFallback(url, event);
    }
}

// Método fallback para copiar URL
function copiarQRUrlFallback(url, event) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            const btn = event ? event.target : document.querySelector('.btn-copy');
            const originalText = btn.textContent;
            btn.textContent = '✅ ¡Copiado!';
            btn.style.background = 'var(--success-color)';
            btn.style.borderColor = 'var(--success-color)';
            
            mostrarMensaje('URL copiada al portapapeles', 'success');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.borderColor = '';
            }, 2000);
        } else {
            throw new Error('No se pudo copiar');
        }
    } catch (err) {
        console.error('Error copiando URL:', err);
        mostrarMensaje('Error al copiar URL. Por favor, cópiala manualmente.', 'error');
    }
}

// Función auxiliar para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    if (window.toast) {
        if (tipo === 'success') {
            toast.success(mensaje);
        } else {
            toast.error(mensaje);
        }
    } else {
        alert(mensaje);
    }
}

function descargarQR() {
    if (!qrImageDataUrlGlobal) {
        mostrarMensaje('Generá el QR primero', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href = qrImageDataUrlGlobal;
    a.download = 'qr-contacto.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    mostrarMensaje('Descarga iniciada', 'success');
}

// Compartir usando Web Share API (nativo en móviles)
async function compartirQR() {
    const qrUrlText = document.getElementById('qrUrlText');
    const url = qrUrlGlobal || (qrUrlText ? qrUrlText.textContent : '');
    
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const shareText = 'Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros:';
    
    // Verificar si Web Share API está disponible
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Agencia Modelos Argentinas - Comparte tus datos',
                text: shareText,
                url: url
            });
            mostrarMensaje('¡Compartido exitosamente!', 'success');
        } catch (error) {
            // El usuario canceló o hubo un error
            if (error.name !== 'AbortError') {
                console.error('Error compartiendo:', error);
                // Si falla, mostrar botones de redes sociales
                mostrarBotonesCompartir();
            }
        }
    } else {
        // Si no está disponible, mostrar botones de redes sociales directamente
        mostrarBotonesCompartir();
    }
}

// Mostrar botones de compartir en redes sociales
function mostrarBotonesCompartir() {
    const shareButtons = document.getElementById('shareButtons');
    shareButtons.style.display = 'block';
    // Scroll suave hacia los botones
    shareButtons.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Función para compartir en redes sociales (mostrar todas las opciones)
function compartirEnRedes() {
    mostrarBotonesCompartir();
}

// Función auxiliar para obtener URL del QR
function getQRUrl() {
    const qrUrlText = document.getElementById('qrUrlText');
    return qrUrlGlobal || (qrUrlText ? qrUrlText.textContent : '');
}

// Compartir en WhatsApp (intenta enviar imagen del QR si está disponible, sino comparte el link)
async function compartirWhatsApp() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const shareText = 'Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + url;

    // Intentar compartir imagen del QR por Web Share API (móvil: elegir WhatsApp)
    if (qrImageDataUrlGlobal && typeof navigator.share === 'function') {
        try {
            const res = await fetch(qrImageDataUrlGlobal);
            const blob = await res.blob();
            const file = new File([blob], 'qr-contacto.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'QR - Agencia Modelos Argentinas',
                    text: shareText
                });
                if (window.toast) toast.success('¡Compartido por WhatsApp!');
                return;
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('Share con imagen falló, usando link:', e);
        }
    }

    // Fallback: abrir wa.me con el link
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + url);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    if (window.toast) toast.success('Abriendo WhatsApp...');
}

// Compartir en Facebook
function compartirFacebook() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) {
        toast.success('Abriendo Facebook...');
    }
}

// Compartir en Twitter
function compartirTwitter() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros:');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) {
        toast.success('Abriendo Twitter...');
    }
}

// Compartir en X (anteriormente Twitter)
function compartirX() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros:');
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) {
        toast.success('Abriendo X...');
    }
}

// Compartir en Instagram
function compartirInstagram() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + url);
    // Instagram no tiene un share URL directo, así que abrimos la app o web
    // Nota: Instagram requiere que el contenido se comparta desde la app móvil
    // En desktop, redirigimos a crear una nueva publicación
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Móvil: intentar abrir la app de Instagram
        window.open(`instagram://share?text=${text}`, '_blank');
        // Si falla, mostrar mensaje
        setTimeout(() => {
            if (window.toast) {
                toast.info('Copia la URL y compártela en Instagram manualmente');
            }
        }, 1000);
    } else {
        // Desktop: abrir Instagram web
        window.open('https://www.instagram.com/', '_blank');
        if (window.toast) {
            toast.info('Copia la URL y compártela en tu publicación de Instagram');
        }
    }
    // Copiar URL al portapapeles automáticamente
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            if (window.toast) {
                toast.success('URL copiada al portapapeles para compartir en Instagram');
            }
        });
    }
}

// Compartir en LinkedIn
function compartirLinkedIn() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) {
        toast.success('Abriendo LinkedIn...');
    }
}

// Compartir por Email
function compartirEmail() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const subject = encodeURIComponent('Agencia Modelos Argentinas - Comparte tus datos');
    const body = encodeURIComponent(`Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros:\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    if (window.toast) {
        toast.success('Abriendo cliente de email...');
    }
}

// Compartir en Telegram
function compartirTelegram() {
    const url = getQRUrl();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + url);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    if (window.toast) {
        toast.success('Abriendo Telegram...');
    }
}

// --- QR Sorteo ---
function getQRUrlSorteo() {
    const el = document.getElementById('qrUrlTextSorteo');
    return qrUrlSorteoGlobal || (el ? el.textContent : '');
}

async function generarQRSorteo() {
    try {
        const response = await fetch('/api/admin/generar-qr-sorteo', {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Error generando QR');

        const container = document.getElementById('qrAdminContainerSorteo');
        if (!container) throw new Error('Contenedor QR Sorteo no encontrado');
        container.innerHTML = '';

        new QRCode(container, {
            text: data.url,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        qrUrlSorteoGlobal = data.url;
        qrImageSorteoGlobal = data.qr || '';
        const qrUrlText = document.getElementById('qrUrlTextSorteo');
        const qrUrl = document.getElementById('qrUrlSorteo');
        const shareButtons = document.getElementById('shareButtonsSorteo');
        if (qrUrlText) qrUrlText.textContent = data.url;
        if (qrUrl) qrUrl.style.display = 'block';
        if (shareButtons) shareButtons.style.display = 'none';

        const btnNative = document.getElementById('btnShareNativeSorteo');
        if (btnNative) {
            btnNative.style.display = navigator.share ? 'inline-block' : 'none';
        }
        const btnSocial = document.querySelector('#qrUrlSorteo .btn-share-social');
        if (btnSocial) btnSocial.style.display = 'inline-block';
    } catch (error) {
        console.error('Error generando QR Sorteo:', error);
        mostrarMensaje('Error generando QR Sorteo: ' + error.message, 'error');
    }
}

function descargarQRSorteo() {
    if (!qrImageSorteoGlobal) {
        mostrarMensaje('Generá el QR Sorteo primero', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href = qrImageSorteoGlobal;
    a.download = 'qr-sorteo.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    mostrarMensaje('Descarga iniciada', 'success');
}

function copiarQRUrlSorteo(event) {
    const url = getQRUrlSorteo();
    if (!url) {
        mostrarMensaje('No hay URL para copiar', 'error');
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            const btn = event ? event.target : document.querySelector('#qrUrlSorteo .btn-copy');
            const orig = btn?.textContent;
            if (btn) {
                btn.textContent = '✅ ¡Copiado!';
                btn.style.background = 'var(--success-color)';
                btn.style.borderColor = 'var(--success-color)';
            }
            mostrarMensaje('URL copiada al portapapeles', 'success');
            setTimeout(() => {
                if (btn) {
                    btn.textContent = orig || '📋 Copiar URL';
                    btn.style.background = '';
                    btn.style.borderColor = '';
                }
            }, 2000);
        }).catch(() => copiarQRUrlFallback(url, event));
    } else {
        copiarQRUrlFallback(url, event);
    }
}

function mostrarBotonesCompartirSorteo() {
    const el = document.getElementById('shareButtonsSorteo');
    if (el) {
        el.style.display = 'block';
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function compartirQRSorteo() {
    const url = getQRUrlSorteo();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const shareText = '¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01: ';
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Sorteo - Agencia Modelos Argentinas',
                text: shareText,
                url
            });
            if (window.toast) toast.success('¡Compartido!');
        } catch (e) {
            if (e.name !== 'AbortError') mostrarBotonesCompartirSorteo();
        }
    } else {
        mostrarBotonesCompartirSorteo();
    }
}

function compartirEnRedesSorteo() {
    mostrarBotonesCompartirSorteo();
}

async function compartirWhatsAppSorteo() {
    const url = getQRUrlSorteo();
    if (!url) {
        mostrarMensaje('No hay URL para compartir', 'error');
        return;
    }
    const shareText = '¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01: ' + url;
    if (qrImageSorteoGlobal && typeof navigator.share === 'function') {
        try {
            const res = await fetch(qrImageSorteoGlobal);
            const blob = await res.blob();
            const file = new File([blob], 'qr-sorteo.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'QR Sorteo - Agencia Modelos Argentinas', text: shareText });
                if (window.toast) toast.success('¡Compartido por WhatsApp!');
                return;
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('Share imagen sorteo falló, usando link:', e);
        }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    if (window.toast) toast.success('Abriendo WhatsApp...');
}

function compartirFacebookSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) toast.success('Abriendo Facebook...');
}

function compartirTwitterSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    const text = encodeURIComponent('¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01:');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) toast.success('Abriendo Twitter...');
}

function compartirXSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    const text = encodeURIComponent('¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01:');
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) toast.success('Abriendo X...');
}

function compartirInstagramSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    const text = encodeURIComponent('¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01: ' + url);
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.open(`instagram://share?text=${text}`, '_blank');
    } else {
        window.open('https://www.instagram.com/', '_blank');
    }
    if (window.toast) toast.info('Copia la URL y compártela en Instagram');
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => {});
}

function compartirLinkedInSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    if (window.toast) toast.success('Abriendo LinkedIn...');
}

function compartirEmailSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    const subject = encodeURIComponent('Sorteo - Cena Puerto Madero - Agencia Modelos Argentinas');
    const body = encodeURIComponent(`¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01:\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    if (window.toast) toast.success('Abriendo cliente de email...');
}

function compartirTelegramSorteo() {
    const url = getQRUrlSorteo();
    if (!url) { mostrarMensaje('No hay URL para compartir', 'error'); return; }
    const text = encodeURIComponent('¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01: ' + url);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    if (window.toast) toast.success('Abriendo Telegram...');
}

// Modelos
async function cargarModelos() {
    const list = document.getElementById('modelosList');
    if (!list) {
        console.error('Elemento modelosList no encontrado');
        return;
    }
    list.innerHTML = '<div class="loading">Cargando modelos...</div>';
    
    try {
        const response = await fetch('/api/admin/modelos', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error al obtener modelos');
        }
        
        if (data.modelos && data.modelos.length > 0) {
            list.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Foto</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Ciudad</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.modelos.map(modelo => `
                            <tr>
                                <td>
                                    ${modelo.foto ? 
                                        `<img src="${escapeHtml(modelo.foto)}" alt="${escapeHtml(modelo.nombre)}" class="table-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">` :
                                        '<span class="no-photo">📷</span>'
                                    }
                                    ${modelo.foto ? '<span class="no-photo" style="display:none;">📷</span>' : ''}
                                </td>
                                <td><strong>${escapeHtml(modelo.nombre)} ${modelo.apellido ? escapeHtml(modelo.apellido) : ''}</strong></td>
                                <td>${modelo.email ? escapeHtml(modelo.email) : '-'}</td>
                                <td>${modelo.telefono ? escapeHtml(modelo.telefono) : '-'}</td>
                                <td>${modelo.ciudad ? escapeHtml(modelo.ciudad) : '-'}</td>
                                <td><span class="badge ${modelo.activa ? 'badge-active' : 'badge-inactive'}">${modelo.activa ? 'Activa' : 'Inactiva'}</span></td>
                                <td>
                                    <button onclick="editarModelo(${modelo.id})" class="btn-small btn-edit">Editar</button>
                                    <button onclick="eliminarModelo(${modelo.id})" class="btn-small btn-delete">Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            list.innerHTML = '<p class="no-data">No hay modelos registrados</p>';
        }
    } catch (error) {
        console.error('Error cargando modelos:', error);
        list.innerHTML = `<p class="error">Error cargando modelos: ${error.message || 'Error desconocido'}. Por favor, intenta nuevamente.</p>`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarFormModelo() {
    documentoEditando = null;
    const modeloForm = document.getElementById('modeloForm');
    const modeloId = document.getElementById('modeloId');
    const formTitulo = document.getElementById('formModeloTitulo');
    const formContainer = document.getElementById('formModelo');
    
    if (modeloForm) modeloForm.reset();
    if (modeloId) modeloId.value = '';
    if (formTitulo) formTitulo.textContent = 'Agregar Nuevo Modelo';
    
    const fotosContainer = document.getElementById('fotosContainer');
    if (fotosContainer) {
        fotosContainer.innerHTML = `
            <div class="foto-input-group">
                <input type="url" class="foto-url-input" placeholder="https://ejemplo.com/foto1.jpg">
                <button type="button" class="btn-remove-foto" onclick="removeFotoInput(this)" style="display: none;">✕</button>
            </div>
        `;
        updateAddFotoButtonState();
    }
    if (formContainer) {
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function cancelarFormModelo() {
    const formContainer = document.getElementById('formModelo');
    const modeloForm = document.getElementById('modeloForm');
    
    if (formContainer) formContainer.style.display = 'none';
    documentoEditando = null;
    if (modeloForm) modeloForm.reset();
    
    const fotosContainer = document.getElementById('fotosContainer');
    if (fotosContainer) {
        fotosContainer.innerHTML = `
            <div class="foto-input-group">
                <input type="url" class="foto-url-input" placeholder="https://ejemplo.com/foto1.jpg">
                <button type="button" class="btn-remove-foto" onclick="removeFotoInput(this)" style="display: none;">✕</button>
            </div>
        `;
        updateAddFotoButtonState();
    }
}

const MAX_FOTOS_MODELO = 20;

function updateAddFotoButtonState() {
    const fotosContainer = document.getElementById('fotosContainer');
    const btn = document.getElementById('btnAddFoto');
    if (!fotosContainer || !btn) return;
    const count = fotosContainer.querySelectorAll('.foto-input-group').length;
    btn.disabled = count >= MAX_FOTOS_MODELO;
}

// Funciones para gestionar múltiples fotos
function addFotoInput() {
    const fotosContainer = document.getElementById('fotosContainer');
    if (!fotosContainer) return;
    const count = fotosContainer.querySelectorAll('.foto-input-group').length;
    if (count >= MAX_FOTOS_MODELO) {
        if (window.toast) toast.error(`Máximo ${MAX_FOTOS_MODELO} fotos por modelo`);
        else alert(`Máximo ${MAX_FOTOS_MODELO} fotos por modelo`);
        return;
    }
    const newInput = document.createElement('div');
    newInput.className = 'foto-input-group';
    newInput.innerHTML = `
        <input type="url" class="foto-url-input" placeholder="https://ejemplo.com/foto.jpg">
        <button type="button" class="btn-remove-foto" onclick="removeFotoInput(this)">✕</button>
    `;
    fotosContainer.appendChild(newInput);
    const removeButtons = fotosContainer.querySelectorAll('.btn-remove-foto');
    removeButtons.forEach(btn => {
        if (removeButtons.length > 1) {
            btn.style.display = 'inline-flex';
        }
    });
    const newInputField = newInput.querySelector('.foto-url-input');
    if (newInputField) newInputField.focus();
    updateAddFotoButtonState();
}

function removeFotoInput(button) {
    const fotosContainer = document.getElementById('fotosContainer');
    if (!fotosContainer) return;
    const inputGroup = button.closest('.foto-input-group');
    if (inputGroup) inputGroup.remove();
    const remainingInputs = fotosContainer.querySelectorAll('.foto-input-group');
    if (remainingInputs.length === 1) {
        const removeBtn = remainingInputs[0].querySelector('.btn-remove-foto');
        if (removeBtn) removeBtn.style.display = 'none';
    }
    updateAddFotoButtonState();
}

async function editarModelo(id) {
    try {
        const response = await fetch(`/api/admin/modelos`, {
            credentials: 'include'
        });
        const data = await response.json();
        const modelo = data.modelos.find(m => m.id === id);
        
        if (modelo) {
            documentoEditando = id;
            const modeloId = document.getElementById('modeloId');
            const formContainer = document.getElementById('formModelo');
            const formTitulo = document.getElementById('formModeloTitulo');
            
            if (modeloId) modeloId.value = id;
            if (document.getElementById('mNombre')) document.getElementById('mNombre').value = modelo.nombre || '';
            if (document.getElementById('mApellido')) document.getElementById('mApellido').value = modelo.apellido || '';
            if (document.getElementById('mEmail')) document.getElementById('mEmail').value = modelo.email || '';
            if (document.getElementById('mTelefono')) document.getElementById('mTelefono').value = modelo.telefono || '';
            if (document.getElementById('mEdad')) document.getElementById('mEdad').value = modelo.edad || '';
            if (document.getElementById('mAltura')) document.getElementById('mAltura').value = modelo.altura || '';
            if (document.getElementById('mMedidas')) document.getElementById('mMedidas').value = modelo.medidas || '';
            if (document.getElementById('mCiudad')) document.getElementById('mCiudad').value = modelo.ciudad || '';
            if (document.getElementById('mDescripcion')) document.getElementById('mDescripcion').value = modelo.descripcion || '';
            
            // Cargar fotos
            const fotosContainer = document.getElementById('fotosContainer');
            if (fotosContainer) {
                const fotos = modelo.fotos && modelo.fotos.length > 0 
                    ? modelo.fotos.map(f => f.url) 
                    : (modelo.foto ? [modelo.foto] : []);
                
                if (fotos.length > 0) {
                    fotosContainer.innerHTML = fotos.map((foto, index) => `
                        <div class="foto-input-group">
                            <input type="url" class="foto-url-input" value="${escapeHtml(foto)}" placeholder="https://ejemplo.com/foto${index + 1}.jpg">
                            <button type="button" class="btn-remove-foto" onclick="removeFotoInput(this)" ${fotos.length === 1 ? 'style="display: none;"' : ''}>✕</button>
                        </div>
                    `).join('');
                } else {
                    fotosContainer.innerHTML = `
                        <div class="foto-input-group">
                            <input type="url" class="foto-url-input" placeholder="https://ejemplo.com/foto1.jpg">
                            <button type="button" class="btn-remove-foto" onclick="removeFotoInput(this)" style="display: none;">✕</button>
                        </div>
                    `;
                }
                updateAddFotoButtonState();
            }
            if (formTitulo) formTitulo.textContent = 'Editar Modelo';
            if (formContainer) {
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } catch (error) {
        alert('Error cargando modelo: ' + error.message);
    }
}

async function eliminarModelo(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este modelo?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/modelos/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            cargarModelos();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error eliminando modelo: ' + error.message);
    }
}

// Formulario de modelo - Esperar a que el DOM esté listo
function initModeloForm() {
    const modeloForm = document.getElementById('modeloForm');
    if (!modeloForm) {
        console.error('Formulario modeloForm no encontrado');
        return;
    }
    
    modeloForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('modeloId').value;
    
    // Recopilar todas las fotos
    const fotoInputs = document.querySelectorAll('.foto-url-input');
    const fotos = Array.from(fotoInputs)
        .map(input => input.value.trim())
        .filter(url => url && url.length > 0);
    
    // Usar la primera foto como foto principal (compatibilidad)
    const fotoPrincipal = fotos.length > 0 ? fotos[0] : '';
    
    const data = {
        nombre: document.getElementById('mNombre').value,
        apellido: document.getElementById('mApellido').value,
        email: document.getElementById('mEmail').value,
        telefono: document.getElementById('mTelefono').value,
        edad: document.getElementById('mEdad').value ? parseInt(document.getElementById('mEdad').value) : null,
        altura: document.getElementById('mAltura').value,
        medidas: document.getElementById('mMedidas').value,
        ciudad: document.getElementById('mCiudad').value,
        foto: fotoPrincipal, // Mantener compatibilidad
        fotos: fotos, // Nuevo: múltiples fotos
        descripcion: document.getElementById('mDescripcion').value,
        activa: 1
    };
    
    try {
        const url = id ? `/api/admin/modelos/${id}` : '/api/admin/modelos';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (window.toast) {
                toast.success(result.message || 'Modelo guardado exitosamente');
            }
            cancelarFormModelo();
            cargarModelos();
        } else {
            const errorMsg = result.message || 'Error guardando modelo';
            if (window.toast) {
                toast.error(errorMsg);
            } else {
                alert('Error: ' + errorMsg);
            }
        }
    } catch (error) {
        const errorMsg = 'Error guardando modelo: ' + error.message;
        if (window.toast) {
            toast.error(errorMsg);
        } else {
            alert(errorMsg);
        }
    }
    });
}

// Inicializar formulario cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModeloForm);
} else {
    initModeloForm();
}

// Contactos
async function cargarContactos() {
    const list = document.getElementById('contactosList');
    if (!list) {
        console.error('Elemento contactosList no encontrado');
        return;
    }
    list.innerHTML = '<div class="loading">Cargando contactos...</div>';
    
    try {
        const response = await fetch('/api/admin/contactos', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error al obtener contactos');
        }
        
        if (data.contactos && data.contactos.length > 0) {
            list.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Empresa</th>
                            <th>Mensaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.contactos.map(contacto => `
                            <tr>
                                <td>${new Date(contacto.fecha).toLocaleDateString('es-ES')}</td>
                                <td><strong>${escapeHtml(contacto.nombre)}</strong></td>
                                <td><a href="mailto:${escapeHtml(contacto.email)}">${escapeHtml(contacto.email)}</a></td>
                                <td>${contacto.telefono ? escapeHtml(contacto.telefono) : '-'}</td>
                                <td>${contacto.empresa ? escapeHtml(contacto.empresa) : '-'}</td>
                                <td>${contacto.mensaje ? escapeHtml(contacto.mensaje) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            list.innerHTML = '<p class="no-data">No hay contactos recibidos</p>';
        }
    } catch (error) {
        console.error('Error cargando contactos:', error);
        list.innerHTML = `<p class="error">Error cargando contactos: ${error.message || 'Error desconocido'}. Por favor, intenta nuevamente.</p>`;
    }
}

