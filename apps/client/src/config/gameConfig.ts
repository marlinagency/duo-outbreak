import type { WeaponId, ZombieKind } from "@duo-outbreak/shared";

export const WEAPONS: Record<WeaponId, {
  name: string; damage: number; fireRate: number; speed: number;
  spread: number; pellets: number; magazine: number; reserve: number;
  color: number; bulletWidth: number; penetration: number; kick: number; reloadMs: number;
}> = {
  pistol: { name: "MK-9 PISTOL", damage: 38, fireRate: 420, speed: 920, spread: .025, pellets: 1, magazine: 12, reserve: 60, color: 0xffd36a, bulletWidth: 16, penetration: 0, kick: .001, reloadMs: 900 },
  smg: { name: "VX-7 SMG", damage: 19, fireRate: 135, speed: 1020, spread: .06, pellets: 1, magazine: 30, reserve: 120, color: 0xffbd54, bulletWidth: 17, penetration: 0, kick: .001, reloadMs: 1350 },
  shotgun: { name: "BREACH-12 SHOTGUN", damage: 23, fireRate: 900, speed: 820, spread: .24, pellets: 8, magazine: 6, reserve: 24, color: 0xff9b43, bulletWidth: 13, penetration: 0, kick: .005, reloadMs: 1550 },
  rifle: { name: "AR-4 BATTLE RIFLE", damage: 34, fireRate: 245, speed: 1180, spread: .016, pellets: 1, magazine: 20, reserve: 80, color: 0x68eaff, bulletWidth: 22, penetration: 1, kick: .002, reloadMs: 1450 },
  magnum: { name: "JUDGE .50 MAGNUM", damage: 112, fireRate: 820, speed: 1080, spread: .012, pellets: 1, magazine: 5, reserve: 20, color: 0xfff1b0, bulletWidth: 26, penetration: 2, kick: .007, reloadMs: 1280 },
  plasma: { name: "PRISM PLASMA LANCE", damage: 58, fireRate: 360, speed: 1260, spread: .01, pellets: 1, magazine: 14, reserve: 70, color: 0x7dfbff, bulletWidth: 28, penetration: 3, kick: .003, reloadMs: 1600 },
  flamer: { name: "SOLAR FLAME CANNON", damage: 17, fireRate: 560, speed: 720, spread: .2, pellets: 10, magazine: 5, reserve: 25, color: 0xff7b35, bulletWidth: 16, penetration: 0, kick: .006, reloadMs: 1750 },
};

export const ZOMBIES: Record<ZombieKind, {
  health: number; speed: number; damage: number; scale: number; tint: number; score: number;
}> = {
  walker: { health: 72, speed: 78, damage: 10, scale: .92, tint: 0xa8d878, score: 100 },
  runner: { health: 42, speed: 138, damage: 8, scale: .82, tint: 0xff6048, score: 160 },
  crawler: { health: 58, speed: 118, damage: 7, scale: .74, tint: 0x6aff4c, score: 190 },
  wraith: { health: 98, speed: 106, damage: 13, scale: 1.02, tint: 0x9a63ff, score: 330 },
  brute: { health: 440, speed: 46, damage: 24, scale: 1.52, tint: 0xc8a16b, score: 900 },
  golem: { health: 620, speed: 38, damage: 30, scale: 1.74, tint: 0xd5c190, score: 1250 },
};
