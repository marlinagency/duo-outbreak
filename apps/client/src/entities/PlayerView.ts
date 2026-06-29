import Phaser from "phaser";
import { PLAYER, type WeaponId } from "@duo-outbreak/shared";
import { WEAPONS } from "../config/gameConfig";

export class PlayerView extends Phaser.Physics.Arcade.Sprite {
  health: number = PLAYER.maxHealth;
  armor = 25;
  weapon: WeaponId = "pistol";
  unlockedWeapons = new Set<WeaponId>(["pistol"]);
  ammo = {
    pistol: { mag: WEAPONS.pistol.magazine, reserve: WEAPONS.pistol.reserve },
    smg: { mag: WEAPONS.smg.magazine, reserve: WEAPONS.smg.reserve },
    shotgun: { mag: WEAPONS.shotgun.magazine, reserve: WEAPONS.shotgun.reserve },
    rifle: { mag: WEAPONS.rifle.magazine, reserve: WEAPONS.rifle.reserve },
    magnum: { mag: WEAPONS.magnum.magazine, reserve: WEAPONS.magnum.reserve },
    plasma: { mag: WEAPONS.plasma.magazine, reserve: WEAPONS.plasma.reserve },
    flamer: { mag: WEAPONS.flamer.magazine, reserve: WEAPONS.flamer.reserve },
  };
  nextShotAt = 0;
  invulnerableUntil = 0;
  overdriveUntil = 0;
  reloadingUntil = 0;
  mutation = 0;
  mutantUntil = 0;
  nextMutantStrikeAt = 0;
  nextShockwaveAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-pistol");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(.94).setDepth(20).setCollideWorldBounds(true);
    this.body!.setCircle(24, 18, 18);
  }

  setWeapon(id: WeaponId) {
    if (!this.unlockedWeapons.has(id) || this.weapon === id) return;
    this.weapon = id;
    this.reloadingUntil = 0;
    this.restoreAppearance();
  }

  unlockWeapon(id: WeaponId) {
    this.unlockedWeapons.add(id);
    const ammo = this.ammo[id];
    ammo.mag = WEAPONS[id].magazine;
    ammo.reserve = Math.max(ammo.reserve, WEAPONS[id].magazine * 2);
    this.setWeapon(id);
  }

  restoreAppearance() {
    if (this.mutantUntil > this.scene.time.now) {
      this.setTexture("mutant-form").setDisplaySize(118, 118).setTint(0xffffff);
      this.body!.setCircle(38, 22, 22);
      return;
    }
    const id = this.weapon;
    const texture =
      id === "pistol" || id === "magnum" ? "player-pistol" :
      id === "smg" || id === "rifle" || id === "plasma" ? "player-smg" : "player-shotgun";
    this.setTexture(texture);
    this.setScale(.94);
    this.body!.setCircle(24, 18, 18);
    this.setTint(
      id === "shotgun" ? 0xffc27a :
      id === "rifle" ? 0x86ecff :
      id === "magnum" ? 0xffe59a :
      id === "plasma" ? 0x8dfffa :
      id === "flamer" ? 0xff9b4d : 0xffffff,
    );
  }

  addMutation(amount: number) {
    if (this.mutantUntil > this.scene.time.now) return;
    this.mutation = Math.min(100, this.mutation + amount);
  }

  activateMutation(now: number) {
    if (this.mutation < 100 || this.mutantUntil > now) return false;
    this.mutation = 0;
    this.mutantUntil = now + 6000;
    this.reloadingUntil = 0;
    this.health = Math.min(100, this.health + 25);
    this.restoreAppearance();
    return true;
  }

  updateMutation(now: number) {
    if (this.mutantUntil > 0 && now >= this.mutantUntil) {
      this.mutantUntil = 0;
      this.restoreAppearance();
    }
  }

  get isMutant() { return this.mutantUntil > this.scene.time.now; }

  startReload(now: number) {
    const weapon = WEAPONS[this.weapon];
    const ammo = this.ammo[this.weapon];
    if (this.reloadingUntil > now || ammo.mag >= weapon.magazine || ammo.reserve <= 0) return;
    this.reloadingUntil = now + weapon.reloadMs;
  }

  updateReload(now: number) {
    if (this.reloadingUntil === 0 || now < this.reloadingUntil) return;
    this.reloadingUntil = 0;
    const weapon = WEAPONS[this.weapon];
    const ammo = this.ammo[this.weapon];
    const needed = weapon.magazine - ammo.mag;
    const loaded = Math.min(needed, ammo.reserve);
    if (this.weapon === "pistol") {
      ammo.mag = weapon.magazine;
      return;
    }
    ammo.mag += loaded;
    ammo.reserve -= loaded;
  }
}
