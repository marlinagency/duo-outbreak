# Phase 2 networking boundary

No networking code is active in Phase 1.

The future Colyseus adapter should:

- translate local `InputFrame` values into compact room messages;
- interpolate remote render state without owning combat outcomes;
- keep Phaser views ignorant of Colyseus schemas;
- reconnect by session token without granting host authority.
