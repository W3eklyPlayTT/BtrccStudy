# BtrccGames

A small, self-hosted Node.js games hub with a calculator, account login, admin tools, game links, and a one-device account limit.

## Run it

Requires Node.js 18 or newer. In this folder, run:

```sh
npm start
```

Then open http://localhost:3000. The first run creates `data.json` and seeds the `admin` account with password `1234`. Change the password by setting `ADMIN_PASSWORD` before the first run. Keep `data.json` private because it contains account records.

## Admin shortcut and tools

The app opens to a full-screen dark calculator. Enter `1010` on the keypad or keyboard to open the sign-in screen. The starter credentials are `admin` / `1234`. A successful login reveals the game hub and hides the calculator. From the admin panel you can add accounts and game cards with a webpage or game URL. Accounts start with one device slot. The account panel shows an additional slot for £3, monthly access for £5, and lifetime access for £15. These are demo purchase records only; connect a payment provider before charging customers.

## Included games

The local library includes Snake, Snake Neon, Flappy Bird, 2048, Tetris, Pong, Breakout, Minesweeper, Space Invaders, Five Nights at Freddy's 4 (web version), and EagleCraft. EagleCraft opens on a warning page that says “WARNING: USE AT YOUR OWN RISK” before launching the supplied offline game file. Each game has its own folder in `public/games/`; source links and license notes are in [public/games/README.md](public/games/README.md). The game URLs are protected by the login session.

Game websites may prevent embedding in an iframe. In that case, add a webpage made to allow embedding or adapt the game page to launch externally.
