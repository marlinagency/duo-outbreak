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
    this.enableBody(true, x, y, true, true);
    this.setTexture(kind === "runner" ? "spitter" : "zombie");
    if (kind === "runner") this.setDisplaySize(82, 82);
    else this.setScale(cfg.scale);
    this.setTint(cfg.tint).setDepth(12);
    this.setAlpha(1);
    this.body!.setCircle(25, 13, 13);
  }

  hit(damage: number) {
    this.health -= damage;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(45, () => {
      if (this.active) this.setTint(ZOMBIES[this.kind].tint);
    });
    return this.health <= 0;
  }

  despawn() {
    this.disableBody(true, true);
    this.clearTint();
  }
}
