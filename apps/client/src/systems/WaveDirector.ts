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
      this.pending = Math.min(10 + this.wave * 4, 58);
      this.waveTotal = this.pending;
      this.state = "spawning";
      this.nextSpawnAt = now + 400;
      onWave(this.wave);
    }
    if (this.state === "spawning" && this.pending > 0 && now >= this.nextSpawnAt) {
      const roll = Math.random();
      const kind: ZombieKind =
        this.wave >= 5 && roll > .92 ? "brute" :
        this.wave >= 2 && roll > .66 ? "runner" : "walker";
      if (spawn(kind)) {
        this.pending--;
        this.alive++;
      }
      this.nextSpawnAt = now + Math.max(130, 520 - this.wave * 22);
      if (this.pending === 0) this.state = "combat";
    }
    if (this.state === "combat" && this.alive === 0) {
      this.state = "intermission";
      this.intermissionUntil = now + 3000;
    }
  }

  onKilled() { this.alive = Math.max(0, this.alive - 1); }
  get remaining() { return this.pending + this.alive; }
}
