'use strict';

// ════════════════════════════════════════════
// PLAYER NAME (URL param)
// ════════════════════════════════════════════
const params      = new URLSearchParams(window.location.search);
const PLAYER_NAME = (params.get('nombre') || 'Joel').slice(0, 20);

// ════════════════════════════════════════════
// RESPONSIVE SCALE
// ════════════════════════════════════════════
const gameWrapper = document.getElementById('gameWrapper');
const GAME_W = 520;
const GAME_H = 710;

function applyScale() {
    const s = Math.min(
        (window.innerWidth  - 8) / GAME_W,
        (window.innerHeight - 8) / GAME_H,
        1
    );
    document.documentElement.style.setProperty('--gs', s.toFixed(4));
}
applyScale();
window.addEventListener('resize', applyScale);
window.addEventListener('orientationchange', () => setTimeout(applyScale, 200));

// ════════════════════════════════════════════
// BACKGROUND PARTICLES
// ════════════════════════════════════════════
(function () {
    const palette = ['#00ff88','#00e5ff','#ffcc00','#ffffff','#a855ff'];
    for (let i = 0; i < 28; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const s = Math.random() * 4 + 2;
        el.style.cssText = [
            `width:${s}px`, `height:${s}px`,
            `left:${Math.random() * 100}%`,
            `background:${palette[Math.floor(Math.random() * palette.length)]}`,
            `opacity:${(Math.random() * 0.3 + 0.08).toFixed(2)}`,
            `animation-duration:${(Math.random() * 14 + 9).toFixed(1)}s`,
            `animation-delay:-${(Math.random() * 20).toFixed(1)}s`,
        ].join(';');
        document.body.appendChild(el);
    }
})();

// ════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════
const GOALS_TO_WIN = 3;

const PITCH_W = 500;
const PITCH_H = 640;

// Portería: top=40, left=90, width=320, height=120
const GOAL_TOP    = 40;
const GOAL_LEFT   = 90;
const GOAL_WIDTH  = 320;
const GOAL_HEIGHT = 120;
const GOAL_LINE_Y = GOAL_TOP + GOAL_HEIGHT; // 160 — donde el portero

// Balón (reposo)
const BALL_REST_X    = PITCH_W / 2;
const BALL_REST_Y    = PITCH_H - 80; // desde top
// Nota: en CSS usamos bottom:80px, aquí trabajamos en Y desde top del pitch.

// Portero
const KEEPER_WIDTH  = 70;   // ancho efectivo (tolerancia visual)
const KEEPER_SPEED  = 160;  // px/s base

// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
let gameRunning   = false;
let gameStartTime = 0;
let goals         = 0;
let shots         = 0;
let saves         = 0;

let ballState     = 'idle';    // 'idle' | 'flying' | 'scored' | 'saved' | 'reset'
let ballX         = BALL_REST_X;
let ballY         = BALL_REST_Y;
let targetX       = 0;
let targetY       = 0;
let shotStartTime = 0;

// Portero
let keeperX      = GOAL_LEFT + GOAL_WIDTH / 2;
let keeperDir    = 1;
let keeperSpeed  = KEEPER_SPEED;
let keeperMin    = GOAL_LEFT + KEEPER_WIDTH / 2 - 10;
let keeperMax    = GOAL_LEFT + GOAL_WIDTH - KEEPER_WIDTH / 2 + 10;

// ════════════════════════════════════════════
// DOM REFS
// ════════════════════════════════════════════
const endScreen    = document.getElementById('endScreen');
const pitchEl      = document.getElementById('pitch');
const ballEl       = document.getElementById('ball');
const keeperEl     = document.getElementById('keeper');
const goalsEl      = document.getElementById('goalsDisplay');
const shotsEl      = document.getElementById('shotsDisplay');
const playerNameEl = document.getElementById('playerNameDisplay');
const feedbackEl   = document.getElementById('feedback');
const countdownEl  = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const aimHint      = document.getElementById('aimHint');

// ════════════════════════════════════════════
// GAME FLOW
// ════════════════════════════════════════════
function initGame() {
    playerNameEl.textContent = '⚽ ' + PLAYER_NAME;

    goals = 0;
    shots = 0;
    saves = 0;
    resetBall();
    keeperX   = GOAL_LEFT + GOAL_WIDTH / 2;
    keeperDir = Math.random() < 0.5 ? 1 : -1;
    keeperSpeed = KEEPER_SPEED;

    endScreen.style.display   = 'none';
    gameWrapper.style.display = 'flex';
    applyScale();
    updateHUD();
    aimHint.classList.remove('hidden');
    startCountdown();
}

function startCountdown() {
    let count = 3;
    countdownEl.textContent = count;
    countdownEl.classList.add('visible');
    const iv = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.textContent = count;
        } else {
            clearInterval(iv);
            countdownEl.textContent = '¡A JUGAR!';
            setTimeout(() => {
                countdownEl.classList.remove('visible');
                beginGame();
            }, 600);
        }
    }, 800);
}

function beginGame() {
    gameRunning   = true;
    gameStartTime = performance.now();
    ballState = 'idle';
    requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════
// LOOP
// ════════════════════════════════════════════
let lastFrameTs = 0;
function gameLoop(ts) {
    if (!gameRunning) return;
    const dt = lastFrameTs ? (ts - lastFrameTs) / 1000 : 0;
    lastFrameTs = ts;

    // Portero rebotando — velocidad crece con goles
    const currentSpeed = keeperSpeed + goals * 45;
    keeperX += keeperDir * currentSpeed * dt;
    if (keeperX < keeperMin) { keeperX = keeperMin; keeperDir = 1; }
    if (keeperX > keeperMax) { keeperX = keeperMax; keeperDir = -1; }
    keeperEl.style.left = keeperX + 'px';

    // Balón volando
    if (ballState === 'flying') {
        const elapsedFlight = (ts - shotStartTime) / 1000;
        const FLIGHT_DUR = 0.45; // 450ms
        const p = Math.min(1, elapsedFlight / FLIGHT_DUR);

        // Interpolación con ligera parábola (sube un poco en el medio)
        const x = BALL_REST_X + (targetX - BALL_REST_X) * p;
        const y = BALL_REST_Y + (targetY - BALL_REST_Y) * p;
        ballX = x;
        ballY = y;

        // Tamaño se reduce conforme se aleja (profundidad)
        const scale = 1 - p * 0.4;

        ballEl.style.left      = x + 'px';
        ballEl.style.top       = y + 'px';
        ballEl.style.bottom    = 'auto';
        ballEl.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;

        // Cuando el balón cruza la línea del portero → evaluar
        if (p >= 1) {
            evaluateShot();
        }
    }

    requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════
// INPUT — tap dentro de la portería
// ════════════════════════════════════════════
function onPitchPoint(clientX, clientY) {
    if (!gameRunning || ballState !== 'idle') return;

    const rect = pitchEl.getBoundingClientRect();
    // Convertir coords de pantalla a coords internas del pitch (500x640)
    const px = (clientX - rect.left) * (PITCH_W / rect.width);
    const py = (clientY - rect.top)  * (PITCH_H / rect.height);

    // Restringir el target dentro de la portería
    const tx = Math.max(GOAL_LEFT + 20, Math.min(GOAL_LEFT + GOAL_WIDTH - 20, px));
    // La Y la clavamos en la línea de gol (donde está el portero)
    const ty = GOAL_LINE_Y;

    shoot(tx, ty);
}

function shoot(tx, ty) {
    shots++;
    targetX = tx;
    targetY = ty;
    ballState = 'flying';
    shotStartTime = performance.now();
    ballEl.classList.add('kicking');
    aimHint.classList.add('hidden');
    updateHUD();
}

function evaluateShot() {
    // Colisión con el portero en el momento del impacto
    const tolerance = KEEPER_WIDTH / 2 + 22; // +22 para el balón
    const dx = Math.abs(targetX - keeperX);

    if (dx <= tolerance) {
        // Atajado
        saves++;
        ballState = 'saved';
        keeperEl.classList.add('diving');
        setTimeout(() => keeperEl.classList.remove('diving'), 350);
        showFeedback('¡ATAJADA!', '#ff4455');
    } else {
        // GOL
        goals++;
        ballState = 'scored';
        showFeedback('¡G O L!', '#00ff88');
        flashGoalNet();
    }
    updateHUD();
    updateProgress();

    // Revisar victoria
    if (goals >= GOALS_TO_WIN) {
        setTimeout(() => winGame(), 900);
        return;
    }

    // Reset para el siguiente tiro
    setTimeout(() => resetBall(), 900);
}

function flashGoalNet() {
    const net = document.getElementById('goalNet');
    net.style.transition = 'background 0.1s, box-shadow 0.1s';
    const prevBg = net.style.background;
    net.style.boxShadow = 'inset 0 0 60px rgba(0,255,136,0.6)';
    setTimeout(() => { net.style.boxShadow = ''; }, 420);
}

function resetBall() {
    ballState = 'idle';
    ballX = BALL_REST_X;
    ballY = BALL_REST_Y;
    ballEl.classList.remove('kicking');
    ballEl.style.left      = '50%';
    ballEl.style.top       = 'auto';
    ballEl.style.bottom    = '80px';
    ballEl.style.transform = 'translate(-50%, 0) scale(1)';
    aimHint.classList.remove('hidden');
}

// ════════════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════════════
function showFeedback(text, color) {
    feedbackEl.textContent      = text;
    feedbackEl.style.color      = color;
    feedbackEl.style.textShadow = `0 4px 14px rgba(0,0,0,0.8), 0 0 22px ${color}`;
    feedbackEl.className        = '';
    void feedbackEl.offsetWidth;
    feedbackEl.className        = 'fb-anim';
}

function updateHUD() {
    goalsEl.textContent = goals + ' / ' + GOALS_TO_WIN;
    shotsEl.textContent = 'Tiros: ' + shots;
}

function updateProgress() {
    const pct = Math.min(100, (goals / GOALS_TO_WIN) * 100);
    progressFill.style.width = pct + '%';
}

// ════════════════════════════════════════════
// WIN / END
// ════════════════════════════════════════════
function winGame() {
    gameRunning = false;

    gameWrapper.style.display = 'none';
    endScreen.style.display   = 'block';

    const acc = shots > 0 ? (goals / shots * 100) : 0;
    let grade, gColor;
    if      (acc >= 90) { grade = '⭐ MVP'; gColor = '#ffcc00'; }
    else if (acc >= 70) { grade = 'CRACK';  gColor = '#00ff88'; }
    else if (acc >= 50) { grade = 'BUENO';  gColor = '#00e5ff'; }
    else                { grade = 'SIGUE';  gColor = '#a855ff'; }

    document.getElementById('finalScore').textContent = goals + ' / ' + GOALS_TO_WIN + ' goles';
    const gradeEl = document.getElementById('grade');
    gradeEl.textContent      = grade;
    gradeEl.style.color      = gColor;
    gradeEl.style.textShadow = `0 0 35px ${gColor}, 0 0 70px ${gColor}44`;

    document.getElementById('stats').innerHTML = `
        <div>⚽ &nbsp;<b style="color:#fff">${PLAYER_NAME}</b></div>
        <div>Goles: <b style="color:#00ff88">${goals}</b></div>
        <div>Tiros totales: <b style="color:#fff">${shots}</b></div>
        <div>Atajadas: <b style="color:#ff6688">${saves}</b></div>
        <div>Efectividad: <b style="color:#fff">${acc.toFixed(1)}%</b></div>
    `;

    // 🎂 Animación de cumpleaños al alcanzar los 3 goles
    showBirthdayAnimation();
}

// ════════════════════════════════════════════
// 🎂 BIRTHDAY ANIMATION
// ════════════════════════════════════════════
function showBirthdayAnimation() {
    const prev = document.getElementById('birthdayOverlay');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id = 'birthdayOverlay';

    // Título gigante
    const title = document.createElement('div');
    title.className = 'bday-title';
    title.innerHTML = `
        ⚽ ¡FELIZ CUMPLE! 🎉<br>
        <span style="display:block">JOEL</span>
    `;
    overlay.appendChild(title);

    // Confeti
    const confettiColors = [
        '#00ff88','#00cc66','#00e5ff','#0099ff',
        '#ffcc00','#ffaa00','#ff0066','#ff3388',
        '#a855ff','#ffffff'
    ];
    for (let i = 0; i < 120; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        const size = 6 + Math.random() * 10;
        c.style.left              = Math.random() * 100 + 'vw';
        c.style.width             = size + 'px';
        c.style.height            = (size + Math.random() * 6) + 'px';
        c.style.background        = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        c.style.animationDelay    = (Math.random() * 4).toFixed(2) + 's';
        c.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + 's';
        c.style.transform         = `rotate(${Math.random() * 360}deg)`;
        c.style.borderRadius      = Math.random() < 0.3 ? '50%' : '2px';
        overlay.appendChild(c);
    }

    // Iconos festivos flotantes (temática futbol + cumpleaños)
    const partyIcons = ['⚽','🥅','🏆','🎉','🎊','🎈','🎁','⭐','✨','🥳','🎂','🍰'];
    for (let i = 0; i < 26; i++) {
        const h = document.createElement('div');
        h.className = 'bday-icon';
        h.textContent = partyIcons[Math.floor(Math.random() * partyIcons.length)];
        h.style.left              = Math.random() * 100 + 'vw';
        h.style.fontSize          = (1.2 + Math.random() * 1.8).toFixed(1) + 'rem';
        h.style.animationDelay    = (Math.random() * 5).toFixed(2) + 's';
        h.style.animationDuration = (5 + Math.random() * 4).toFixed(2) + 's';
        overlay.appendChild(h);
    }

    // Estrellas parpadeantes
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('div');
        s.className = 'bday-spark';
        s.style.left              = Math.random() * 100 + 'vw';
        s.style.top               = Math.random() * 100 + 'vh';
        s.style.animationDelay    = (Math.random() * 2).toFixed(2) + 's';
        s.style.animationDuration = (1 + Math.random() * 2).toFixed(2) + 's';
        overlay.appendChild(s);
    }

    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('visible');
}

function hideBirthdayAnimation() {
    const o = document.getElementById('birthdayOverlay');
    if (o) o.remove();
}

// ════════════════════════════════════════════
// INPUT — touch + mouse
// ════════════════════════════════════════════
pitchEl.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (t) onPitchPoint(t.clientX, t.clientY);
}, { passive: false });

pitchEl.addEventListener('mousedown', e => {
    e.preventDefault();
    onPitchPoint(e.clientX, e.clientY);
});

pitchEl.addEventListener('contextmenu', e => e.preventDefault());

// ════════════════════════════════════════════
// BUTTONS
// ════════════════════════════════════════════
document.getElementById('restartBtn').addEventListener('click', () => {
    hideBirthdayAnimation();
    initGame();
});
document.getElementById('menuBtn').addEventListener('click', () => {
    hideBirthdayAnimation();
    window.location.href = 'index.html';
});

// ════════════════════════════════════════════
// TAP OVERLAY — primer gesto
// ════════════════════════════════════════════
const tapOverlay = document.getElementById('tapOverlay');

function handleTap() {
    tapOverlay.classList.add('hidden');
    setTimeout(() => tapOverlay.remove(), 320);
    initGame();
}

tapOverlay.addEventListener('touchend', e => { e.preventDefault(); handleTap(); }, { passive: false });
tapOverlay.addEventListener('click', handleTap);
