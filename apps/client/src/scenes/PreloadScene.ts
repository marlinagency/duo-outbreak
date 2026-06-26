import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() { super("preload"); }

  preload() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const label = this.add.text(cx, cy - 32, "INITIALIZING BLACKOUT PROTOCOL", {
      fontFamily: "Kenney Future",
      fontSize: "24px",
      color: "#bce9e7",
    }).setOrigin(.5);
    const bar = this.add.rectangle(cx - 240, cy + 18, 0, 8, 0x52eadc).setOrigin(0, .5);
    this.load.on("progress", (v: number) => bar.width = 480 * v);
    this.load.on("complete", () => label.setText("SECTOR ONLINE"));

    const base = "/assets/kenney";
    this.load.image("player-pistol", `${base}/topdown/player_pistol.png`);
    this.load.image("player-smg", `${base}/topdown/player_smg.png`);
    this.load.image("player-shotgun", `${base}/topdown/player_shotgun.png`);
    this.load.image("zombie", `${base}/topdown/zombie.png`);
    this.load.image("weapon-pistol", `${base}/topdown/weapon_pistol.png`);
    this.load.image("weapon-smg", `${base}/topdown/weapon_smg.png`);
    this.load.image("weapon-shotgun", `${base}/topdown/weapon_shotgun.png`);
    this.load.image("weapon-rifle", `${base}/topdown/weapon_rifle.png`);
    this.load.image("weapon-magnum", `${base}/topdown/weapon_magnum.png`);
    this.load.image("tile-floor", `${base}/topdown/tile_floor.png`);
    this.load.image("crate", `${base}/topdown/crate.png`);
    this.load.image("barrel", `${base}/topdown/barrel.png`);
    this.load.image("wall", `${base}/topdown/wall.png`);
    this.load.image("pickup-health", `${base}/topdown/pickup_health.png`);
    this.load.image("pickup-ammo", `${base}/topdown/pickup_ammo.png`);
    this.load.image("debris", `${base}/topdown/debris.png`);
    this.load.image("oil-stain", `${base}/topdown/oil_stain.png`);
    this.load.image("tire", `${base}/topdown/tire.png`);
    this.load.image("floor-light-amber", `${base}/topdown/floor_light_amber.png`);
    this.load.image("floor-light-teal", `${base}/topdown/floor_light_teal.png`);
    this.load.image("spitter", "/assets/custom/spitter.png");
    this.load.image("spitter-orb", "/assets/custom/spitter-orb.png");
    this.load.image("pickup-medkit-custom", "/assets/custom/pickup-medkit.png");
    this.load.image("pickup-armor-custom", "/assets/custom/pickup-armor.png");
    this.load.image("pickup-weapon-crate", "/assets/custom/pickup-weapon-crate.png");
    this.load.image("mutant-form", "/assets/custom/mutant-form.png");
    this.load.audio("hit", `${base}/audio/hit.ogg`);
    this.load.audio("metal", `${base}/audio/metal.ogg`);
    this.load.audio("ui-confirm", `${base}/audio/confirm.ogg`);
    this.load.audio("ui-wave", `${base}/audio/wave.ogg`);
  }

  create() { this.scene.start("menu"); }
}
