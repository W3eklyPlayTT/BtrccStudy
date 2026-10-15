# 🐍 Snake Game

A classic Snake Game built with vanilla HTML, CSS, and JavaScript — featuring a sleek dark UI, smooth animations, score tracking, and progressive difficulty.

---

## 🎮 Live Demo

Open `index.html` directly in your browser — no build step or server required.
                      https://vis-a11y.github.io/snake-game/

---

## ✨ Features

- **Classic Snake gameplay** — eat food, grow longer, avoid walls and yourself
- **Progressive difficulty** — game speed increases every 50 points
- **Score & High Score tracking** — high score is persisted via `localStorage`
- **Live timer** — tracks how long you've survived each session
- **Responsive layout** — adapts to different screen sizes (mobile-friendly)
- **Smooth animations** — pulsing food, glowing snake, and CSS transitions throughout
- **Dark glassmorphism UI** — modern, premium aesthetic with radial gradient background

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `Arrow Up` | Move Up |
| `Arrow Down` | Move Down |
| `Arrow Left` | Move Left |
| `Arrow Right` | Move Right |

> The snake cannot reverse directly into itself (e.g., pressing Left while moving Right is ignored).

---

## 🚀 Getting Started

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/your-username/snake-game.git
   cd snake-game
   ```

2. **Open the game** — simply open `index.html` in any modern browser:
   ```bash
   # On Windows
   start index.html

   # On macOS
   open index.html

   # On Linux
   xdg-open index.html
   ```

No dependencies, no npm install, no build tools needed.

---

## 📁 Project Structure

```
SNAKE-GAME/
├── index.html    # Game markup — board, score panel, and modals
├── style.css     # All styles — dark theme, grid layout, animations
├── script.js     # Game logic — loop, collision, rendering, input
└── README.md     # You are here
```

---

## ⚙️ How It Works

### Board Initialization
The game board is a CSS Grid dynamically sized based on the container's pixel dimensions and a fixed block size of `40×40px` with a `4px` gap. The grid is rebuilt on window resize.

### Game Loop
A `setInterval`-driven loop runs every `gameSpeed` ms (starting at `400ms`). Each tick:
1. Moves the snake head in the current direction
2. Checks for wall or self-collision → Game Over
3. Checks if food was eaten → grow, update score, maybe increase speed
4. Re-renders the board by toggling CSS classes on grid cells

### Difficulty Scaling
Every time the score reaches a multiple of **50**, the interval is reduced by **10ms** (down to a minimum of **50ms**), making the snake faster.

### Persistence
High score is saved to `localStorage` under the key `"highScore"` and restored on page load.

---

## 🎨 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--snake-color` | `#58ff51` | Snake body & button fill |
| `--food-color` | `#ff4f4f` | Food cell |
| `--bg-color` | `#020202` | Page background |
| `--panel-bg` | `rgba(255,255,255,0.08)` | Info & modal panels |
| `--radius` | `16px` | Card border radius |

---

## 📱 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| `> 768px` | Sidebar info panel + game board side-by-side |
| `≤ 768px` | Stacked layout — info stats in a row above the board |

---

## 🛠️ Potential Improvements

- [ ] Touch / swipe controls for mobile
- [ ] Sound effects on eat and game over
- [ ] Named difficulty presets (Easy / Medium / Hard)
- [ ] Leaderboard with multiple named scores
- [ ] Pause / resume functionality (`Space` key)
- [ ] Animated snake head direction

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).




The project made by vishal prajapati


