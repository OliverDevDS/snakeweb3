// Variáveis Globais
window.steps = 0; 
let score = 0;
let gameOver = false;
let snake = [{ x: 200, y: 200 }];
let food = { x: 100, y: 100 };
let dx = 0; let dy = 0;
const gridSize = 20;
let gameInterval = null;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -gridSize; }
    if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = gridSize; }
    if (e.key === "ArrowLeft" && dx === 0) { dx = -gridSize; dy = 0; }
    if (e.key === "ArrowRight" && dx === 0) { dx = gridSize; dy = 0; }
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lime";
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#00FF00" : "#008000";
        ctx.fillRect(part.x, part.y, gridSize - 2, gridSize - 2);
    });
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, gridSize - 2, gridSize - 2);
}

async function update() {
    if (window.steps <= 0 || (dx === 0 && dy === 0) || gameOver) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height || 
        snake.some(part => part.x === head.x && part.y === head.y)) {
        handleGameOver();
        return;
    }

    snake.unshift(head);
    window.steps--; // Consome passo
    document.getElementById("steps").innerText = window.steps;

    if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById("score").innerText = score;
        generateFood();
    } else {
        snake.pop();
    }
    draw();
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
        y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
    };
}

async function handleGameOver() {
    gameOver = true;
    dx = 0; dy = 0;
    setTimeout(async () => {
        if (confirm(`GAME OVER! Score: ${score}\nSave on the Blockchain ranking?`)) {
            await window.web3Submit(score); // Chama a função global
        }
    }, 100);
}

window.startGameLoop = function() {
    if (!gameInterval) {
        gameInterval = setInterval(update, 150); // Só começa após login
    }
};

async function spinWheel() {
    const btn = document.getElementById("spinBtn");
    btn.disabled = true;
    await window.web3Spin(); // Chama a roleta web3
    btn.disabled = false;
}

function restartGame() {
    snake = [{ x: 200, y: 200 }];
    generateFood();
    dx = 0; dy = 0;
    score = 0;
    gameOver = false;
    document.getElementById("score").innerText = "0";
    draw();
}

draw();