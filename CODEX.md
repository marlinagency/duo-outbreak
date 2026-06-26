# CODEX.md — Online Mobile Web Co-op Top-Down Zombie Shooter

## Project Goal

Build a polished, smooth, mobile-first, browser-based online co-op top-down zombie survival shooter inspired by the classic local co-op feeling of Boxhead-style games, but using original code and free Kenney assets.

The game must run directly in the browser, including iPhone Safari, Android Chrome, and desktop browsers. It should feel like a real mobile game even though it is web-based. No app store installation should be required.

Core experience:

- Player creates a private room.
- Game generates a short invite link.
- Second player opens the link on iPhone, Android, or desktop.
- Both players join the same room.
- They fight zombie waves together in real time.
- Controls feel smooth on mobile.
- Gameplay remains responsive, stable, and visually clean.

Do not copy original Boxhead 2 code, name, assets, maps, UI, sounds, or branding. Use Kenney assets and original implementation.

---

## Tech Stack

Use this stack unless there is a strong technical reason not to:

### Client

- TypeScript
- Vite
- Phaser 3
- HTML/CSS
- PWA-ready structure
- Mobile-first responsive layout

### Server

- Node.js
- TypeScript
- Colyseus for authoritative multiplayer rooms and state sync
- WebSocket-based real-time communication

### Assets

Use Kenney free assets, especially:

- Kenney Top-down Shooter
- Kenney UI assets
- Kenney input/mobile controls assets if needed
- Other CC0 Kenney packs when useful

Asset rules:

- Keep asset file sizes small.
- Use sprite atlases when useful.
- Do not use ripped Boxhead assets.
- Do not use copyrighted original Flash game files.
- Maintain a clear `ASSETS_LICENSES.md` file.

---

## Target Platforms

The game must support:

- iPhone Safari
- Android Chrome
- Desktop Chrome
- Desktop Edge
- Desktop Firefox

Primary target is mobile web.

The game must be playable in landscape mode on phones.

If the user opens the game in portrait mode, show a clean “Rotate your phone” screen.

---

## Performance Goals

Target performance:

- 60 FPS on modern phones.
- Stable 30 FPS fallback on weaker phones.
- Low input delay.
- Fast initial load.
- No heavy particle spam.
- No expensive pathfinding for every zombie every frame.
- No unnecessary network spam.

Performance requirements:

- Use object pooling for bullets, hit effects, particles, and zombies.
- Avoid creating new objects every frame.
- Keep zombie AI simple and server-controlled.
- Cap active zombies per wave.
- Use fixed timestep simulation on server.
- Use client-side interpolation for remote entities.
- Use prediction only for the local player where safe.
- Send player input to server, not full client state.
- Server is authoritative for health, damage, zombie positions, wave state, pickups, and score.

---

## Game Design

Working title: `Duo Outbreak`

Do not use the name Boxhead in the actual game branding.

### Core Loop

1. Two players join a private room.
2. Players spawn in a small arena.
3. Zombies spawn in waves.
4. Players survive, shoot, collect drops, and revive each other.
5. Waves become harder.
6. Game ends when both players are dead.
7. Show a result screen with:
   - wave reached
   - zombies killed
   - survival time
   - revives
   - accuracy if tracked
   - best player moments

---

## MVP Features

Implement these first:

### Main Menu

- Create Room button
- Join Room by code/link
- Player nickname input
- Character color selection
- Basic settings:
  - sound on/off
  - vibration on/off if supported
  - graphics quality: low/medium/high

### Room System

- Create private room.
- Generate short room code.
- Generate invite URL.
- Allow exactly 2 active players in a gameplay room.
- If room is full, show proper message.
- If a player disconnects, allow reconnect for a short period.
- Host should not have unfair authority; server controls the game.

### Gameplay

- Top-down arena.
- Two players.
- Zombies chase players.
- Players shoot zombies.
- Waves increase difficulty.
- Health system.
- Score system.
- Pickups:
  - health
  - ammo
  - temporary fire rate boost
- Game over screen.
- Restart room button.

### Weapons

Start with:

- Pistol: infinite or generous ammo, low damage.
- SMG: faster fire, limited ammo.
- Shotgun: close-range spread.
- Explosive barrel or grenade later, not required in first MVP.

### Enemies

Start with:

- Basic zombie
- Fast weak zombie
- Tank slow zombie

Enemy logic should be simple but fun:

- Move toward nearest living player.
- If close enough, attack.
- Avoid expensive pathfinding.
- Use simple steering/separation so zombies do not stack perfectly.

---

## Mobile Controls

Mobile controls are critical.

Use a landscape mobile layout:

- Left side: virtual joystick for movement.
- Right side: aim joystick or drag-to-aim.
- Fire button or auto-fire option.
- Weapon switch button.
- Revive/interact button.
- Big buttons, easy to press.
- No tiny UI.

Control options:

1. Auto-fire mode:
   - Player aims with right joystick.
   - Weapon fires automatically while aiming.
   - Best for mobile.

2. Manual-fire mode:
   - Player aims with right joystick.
   - Separate fire button.
   - Optional advanced mode.

Desktop controls:

- WASD movement.
- Mouse aim.
- Left click shoot.
- Number keys / mouse wheel weapon switch.

---

## Multiplayer Architecture

Use authoritative server model.

### Client sends input

Client sends compact input messages:

- movement vector
- aim angle
- shooting state
- weapon switch request
- revive/interact request

Client must not decide:

- zombie damage
- player damage
- score
- pickup collection
- wave completion
- final game result

### Server owns simulation

Server controls:

- player position validation
- zombie movement
- zombie attacks
- bullet creation or hitscan validation
- bullet collision
- pickup spawns
- wave progression
- health
- death/revive
- score
- game over

### Networking

Requirements:

- Use Colyseus rooms.
- One Colyseus room equals one game session.
- Max 2 players per room.
- Use schema state for synced entities.
- Use messages for high-frequency inputs.
- Tick simulation at a fixed rate, for example 20 or 30 ticks per second.
- Client renders at native FPS with interpolation.

Handle:

- packet delay
- temporary disconnect
- reconnect
- second player leaving
- room cleanup after game ends

---

## Project Structure

Use this structure:

```txt
/
  CODEX.md
  README.md
  ASSETS_LICENSES.md
  package.json
  pnpm-workspace.yaml

  /apps
    /client
      index.html
      package.json
      vite.config.ts
      /src
        main.ts
        game.ts
        /scenes
          BootScene.ts
          PreloadScene.ts
          MenuScene.ts
          RoomScene.ts
          GameScene.ts
          GameOverScene.ts
        /net
          colyseusClient.ts
          roomClient.ts
        /input
          mobileControls.ts
          desktopControls.ts
        /entities
          PlayerView.ts
          ZombieView.ts
          BulletView.ts
          PickupView.ts
        /ui
          Hud.ts
          RotatePhoneOverlay.ts
          MobileButtons.ts
        /assets
          /kenney

    /server
      package.json
      tsconfig.json
      /src
        index.ts
        /rooms
          GameRoom.ts
        /schema
          GameState.ts
          PlayerState.ts
          ZombieState.ts
          BulletState.ts
          PickupState.ts
        /systems
          movementSystem.ts
          zombieSystem.ts
          weaponSystem.ts
          waveSystem.ts
          pickupSystem.ts
          collisionSystem.ts
          scoringSystem.ts
        /config
          gameConfig.ts

  /packages
    /shared
      package.json
      /src
        types.ts
        constants.ts
        math.ts
        protocol.ts
```

---

## Visual Style

Style should feel:

- simple
- clean
- readable
- punchy
- fast
- slightly arcade
- not childish
- not too realistic

Use Kenney assets as the base, but make the final presentation feel more polished with:

- clean shadows
- subtle screen shake
- hit flash
- simple blood/hit effect
- clean wave transition text
- readable health bars
- good mobile UI spacing

Do not overdo effects.

---

## Map Design

First map:

- Rectangular arena.
- Walls around edges.
- Some obstacles.
- Some furniture/cover.
- Multiple zombie spawn points.
- No complex maze in MVP.

Later maps:

- warehouse
- street block
- laboratory
- abandoned office
- survival room

Collision must be simple and stable.

---

## Gameplay Feel

The game must feel responsive.

Important feel rules:

- Player movement should be smooth and slightly fast.
- Shooting should have clear feedback.
- Zombies should be dangerous but readable.
- Early waves should be easy.
- Difficulty should ramp quickly after wave 5.
- Two players should need to help each other.
- Revive mechanic should create emotional co-op moments.

Revive idea:

- If one player dies, they become downed.
- Other player can revive by standing nearby for 2 seconds.
- If both are down/dead, game over.

---

## iPhone Web Requirements

The game must work well on iPhone Safari.

Implement:

- responsive canvas sizing
- safe-area support for notches
- landscape lock guidance
- touch-action none
- prevent page scroll while playing
- prevent double-tap zoom
- full-screen-like PWA behavior where possible
- correct audio unlock after first user tap

CSS requirements:

```css
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  background: #000;
}
```

Use safe area variables:

```css
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

---

## PWA Requirements

Make the web game installable as a PWA later.

Include:

- `manifest.webmanifest`
- app icons
- theme color
- display standalone
- service worker only after basic game works
- offline shell optional
- online gameplay must clearly require internet

---

## Quality Requirements

Before considering a feature done:

- It works on desktop.
- It works on Android Chrome.
- It works on iPhone Safari.
- It handles reconnect or fails gracefully.
- It does not crash when the other player leaves.
- It does not create major FPS drops.
- It does not rely on copyrighted Boxhead files.

---

## Development Order

Build in this exact order.

### Phase 1 — Local Single Player Prototype

Goal: make the game fun without multiplayer.

Tasks:

- Phaser project setup.
- Load Kenney assets.
- Create arena.
- Add player movement.
- Add shooting.
- Add zombies.
- Add bullet/zombie collision.
- Add health.
- Add waves.
- Add game over.

Do not add multiplayer yet.

### Phase 2 — Multiplayer Room Prototype

Goal: two remote players can join and move.

Tasks:

- Create Colyseus server.
- Create room.
- Add join/create room flow.
- Sync two players.
- Send input from client to server.
- Render remote player.
- Handle disconnect.

### Phase 3 — Authoritative Gameplay

Goal: server controls the actual game.

Tasks:

- Move zombie simulation to server.
- Move damage to server.
- Move pickups to server.
- Move wave system to server.
- Sync health/score/wave.
- Add server-side collision.

### Phase 4 — Mobile Controls

Goal: iPhone and Android playability.

Tasks:

- Add virtual joystick.
- Add aim/fire control.
- Add landscape UI.
- Add rotate phone overlay.
- Tune movement and aim for touch.
- Test with two phones.

### Phase 5 — Polish

Goal: make it feel like a real game.

Tasks:

- Add sound effects.
- Add hit feedback.
- Add screen shake.
- Add better HUD.
- Add game over stats.
- Add invite link UI.
- Add loading screen.
- Add quality settings.

### Phase 6 — Deployment

Goal: playable online URL.

Tasks:

- Deploy client.
- Deploy server.
- Configure WebSocket URL.
- Add HTTPS.
- Test iPhone Safari remote connection.
- Test Android Chrome remote connection.
- Test desktop/mobile crossplay.

---

## Anti-Goals

Do not do these in the first version:

- Do not make accounts.
- Do not add login.
- Do not add database unless needed.
- Do not add shop.
- Do not add complex inventory.
- Do not add 10 maps.
- Do not add 20 weapons.
- Do not add advanced pathfinding.
- Do not add heavy 3D.
- Do not copy Boxhead assets or code.
- Do not optimize prematurely before the basic loop works.

---

## Acceptance Criteria for MVP

MVP is successful when:

- Player A opens the website and creates a room.
- Player A sends the invite link to Player B.
- Player B opens it on iPhone Safari.
- Both players spawn in the same arena.
- Both players can move and shoot.
- Zombies spawn and chase them.
- Both players see the same wave, health, score, and enemies.
- Game remains playable for at least 10 minutes.
- Mobile controls feel comfortable.
- Game does not require installing an app.
- Game does not use copyrighted original Boxhead files.

---

## Coding Style

Use:

- TypeScript everywhere.
- Clear small files.
- No giant 1000-line scene files.
- Shared constants between client and server.
- Clean separation between rendering and simulation.
- Comments for non-obvious networking logic.
- Simple math helpers for vectors and angles.
- Deterministic-ish server simulation where practical.

Avoid:

- messy global variables
- client-authoritative gameplay
- unnecessary libraries
- hardcoded magic numbers everywhere
- huge asset files
- blocking UI
- memory leaks

---

## Initial Commands

Preferred package manager: pnpm.

Suggested setup:

```bash
pnpm create vite apps/client --template vanilla-ts
mkdir -p apps/server/src
mkdir -p packages/shared/src
```

Install likely dependencies:

```bash
pnpm add phaser @colyseus/client --filter client
pnpm add colyseus @colyseus/schema express cors --filter server
pnpm add -D typescript tsx nodemon vite --filter server
```

Adjust exact commands depending on final workspace configuration.

---

## First Implementation Task for Codex

Start by creating the base monorepo structure and implementing Phase 1 local single-player prototype.

Do not attempt full multiplayer until local gameplay feels good.

Deliver:

- working Vite + Phaser client
- one playable arena
- player movement
- shooting
- zombies chasing player
- waves
- basic HUD
- game over
- Kenney asset loading structure
- clear TODOs for multiplayer phase

Keep the code clean and ready for Colyseus integration.

---

## Prompt to give Codex first

Read `CODEX.md` carefully. Start with Phase 1 only. Create the base monorepo structure and implement a smooth local single-player Phaser prototype using Kenney assets. Do not implement multiplayer yet. Keep the code clean and ready for Colyseus authoritative multiplayer in Phase 2.
