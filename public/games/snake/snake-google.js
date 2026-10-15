(() => {
  const canvas = document.querySelector('#game-board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('#score');
  const bestEl = document.querySelector('#best-score');
  const overlay = document.querySelector('#game-overlay');
  const overlayTitle = document.querySelector('#overlay-title');
  const overlayMessage = document.querySelector('#overlay-message');
  const startButton = document.querySelector('#start-button');
  const pauseButton = document.querySelector('#pause-button');
  const speedSelect = document.querySelector('#speed');
  const cells = 20;
  let snake;
  let direction;
  let nextDirection;
  let apple;
  let score = 0;
  let best = Number(localStorage.getItem('btrcc-snake-best') || 0);
  let state = 'ready';
  let timer;

  bestEl.textContent = best;

  function reset() {
    clearInterval(timer);
    score = 0;
    scoreEl.textContent = score;
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    apple = placeApple();
    state = 'ready';
    setOverlay('Ready to play?', 'Eat the apples, grow your snake, and avoid the walls and your tail.', 'Play');
    draw();
  }

  function placeApple() {
    let point;
    do {
      point = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
    } while (snake?.some(part => part.x === point.x && part.y === point.y));
    return point;
  }

  function setOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function start() {
    if (state === 'over') reset();
    if (state === 'running') return;
    state = 'running';
    overlay.classList.add('hidden');
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', 'Pause game');
    clearInterval(timer);
    timer = setInterval(tick, Number(speedSelect.value));
  }

  function pause() {
    if (state !== 'running') return;
    clearInterval(timer);
    state = 'paused';
    pauseButton.textContent = '▶';
    pauseButton.setAttribute('aria-label', 'Resume game');
    setOverlay('Paused', 'Take a breather. Your snake is waiting.', 'Resume');
  }

  function tick() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const ate = head.x === apple.x && head.y === apple.y;
    const body = ate ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= cells || head.y >= cells || body.some(part => part.x === head.x && part.y === head.y)) {
      clearInterval(timer);
      state = 'over';
      pauseButton.textContent = 'Ⅱ';
      setOverlay('Game over', `You scored ${score}. Ready for another round?`, 'Play again');
      draw();
      return;
    }
    snake.unshift(head);
    if (ate) {
      score += 1;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('btrcc-snake-best', String(best));
      }
      apple = placeApple();
    } else {
      snake.pop();
    }
    draw();
  }

  function setDirection(name) {
    if (state === 'over') return;
    const choices = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
    };
    const candidate = choices[name];
    if (!candidate || (candidate.x === -direction.x && candidate.y === -direction.y)) return;
    nextDirection = candidate;
    if (state === 'ready') start();
    else if (state === 'paused') start();
  }

  function draw() {
    const box = canvas.getBoundingClientRect();
    const size = box.width || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(size * dpr) || canvas.height !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const tile = size / cells;
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        ctx.fillStyle = (x + y) % 2 ? '#a4d64a' : '#9dce43';
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    drawApple(tile);
    snake.forEach((part, index) => drawSnakePart(part, index, tile));
  }

  function drawApple(tile) {
    const x = (apple.x + 0.5) * tile;
    const y = (apple.y + 0.53) * tile;
    ctx.fillStyle = '#db3e46';
    ctx.beginPath();
    ctx.arc(x, y, tile * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b862e';
    ctx.beginPath();
    ctx.ellipse(x + tile * 0.14, y - tile * 0.34, tile * 0.12, tile * 0.07, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9b88';
    ctx.beginPath();
    ctx.arc(x - tile * 0.12, y - tile * 0.1, tile * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnakePart(part, index, tile) {
    const gap = Math.max(1.5, tile * 0.07);
    const x = part.x * tile + gap;
    const y = part.y * tile + gap;
    const length = tile - gap * 2;
    ctx.fillStyle = index === 0 ? '#267b35' : '#318b3e';
    ctx.beginPath();
    ctx.roundRect(x, y, length, length, tile * (index === 0 ? 0.31 : 0.24));
    ctx.fill();
    if (index === 0) drawEyes(part, x, y, length, tile);
  }

  function drawEyes(head, x, y, length, tile) {
    ctx.fillStyle = '#f7f7ef';
    const forward = direction.x > 0 ? [0.68, 0.68] : direction.x < 0 ? [0.32, 0.32] : [0.34, 0.66];
    const vertical = direction.y > 0 ? [0.68, 0.68] : direction.y < 0 ? [0.32, 0.32] : [0.34, 0.66];
    const centers = direction.x !== 0
      ? [[x + length * forward[0], y + length * 0.32], [x + length * forward[1], y + length * 0.68]]
      : [[x + length * 0.32, y + length * vertical[0]], [x + length * 0.68, y + length * vertical[1]]];
    for (const [eyeX, eyeY] of centers) {
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, tile * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  startButton.addEventListener('click', () => state === 'paused' ? start() : (reset(), start()));
  document.querySelector('#restart-button').addEventListener('click', () => { reset(); start(); });
  pauseButton.addEventListener('click', () => state === 'running' ? pause() : start());
  speedSelect.addEventListener('change', () => { if (state === 'running') { clearInterval(timer); timer = setInterval(tick, Number(speedSelect.value)); } });
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction)));

  document.addEventListener('keydown', event => {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) {
      event.preventDefault();
      setDirection(keys[event.key]);
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (state === 'running') pause(); else start();
    } else if (event.key === 'Enter' && state === 'over') {
      reset(); start();
    }
  });

  let touchStart;
  canvas.addEventListener('pointerdown', event => { touchStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 16) setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touchStart = null;
  });
  window.addEventListener('resize', draw);
  reset();
})();
