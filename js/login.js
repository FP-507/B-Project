'use strict';

// ════════════════════════════════════════
// BACKGROUND PARTICLES
// ════════════════════════════════════════
(function () {
    const palette = ['#ff0066','#ff6600','#ffff00','#00ff88','#0066ff','#cc00ff','#ff69b4'];
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const s = Math.random() * 4 + 2;
        el.style.cssText = [
            `width:${s}px`, `height:${s}px`,
            `left:${Math.random() * 100}%`,
            `background:${palette[Math.floor(Math.random() * palette.length)]}`,
            `opacity:${(Math.random() * 0.3 + 0.06).toFixed(2)}`,
            `animation-duration:${(Math.random() * 14 + 9).toFixed(1)}s`,
            `animation-delay:-${(Math.random() * 20).toFixed(1)}s`,
        ].join(';');
        document.body.appendChild(el);
    }
})();

// ════════════════════════════════════════
// ROUTING  —  agrega aquí a cada amig@
// ════════════════════════════════════════
const ROUTES = {
    'janeth': 'janeth.html',
    // 'carlos': 'carlos.html',
    // 'sofia':  'sofia.html',
};

// ════════════════════════════════════════
// UI REFS
// ════════════════════════════════════════
const nameInput = document.getElementById('nameInput');
const playBtn   = document.getElementById('playBtn');
const messageEl = document.getElementById('message');

let msgTimer = null;

function showMessage(text, type) {
    clearTimeout(msgTimer);
    messageEl.textContent = text;
    messageEl.className   = `visible ${type}`;
    if (type === 'error') {
        msgTimer = setTimeout(() => { messageEl.className = ''; }, 3000);
    }
}

// ════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════
function tryPlay() {
    const raw = nameInput.value.trim();
    const key = raw.toLowerCase()
                   .normalize('NFD')
                   .replace(/[\u0300-\u036f]/g, ''); // quita tildes

    if (!raw) {
        showMessage('¡Escribe tu nombre primero!', 'error');
        nameInput.focus();
        return;
    }

    if (ROUTES[key]) {
        showMessage('¡Cargando tu juego...', 'info');
        setTimeout(() => {
            window.location.href = ROUTES[key] + '?nombre=' + encodeURIComponent(raw);
        }, 320);
    } else {
        showMessage('¡Tu juego está en camino! 🎮', 'info');
    }
}

// ════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════
playBtn.addEventListener('click', tryPlay);

nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { nameInput.blur(); tryPlay(); }
});

nameInput.addEventListener('input', () => {
    messageEl.className = '';
});
