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
let gameRunning   = false;
let gameStartTime = 0;
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
    ytStop();
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
    requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════
// GAME LOOP
// ════════════════════════════════════════════
function gameLoop(ts) {
    if (!gameRunning) return;
    const elapsed = ts - gameStartTime;

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
    const elapsed = performance.now() - gameStartTime;
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

        playSound(lane, true);
        showFeedback(isPerfect ? 'PERFECT!' : 'GOOD!', isPerfect ? '#ffff00' : '#00ff88');
        updateHUD();

        const btn = document.getElementById('btn' + lane);
        btn.style.boxShadow = `0 0 22px ${COLORS[lane]}, 0 0 44px ${COLORS[lane]}44`;
        setTimeout(() => { btn.style.boxShadow = ''; }, 220);
    } else {
        playSound(lane, false);
    }
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
}

// ════════════════════════════════════════════
// YOUTUBE — iframe creado en gesto del usuario
// ════════════════════════════════════════════
const YT_VIDEO_ID = '0y5yloj44Io'; // Risk It All — Bruno Mars

function ytStart() {
    ytStop();
    const f = document.createElement('iframe');
    f.id    = 'ytFrame';
    f.src   = `https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&mute=0&controls=0&rel=0&playsinline=1`;
    f.allow = 'autoplay; encrypted-media';
    f.style.cssText = 'position:fixed;bottom:-400px;right:-400px;width:320px;height:180px;border:none;pointer-events:none;';
    document.body.appendChild(f);
}

function ytStop() {
    const f = document.getElementById('ytFrame');
    if (f) f.remove();
}

// ════════════════════════════════════════════
// BUTTONS
// ════════════════════════════════════════════
document.getElementById('restartBtn').addEventListener('click', () => {
    ytStart();
    initGame();
});
document.getElementById('menuBtn').addEventListener('click', () => {
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
