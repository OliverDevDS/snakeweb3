// ─── Audio Engine ─────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playTone(freq, type, duration, volume, startTime) {
    if (audioMuted) return;
    try {
        const ctx = getAudio();
        if (ctx.state === "suspended") ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type || "square";
        osc.frequency.setValueAtTime(freq, startTime || ctx.currentTime);
        gain.gain.setValueAtTime(volume || 0.15, startTime || ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, (startTime || ctx.currentTime) + duration);
        osc.start(startTime || ctx.currentTime);
        osc.stop((startTime || ctx.currentTime) + duration);
    } catch (e) {}
}

const SFX = {
    move()  { playTone(220, "square", 0.04, 0.05); },
    eat() {
        const ctx = getAudio(), t = ctx.currentTime;
        playTone(440, "square", 0.08, 0.15, t);
        playTone(660, "square", 0.08, 0.15, t + 0.08);
        playTone(880, "square", 0.12, 0.2,  t + 0.16);
    },
    eatBonus() {
        const ctx = getAudio(), t = ctx.currentTime;
        playTone(523, "square", 0.07, 0.2, t);
        playTone(784, "square", 0.07, 0.2, t + 0.07);
        playTone(1046,"square", 0.07, 0.2, t + 0.14);
        playTone(1318,"square", 0.12, 0.3, t + 0.21);
    },
    die() {
        const ctx = getAudio(), t = ctx.currentTime;
        playTone(400, "sawtooth", 0.1,  0.2,  t);
        playTone(300, "sawtooth", 0.1,  0.2,  t + 0.1);
        playTone(200, "sawtooth", 0.15, 0.25, t + 0.2);
        playTone(100, "sawtooth", 0.3,  0.3,  t + 0.35);
    },
    spin() {
        const ctx = getAudio(), t = ctx.currentTime;
        for (let i = 0; i < 8; i++) playTone(200 + i * 80, "square", 0.08, 0.1 + i * 0.01, t + i * 0.07);
    },
    start() {
        const ctx = getAudio(), t = ctx.currentTime;
        [262, 330, 392, 523].forEach((f, i) => playTone(f, "triangle", 0.15, 0.15, t + i * 0.1));
    },
    milestone() {
        const ctx = getAudio(), t = ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => playTone(f, "square", 0.12, 0.2, t + i * 0.08));
    }
};

// ─── Audio Mute ───────────────────────────────────────────────────────────────
let audioMuted = false;
window.toggleMute = function() {
    audioMuted = !audioMuted;
    const btn = document.getElementById("muteBtn");
    if (btn) btn.textContent = audioMuted ? "🔇 Muted" : "🔊 Sound";
};

// toggleMute controls audioMuted flag; playTone already checks it

// ─── Slot Machine Animation ───────────────────────────────────────────────────
// Estados: "off" | "spinning" | "result"
let slotState   = "off";
let slotResult  = 0;
let slotFrame   = 0;
let slotCurrent = 1;
let slotTick    = 0;
const SLOT_DURATION = 25;
const SLOT_NUMS = [1, 2, 3, 5, 10];

function startSlotAnimation(result) {
    slotState   = "spinning";
    slotResult  = result;
    slotFrame   = 0;
    slotCurrent = SLOT_NUMS[Math.floor(Math.random() * SLOT_NUMS.length)];
    slotTick    = 0;
}

function updateSlot() {
    if (slotState !== "spinning") return;
    slotFrame++;
    slotTick++;
    const progress = slotFrame / SLOT_DURATION;
    const interval = Math.max(1, Math.floor(1 + progress * 4));
    if (slotTick >= interval) {
        slotTick = 0;
        slotCurrent = slotFrame >= SLOT_DURATION - 5
            ? slotResult
            : SLOT_NUMS[Math.floor(Math.random() * SLOT_NUMS.length)];
    }
    if (slotFrame >= SLOT_DURATION) {
        slotState   = "result";
        slotCurrent = slotResult;
        // Fecha após 1.4s
        setTimeout(() => { slotState = "off"; }, 1400);
    }
}

function drawSlotOverlay() {
    if (slotState === "off") return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const chainColor = getChainColor();
    const isResult = slotState === "result";

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Caixa central
    const bw = 200, bh = 120;
    ctx.strokeStyle = chainColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = chainColor;
    ctx.strokeRect(cx - bw/2, cy - bh/2, bw, bh);
    ctx.shadowBlur = 0;

    // Números ao redor (só durante animação)
    if (!isResult) {
        const decorNums = [1, 2, 3, 5, 10];
        decorNums.forEach((n, i) => {
            const angle = (i / decorNums.length) * Math.PI * 2 - Math.PI / 2;
            const nx = cx + Math.cos(angle) * 92;
            const ny = cy + Math.sin(angle) * 92;
            const hl = n === slotCurrent;
            ctx.save();
            ctx.globalAlpha = hl ? 1 : 0.2;
            ctx.fillStyle = hl ? chainColor : "#fff";
            ctx.font = "bold 16px 'Courier New'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (hl) { ctx.shadowBlur = 14; ctx.shadowColor = chainColor; }
            ctx.fillText(n, nx, ny);
            ctx.restore();
        });
    }

    // Número central grande
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isResult) {
        ctx.font = "bold 72px 'Courier New'";
        ctx.fillStyle = chainColor;
        ctx.shadowBlur = 30;
        ctx.shadowColor = chainColor;
        ctx.fillText(slotResult, cx, cy - 10);
        ctx.shadowBlur = 0;
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillStyle = "#fff";
        ctx.fillText(`+${slotResult} moves!`, cx, cy + 44);
    } else {
        ctx.font = "bold 72px 'Courier New'";
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.9;
        ctx.fillText(slotCurrent, cx, cy - 10);
        ctx.globalAlpha = 1;
        ctx.font = "12px 'Courier New'";
        ctx.fillStyle = "#ffffff66";
        ctx.fillText("sorteando...", cx, cy + 44);
    }

    ctx.restore();
}

// ─── Particle System ──────────────────────────────────────────────────────────
// Particles are purely visual — never affect game logic
const particles = [];

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 1.5 + Math.random() * 3;
        particles.push({
            x: x + 10, y: y + 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.04,
            size: 2 + Math.random() * 4,
            color: color || "#00ff44"
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });
}

// ─── Screen Shake ─────────────────────────────────────────────────────────────
let shakeIntensity = 0, shakeDuration = 0, shakeX = 0, shakeY = 0;

function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration  = duration;
}

function updateShake() {
    if (shakeDuration > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
        shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
        shakeDuration--;
        shakeIntensity *= 0.9;
    } else { shakeX = 0; shakeY = 0; }
}

// ─── Floating Score Texts ─────────────────────────────────────────────────────
const floatingTexts = [];

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x: x + 10, y, text, color: color || "#00ff44", life: 1.0, vy: -1.5 });
}

function drawFloatingTexts() {
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ft.color;
        ctx.font = "bold 14px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        ft.y  += ft.vy;
        ft.life -= 0.025;
    });
    for (let i = floatingTexts.length - 1; i >= 0; i--)
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
}

// ─── Estado Global ────────────────────────────────────────────────────────────
window.steps = 0;
let score = 0;
let gameOver = false;
let snake = [{ x: 200, y: 200 }];

// food: comida normal sempre presente { x, y, type:"normal" }
// bonusFood: comida especial opcional { x, y, type, framesLeft } | null
let food = { x: 100, y: 100, type: "normal" };
let bonusFood = null;
const BONUS_LIFETIME = 60; // frames que a comida especial fica na tela (~8s a 140ms/frame)

let dx = 0, dy = 0;
const gridSize = 20;
let gameInterval = null;
let gameStarted  = false;
let frameCount   = 0;
let bgStars      = [];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ─── Stars ────────────────────────────────────────────────────────────────────
function generateStars() {
    bgStars = [];
    for (let i = 0; i < 40; i++) {
        bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            alpha: Math.random() * 0.3 + 0.05,
            pulse: Math.random() * Math.PI * 2
        });
    }
}
generateStars();

// ─── Keyboard Controls ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    // Space = restart when game over, or start direction
    if (e.code === "Space") {
        e.preventDefault();
        if (gameOver) { restartGame(); return; }
        if (!gameStarted && window.steps > 0) { window.startGameLoop(); return; }
        if (gameStarted && dx === 0 && dy === 0 && window.steps > 0) {
            dx = gridSize; dy = 0;
        }
        return;
    }
    // Auto-inicia com teclas direcionais se wallet ok mas loop não iniciado
    if (!gameStarted && window.steps > 0) window.startGameLoop();
    if (gameOver || !gameStarted) return;
    const moves = {
        ArrowUp:    () => dy === 0 && (dx = 0,  dy = -gridSize),
        ArrowDown:  () => dy === 0 && (dx = 0,  dy =  gridSize),
        ArrowLeft:  () => dx === 0 && (dx = -gridSize, dy = 0),
        ArrowRight: () => dx === 0 && (dx =  gridSize, dy = 0),
        w: () => dy === 0 && (dx = 0,  dy = -gridSize),
        s: () => dy === 0 && (dx = 0,  dy =  gridSize),
        a: () => dx === 0 && (dx = -gridSize, dy = 0),
        d: () => dx === 0 && (dx =  gridSize, dy = 0),
    };
    if (moves[e.key]) { e.preventDefault(); moves[e.key](); }
});

// ─── Mobile Controls ──────────────────────────────────────────────────────────
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (!gameStarted || gameOver) return;
    const ddx = e.changedTouches[0].clientX - touchStartX;
    const ddy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(ddx) > Math.abs(ddy)) {
        if (ddx > 20  && dx === 0) { dx = gridSize;  dy = 0; }
        else if (ddx < -20 && dx === 0) { dx = -gridSize; dy = 0; }
    } else {
        if (ddy > 20  && dy === 0) { dx = 0; dy = gridSize;  }
        else if (ddy < -20 && dy === 0) { dx = 0; dy = -gridSize; }
    }
    e.preventDefault();
}, { passive: false });

window.moveSnake = function(dir) {
    // Auto-inicia o loop se wallet conectada mas startGameLoop ainda não foi chamado
    if (!gameStarted && window.steps > 0) window.startGameLoop();
    if (!gameStarted || gameOver) return;
    if (dir === "up"    && dy === 0) { dx = 0; dy = -gridSize; }
    if (dir === "down"  && dy === 0) { dx = 0; dy =  gridSize; }
    if (dir === "left"  && dx === 0) { dx = -gridSize; dy = 0; }
    if (dir === "right" && dx === 0) { dx =  gridSize; dy = 0; }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getChainColor() {
    return (window.activeChain && window.activeChain.color) || "#00ff44";
}

function isArcChain() {
    return window.activeChain && window.activeChain.id === "arc";
}

// ─── Draw Background ──────────────────────────────────────────────────────────
function drawBackground() {
    ctx.fillStyle = "#050a05";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bgStars.forEach(s => {
        s.pulse += 0.02;
        const alpha = s.alpha + Math.sin(s.pulse) * 0.05;
        ctx.fillStyle = `rgba(0,255,68,${alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Vignette
    const grad = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.width * 0.2,
        canvas.width/2, canvas.height/2, canvas.width * 0.75
    );
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── Draw Snake ───────────────────────────────────────────────────────────────
function drawSnake() {
    const chainColor = getChainColor();
    snake.forEach((seg, i) => {
        const alpha = i === 0 ? 1 : Math.max(0.3, 1 - (i / snake.length) * 0.6);
        ctx.save();
        ctx.globalAlpha = alpha;

        if (i === 0) {
            // Head glow
            ctx.shadowBlur = 14 + Math.sin(frameCount * 0.15) * 4;
            ctx.shadowColor = chainColor;
            ctx.fillStyle = chainColor;
            ctx.fillRect(seg.x + 1, seg.y + 1, gridSize - 2, gridSize - 2);

            // Eyes
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#000";
            if (dx > 0) {
                ctx.fillRect(seg.x + 13, seg.y + 4,  3, 3);
                ctx.fillRect(seg.x + 13, seg.y + 13, 3, 3);
            } else if (dx < 0) {
                ctx.fillRect(seg.x + 4, seg.y + 4,  3, 3);
                ctx.fillRect(seg.x + 4, seg.y + 13, 3, 3);
            } else if (dy < 0) {
                ctx.fillRect(seg.x + 4,  seg.y + 4, 3, 3);
                ctx.fillRect(seg.x + 13, seg.y + 4, 3, 3);
            } else {
                ctx.fillRect(seg.x + 4,  seg.y + 13, 3, 3);
                ctx.fillRect(seg.x + 13, seg.y + 13, 3, 3);
            }
        } else {
            const t = i / snake.length;
            const r = parseInt(chainColor.slice(1,3), 16);
            const g = parseInt(chainColor.slice(3,5), 16);
            const b = parseInt(chainColor.slice(5,7), 16);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = chainColor;
            ctx.fillRect(seg.x + 2, seg.y + 2, gridSize - 4, gridSize - 4);
        }
        ctx.restore();
    });
}

// ─── Draw Food ────────────────────────────────────────────────────────────────
function drawSingleFood(f, alpha) {
    const pulse  = 0.85 + Math.sin(frameCount * 0.12) * 0.12;
    const size   = (gridSize - 4) * pulse;
    const offset = (gridSize - size) / 2;
    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;

    if (f.type === "bonus5") {
        ctx.shadowBlur = 18 + Math.sin(frameCount * 0.1) * 8;
        ctx.shadowColor = "#ffd700";
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(f.x + offset, f.y + offset, size, size);
        ctx.shadowBlur = 4; ctx.fillStyle = "#fff8";
        ctx.fillRect(f.x + offset + 3, f.y + offset + 3, size - 6, size - 6);
        ctx.shadowBlur = 0; ctx.fillStyle = "#000";
        ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
        ctx.fillText("5", f.x + gridSize / 2, f.y + gridSize / 2 + 4);
        ctx.textAlign = "left";
    } else if (f.type === "bonus2") {
        ctx.shadowBlur = 14 + Math.sin(frameCount * 0.1) * 6;
        ctx.shadowColor = "#cc44ff";
        ctx.fillStyle = "#cc44ff";
        ctx.fillRect(f.x + offset, f.y + offset, size, size);
        ctx.shadowBlur = 4; ctx.fillStyle = "#fff8";
        ctx.fillRect(f.x + offset + 3, f.y + offset + 3, size - 6, size - 6);
        ctx.shadowBlur = 0; ctx.fillStyle = "#000";
        ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
        ctx.fillText("2", f.x + gridSize / 2, f.y + gridSize / 2 + 4);
        ctx.textAlign = "left";
    } else {
        ctx.shadowBlur = 15 + Math.sin(frameCount * 0.1) * 8;
        ctx.shadowColor = "#ff3333"; ctx.fillStyle = "#FF3333";
        ctx.fillRect(f.x + offset, f.y + offset, size, size);
        ctx.shadowBlur = 4; ctx.shadowColor = "#ffaaaa"; ctx.fillStyle = "#ff8888";
        ctx.fillRect(f.x + offset + 3, f.y + offset + 3, size - 6, size - 6);
    }
    ctx.restore();
}

function drawFood() {
    drawSingleFood(food, 1);
    if (bonusFood) {
        const alpha = bonusFood.framesLeft < 15 ? bonusFood.framesLeft / 15 : 1;
        drawSingleFood(bonusFood, alpha);
    }
}

// ─── Draw Border Glow ─────────────────────────────────────────────────────────
function drawBorderGlow() {
    const chainColor = getChainColor();
    const intensity = 0.5 + Math.sin(frameCount * 0.05) * 0.3;
    ctx.save();
    ctx.strokeStyle = chainColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15 * intensity;
    ctx.shadowColor = chainColor;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.restore();
}

// ─── Chain Logo ───────────────────────────────────────────────────────────────
const arcLogo = new Image();
arcLogo.src = "https://pbs.twimg.com/profile_images/1880001542566756352/PmhJD1uZ_400x400.jpg";

function drawChainWatermark() {
    const chainColor = getChainColor();
    ctx.save();

    if (isArcChain() && arcLogo.complete && arcLogo.naturalWidth > 0) {
        // Logo Arc centralizado com baixa opacidade
        const size = 80;
        const x = canvas.width / 2 - size / 2;
        const y = canvas.height / 2 - size / 2;
        ctx.globalAlpha = 0.07;
        ctx.drawImage(arcLogo, x, y, size, size);
    } else {
        // Texto fallback
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = chainColor;
        ctx.font = "bold 72px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText(isArcChain() ? "ARC" : "RH", canvas.width / 2, canvas.height / 2 + 26);
    }
    ctx.restore();
}

// ─── Draw Overlay (start / idle) ──────────────────────────────────────────────
function drawOverlay() {
    const chainColor = getChainColor();
    if (!gameStarted || (dx === 0 && dy === 0 && !gameOver)) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, canvas.height / 2 - 42, canvas.width, 84);

        ctx.strokeStyle = `${chainColor}80`;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, canvas.height / 2 - 42, canvas.width, 84);

        ctx.fillStyle = chainColor;
        ctx.font = "bold 16px 'Courier New'";
        ctx.textAlign = "center";
        ctx.shadowBlur = 10;
        ctx.shadowColor = chainColor;

        if (!gameStarted) {
            ctx.fillText("🔗 Connect your wallet to play", canvas.width / 2, canvas.height / 2 - 12);
            ctx.font = "12px 'Courier New'";
            ctx.shadowBlur = 5;
            ctx.fillText("spin the wheel to earn moves", canvas.width / 2, canvas.height / 2 + 10);
        } else if (window.steps <= 0) {
            ctx.fillText("🎰 Spin the wheel to earn moves!", canvas.width / 2, canvas.height / 2);
        } else {
            if (frameCount % 60 < 40) {
                ctx.fillText("▶ Arrow keys / WASD to start", canvas.width / 2, canvas.height / 2 - 8);
                ctx.font = "11px 'Courier New'";
                ctx.shadowBlur = 4;
                ctx.fillText("[SPACE] to restart after game over", canvas.width / 2, canvas.height / 2 + 14);
            }
        }
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
    }
}

// ─── Draw Roulette Overlay ────────────────────────────────────────────────────

// ─── Main Draw ────────────────────────────────────────────────────────────────
function draw() {
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawChainWatermark();
    drawSnake();
    drawFood();
    drawParticles();
    drawFloatingTexts();
    drawBorderGlow();
    drawOverlay();

    if (slotState !== "off") drawSlotOverlay();

    ctx.restore();
    frameCount++;
}

// ─── Main Loop ────────────────────────────────────────────────────────────────
async function update() {
    updateShake();
    updateParticles();
    if (slotState === "spinning") { updateSlot(); draw(); return; }

    if (window.steps <= 0 || (dx === 0 && dy === 0) || gameOver) {
        draw(); return;
    }

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        spawnParticles(snake[0].x, snake[0].y, 16, "#ff3333");
        triggerShake(8, 15);
        SFX.die();
        handleGameOver("💀 Hit the wall!"); return;
    }

    // Self collision — compare grid coords only (never particles)
    if (snake.some(p => p.x === head.x && p.y === head.y)) {
        spawnParticles(snake[0].x, snake[0].y, 16, "#ff6600");
        triggerShake(8, 15);
        SFX.die();
        handleGameOver("💀 Bit its own tail!"); return;
    }

    snake.unshift(head);
    window.steps--;
    document.getElementById("steps").innerText = window.steps;

    // Normal food collision
    if (head.x === food.x && head.y === food.y) {
        eatFood(food, head);
        generateNormalFood();
    }
    // Bonus food collision
    else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
        eatFood(bonusFood, head);
        bonusFood = null;
        snake.pop(); // não cresce — bonus não adiciona segmento extra
    }
    else {
        snake.pop();
    }

    // Tick bonus food timer
    if (bonusFood) {
        bonusFood.framesLeft--;
        if (bonusFood.framesLeft <= 0) bonusFood = null;
    }

    // Tenta spawnar bonus food aleatoriamente (1% por frame se não tiver nenhuma)
    if (!bonusFood && Math.random() < 0.01) spawnBonusFood();

    if (frameCount % 3 === 0) SFX.move();

    if (window.steps <= 0) {
        SFX.die();
        triggerShake(6, 10);
        handleGameOver("🎰 Out of moves!");
        return;
    }

    draw();
}

// ─── Generate Food ────────────────────────────────────────────────────────────
function occupiedPositions() {
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    if (bonusFood) occupied.add(`${bonusFood.x},${bonusFood.y}`);
    occupied.add(`${food.x},${food.y}`);
    return occupied;
}

function randomFreeCell(occupied) {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * (canvas.width  / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
}

function generateNormalFood() {
    const occupied = occupiedPositions();
    const pos = randomFreeCell(occupied);
    food = { x: pos.x, y: pos.y, type: "normal" };
}

function spawnBonusFood() {
    const occupied = occupiedPositions();
    const pos = randomFreeCell(occupied);
    const type = Math.random() < 0.3 ? "bonus5" : "bonus2";
    bonusFood = { x: pos.x, y: pos.y, type, framesLeft: BONUS_LIFETIME };
}

function eatFood(f, head) {
    const pts = f.type === "bonus5" ? 5 : f.type === "bonus2" ? 2 : 1;
    score += pts;
    document.getElementById("score").innerText = score;

    const color = f.type === "bonus5" ? "#ffd700" : f.type === "bonus2" ? "#cc44ff" : getChainColor();
    spawnParticles(head.x, head.y, pts >= 5 ? 20 : pts >= 2 ? 14 : 10, color);
    spawnFloatingText(head.x, head.y, `+${pts}`, color);

    if (pts > 1) {
        SFX.eatBonus();
        triggerShake(pts, pts * 2);
    } else {
        SFX.eat();
    }

    if (score % 5 === 0) {
        SFX.milestone();
        spawnParticles(head.x, head.y, 24, "#ffff00");
        spawnFloatingText(head.x, head.y - 20, `🔥 ${score}!`, "#ffff00");
        triggerShake(4, 8);
    }

    const el = document.getElementById("score");
    el.style.textShadow = "0 0 20px " + getChainColor();
    setTimeout(() => el.style.textShadow = "", 300);
}

// ─── Game Over ────────────────────────────────────────────────────────────────
async function handleGameOver(reason = "GAME OVER") {
    gameOver = true;
    dx = 0; dy = 0;

    snake.forEach((seg, i) => {
        if (i % 2 === 0) spawnParticles(seg.x, seg.y, 4, "#ff3333");
    });

    setTimeout(() => {
        const chainColor = getChainColor();
        ctx.fillStyle = "rgba(0,0,0,0.78)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#ff3333";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff3333";
        ctx.strokeRect(10, canvas.height / 2 - 56, canvas.width - 20, 112);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 28px 'Courier New'";
        ctx.textAlign = "center";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff3333";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 18);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#ccc";
        ctx.font = "13px 'Courier New'";
        ctx.fillText(reason, canvas.width / 2, canvas.height / 2 + 6);

        ctx.fillStyle = chainColor;
        ctx.font = "bold 16px 'Courier New'";
        ctx.shadowBlur = 8;
        ctx.shadowColor = chainColor;
        ctx.fillText(`Score: ${score} 🐍`, canvas.width / 2, canvas.height / 2 + 28);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#ffffff66";
        ctx.font = "11px 'Courier New'";
        ctx.fillText("[SPACE] to restart", canvas.width / 2, canvas.height / 2 + 48);
        ctx.textAlign = "left";
    }, 300);

    if (score > 0) {
        setTimeout(async () => {
            if (confirm(`${reason}\n\nScore: ${score} 🐍\n\nSave to the blockchain leaderboard?`)) {
                await window.web3Submit(score);
            }
        }, 700);
    }
}

// ─── Start / Restart ──────────────────────────────────────────────────────────
window.startGameLoop = function () {
    gameStarted = true;
    if (!food || food.x === undefined) generateNormalFood();
    SFX.start();
    if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    gameInterval = setInterval(update, 140);
    draw();
};

function restartGame() {
    snake = [{ x: 200, y: 200 }];
    bonusFood = null;
    generateNormalFood();
    dx = 0; dy = 0;
    score = 0;
    gameOver = false;
    particles.length = 0;
    floatingTexts.length = 0;
    shakeIntensity = 0; shakeDuration = 0;
    slotState = "off";
    document.getElementById("score").innerText = "0";
    if (gameStarted) {
        SFX.start();
        if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
        gameInterval = setInterval(update, 140);
    }
    draw();
}
window.restartGame = restartGame;

// ─── Spin Wheel ───────────────────────────────────────────────────────────────
async function spinWheel() {
    const btn = document.getElementById("spinBtn");
    if (btn) { btn.disabled = true; btn.innerText = "🎰 Spinning..."; }

    try {
        const stepsBefore = window.steps || 0;

        // Executa transação na blockchain
        await window.web3Spin();

        // web3Spin já chama updateStepsUI() internamente e atualiza window.steps
        const stepsAfter = window.steps || 0;
        const gained = stepsAfter - stepsBefore;
        const result = gained > 0 ? gained : 1;

        // Mostra animação slot com o resultado REAL
        startSlotAnimation(result);
        SFX.spin();

    } catch (e) {
        console.error(e);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "🎰 Spin the Wheel"; }
    }
}
window.spinWheel = spinWheel;

// ─── Chain Switch ─────────────────────────────────────────────────────────────
window.onChainSwitch = function(chain) {
    document.documentElement.style.setProperty("--green",  chain.color);
    document.documentElement.style.setProperty("--accent", chain.color);
};

window.onSpinSuccess = () => {}; // handled inside spinWheel above

// ─── Initial Render ───────────────────────────────────────────────────────────
draw();
