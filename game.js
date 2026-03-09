// ─── Estado Global ────────────────────────────────────────────────────────────
window.steps = 0;
let score = 0;
let gameOver = false;
let snake = [{ x: 200, y: 200 }];
let food = { x: 100, y: 100 };
let dx = 0, dy = 0;
const gridSize = 20;
let gameInterval = null;
let gameStarted = false;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ─── Controles Teclado ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    if (gameOver || !gameStarted) return;
    const moves = {
        ArrowUp:    () => dy === 0 && (dx = 0, dy = -gridSize),
        ArrowDown:  () => dy === 0 && (dx = 0, dy =  gridSize),
        ArrowLeft:  () => dx === 0 && (dx = -gridSize, dy = 0),
        ArrowRight: () => dx === 0 && (dx =  gridSize, dy = 0),
        w: () => dy === 0 && (dx = 0, dy = -gridSize),
        s: () => dy === 0 && (dx = 0, dy =  gridSize),
        a: () => dx === 0 && (dx = -gridSize, dy = 0),
        d: () => dx === 0 && (dx =  gridSize, dy = 0),
    };
    if (moves[e.key]) { e.preventDefault(); moves[e.key](); }
});

// ─── Controles Mobile (Swipe) ─────────────────────────────────────────────────
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (!gameStarted || gameOver) return;
    const dx2 = e.changedTouches[0].clientX - touchStartX;
    const dy2 = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx2) > Math.abs(dy2)) {
        if (dx2 > 20 && dx === 0) { dx = gridSize; dy = 0; }
        else if (dx2 < -20 && dx === 0) { dx = -gridSize; dy = 0; }
    } else {
        if (dy2 > 20 && dy === 0) { dx = 0; dy = gridSize; }
        else if (dy2 < -20 && dy === 0) { dx = 0; dy = -gridSize; }
    }
    e.preventDefault();
}, { passive: false });

// ─── Botões Direcionais (mobile/desktop) ──────────────────────────────────────
window.moveSnake = function(dir) {
    if (!gameStarted || gameOver) return;
    if (dir === "up"    && dy === 0) { dx = 0; dy = -gridSize; }
    if (dir === "down"  && dy === 0) { dx = 0; dy =  gridSize; }
    if (dir === "left"  && dx === 0) { dx = -gridSize; dy = 0; }
    if (dir === "right" && dx === 0) { dx =  gridSize; dy = 0; }
};

// ─── Desenho ──────────────────────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid sutil
    ctx.strokeStyle = "rgba(0,255,0,0.05)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Cobra
    snake.forEach((part, index) => {
        if (index === 0) {
            // Cabeça brilhante
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00ff00";
            ctx.fillStyle = "#00FF44";
        } else {
            ctx.shadowBlur = 0;
            const brightness = Math.max(40, 128 - index * 4);
            ctx.fillStyle = `rgb(0, ${brightness}, 0)`;
        }
        ctx.fillRect(part.x + 1, part.y + 1, gridSize - 3, gridSize - 3);

        // Borda
        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(part.x + 1, part.y + 1, gridSize - 3, gridSize - 3);
    });
    ctx.shadowBlur = 0;

    // Comida pulsando (animação via frame count)
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff4444";
    ctx.fillStyle = "#FF3333";
    ctx.fillRect(food.x + 1, food.y + 1, gridSize - 3, gridSize - 3);
    ctx.shadowBlur = 0;

    // Mensagem de aguardando
    if (!gameStarted || (dx === 0 && dy === 0 && !gameOver)) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, canvas.height/2 - 30, canvas.width, 60);
        ctx.fillStyle = "#0f0";
        ctx.font = "bold 16px 'Courier New'";
        ctx.textAlign = "center";
        if (!gameStarted) {
            ctx.fillText("🔗 Connect your wallet to play", canvas.width/2, canvas.height/2 - 5);
            ctx.font = "12px 'Courier New'";
            ctx.fillText("spin the wheel to earn moves", canvas.width/2, canvas.height/2 + 15);
        } else if (window.steps <= 0) {
            ctx.fillText("🎰 Spin the wheel to earn moves!", canvas.width/2, canvas.height/2);
        } else {
            ctx.fillText("▶ Use arrow keys to start", canvas.width/2, canvas.height/2);
        }
        ctx.textAlign = "left";
    }
}

// ─── Loop Principal ───────────────────────────────────────────────────────────
async function update() {
    if (window.steps <= 0 || dx === 0 && dy === 0 || gameOver) {
        draw(); // Redesenha com mensagem
        return;
    }

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Colisão com parede
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        handleGameOver("💀 Hit the wall!"); return;
    }
    // Colisão com o próprio corpo
    if (snake.some(p => p.x === head.x && p.y === head.y)) {
        handleGameOver("💀 Bit its own tail!"); return;
    }

    snake.unshift(head);
    window.steps--;
    document.getElementById("steps").innerText = window.steps;

    if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById("score").innerText = score;
        generateFood();
        // Flash no score
        const el = document.getElementById("score");
        el.style.textShadow = "0 0 20px #0f0";
        setTimeout(() => el.style.textShadow = "", 300);
    } else {
        snake.pop();
    }

    // Sem passadas: para o jogo
    if (window.steps <= 0) {
        handleGameOver("🎰 Out of moves!");
        return;
    }

    draw();
}

function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
    } while (snake.some(p => p.x === newFood.x && p.y === newFood.y));
    food = newFood;
}

// ─── Game Over ────────────────────────────────────────────────────────────────
async function handleGameOver(reason = "GAME OVER") {
    gameOver = true;
    dx = 0; dy = 0;

    // Overlay no canvas
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f0";
    ctx.font = "bold 24px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 20);
    ctx.font = "14px 'Courier New'";
    ctx.fillText(reason, canvas.width/2, canvas.height/2 + 5);
    ctx.fillText(`Score Final: ${score}`, canvas.width/2, canvas.height/2 + 28);
    ctx.textAlign = "left";

    if (score > 0) {
        setTimeout(async () => {
            if (confirm(`${reason}\n\nScore: ${score} 🐍\n\nSave to the blockchain leaderboard?`)) {
                await window.web3Submit(score);
            }
        }, 400);
    }
}

// ─── Iniciar Loop (chamado após login) ────────────────────────────────────────
window.startGameLoop = function () {
    gameStarted = true;
    if (!gameInterval) {
        gameInterval = setInterval(update, 150);
    }
    draw();
};

// ─── Reiniciar Jogo ───────────────────────────────────────────────────────────
function restartGame() {
    snake = [{ x: 200, y: 200 }];
    generateFood();
    dx = 0; dy = 0;
    score = 0;
    gameOver = false;
    document.getElementById("score").innerText = "0";
    draw();
}
window.restartGame = restartGame;

// Spin ainda precisa dos steps
async function spinWheel() {
    await window.web3Spin();
}
window.spinWheel = spinWheel;

// Render inicial
draw();
