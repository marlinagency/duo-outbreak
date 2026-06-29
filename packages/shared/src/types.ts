export type WeaponId = "pistol" | "smg" | "shotgun" | "rifle" | "magnum" | "plasma" | "flamer";
export type ZombieKind = "walker" | "runner" | "crawler" | "wraith" | "brute" | "golem";
export type PickupKind = "health" | "armor" | "ammo" | "overdrive" | "weapon";

export interface InputFrame {
  sequence: number;
  moveX: number;
  moveY: number;
  aimAngle: number;
  shooting: boolean;
  weapon: WeaponId;
  reload?: boolean;
  activateSpecial?: boolean;
  mutantShockwave?: boolean;
  pause?: boolean;
}

export interface RunStats {
  wave: number;
  kills: number;
  score: number;
  shots: number;
  hits: number;
  survivedMs: number;
  bestCombo: number;
}

export interface NetworkInputFrame extends InputFrame {
  dt: number;
}

export type RoomMode = "local" | "online";

export interface GameLaunchOptions {
  mode?: RoomMode;
  roomId?: string;
  nickname?: string;
  color?: number;
}
