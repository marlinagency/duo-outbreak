import Phaser from "phaser";

export class BulletView extends Phaser.Physics.Arcade.Image {
  damage = 0;
  expiresAt = 0;
  penetration = 0;
  hitIds = new Set<string>();

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, "weapon-pistol");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(16, 5).setTint(0xffd36a).setDepth(18);
    this.setActive(false).setVisible(false);
  }

  fire(
    x: number, y: number, angle: number, speed: number, damage: number,
    now: number, color: number, width: number, penetration: number,
  ) {
    this.damage = damage;
    this.expiresAt = now + 760;
    this.penetration = penetration;
    this.hitIds.clear();
    this.enableBody(true, x, y, true, true);
    this.setDisplaySize(width, Math.max(4, width * .28)).setTint(color);
    this.rotation = angle;
    this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
  }

  despawn() { this.disableBody(true, true); }
}
