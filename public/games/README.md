# BtrccGames local game library

Each game is kept in its own folder and is served from this Node.js app after login. The source projects are browser-only JavaScript/HTML games; original READMEs and license notices are retained in their folders.

| Local game | GitHub source | License |
| --- | --- | --- |
| Snake | https://github.com/adrianov/snake | MIT |
| Snake Neon | https://github.com/vis-a11y/snake-game | MIT |
| Flappy Bird | https://github.com/kubowania/flappy-bird | MIT |
| 2048 | https://github.com/gabrielecirulli/2048 | MIT |
| Tetris | https://github.com/jakesgordon/javascript-tetris | MIT |
| Pong | https://github.com/jakesgordon/javascript-pong | MIT |
| Breakout | https://github.com/jakesgordon/javascript-breakout | MIT |
| Minesweeper | https://github.com/mayankrajendrat/minesweeper | MIT |
| Space Invaders | https://github.com/dwmkerr/spaceinvaders | MIT |

Some original game pages include their own links, fonts, or analytics. Minesweeper loads several visual libraries from public CDNs.

| Five Nights at Freddy's 4 (web) | https://github.com/Apolancodelo/fnaf4-web | Source added with creator's permission; retains the original game's credits and disclaimer. |
| EagleCraft | User-supplied `EaglercraftX_1.8_u32_Offline_Signed.html` | User-provided offline HTML; launch page displays a use-at-own-risk warning. |

Minesweeper's Twemoji PNGs are bundled from https://github.com/twitter/twemoji (CC-BY 4.0); see the upstream asset license and source at https://github.com/twitter/twemoji.


## Game card logos

The game hub shows icon tiles without visible names. Until you add artwork, each tile uses a placeholder emoji. Add a `logo.png` inside a game's folder, such as `public/games/snake/logo.png`, and the hub will show it automatically. The game title stays available to screen readers and in the hover tooltip.
