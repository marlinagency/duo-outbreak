# Duo Outbreak

Browser-based top-down zombie survival prototype with a local single-player mode,
landscape mobile touch controls, and a Phase 3 Colyseus authoritative gameplay prototype.

## Run

Install once:

```bash
corepack pnpm install
```

Terminal 1:

```bash
corepack pnpm dev:server
```

Terminal 2:

```bash
corepack pnpm dev:client
```

Open `http://127.0.0.1:5173`.

## Online room flow

- Click `ONLINE ROOM` to create a private room.
- The URL is updated with `?room=ROOM_ID`.
- Open the same URL from another browser/device on the same network to join.
- Phase 3 sends player input to the server.
- Server owns player movement, zombie waves, zombie movement, bullets, damage, pickups, kills, and score.
- Client renders the synced server state.

For remote play, prefer a deployed WebSocket host over a temporary tunnel. See
[FREE_HOSTING.md](./FREE_HOSTING.md). The included `render.yaml` deploys the
client and Colyseus server as one free Render web service.

## Controls

Desktop:

- Move: WASD
- Aim/fire: mouse
- Switch weapon: 1-5 or mouse wheel
- Reload: R
- Mutation: Q when the kill meter is full
- Mutant shockwave: Space during transformation
- Pause: Escape

Mobile landscape:

- Left stick: move
- Right stick/drag: aim and auto-fire
- MUTATE button: activate special when full
- SHOCK button: mutant shockwave

Portrait mode shows a rotate-phone overlay.

## Verify

```bash
corepack pnpm typecheck
corepack pnpm build
```
