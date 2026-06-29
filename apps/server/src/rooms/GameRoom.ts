import type { Client } from "@colyseus/core";
import { Room } from "@colyseus/core";
import {
  NET_MESSAGES,
  PLAYER,
  ROOM,
  type NetworkInputFrame,
  type WeaponId,
  type ZombieKind,
} from "@duo-outbreak/shared";
import { SERVER_GAME, SERVER_WEAPONS, SERVER_ZOMBIES } from "../config/gameConfig.js";
import { BulletState } from "../schema/BulletState.js";
import { GameState } from "../schema/GameState.js";
import { PickupState } from "../schema/PickupState.js";
import { PlayerState } from "../schema/PlayerState.js";
import { ZombieState } from "../schema/ZombieState.js";

type JoinOptions = {
  nickname?: string;
  color?: number;
};

type LatestInput = Pick<
  NetworkInputFrame,
  "moveX" | "moveY" | "aimAngle" | "shooting" | "weapon" | "activateSpecial" | "mutantShockwave"
>;

const weaponOrder = new Set<WeaponId>(["pistol", "smg", "shotgun", "rifle", "magnum", "plasma", "flamer"]);
const weaponByLevel: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "magnum", "plasma", "flamer"];
const unlocks: Array<{ weapon: WeaponId; kills: number; level: number }> = [
  { weapon: "smg", kills: 12, level: 1 },
  { weapon: "shotgun", kills: 28, level: 2 },
  { weapon: "rifle", kills: 50, level: 3 },
  { weapon: "magnum", kills: 80, level: 4 },
  { weapon: "plasma", kills: 115, level: 5 },
  { weapon: "flamer", kills: 150, level: 6 },
];
const spawnPoints = [
  { x: 800, y: 150 },
  { x: 800, y: 750 },
];

export class GameRoom extends Room<{ state: GameState }> {
  maxClients = ROOM.maxPlayers;
  private latestInputs = new Map<string, LatestInput>();
  private nextSpawnAt = 1800;
  private intermissionUntil = 1800;
  private mode: "intermission" | "spawning" | "combat" = "intermission";
  private zombieSeq = 0;
  private bulletSeq = 0;
  private pickupSeq = 0;

  onCreate() {
    this.setState(new GameState());
    this.state.roomCode = this.roomId;
    this.setSimulationInterval((dt) => this.update(dt), SERVER_GAME.tickMs);

    this.onMessage(NET_MESSAGES.input, (client, input: NetworkInputFrame) => {
      if (!this.state.players.has(client.sessionId)) return;
      this.latestInputs.set(client.sessionId, {
        moveX: clamp(input.moveX, -1, 1),
        moveY: clamp(input.moveY, -1, 1),
        aimAngle: Number.isFinite(input.aimAngle) ? input.aimAngle : 0,
        shooting: Boolean(input.shooting),
        weapon: weaponOrder.has(input.weapon) ? input.weapon : "pistol",
        activateSpecial: Boolean(input.activateSpecial),
        mutantShockwave: Boolean(input.mutantShockwave),
      });
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const spawn = SERVER_GAME.spawns[this.state.players.size % SERVER_GAME.spawns.length];
    const player = new PlayerState();
    player.id = client.sessionId;
    player.nickname = sanitizeName(options.nickname);
    player.color = sanitizeColor(options.color, this.state.players.size);
    player.x = spawn.x;
    player.y = spawn.y;
    player.invulnerableUntil = this.state.serverTime + 3000;
    this.state.players.set(client.sessionId, player);
    this.latestInputs.set(client.sessionId, {
      moveX: 0,
      moveY: 0,
      aimAngle: 0,
      shooting: false,
      weapon: "pistol",
      activateSpecial: false,
      mutantShockwave: false,
    });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    this.latestInputs.delete(client.sessionId);
    this.clock.setTimeout(() => {
      const current = this.state.players.get(client.sessionId);
      if (current && !current.connected) this.state.players.delete(client.sessionId);
    }, 15_000);
  }

  private update(dtMs: number) {
    this.state.serverTime += dtMs;
    const now = this.state.serverTime;
    const dt = Math.min(dtMs / 1000, 0.05);
    this.updatePlayers(dt, now);
    this.updateWaves(now);
    this.updateZombies(dt, now);
    this.updateBullets(dt, now);
    this.updatePickups(now);
    this.state.alive = this.state.zombies.size;
  }

  private updatePlayers(dt: number, now: number) {
    this.state.players.forEach((player, sessionId) => {
      const input = this.latestInputs.get(sessionId);
      if (!input || !player.connected || player.health <= 0) return;
      let { moveX, moveY } = input;
      const length = Math.hypot(moveX, moveY);
      if (length > 1) {
        moveX /= length;
        moveY /= length;
      }
      player.moveX = moveX;
      player.moveY = moveY;
      player.rotation = input.aimAngle;
      player.shooting = input.shooting;
      const requestedWeapon = clampWeapon(input.weapon, player.weaponLevel);
      player.weapon = requestedWeapon;
      if (input.activateSpecial && player.mutation >= 100 && now >= player.mutantUntil) {
        player.mutation = 0;
        player.mutantUntil = now + 6000;
        player.health = Math.min(PLAYER.maxHealth, player.health + 25);
      }
      const isMutant = now < player.mutantUntil;
      if (isMutant) {
        player.health = Math.min(PLAYER.maxHealth, player.health + 2.4 * dt);
        player.armor = Math.min(75, player.armor + 3.2 * dt);
      }
      const speed = isMutant ? SERVER_GAME.playerSpeed * 1.32 : SERVER_GAME.playerSpeed;
      player.x = clamp(player.x + moveX * speed * dt, SERVER_GAME.bounds.minX, SERVER_GAME.bounds.maxX);
      player.y = clamp(player.y + moveY * speed * dt, SERVER_GAME.bounds.minY, SERVER_GAME.bounds.maxY);
      if (isMutant && input.shooting) this.mutantStrike(player, input.aimAngle, now);
      else if (input.shooting) this.tryShoot(player, requestedWeapon, input.aimAngle, now);
      if (isMutant && input.mutantShockwave) this.mutantShockwave(player, now);
    });
  }

  private tryShoot(player: PlayerState, weaponId: WeaponId, angle: number, now: number) {
    const weapon = SERVER_WEAPONS[weaponId];
    const scaling = weaponScaling(this.state.wave);
    if (now < player.nextShotAt) return;
    player.nextShotAt = now + weapon.fireRate * scaling.fireRateMultiplier;
    for (let i = 0; i < weapon.pellets; i++) {
      if (this.state.bullets.size >= SERVER_GAME.maxBullets) break;
      const bullet = new BulletState();
      const shotAngle = angle + (Math.random() * 2 - 1) * weapon.spread;
      bullet.id = `b-${++this.bulletSeq}`;
      bullet.ownerId = player.id;
      bullet.x = player.x + Math.cos(angle) * 35;
      bullet.y = player.y + Math.sin(angle) * 35;
      bullet.angle = shotAngle;
      bullet.damage = weapon.damage * scaling.damageMultiplier;
      bullet.speed = weapon.speed;
      bullet.expiresAt = now + 760;
      bullet.color = weapon.color;
      bullet.width = weapon.bulletWidth;
      bullet.radius = Math.max(8, weapon.bulletWidth * .45);
      this.state.bullets.set(bullet.id, bullet);
    }
  }

  private mutantStrike(player: PlayerState, angle: number, now: number) {
    if (now < player.nextShotAt) return;
    player.nextShotAt = now + 430;
    const centerX = player.x + Math.cos(angle) * 72;
    const centerY = player.y + Math.sin(angle) * 72;
    this.damageZombiesInRadius(centerX, centerY, 112, 145, player.id);
  }

  private mutantShockwave(player: PlayerState, now: number) {
    if (now < player.nextShockwaveAt) return;
    player.nextShockwaveAt = now + 1900;
    this.damageZombiesInRadius(player.x, player.y, 245, 210, player.id);
    [...this.state.bullets.entries()].forEach(([id, bullet]) => {
      if (bullet.hostile && distanceBetween(player.x, player.y, bullet.x, bullet.y) < 270) {
        this.state.bullets.delete(id);
      }
    });
  }

  private updateWaves(now: number) {
    if (this.state.players.size === 0) return;
    if (this.mode === "intermission" && now >= this.intermissionUntil) {
      this.state.wave++;
      this.state.pending = Math.min(10 + this.state.wave * 4, 58);
      this.state.waveTotal = this.state.pending;
      this.mode = "spawning";
      this.nextSpawnAt = now + 400;
    }
    if (this.mode === "spawning" && this.state.pending > 0 && now >= this.nextSpawnAt) {
      this.spawnZombie(this.pickZombieKind());
      this.state.pending--;
      this.nextSpawnAt = now + Math.max(130, 520 - this.state.wave * 22);
      if (this.state.pending === 0) this.mode = "combat";
    }
    if (this.mode === "combat" && this.state.pending === 0 && this.state.zombies.size === 0) {
      this.mode = "intermission";
      this.intermissionUntil = now + 3000;
    }
  }

  private pickZombieKind(): ZombieKind {
    const roll = Math.random();
    if (this.state.wave >= 8 && roll > .96) return "golem";
    if (this.state.wave >= 5 && roll > .88) return "brute";
    if (this.state.wave >= 5 && roll > .74) return "wraith";
    if (this.state.wave >= 3 && roll > .53) return "crawler";
    if (this.state.wave >= 2 && roll > .34) return "runner";
    return "walker";
  }

  private spawnZombie(kind: ZombieKind) {
    if (this.state.zombies.size >= SERVER_GAME.maxZombies) return;
    const activeKindCount = (targetKind: ZombieKind) =>
      [...this.state.zombies.values()].filter((z) => z.kind === targetKind).length;
    const activeSpitters = activeKindCount("runner");
    const spitterCap = this.state.wave <= 4 ? 2 : this.state.wave <= 8 ? 3 : 4;
    if (kind === "runner" && activeSpitters >= spitterCap) kind = "walker";
    if (kind === "wraith" && activeKindCount("wraith") >= (this.state.wave <= 7 ? 2 : 4)) kind = "crawler";
    if (kind === "golem" && activeKindCount("golem") >= (this.state.wave <= 10 ? 1 : 2)) kind = "brute";
    const cfg = SERVER_ZOMBIES[kind];
    const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const zombie = new ZombieState();
    zombie.id = `z-${++this.zombieSeq}`;
    zombie.kind = kind;
    zombie.x = point.x + randomBetween(-88, 88);
    zombie.y = point.y + randomBetween(-12, 12);
    zombie.health = cfg.health * (1 + Math.max(0, this.state.wave - 1) * .085);
    zombie.maxHealth = zombie.health;
    zombie.speed = cfg.speed * (1 + Math.min(this.state.wave, 12) * .018);
    zombie.damage = cfg.damage;
    zombie.scoreValue = cfg.score;
    zombie.nextAttackAt = this.state.serverTime + 700;
    zombie.nextRangedAt = this.state.serverTime + 1300 + Math.random() * 900;
    this.state.zombies.set(zombie.id, zombie);
  }

  private updateZombies(dt: number, now: number) {
    this.state.zombies.forEach((zombie) => {
      const target = this.nearestLivingPlayer(zombie.x, zombie.y);
      if (!target) return;
      const angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      const distance = distanceBetween(zombie.x, zombie.y, target.x, target.y);
      let steerX = Math.cos(angle);
      let steerY = Math.sin(angle);
      let speedMultiplier = 1;
      if (zombie.kind === "runner") {
        if (distance < 215) {
          steerX *= -.72;
          steerY *= -.72;
        } else if (distance < 390) {
          steerX = 0;
          steerY = 0;
        }
        if (distance < 460 && now >= zombie.nextRangedAt) {
          zombie.nextRangedAt = now + 2400 + Math.random() * 700;
          this.fireSpitterOrb(zombie, target, angle, now);
        }
      }
      if (zombie.kind === "wraith") {
        if (distance < 165) {
          steerX = -Math.cos(angle);
          steerY = -Math.sin(angle);
        } else if (distance < 340) {
          steerX = -Math.sin(angle);
          steerY = Math.cos(angle);
        }
        if (distance < 430 && now >= zombie.nextRangedAt) {
          zombie.nextRangedAt = now + 1500 + Math.random() * 800;
          this.fireSpitterOrb(zombie, target, angle, now, 0x9a63ff, 24, 380, 28);
        }
      }
      if (zombie.kind === "crawler") {
        const zigzag = Math.sin(now * .012 + zombie.x * .03) * .85;
        steerX += -Math.sin(angle) * zigzag;
        steerY += Math.cos(angle) * zigzag;
        if (distance < 130) speedMultiplier = 1.18;
      }
      if (zombie.kind === "golem" && distance < 160) speedMultiplier = .82;
      const length = Math.hypot(steerX, steerY) || 1;
      zombie.x = clamp(zombie.x + steerX / length * zombie.speed * speedMultiplier * dt, SERVER_GAME.bounds.minX, SERVER_GAME.bounds.maxX);
      zombie.y = clamp(zombie.y + steerY / length * zombie.speed * speedMultiplier * dt, SERVER_GAME.bounds.minY, SERVER_GAME.bounds.maxY);
      zombie.rotation = angle;
      if (
        zombie.kind !== "runner" &&
        zombie.kind !== "wraith" &&
        distance < zombieAttackReach(zombie.kind) &&
        now >= zombie.nextAttackAt
      ) {
        zombie.nextAttackAt = now + (zombie.kind === "golem" ? 980 : 760);
        this.damagePlayer(target, zombie.damage);
      }
    });
  }

  private fireSpitterOrb(
    zombie: ZombieState,
    target: PlayerState,
    angle: number,
    now: number,
    color = 0xff4d1f,
    damage = 34,
    speed = 330,
    width = 34,
  ) {
    if (this.state.bullets.size >= SERVER_GAME.maxBullets) return;
    const bullet = new BulletState();
    bullet.id = `orb-${++this.bulletSeq}`;
    bullet.ownerId = zombie.id;
    bullet.x = zombie.x + Math.cos(angle) * 38;
    bullet.y = zombie.y + Math.sin(angle) * 38;
    const leadX = target.x + target.moveX * 70;
    const leadY = target.y + target.moveY * 70;
    bullet.angle = Math.atan2(leadY - zombie.y, leadX - zombie.x);
    bullet.damage = damage;
    bullet.speed = speed;
    bullet.expiresAt = now + 2800;
    bullet.color = color;
    bullet.width = width;
    bullet.radius = Math.max(14, width * .52);
    bullet.hostile = true;
    this.state.bullets.set(bullet.id, bullet);
  }

  private updateBullets(dt: number, now: number) {
    const deadBullets: string[] = [];
    const deadZombies: Array<{ zombie: ZombieState; ownerId: string }> = [];
    this.state.bullets.forEach((bullet, bulletId) => {
      bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
      bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
      if (
        now >= bullet.expiresAt ||
        bullet.x < SERVER_GAME.bounds.minX || bullet.x > SERVER_GAME.bounds.maxX ||
        bullet.y < SERVER_GAME.bounds.minY || bullet.y > SERVER_GAME.bounds.maxY
      ) {
        deadBullets.push(bulletId);
        return;
      }
      if (bullet.hostile) {
        for (const player of this.state.players.values()) {
          if (!player.connected || player.health <= 0) continue;
          if (distanceBetween(bullet.x, bullet.y, player.x, player.y) > bullet.radius + 18) continue;
          this.damagePlayer(player, bullet.damage);
          deadBullets.push(bulletId);
          break;
        }
      } else {
        for (const zombie of this.state.zombies.values()) {
          if (distanceBetween(bullet.x, bullet.y, zombie.x, zombie.y) > zombieHitRadius(zombie.kind)) continue;
          zombie.health -= bullet.damage;
          deadBullets.push(bulletId);
          if (zombie.health <= 0) deadZombies.push({ zombie, ownerId: bullet.ownerId });
          break;
        }
      }
    });
    deadBullets.forEach((id) => this.state.bullets.delete(id));
    deadZombies.forEach(({ zombie, ownerId }) => this.killZombie(zombie, ownerId));
  }

  private updatePickups(now: number) {
    this.state.pickups.forEach((pickup, pickupId) => {
      if (now >= pickup.expiresAt) {
        this.state.pickups.delete(pickupId);
        return;
      }
      for (const player of this.state.players.values()) {
        if (!player.connected || player.health <= 0) continue;
        if (distanceBetween(player.x, player.y, pickup.x, pickup.y) > 45) continue;
        if (pickup.kind === "health") player.health = Math.min(PLAYER.maxHealth, player.health + 30);
        if (pickup.kind === "armor") player.armor = Math.min(75, player.armor + 28);
        if (pickup.kind === "ammo") {
          player.score += 75;
          player.nextShotAt = Math.max(0, player.nextShotAt - 260);
        }
        this.state.pickups.delete(pickupId);
        break;
      }
    });
  }

  private killZombie(zombie: ZombieState, ownerId: string) {
    if (!this.state.zombies.has(zombie.id)) return;
    this.state.zombies.delete(zombie.id);
    this.state.kills++;
    this.state.score += zombie.scoreValue;
    const owner = this.state.players.get(ownerId);
    if (owner) {
      owner.kills++;
      owner.score += zombie.scoreValue;
      owner.mutation = Math.min(100, owner.mutation + mutationGain(zombie.kind));
      const nextUnlock = unlocks.find((unlock) => owner.kills >= unlock.kills && owner.weaponLevel < unlock.level);
      if (nextUnlock) owner.weaponLevel = nextUnlock.level;
    }
    if (Math.random() < .17) this.spawnPickup(zombie.x, zombie.y);
  }

  private damageZombiesInRadius(x: number, y: number, radius: number, damage: number, ownerId: string) {
    const dead: ZombieState[] = [];
    this.state.zombies.forEach((zombie) => {
      const distance = distanceBetween(x, y, zombie.x, zombie.y);
      if (distance > radius) return;
      zombie.health -= damage * (1 - distance / (radius * 1.8));
      if (zombie.health <= 0) dead.push(zombie);
    });
    dead.forEach((zombie) => this.killZombie(zombie, ownerId));
  }

  private spawnPickup(x: number, y: number) {
    const pickup = new PickupState();
    pickup.id = `p-${++this.pickupSeq}`;
    const roll = Math.random();
    pickup.kind = roll < .45 ? "health" : roll < .75 ? "armor" : "ammo";
    pickup.x = x;
    pickup.y = y;
    pickup.expiresAt = this.state.serverTime + 12_000;
    this.state.pickups.set(pickup.id, pickup);
  }

  private nearestLivingPlayer(x: number, y: number) {
    let best: PlayerState | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.state.players.forEach((player) => {
      if (!player.connected || player.health <= 0) return;
      const distance = distanceBetween(x, y, player.x, player.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = player;
      }
    });
    return best;
  }

  private damagePlayer(player: PlayerState, damage: number) {
    if (this.state.serverTime < player.invulnerableUntil) return;
    player.invulnerableUntil = this.state.serverTime + 520;
    const absorbed = Math.min(player.armor, Math.ceil(damage * .65));
    player.armor -= absorbed;
    player.health = Math.max(0, player.health - (damage - absorbed));
    if ([...this.state.players.values()].every((p) => !p.connected || p.health <= 0)) this.state.gameOver = true;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeName(value: unknown) {
  if (typeof value !== "string") return "survivor";
  const trimmed = value.trim().slice(0, 16);
  return trimmed.length > 0 ? trimmed : "survivor";
}

function sanitizeColor(value: unknown, index: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return index % 2 === 0 ? 0x52eadc : 0xffca3a;
}

function clampWeapon(weapon: WeaponId, level: number) {
  const requested = weaponByLevel.indexOf(weapon);
  if (requested < 0) return "pistol";
  return weaponByLevel[Math.min(requested, Math.max(0, level))];
}

function weaponScaling(wave: number) {
  const level = Math.max(0, wave - 1);
  return {
    damageMultiplier: 1 + Math.min(.7, level * .045),
    fireRateMultiplier: Math.max(.72, 1 - level * .018),
  };
}

function zombieHitRadius(kind: ZombieKind) {
  if (kind === "golem") return 54;
  if (kind === "brute") return 42;
  if (kind === "runner" || kind === "wraith") return 34;
  if (kind === "crawler") return 26;
  return 30;
}

function zombieAttackReach(kind: ZombieKind) {
  if (kind === "golem") return 74;
  if (kind === "brute") return 66;
  if (kind === "crawler") return 42;
  return 48;
}

function mutationGain(kind: ZombieKind) {
  if (kind === "golem") return 36;
  if (kind === "brute") return 28;
  if (kind === "wraith") return 22;
  if (kind === "runner") return 18;
  if (kind === "crawler") return 14;
  return 8;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function distanceBetween(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}
