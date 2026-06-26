import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  create() {
    this.input.addPointer(2);
    this.scene.start("preload");
  }
}
