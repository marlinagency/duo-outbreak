import Phaser from "phaser";

export class EnemyProjectileView extends Phaser.Physics.Arcade.Image {
  damage = 0;
  expiresAt = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, "spitter-orb");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false).setDepth(19);
  }

  fire(x: number, y: number, angle: number, now: number) {
    this.damage = 34;
    this.expiresAt = now + 2800;
    this.enableBody(true, x, y, true, true);
    this.setDisplaySize(34, 34).setRotation(angle);
    this.scene.physics.velocityFromRotation(angle, 330, this.body!.velocity);
  }

  despawn() { this.disableBody(true, true); }
}
