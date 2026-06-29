import Phaser from "phaser";

type ProjectileOptions = {
  damage?: number;
  speed?: number;
  size?: number;
  tint?: number;
};

export class EnemyProjectileView extends Phaser.Physics.Arcade.Image {
  damage = 0;
  expiresAt = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, "spitter-orb");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false).setDepth(19);
  }

  fire(x: number, y: number, angle: number, now: number, options: ProjectileOptions = {}) {
    const size = options.size ?? 34;
    this.damage = options.damage ?? 34;
    this.expiresAt = now + 2800;
    this.enableBody(true, x, y, true, true);
    this.setDisplaySize(size, size).setRotation(angle).setTint(options.tint ?? 0xffffff);
    this.scene.physics.velocityFromRotation(angle, options.speed ?? 330, this.body!.velocity);
  }

  despawn() {
    this.clearTint();
    this.disableBody(true, true);
  }
}
