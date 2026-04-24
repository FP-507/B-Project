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
const MAX_SHOTS    = 8;   // 8 tiros para hacer 3 goles

const PITCH_W = 500;
const PITCH_H = 640;

// Portería: top=40, left=90, width=320, height=120
const GOAL_TOP    = 40;
const GOAL_LEFT   = 90;
const GOAL_WIDTH  = 320;
const GOAL_HEIGHT = 120;
const GOAL_LINE_Y = GOAL_TOP + GOAL_HEIGHT; // 160 — donde el portero

// Balón (reposo)
const BALL_REST_X = PITCH_W / 2;
const BALL_REST_Y = PITCH_H - 80;
const BALL_R      = 18;   // radio efectivo del balón para colisión

// Portero — hitbox ajustado al alcance real de los guantes del SVG
// (guantes en x=13 y x=67, radio 6.5 → silueta de 67px → half ≈ 34)
const KEEPER_WIDTH       = 80;
const KEEPER_HALF        = 34;                 // half-width visible del sprite
const SAVE_TOL           = KEEPER_HALF + BALL_R; // 52 — coincide con la silueta
const KEEPER_BASE_SPEED  = 240;                // px/s base oscilación
const KEEPER_SPEED_BOOST = 55;                 // +por gol
const KEEPER_REACT_MS    = 150;                // reacción tras el disparo
const KEEPER_DIVE_SPEED  = 280;                // px/s al lanzarse
const KEEPER_DIVE_BOOST  = 35;                 // +por gol

const FLIGHT_DUR = 0.48;  // segundos que tarda el balón en llegar

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
let keeperX        = GOAL_LEFT + GOAL_WIDTH / 2;
let keeperDir      = 1;
let keeperState    = 'osc';  // 'osc' | 'reacting' | 'diving'
let keeperDiveTgt  = 0;
let keeperDiveAt   = 0;       // timestamp cuando empezar a lanzarse
const keeperMin    = GOAL_LEFT + KEEPER_HALF + 4;
const keeperMax    = GOAL_LEFT + GOAL_WIDTH - KEEPER_HALF - 4;

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
    keeperX     = GOAL_LEFT + GOAL_WIDTH / 2;
    keeperDir   = Math.random() < 0.5 ? 1 : -1;
    keeperState = 'osc';
    keeperEl.classList.remove('lean-left','lean-right');

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

    // ── IA del portero ─────────────────────────────
    if (keeperState === 'osc') {
        // Oscilación: velocidad crece con goles
        const oscSpeed = KEEPER_BASE_SPEED + goals * KEEPER_SPEED_BOOST;
        keeperX += keeperDir * oscSpeed * dt;
        if (keeperX < keeperMin) { keeperX = keeperMin; keeperDir = 1; }
        if (keeperX > keeperMax) { keeperX = keeperMax; keeperDir = -1; }
    } else if (keeperState === 'reacting') {
        // Sigue oscilando durante la ventana de reacción
        const oscSpeed = KEEPER_BASE_SPEED + goals * KEEPER_SPEED_BOOST;
        keeperX += keeperDir * oscSpeed * dt;
        if (keeperX < keeperMin) { keeperX = keeperMin; keeperDir = 1; }
        if (keeperX > keeperMax) { keeperX = keeperMax; keeperDir = -1; }
        if (ts >= keeperDiveAt) {
            keeperState = 'diving';
            // Lean visual según dirección
            if (keeperDiveTgt < keeperX) keeperEl.classList.add('lean-left');
            else                         keeperEl.classList.add('lean-right');
        }
    } else if (keeperState === 'diving') {
        // Se lanza hacia donde apuntaste
        const diveSpeed = KEEPER_DIVE_SPEED + goals * KEEPER_DIVE_BOOST;
        const diff = keeperDiveTgt - keeperX;
        const step = diveSpeed * dt;
        if (Math.abs(diff) <= step) keeperX = keeperDiveTgt;
        else                        keeperX += Math.sign(diff) * step;
    }
    keeperX = Math.max(keeperMin, Math.min(keeperMax, keeperX));
    // keeperX está en coords del pitch, pero #keeper es hijo de #goal
    // → hay que restar GOAL_LEFT para pintarlo en la posición correcta
    keeperEl.style.left = (keeperX - GOAL_LEFT) + 'px';

    // Balón volando
    if (ballState === 'flying') {
        const elapsedFlight = (ts - shotStartTime) / 1000;
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

    // Activar la reacción del portero
    keeperDiveTgt = tx;
    keeperDiveAt  = shotStartTime + KEEPER_REACT_MS;
    keeperState   = 'reacting';
    updateHUD();
}

function evaluateShot() {
    // Colisión: distancia entre centro del balón y centro del portero
    const dx = Math.abs(targetX - keeperX);

    if (dx <= SAVE_TOL) {
        // Atajado
        saves++;
        ballState = 'saved';
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

    // Portero vuelve a oscilar
    setTimeout(() => {
        keeperEl.classList.remove('lean-left','lean-right');
        keeperState = 'osc';
        // Que retome dirección hacia el centro para variar
        keeperDir = keeperX > (GOAL_LEFT + GOAL_WIDTH / 2) ? -1 : 1;
    }, 500);

    // Revisar victoria
    if (goals >= GOALS_TO_WIN) {
        setTimeout(() => winGame(true), 900);
        return;
    }

    // Revisar derrota (se acabaron los tiros sin llegar a 3)
    if (shots >= MAX_SHOTS) {
        setTimeout(() => winGame(false), 900);
        return;
    }

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
    shotsEl.textContent = 'Tiros: ' + shots + ' / ' + MAX_SHOTS;
}

function updateProgress() {
    const pct = Math.min(100, (goals / GOALS_TO_WIN) * 100);
    progressFill.style.width = pct + '%';
}

// ════════════════════════════════════════════
// WIN / END
// ════════════════════════════════════════════
function winGame(didWin) {
    gameRunning = false;

    gameWrapper.style.display = 'none';
    endScreen.style.display   = 'block';

    const acc = shots > 0 ? (goals / shots * 100) : 0;
    let grade, gColor, headline;
    if (didWin) {
        headline = '⚽ ¡Lo lograste!';
        if      (acc >= 75)  { grade = '⭐ MVP';     gColor = '#ffcc00'; }
        else if (acc >= 50)  { grade = 'GOLEADOR';   gColor = '#00ff88'; }
        else                 { grade = 'CAMPEÓN';    gColor = '#00e5ff'; }
    } else {
        headline = '❌ Sin más tiros';
        grade  = 'SIGUE';
        gColor = '#a855ff';
    }

    document.querySelector('#endScreen h2').textContent = headline;
    document.getElementById('finalScore').textContent = goals + ' / ' + GOALS_TO_WIN + ' goles';
    const gradeEl = document.getElementById('grade');
    gradeEl.textContent      = grade;
    gradeEl.style.color      = gColor;
    gradeEl.style.textShadow = `0 0 35px ${gColor}, 0 0 70px ${gColor}44`;

    document.getElementById('stats').innerHTML = `
        <div>⚽ &nbsp;<b style="color:#fff">${PLAYER_NAME}</b></div>
        <div>Goles: <b style="color:#00ff88">${goals}</b> / ${GOALS_TO_WIN}</div>
        <div>Tiros: <b style="color:#fff">${shots}</b> / ${MAX_SHOTS}</div>
        <div>Atajadas: <b style="color:#ff6688">${saves}</b></div>
        <div>Efectividad: <b style="color:#fff">${acc.toFixed(1)}%</b></div>
    `;

    // 🎂 Solo celebración de cumpleaños si realmente ganó (3 goles)
    if (didWin) showBirthdayAnimation();
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

    // Joel con la copa — imagen real + halo animado
    const champ = document.createElement('div');
    champ.className = 'bday-champ';
    champ.innerHTML = `
      <img class="j-photo" src="assets/joel-champion.png" alt="Joel campeón"/>
      <div class="j-sparkles">
        <span class="j-sp j-sp-1"></span>
        <span class="j-sp j-sp-2"></span>
        <span class="j-sp j-sp-3"></span>
        <span class="j-sp j-sp-4"></span>
        <span class="j-sp j-sp-5"></span>
      </div>
    `;
    overlay.appendChild(champ);

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
