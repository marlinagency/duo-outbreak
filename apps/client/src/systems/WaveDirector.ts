import type { ZombieKind } from "@duo-outbreak/shared";

export class WaveDirector {
  wave = 0;
  pending = 0;
  alive = 0;
  waveTotal = 0;
  nextSpawnAt = 0;
  intermissionUntil = 0;
  state: "intermission" | "spawning" | "combat" = "intermission";

  constructor() { this.intermissionUntil = 1800; }

  update(now: number, spawn: (kind: ZombieKind) => boolean, onWave: (wave: number) => void) {
    if (this.state === "intermission" && now >= this.intermissionUntil) {
      this.wave++;
      this.pending = Math.min(9 + this.wave * 3, 46);
      this.waveTotal = this.pending;
      this.state = "spawning";
      this.nextSpawnAt = now + 400;
      onWave(this.wave);
    }
    if (this.state === "spawning" && this.pending > 0 && now >= this.nextSpawnAt) {
      const roll = Math.random();
      const kind: ZombieKind =
        this.wave >= 8 && roll > .96 ? "golem" :
        this.wave >= 5 && roll > .88 ? "brute" :
        this.wave >= 5 && roll > .74 ? "wraith" :
        this.wave >= 3 && roll > .53 ? "crawler" :
        this.wave >= 2 && roll > .34 ? "runner" : "walker";
      if (spawn(kind)) {
        this.pending--;
        this.alive++;
      }
      this.nextSpawnAt = now + Math.max(165, 540 - this.wave * 20);
      if (this.pending === 0) this.state = "combat";
    }
    if (this.state === "combat" && this.alive === 0) {
      this.state = "intermission";
      this.intermissionUntil = now + 3000;
    }
  }

  onKilled() { this.alive = Math.max(0, this.alive - 1); }
  syncAlive(actualAlive: number) { this.alive = Math.max(0, actualAlive); }
  get remaining() { return this.pending + this.alive; }
}
