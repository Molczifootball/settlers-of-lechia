# Osadnicy z Lechii (Settlers of Lechia)

A Catan-inspired multiplayer strategy game with a Polish/Lechia medieval theme.

**Stack:** Node.js + Socket.io · React + Vite · Web Audio API · localStorage settings

## Features (v0.1)

- 2–4 players online (real-time via WebSockets)
- Authoritative server-side state — no client cheating possible
- Full Catan ruleset: settlements, cities, roads, dev cards, robber, ports, trading
- Largest Army & Longest Road tracking with proper tie rules
- AI bots with strategic heuristics (probability scoring, dev card use, trade response)
- Discard-on-7, hidden VP cards, color-blind mode
- Player-to-player chat
- Polish 🇵🇱 / English 🇬🇧 i18n
- Reconnection support, JSON persistence
- Mobile-friendly responsive layout

## Local development

```bash
# install all deps
npm run install:all

# run server (port 3001)
npm run dev:server

# in another terminal, run client (port 3000)
npm run dev:client
```

Open http://localhost:3000

## Production build

```bash
npm run build      # builds client into client/dist
npm start          # NODE_ENV=production, server serves client/dist
```

The server exposes:
- `/`            → static React app
- `/health`      → JSON health check
- `/socket.io/*` → WebSocket upgrade

## Deploy to Render.com (recommended for v0.1)

1. Push this repo to GitHub.
2. Go to https://dashboard.render.com → **New** → **Blueprint**.
3. Pick your GitHub repo. Render reads `render.yaml` and provisions a free Web Service.
4. After ~3–5 minutes you'll have a public URL like `https://settlers-of-lechia.onrender.com`.

**Free tier caveat:** Render free instances spin down after 15 min of inactivity — first request after that takes ~30s to wake. Paid tier (\$7/mo) keeps it warm.

## Deploy to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Railway auto-detects the Dockerfile and deploys.

## Deploy with Docker (any host)

```bash
docker build -t settlers-of-lechia .
docker run -p 3001:3001 settlers-of-lechia
```

## Project structure

```
settlers-of-lechia/
├── server/                # Node.js + Socket.io game server
│   └── src/
│       ├── index.js       # Socket handlers, bot driver
│       ├── GameState.js   # Game logic (rules, validation)
│       ├── Board.js       # Hex board generation, ports
│       ├── RoomManager.js # Room lifecycle + game actions
│       └── Bot.js         # Heuristic AI
├── client/                # React + Vite UI
│   └── src/
│       ├── App.jsx
│       ├── boardLogic.js  # Client-side rule mirror
│       ├── i18n.js        # PL/EN strings
│       ├── settings.js    # Persisted preferences
│       ├── sounds.js      # Web Audio synth
│       └── components/    # 14 UI components
├── package.json           # Root build/start scripts
├── render.yaml            # Render blueprint
├── Dockerfile             # Container build
└── README.md
```

## Roadmap

- Painted hex tile / card / building artwork (Nano Banana pipeline ready)
- Tutorial overlay for first-time players
- Counter-offer trades
- Replay system
- Isometric board view

## License

MIT
