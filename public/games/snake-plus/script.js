const board = document.querySelector(".board");
const startBtn = document.querySelector(".start-btn");
const restartBtn = document.querySelector(".restart-btn");
const startPanel = document.querySelector(".modal .start-game");
const gameOverPanel = document.querySelector(".modal .game-over");
const modal = document.querySelector(".modal");
const scoreElement = document.querySelector("#score");
const highScoreElement = document.querySelector("#high-score");
const timeElement = document.querySelector("#time");

const blockWidth = 40;
const blockHeight = 40;
const boardGap = 4;

let cols = 0;
let rows = 0;
let blocks = {};
let snake = [];
let food = { x: 0, y: 0 };

let direction = "right";
let nextDirection = "right";

let score = 0;
let highScore = Number(localStorage.getItem("highScore")) || 0;
let secondsElapsed = 0;

let intervalId = null;
let timeIntervalId = null;

let gameSpeed = 120;

if (highScoreElement) {
  highScoreElement.innerText = highScore;
}

if (scoreElement) {
  scoreElement.innerText = score;
}

if (timeElement) {
  timeElement.innerText = "00:00";
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * rows),
    y: Math.floor(Math.random() * cols),
  };
}

function placeFood() {
  const availableCells = [];

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      const occupied = snake.some(
        (segment) =>
          segment.x === x &&
          segment.y === y
      );

      if (!occupied) {
        availableCells.push({ x, y });
      }
    }
  }

  if (!availableCells.length) {
    endGame();
    return { x: 0, y: 0 };
  }

  return availableCells[
    Math.floor(
      Math.random() * availableCells.length
    )
  ];
}

function initializeBoard() {
  if (!board) return;

  cols = Math.floor(
    (board.clientWidth + boardGap) /
      (blockWidth + boardGap)
  );

  rows = Math.floor(
    (board.clientHeight + boardGap) /
      (blockHeight + boardGap)
  );

  if (isNaN(cols) || cols < 10) cols = 10;
  if (isNaN(rows) || rows < 10) rows = 10;

  board.innerHTML = "";
  blocks = {};

  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block =
        document.createElement("div");

      block.className = "block";
      block.dataset.pos = `${row},${col}`;

      board.appendChild(block);

      blocks[`${row},${col}`] = block;
    }
  }
}

function renderBoard() {
  Object.values(blocks).forEach((block) => {
    if (block) {
      block.classList.remove(
        "fill",
        "food"
      );
    }
  });

  snake.forEach((segment) => {
    const snakeBlock =
      blocks[`${segment.x},${segment.y}`];

    if (snakeBlock) {
      snakeBlock.classList.add("fill");
    }
  });

  const foodBlock =
    blocks[`${food.x},${food.y}`];

  if (foodBlock) {
    foodBlock.classList.add("food");
  }
}

function showModal(showGameOver = false) {
  if (
    !modal ||
    !startPanel ||
    !gameOverPanel
  )
    return;

  modal.style.display = "flex";

  if (showGameOver) {
    startPanel.style.display = "none";
    gameOverPanel.style.display = "flex";
  } else {
    startPanel.style.display = "flex";
    gameOverPanel.style.display = "none";
  }
}

function hideModal() {
  if (!modal) return;

  modal.style.display = "none";
}

function endGame() {
  clearInterval(intervalId);
  clearInterval(timeIntervalId);

  intervalId = null;
  timeIntervalId = null;

  showModal(true);
}

function resetGame() {
  clearInterval(intervalId);
  clearInterval(timeIntervalId);

  intervalId = null;
  timeIntervalId = null;

  score = 0;
  secondsElapsed = 0;

  gameSpeed = 400;

  direction = "right";
  nextDirection = "right";

  if (scoreElement) {
    scoreElement.innerText = score;
  }

  if (timeElement) {
    timeElement.innerText =
      formatTime(secondsElapsed);
  }

  initializeBoard();

  snake = [
    {
      x: Math.floor(rows / 2),
      y: Math.floor(cols / 2),
    },
  ];

  food = placeFood();

  renderBoard();

  intervalId = setInterval(
    gameLoop,
    gameSpeed
  );

  timeIntervalId = setInterval(() => {
    secondsElapsed++;

    if (timeElement) {
      timeElement.innerText =
        formatTime(secondsElapsed);
    }
  }, 1000);
}

function gameLoop() {
  if (!snake.length) return;

  direction = nextDirection;

  const head = { ...snake[0] };

  switch (direction) {
    case "left":
      head.y--;
      break;

    case "right":
      head.y++;
      break;

    case "up":
      head.x--;
      break;

    case "down":
      head.x++;
      break;
  }

  const hitWall =
    head.x < 0 ||
    head.x >= rows ||
    head.y < 0 ||
    head.y >= cols;

  const body = snake.slice(
    0,
    snake.length - 1
  );

  const hitSelf = body.some(
    (segment) =>
      segment.x === head.x &&
      segment.y === head.y
  );

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  const ateFood =
    head.x === food.x &&
    head.y === food.y;

  if (ateFood) {
    score += 10;

    if (scoreElement) {
      scoreElement.innerText = score;
    }

    if (score > highScore) {
      highScore = score;

      if (highScoreElement) {
        highScoreElement.innerText =
          highScore;
      }

      localStorage.setItem(
        "highScore",
        highScore
      );
    }

    if (
      score % 50 === 0 &&
      gameSpeed > 50
    ) {
      gameSpeed -= 10;

      clearInterval(intervalId);

      intervalId = setInterval(
        gameLoop,
        gameSpeed
      );
    }

    food = placeFood();
  } else {
    snake.pop();
  }

  renderBoard();
}

function handleKeydown(event) {
  if (!intervalId) return;

  switch (event.key) {
    case "ArrowLeft":
      if (direction !== "right") {
        nextDirection = "left";
      }
      break;

    case "ArrowRight":
      if (direction !== "left") {
        nextDirection = "right";
      }
      break;

    case "ArrowUp":
      if (direction !== "down") {
        nextDirection = "up";
      }
      break;

    case "ArrowDown":
      if (direction !== "up") {
        nextDirection = "down";
      }
      break;
  }
}

window.addEventListener(
  "keydown",
  handleKeydown
);

window.addEventListener(
  "resize",
  () => {
    if (!intervalId) {
      initializeBoard();

      if (snake.length) {
        renderBoard();
      }
    }
  }
);

if (startBtn) {
  startBtn.addEventListener(
    "click",
    () => {
      hideModal();
      resetGame();
    }
  );
}

if (restartBtn) {
  restartBtn.addEventListener(
    "click",
    () => {
      hideModal();
      resetGame();
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeBoard();

    snake = [
      {
        x: Math.floor(rows / 2),
        y: Math.floor(cols / 2),
      },
    ];

    food = placeFood();

    renderBoard();

    showModal(false);
  }
);