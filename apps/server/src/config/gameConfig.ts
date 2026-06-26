import { PLAYER, ROOM, WORLD } from "@duo-outbreak/shared";
import type { WeaponId, ZombieKind } from "@duo-outbreak/shared";

export const SERVER_GAME = {
  tickMs: 1000 / ROOM.simulationHz,
  playerSpeed: PLAYER.speed,
  bounds: {
    minX: WORLD.margin,
    maxX: WORLD.width - WORLD.margin,
    minY: WORLD.margin,
    maxY: WORLD.height - WORLD.margin,
  },
  spawns: [
    { x: 735, y: 450 },
    { x: 865, y: 450 },
  ],
  maxZombies: 70,
  maxBullets: 130,
} as const;

export const SERVER_WEAPONS: Record<WeaponId, {
  damage: number; fireRate: number; speed: number; spread: number;
  pellets: number; color: number; bulletWidth: number;
}> = {
  pistol: { damage: 38, fireRate: 420, speed: 920, spread: .025, pellets: 1, color: 0xffd36a, bulletWidth: 16 },
  smg: { damage: 19, fireRate: 135, speed: 1020, spread: .06, pellets: 1, color: 0xffbd54, bulletWidth: 17 },
  shotgun: { damage: 23, fireRate: 900, speed: 820, spread: .24, pellets: 8, color: 0xff9b43, bulletWidth: 13 },
  rifle: { damage: 34, fireRate: 245, speed: 1180, spread: .016, pellets: 1, color: 0x68eaff, bulletWidth: 22 },
  magnum: { damage: 112, fireRate: 820, speed: 1080, spread: .012, pellets: 1, color: 0xfff1b0, bulletWidth: 26 },
};

export const SERVER_ZOMBIES: Record<ZombieKind, {
  health: number; speed: number; damage: number; score: number;
}> = {
  walker: { health: 72, speed: 78, damage: 7, score: 100 },
  runner: { health: 42, speed: 138, damage: 8, score: 160 },
  brute: { health: 440, speed: 46, damage: 18, score: 900 },
};
