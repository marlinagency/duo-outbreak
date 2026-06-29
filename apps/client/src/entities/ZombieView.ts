import Phaser from "phaser";
import type { ZombieKind } from "@duo-outbreak/shared";
import { ZOMBIES } from "../config/gameConfig";

export class ZombieView extends Phaser.Physics.Arcade.Sprite {
  kind: ZombieKind = "walker";
  health = 1;
  maxHealth = 1;
  speed = 1;
  damage = 1;
  scoreValue = 1;
  nextAttackAt = 0;
  entityId = "";
  steerSign = 1;
  lastProgressAt = 0;
  lastProgressX = 0;
  lastProgressY = 0;
  forcedSteerUntil = 0;
  orbitAngle = 0;
  nextRangedAt = 0;
  chargingUntil = 0;
  private nextHitFlashAt = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, -200, "zombie");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
  }

  spawn(id: string, x: number, y: number, kind: ZombieKind, wave: number) {
    const cfg = ZOMBIES[kind];
    this.entityId = id;
    this.kind = kind;
    this.health = cfg.health * (1 + Math.max(0, wave - 1) * .085);
    this.maxHealth = this.health;
    this.speed = cfg.speed * (1 + Math.min(wave, 12) * .018);
    this.damage = cfg.damage;
    this.scoreValue = cfg.score;
    this.steerSign = Math.random() > .5 ? 1 : -1;
    this.lastProgressAt = this.scene.time.now;
    this.lastProgressX = x;
    this.lastProgressY = y;
    this.forcedSteerUntil = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.nextRangedAt = this.scene.time.now + 1200 + Math.random() * 1000;
    this.chargingUntil = 0;
    this.nextHitFlashAt = 0;
    this.enableBody(true, x, y, true, true);
    this.setTexture(zombieTexture(kind));
    if (kind === "runner") this.setDisplaySize(82, 82);
    else if (kind === "crawler") this.setDisplaySize(74, 74);
    else if (kind === "wraith") this.setDisplaySize(96, 102);
    else if (kind === "golem") this.setDisplaySize(126, 126);
    else this.setScale(cfg.scale);
    this.setTint(cfg.tint).setDepth(12);
    this.setAlpha(1);
    const radius = kind === "golem" ? 38 : kind === "crawler" ? 22 : kind === "wraith" ? 28 : 25;
    this.body!.setCircle(radius, 13, 13);
  }

  hit(damage: number) {
    this.health -= damage;
    const now = this.scene.time.now;
    if (now >= this.nextHitFlashAt) {
      this.nextHitFlashAt = now + 70;
      this.setTintFill(0xffffff);
      this.scene.time.delayedCall(42, () => {
        if (this.active) this.setTint(ZOMBIES[this.kind].tint);
      });
    }
    return this.health <= 0;
  }

  despawn() {
    this.disableBody(true, true);
    this.clearTint();
  }
}

function zombieTexture(kind: ZombieKind) {
  if (kind === "runner") return "spitter";
  if (kind === "crawler") return "monster-crawler";
  if (kind === "wraith") return "monster-wraith";
  if (kind === "golem") return "monster-golem";
  return "zombie";
}
