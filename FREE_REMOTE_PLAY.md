# Free remote play

This is the quickest free way to play with a friend on a phone from another network.

It uses one HTTPS URL for both:

- the web game client
- the Colyseus WebSocket server

## 1. Build the game

```bash
corepack pnpm install
corepack pnpm build
```

## 2. Start public single-port mode

```bash
corepack pnpm start:public
```

Keep this terminal open.

Local test URL:

```txt
http://127.0.0.1:2567
```

## 3. Open a free Cloudflare Quick Tunnel

Install Cloudflare Tunnel once:

```bash
winget install Cloudflare.cloudflared
```

Then run:

```bash
cloudflared tunnel --url http://localhost:2567
```

Cloudflare prints a free URL like:

```txt
https://something.trycloudflare.com
```

Open that URL on your phone.

## 4. Invite your friend

Click `ONLINE ROOM`.

The URL becomes:

```txt
https://something.trycloudflare.com?room=ROOM_ID
```

Send that exact URL to your friend.

## Notes

- This is free and good for testing.
- The `trycloudflare.com` URL is temporary and changes when you restart the tunnel.
- Keep both terminals open while playing.
- For a permanent free-ish setup later, use a Cloudflare account and a named tunnel/domain.
