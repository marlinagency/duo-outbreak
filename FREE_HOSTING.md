# Free online hosting

Cloudflare quick tunnels are useful for testing, but they add an extra relay hop
through the developer machine. For real-time WebSocket gameplay this often feels
laggy on mobile.

The recommended free setup for this prototype is a single Render Web Service:

- one Node process hosts Colyseus;
- the same process serves the built Phaser client;
- the browser connects back to the same origin, so no extra WebSocket URL config
  is needed.

## Recommended: Render free web service

1. Push this repository to GitHub.
2. Open Render and choose **New > Blueprint**.
3. Select the repository.
4. Render reads `render.yaml`.
5. Deploy.
6. Open the generated `https://...onrender.com` URL.
7. Press `ONLINE ROOM`; share the URL after it receives `?room=...`.

`render.yaml` uses the Frankfurt region for lower latency from Turkey/Europe.

### Free plan caveat

Render free services may sleep after inactivity. The first open after sleeping can
take a short time. Once awake, it is a much better fit than a temporary tunnel
for Colyseus/WebSocket gameplay.

## Why not Vercel for this version?

Vercel is excellent for static frontends and serverless APIs, but this game keeps
authoritative Colyseus room state in one long-running Node process. For this
prototype, a single persistent WebSocket server is simpler and smoother.

Vercel can still host the static client later, but then the Colyseus server should
run elsewhere and the client must be built with `VITE_COLYSEUS_URL`.

## Local fallback

For local testing:

```bash
corepack pnpm start:public
```

Open:

```text
http://127.0.0.1:2567
```
