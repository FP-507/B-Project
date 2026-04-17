'use strict';

// ════════════════════════════════════════════
// PLAYER NAME  (from URL param)
// ════════════════════════════════════════════
const params      = new URLSearchParams(window.location.search);
const PLAYER_NAME = (params.get('nombre') || 'Jugador').slice(0, 20);

// ════════════════════════════════════════════
// RESPONSIVE SCALE
// ════════════════════════════════════════════
const gameWrapper = document.getElementById('gameWrapper');
const GAME_W = 520;
const GAME_H = 660;

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
    const palette = ['#ff0066','#ff6600','#ffff00','#00ff88','#0066ff','#cc00ff','#ff69b4'];
    for (let i = 0; i < 28; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const s = Math.random() * 4 + 2;
        el.style.cssText = [
            `width:${s}px`, `height:${s}px`,
            `left:${Math.random() * 100}%`,
            `background:${palette[Math.floor(Math.random() * palette.length)]}`,
            `opacity:${(Math.random() * 0.35 + 0.08).toFixed(2)}`,
            `animation-duration:${(Math.random() * 14 + 9).toFixed(1)}s`,
            `animation-delay:-${(Math.random() * 20).toFixed(1)}s`,
        ].join(';');
        document.body.appendChild(el);
    }
})();

// ════════════════════════════════════════════
// AUDIO  (feedback de notas)
// ════════════════════════════════════════════
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
// D major pentatonic: D4, F#4, A4, B4, D5  — tono de "Risk It All"
const LANE_FREQ = [293.66, 369.99, 440.00, 493.88, 587.33];

function playSound(lane, hit) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = LANE_FREQ[lane];
        osc.type = hit ? 'sawtooth' : 'sine';
        const vol = hit ? 0.22 : 0.04;
        const dur = hit ? 0.20 : 0.08;
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + dur);
    } catch (_) {}
}

// ════════════════════════════════════════════
// SONG GENERATION  —  "Risk It All" · Bruno Mars
// Bolero romántico · 86 BPM · Re mayor
// Estructura: Intro → V1 → PreC → C1 → V2 → PreC → C2 → Bridge → C final
// ════════════════════════════════════════════
const BPM  = 86;
const BEAT = (60 / BPM) * 1000;   // ~697.7 ms por beat
const HALF = BEAT / 2;             // ~348.8 ms
const QRTR = BEAT / 4;            // ~174.4 ms

function makeSong() {
    const notes = [];
    const add = (lane, t) => notes.push({ lane, time: Math.round(t) });
    const B = BEAT, H = HALF, Q = QRTR;

    // ── INTRO: guitarra acústica, muy espaciado (2 bars) ──────
    function intro(t) {
        add(2, t);           add(0, t+B+H);
        add(3, t+B*2);       add(1, t+B*3+H);
        add(4, t+B*4);       add(2, t+B*5+H);
        add(0, t+B*6);       add(3, t+B*7+H);
        return t + B*8;
    }

    // ── VERSO: ritmo bolero habanera, 5 notas/bar ────────────
    function verse(t) {
        add(1, t);         add(3, t+B);
        add(2, t+B+H);     add(0, t+B*2);     add(4, t+B*2+H);

        add(2, t+B*4);     add(0, t+B*5);
        add(3, t+B*5+H);   add(1, t+B*6);     add(4, t+B*6+H);

        add(3, t+B*8);     add(1, t+B*9);
        add(2, t+B*9+H);   add(4, t+B*10);    add(0, t+B*10+H);

        add(2, t+B*12);    add(4, t+B*13);
        add(1, t+B*13+H);  add(3, t+B*14);    add(0, t+B*14+H);
        return t + B*16;
    }

    // ── PRE-CORO: tensión ascendente ─────────────────────────
    function preChorus(t) {
        add(0, t);       add(2, t+H);       add(1, t+B);
        add(3, t+B+H);   add(0, t+B*2);     add(4, t+B*2+H);
        add(2, t+B*3);   add(1, t+B*3+H);

        add(3, t+B*4);       add(0, t+B*4+H);
        add(4, t+B*5);       add(2, t+B*5+H);
        add(1, t+B*6);       add(3, t+B*6+Q);
        add(0, t+B*6+H);     add(4, t+B*7+H);

        add(2, t+B*8);       add(0, t+B*8+Q);    add(4, t+B*8+H);
        add(2, t+B*8+H+Q);   add(0, t+B*9);      add(3, t+B*9+Q);
        add(1, t+B*9+H);     add(4, t+B*10);     add(2, t+B*10+H);
        add(1, t+B*11);      add(3, t+B*11+H);

        add(0, t+B*12);      add(2, t+B*12+Q);   add(4, t+B*12+H);
        add(1, t+B*12+H+Q);  add(3, t+B*13);     add(0, t+B*13+Q);
        add(2, t+B*13+H);    add(4, t+B*14);     add(1, t+B*14+Q);
        add(3, t+B*14+H);    add(0, t+B*14+H+Q); add(4, t+B*15+H);
        return t + B*16;
    }

    // ── CORO: "I'd risk it all for you" ──────────────────────
    function chorus(t) {
        add(2, t);          add(4, t+Q);        add(1, t+H);
        add(3, t+B);        add(0, t+B+H);
        add(4, t+B*2);      add(2, t+B*2+H);
        add(1, t+B*3);      add(3, t+B*3+H);

        add(2, t+B*4);      add(4, t+B*4+Q);    add(1, t+B*4+H);
        add(3, t+B*5);      add(0, t+B*5+H);
        add(4, t+B*6);      add(2, t+B*6+Q);    add(1, t+B*6+H);
        add(3, t+B*7);      add(0, t+B*7+H);

        add(0, t+B*8);      add(2, t+B*8+Q);    add(4, t+B*8+H);
        add(2, t+B*8+H+Q);  add(0, t+B*9);      add(3, t+B*9+Q);
        add(1, t+B*9+H);    add(4, t+B*10);     add(2, t+B*10+H);
        add(0, t+B*11);     add(3, t+B*11+H);

        add(2, t+B*12);     add(0, t+B*12+Q);   add(4, t+B*12+H);
        add(1, t+B*13);     add(3, t+B*13+H);
        add(2, t+B*14);     add(0, t+B*14+H);
        add(4, t+B*15+H);
        return t + B*16;
    }

    // ── BRIDGE: dramático, escalas ───────────────────────────
    function bridge(t) {
        for (let i = 0; i < 5; i++) add(i, t + i*H);
        for (let i = 4; i >= 0; i--) add(i, t + B*4 + (4-i)*H);
        [2,0,4,2,0,4,2,4].forEach((l,i) => add(l, t + B*8  + i*Q));
        [1,3,2,1,3,0,4,2].forEach((l,i) => add(l, t + B*12 + i*Q));
        return t + B*16;
    }

    // ── ESTRUCTURA ───────────────────────────────────────────
    let t = 2500;

    t = intro(t);

    t = verse(t);
    t = verse(t);

    t = preChorus(t);

    t = chorus(t);
    t = chorus(t);

    t = verse(t);
    t = verse(t);

    t = preChorus(t);

    t = chorus(t);
    t = chorus(t);

    t = bridge(t);
    t = bridge(t);

    t = chorus(t);
    t = chorus(t);
    t = chorus(t);

    return { notes: notes.sort((a,b) => a.time - b.time), duration: t + 2000 };
}

// ════════════════════════════════════════════
// GAME CONSTANTS
// ════════════════════════════════════════════
const COLORS    = ['#00cc00','#cc0000','#cccc00','#3399ff','#ff6600'];
const COLORS_BG = [
    'rgba(0,204,0,0.17)',   'rgba(204,0,0,0.17)',
    'rgba(204,204,0,0.17)', 'rgba(51,153,255,0.17)',
    'rgba(255,102,0,0.17)',
];
const HW_H      = 600;
const HIT_Y     = HW_H - 80;
const NOTE_SPD  = 300;
const SPAWN_ADV = (HIT_Y / NOTE_SPD) * 1000;
const HIT_WIN   = 125;
const PERF_WIN  = 55;

// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
let gameRunning    = false;
let gameStartTime  = 0;      // fallback performance.now() anchor
let audioAnchorSec = 0;      // songAudio.currentTime capturado al empezar

// Calibración: ajusta si las notas caen adelantadas/retrasadas respecto al audio.
// Positivo = notas caen MÁS TARDE (si sientes que llegan antes del beat).
// Negativo = notas caen MÁS TEMPRANO (si sientes que llegan después del beat).
// Puedes sobrescribir con ?cal=150 en la URL.
const _urlCal   = parseInt(new URLSearchParams(location.search).get('cal'));
const CAL_OFFSET = isFinite(_urlCal) ? _urlCal : 0;

function getElapsed() {
    // Preferimos el reloj del audio — lo que escuchas es la verdad
    if (songAudio && !songAudio.paused && songAudio.readyState >= 2) {
        return (songAudio.currentTime - audioAnchorSec) * 1000 + CAL_OFFSET;
    }
    // Fallback si el audio todavía no está listo
    return performance.now() - gameStartTime + CAL_OFFSET;
}
let song          = null;
let noteQueue     = [];
let activeNotes   = [];
let score         = 0, combo = 0, maxCombo = 0;
let totalNotes    = 0, hitNotes = 0, perfectHits = 0;

// ════════════════════════════════════════════
// DOM REFS
// ════════════════════════════════════════════
const endScreen    = document.getElementById('endScreen');
const highway      = document.getElementById('highway');
const scoreEl      = document.getElementById('scoreDisplay');
const comboEl      = document.getElementById('comboDisplay');
const playerNameEl = document.getElementById('playerNameDisplay');
const feedbackEl   = document.getElementById('feedback');
const countdownEl  = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');

// ════════════════════════════════════════════
// GAME FLOW
// ════════════════════════════════════════════
function initGame() {
    // NOTA: no llamamos ytStop() aquí — la música se inicia en handleTap()/restartBtn
    // justo antes de initGame(), así que ytStop() aquí la mataría de inmediato.
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playerNameEl.textContent = '🎸 ' + PLAYER_NAME;

    score = 0; combo = 0; maxCombo = 0;
    hitNotes = 0; perfectHits = 0;
    activeNotes = [];
    highway.querySelectorAll('.note').forEach(el => el.remove());

    song       = makeSong();
    noteQueue  = [...song.notes];
    totalNotes = song.notes.length;

    endScreen.style.display   = 'none';
    gameWrapper.style.display = 'flex';
    applyScale();
    updateHUD();
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
            countdownEl.textContent = '¡YA!';
            setTimeout(() => {
                countdownEl.classList.remove('visible');
                beginGame();
            }, 500);
        }
    }, 800);
}

function beginGame() {
    gameRunning   = true;
    gameStartTime = performance.now();
    // Ancla el reloj del juego al tiempo ACTUAL del audio — así lo que escuchas
    // y lo que cae siempre están en fase, aun si hubo retraso al cargar.
    audioAnchorSec = (songAudio && songAudio.currentTime) ? songAudio.currentTime : 0;
    requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════
// GAME LOOP
// ════════════════════════════════════════════
function gameLoop(ts) {
    if (!gameRunning) return;
    const elapsed = getElapsed();

    progressFill.style.width = Math.min(100, elapsed / song.duration * 100) + '%';

    while (noteQueue.length > 0 && noteQueue[0].time - elapsed <= SPAWN_ADV + 120)
        spawnNote(noteQueue.shift());

    for (let i = activeNotes.length - 1; i >= 0; i--) {
        const n = activeNotes[i];
        const y = ((elapsed - (n.time - SPAWN_ADV)) / 1000) * NOTE_SPD;
        n.el.style.top = y + 'px';

        if (y > HIT_Y + 65) {
            n.el.style.opacity = '0.12';
            const el = n.el;
            setTimeout(() => el.remove(), 280);
            activeNotes.splice(i, 1);
            combo = 0;
            updateHUD();
            showFeedback('MISS', '#ff4040');
        }
    }

    if (elapsed >= song.duration && noteQueue.length === 0 && activeNotes.length === 0) {
        endGame(); return;
    }
    requestAnimationFrame(gameLoop);
}

function spawnNote(note) {
    const el = document.createElement('div');
    el.className = 'note';
    el.style.left        = (note.lane * 100 + 9) + 'px';
    el.style.top         = '-30px';
    el.style.background  = COLORS_BG[note.lane];
    el.style.borderColor = COLORS[note.lane];
    el.style.boxShadow   = `0 0 9px ${COLORS[note.lane]}, inset 0 1px 0 rgba(255,255,255,0.2)`;
    highway.appendChild(el);
    activeNotes.push({ ...note, el });
}

// ════════════════════════════════════════════
// HIT LOGIC
// ════════════════════════════════════════════
function pressLane(lane) {
    if (!gameRunning) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('btn' + lane).classList.add('active');
    tryHit(lane);
}
function releaseLane(lane) {
    document.getElementById('btn' + lane).classList.remove('active');
}

function tryHit(lane) {
    const elapsed = getElapsed();
    let best = null, bestDist = HIT_WIN + 1;
    for (const n of activeNotes) {
        if (n.lane !== lane) continue;
        const dist = Math.abs(elapsed - n.time);
        if (dist < bestDist) { best = n; bestDist = dist; }
    }

    if (best) {
        const idx = activeNotes.indexOf(best);
        if (idx !== -1) activeNotes.splice(idx, 1);

        const isPerfect = bestDist <= PERF_WIN;
        const mult      = Math.min(4, 1 + Math.floor(combo / 10));
        score += (isPerfect ? 100 : 50) * mult;
        combo++; maxCombo = Math.max(maxCombo, combo);
        hitNotes++; if (isPerfect) perfectHits++;

        best.el.style.background = COLORS[lane] + 'aa';
        best.el.style.transform  = 'scaleY(0.4)';
        best.el.style.transition = 'opacity 0.1s, transform 0.1s';
        const el = best.el;
        setTimeout(() => el.remove(), 120);

        // Cada 10 de combo un mensaje especial de ánimo
        const milestone = isPerfect && combo > 0 && combo % 10 === 0;
        const fbText  = milestone ? '¡INCREÍBLE!' : (isPerfect ? 'PERFECT!' : 'GOOD!');
        const fbColor = milestone ? '#00e5ff' : (isPerfect ? '#ffff00' : '#00ff88');
        showFeedback(fbText, fbColor);
        updateHUD();

        const btn = document.getElementById('btn' + lane);
        btn.style.boxShadow = `0 0 22px ${COLORS[lane]}, 0 0 44px ${COLORS[lane]}44`;
        setTimeout(() => { btn.style.boxShadow = ''; }, 220);
    }
    // Sin sonido sintético cuando fallas — solo la canción de fondo
}

// ════════════════════════════════════════════
// TOUCH INPUT
// ════════════════════════════════════════════
const touchLanes = new Map();

document.querySelectorAll('.lane-touch').forEach(zone => {
    const lane = parseInt(zone.dataset.lane);

    zone.addEventListener('touchstart', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (!touchLanes.has(t.identifier)) {
                touchLanes.set(t.identifier, lane);
                pressLane(lane);
            }
        }
    }, { passive: false });

    zone.addEventListener('touchend', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (touchLanes.get(t.identifier) === lane) {
                touchLanes.delete(t.identifier);
                releaseLane(lane);
            }
        }
    }, { passive: false });

    zone.addEventListener('touchcancel', e => {
        for (const t of e.changedTouches) {
            if (touchLanes.has(t.identifier)) {
                releaseLane(touchLanes.get(t.identifier));
                touchLanes.delete(t.identifier);
            }
        }
    }, { passive: false });

    // ── MOUSE (PC) ───────────────────────────────────────────
    zone.addEventListener('mousedown', e => {
        e.preventDefault();
        pressLane(lane);
        const up = () => {
            releaseLane(lane);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mouseup', up);
    });

    // evitar "fantasma" de selección
    zone.addEventListener('contextmenu', e => e.preventDefault());
});

// También aceptamos los botones visibles (los de colores) como clickeables
document.querySelectorAll('.hit-btn').forEach((btn, lane) => {
    btn.addEventListener('mousedown', e => {
        e.preventDefault();
        pressLane(lane);
        const up = () => {
            releaseLane(lane);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mouseup', up);
    });
});

// ── TECLADO (opcional, bonus para PC) ────────────────────
// A S D F G → carriles 0..4
const KEY_MAP = { 'a':0, 's':1, 'd':2, 'f':3, 'g':4 };
const keyHeld = new Set();
window.addEventListener('keydown', e => {
    const lane = KEY_MAP[e.key.toLowerCase()];
    if (lane === undefined || keyHeld.has(lane)) return;
    keyHeld.add(lane);
    pressLane(lane);
});
window.addEventListener('keyup', e => {
    const lane = KEY_MAP[e.key.toLowerCase()];
    if (lane === undefined) return;
    keyHeld.delete(lane);
    releaseLane(lane);
});

// ════════════════════════════════════════════
// HUD
// ════════════════════════════════════════════
function updateHUD() {
    scoreEl.textContent = String(score).padStart(6, '0');
    const mult = Math.min(4, 1 + Math.floor(combo / 10));
    comboEl.innerHTML = `x${combo} <span style="font-size:.7rem;color:#ffaa00">×${mult}</span>`;
}

// ════════════════════════════════════════════
// FEEDBACK POPUP
// ════════════════════════════════════════════
function showFeedback(text, color) {
    feedbackEl.textContent      = text;
    feedbackEl.style.color      = color;
    feedbackEl.style.textShadow = `0 0 18px ${color}`;
    feedbackEl.className        = '';
    void feedbackEl.offsetWidth;
    feedbackEl.className        = 'fb-anim';
}

// ════════════════════════════════════════════
// END GAME
// ════════════════════════════════════════════
function endGame() {
    gameRunning = false;
    ytStop();
    highway.querySelectorAll('.note').forEach(el => el.remove());
    activeNotes = [];

    gameWrapper.style.display = 'none';
    endScreen.style.display   = 'block';

    const acc = totalNotes > 0 ? hitNotes / totalNotes * 100 : 0;
    let grade, gColor;
    if      (acc >= 95) { grade = 'S'; gColor = '#ffff00'; }
    else if (acc >= 80) { grade = 'A'; gColor = '#00ff88'; }
    else if (acc >= 65) { grade = 'B'; gColor = '#3399ff'; }
    else if (acc >= 50) { grade = 'C'; gColor = '#ff6600'; }
    else                { grade = 'D'; gColor = '#cc4444'; }

    document.getElementById('finalScore').textContent = score.toLocaleString() + ' pts';
    const gradeEl = document.getElementById('grade');
    gradeEl.textContent      = grade;
    gradeEl.style.color      = gColor;
    gradeEl.style.textShadow = `0 0 35px ${gColor}, 0 0 70px ${gColor}44`;

    document.getElementById('stats').innerHTML = `
        <div>🎸 &nbsp;<b style="color:#fff">${PLAYER_NAME}</b></div>
        <div>Notas acertadas: <b style="color:#fff">${hitNotes} / ${totalNotes}</b></div>
        <div>Perfects: <b style="color:#ffff00">${perfectHits}</b></div>
        <div>Precisión: <b style="color:#fff">${acc.toFixed(1)}%</b></div>
        <div>Combo máximo: <b style="color:#00ffff">${maxCombo}</b></div>
    `;

    // 🎂 Animación de cumpleaños
    showBirthdayAnimation();
}

// ════════════════════════════════════════════
// 🎂 BIRTHDAY ANIMATION
// ════════════════════════════════════════════
function showBirthdayAnimation() {
    // Evita duplicar si ya existe
    const prev = document.getElementById('birthdayOverlay');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id = 'birthdayOverlay';

    // Título gigante
    const title = document.createElement('div');
    title.className = 'bday-title';
    title.innerHTML = `
        🎂 ¡FELIZ CUMPLE! 🎉<br>
        <span style="display:block">JANETH</span>
    `;
    overlay.appendChild(title);

    // Confeti — colores variados, cae de arriba
    const confettiColors = [
        '#ff0066','#ff3388','#ffcc00','#ffaa00',
        '#00ffaa','#00cc88','#00aaff','#0066ff',
        '#cc00ff','#ff66cc','#ffffff'
    ];
    for (let i = 0; i < 120; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        const size = 6 + Math.random() * 10;
        const w    = size;
        const h    = size + Math.random() * 6;
        c.style.left            = Math.random() * 100 + 'vw';
        c.style.width           = w + 'px';
        c.style.height          = h + 'px';
        c.style.background      = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        c.style.animationDelay    = (Math.random() * 4).toFixed(2) + 's';
        c.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + 's';
        c.style.transform       = `rotate(${Math.random() * 360}deg)`;
        c.style.borderRadius    = Math.random() < 0.3 ? '50%' : '2px';
        overlay.appendChild(c);
    }

    // Iconos festivos flotantes (globos, regalos, estrellas, etc.)
    const partyIcons = ['🎈','🎁','🎉','🎊','⭐','✨','🥳','🍰','🎂'];
    for (let i = 0; i < 24; i++) {
        const h = document.createElement('div');
        h.className = 'bday-heart';
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
    // Forzar reflow antes de añadir .visible para que transicione
    void overlay.offsetWidth;
    overlay.classList.add('visible');
}

function hideBirthdayAnimation() {
    const o = document.getElementById('birthdayOverlay');
    if (o) o.remove();
}

// ════════════════════════════════════════════
// AUDIO LOCAL — sin restricciones de embed
// ════════════════════════════════════════════
const SONG_URL = 'audio/risk-it-all.mp3';
let songAudio = null;

// Precargamos desde ya para que el primer play sea instantáneo
const songPreload = new Audio();
songPreload.preload = 'auto';
songPreload.src     = SONG_URL;

function showAudioBanner(msg, isError) {
    let b = document.getElementById('audioBanner');
    if (!b) {
        b = document.createElement('div');
        b.id = 'audioBanner';
        b.style.cssText = [
            'position:fixed','top:8px','left:50%','transform:translateX(-50%)',
            'background:rgba(0,0,0,0.85)','padding:8px 14px','border-radius:6px',
            'font-family:Arial,sans-serif','font-size:0.75rem','letter-spacing:1px',
            'z-index:9999','pointer-events:auto','cursor:pointer',
            'box-shadow:0 4px 12px rgba(0,0,0,0.5)'
        ].join(';');
        b.addEventListener('click', () => {
            if (songAudio) songAudio.play().catch(() => {});
            b.remove();
        });
        document.body.appendChild(b);
    }
    b.style.color  = isError ? '#ff6688' : '#ff69b4';
    b.style.border = '1px solid ' + (isError ? '#ff3366' : '#ff69b4');
    b.textContent  = msg;
}

function ytStart() {
    ytStop();
    songAudio = new Audio(SONG_URL);
    songAudio.preload = 'auto';
    songAudio.loop    = false;
    songAudio.volume  = 0.7;

    songAudio.addEventListener('error', () => {
        const code = songAudio.error ? songAudio.error.code : '?';
        showAudioBanner('♪ No se pudo cargar el audio (err ' + code + ') — revisa audio/risk-it-all.mp3', true);
    });

    const p = songAudio.play();
    if (p && p.catch) {
        p.catch(err => {
            console.warn('Audio autoplay bloqueado:', err);
            showAudioBanner('♪ TOCA AQUÍ para activar la música', false);
        });
    }
}

function ytStop() {
    if (songAudio) {
        songAudio.pause();
        songAudio.currentTime = 0;
        songAudio = null;
    }
    const b = document.getElementById('audioBanner');
    if (b) b.remove();
}

// ════════════════════════════════════════════
// BUTTONS
// ════════════════════════════════════════════
document.getElementById('restartBtn').addEventListener('click', () => {
    hideBirthdayAnimation();
    ytStart();
    initGame();
});
document.getElementById('menuBtn').addEventListener('click', () => {
    hideBirthdayAnimation();
    ytStop();
    window.location.href = 'index.html';
});

// ════════════════════════════════════════════
// TAP OVERLAY — primer gesto que desbloquea audio
// ════════════════════════════════════════════
const tapOverlay = document.getElementById('tapOverlay');

function handleTap() {
    tapOverlay.classList.add('hidden');
    setTimeout(() => tapOverlay.remove(), 320);
    ytStart();   // navegador permite autoplay aquí
    initGame();
}

tapOverlay.addEventListener('touchend', e => { e.preventDefault(); handleTap(); }, { passive: false });
tapOverlay.addEventListener('click', handleTap);
