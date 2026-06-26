import Phaser from "phaser";
import type { RunStats, WeaponId } from "@duo-outbreak/shared";
import { WEAPONS } from "../config/gameConfig";
import type { PlayerView } from "../entities/PlayerView";

const WEAPON_ORDER: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "magnum"];

export class Hud {
  private healthBar!: Phaser.GameObjects.Rectangle;
  private armorBar!: Phaser.GameObjects.Rectangle;
  private healthText!: Phaser.GameObjects.Text;
  private armorText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private remainingText!: Phaser.GameObjects.Text;
  private waveBar!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Rectangle;
  private ammoText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private mutationBar!: Phaser.GameObjects.Rectangle;
  private mutationText!: Phaser.GameObjects.Text;
  private weaponSlots = new Map<WeaponId, {
    frame: Phaser.GameObjects.Rectangle;
    ammo: Phaser.GameObjects.Text;
    label: Phaser.GameObjects.Text;
  }>();
  private readonly mobile: boolean;

  constructor(scene: Phaser.Scene) {
    this.mobile = window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 920;
    const fixed = <
      T extends Phaser.GameObjects.GameObject &
      Phaser.GameObjects.Components.ScrollFactor &
      Phaser.GameObjects.Components.Depth
    >(object: T, depth = 100) => object.setScrollFactor(0).setDepth(depth);

    const panel = (x: number, y: number, width: number, height: number) =>
      fixed(scene.add.rectangle(x, y, width, height, 0x020709, .9)
        .setOrigin(0).setStrokeStyle(2, 0x254c50, .95));

    if (this.mobile) {
      this.createMobile(scene, fixed, panel);
      return;
    }

    panel(28, 26, 370, 138);
    fixed(scene.add.text(48, 42, "OPERATIVE // P1", {
      fontFamily: "Kenney Future", fontSize: "16px", color: "#7ff8ec",
    }));
    fixed(scene.add.text(350, 42, "ACTIVE", {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#63dd7b",
    }).setOrigin(1, 0));

    fixed(scene.add.text(48, 77, "HEALTH", {
      fontFamily: "Kenney Future", fontSize: "11px", color: "#81999a",
    }));
    fixed(scene.add.rectangle(112, 78, 238, 17, 0x2a1114).setOrigin(0));
    this.healthBar = fixed(scene.add.rectangle(112, 78, 238, 17, 0xf04439).setOrigin(0));
    this.healthText = fixed(scene.add.text(356, 74, "100", {
      fontFamily: "Kenney Future", fontSize: "14px", color: "#ffffff",
    }).setOrigin(1, 0));

    fixed(scene.add.text(48, 110, "ARMOR", {
      fontFamily: "Kenney Future", fontSize: "11px", color: "#81999a",
    }));
    fixed(scene.add.rectangle(112, 111, 238, 14, 0x0c2232).setOrigin(0));
    this.armorBar = fixed(scene.add.rectangle(112, 111, 238, 14, 0x2b91d8).setOrigin(0));
    this.armorText = fixed(scene.add.text(356, 107, "50", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#bde9ff",
    }).setOrigin(1, 0));

    panel(614, 20, 372, 112);
    this.waveText = fixed(scene.add.text(800, 30, "WAVE 0", {
      fontFamily: "Kenney Future", fontSize: "34px", color: "#ffffff",
      stroke: "#020303", strokeThickness: 6,
    }).setOrigin(.5, 0));
    this.remainingText = fixed(scene.add.text(800, 71, "BLACKOUT PROTOCOL", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#69eee4",
    }).setOrigin(.5, 0));
    fixed(scene.add.rectangle(650, 103, 300, 8, 0x10292b).setOrigin(0));
    this.waveBar = fixed(scene.add.rectangle(650, 103, 300, 8, 0x4de5d8).setOrigin(0));

    panel(1208, 26, 364, 138);
    fixed(scene.add.text(1230, 42, "TACTICAL SCORE", {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#81999a",
    }));
    this.scoreText = fixed(scene.add.text(1548, 35, "0", {
      fontFamily: "Kenney Future", fontSize: "32px", color: "#ffffff",
    }).setOrigin(1, 0));
    this.ammoText.setPosition(80, 112).setOrigin(0).setStyle({
      fontFamily: "Kenney Future", fontSize: "22px", color: "#ffffff",
      stroke: "#020303", strokeThickness: 5,
    });
    this.killsText = fixed(scene.add.text(1230, 88, "KILLS  0", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#9db4b5",
    }));
    this.accuracyText = fixed(scene.add.text(1370, 88, "ACC  0%", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#9db4b5",
    }));
    this.comboText = fixed(scene.add.text(1548, 112, "x1 CHAIN", {
      fontFamily: "Kenney Future", fontSize: "18px", color: "#ffc63b",
    }).setOrigin(1, 0));
    fixed(scene.add.rectangle(1230, 139, 318, 7, 0x33260b).setOrigin(0));
    this.comboBar = fixed(scene.add.rectangle(1230, 139, 26, 7, 0xffbd28).setOrigin(0));

    panel(28, 772, 270, 98);
    fixed(scene.add.text(48, 789, "MISSION TIME", {
      fontFamily: "Kenney Future", fontSize: "11px", color: "#6d8789",
    }));
    this.timerText = fixed(scene.add.text(48, 818, "00:00", {
      fontFamily: "Kenney Future", fontSize: "25px", color: "#ffffff",
    }));
    this.statusText = fixed(scene.add.text(278, 824, "SYSTEMS NOMINAL", {
      fontFamily: "Kenney Future", fontSize: "11px", color: "#67e9df",
    }).setOrigin(1, 0));
    fixed(scene.add.rectangle(48, 854, 210, 7, 0x173016).setOrigin(0));
    this.mutationBar = fixed(scene.add.rectangle(48, 854, 0, 7, 0x78ff45).setOrigin(0));
    this.mutationText = fixed(scene.add.text(278, 848, "Q MUTATION 0%", {
      fontFamily: "Kenney Future", fontSize: "9px", color: "#6e8b6c",
    }).setOrigin(1, 0));

    const slotWidth = 166;
    const gap = 10;
    const startX = 330;
    WEAPON_ORDER.forEach((id, index) => {
      const x = startX + index * (slotWidth + gap);
      const frame = fixed(scene.add.rectangle(x, 788, slotWidth, 82, 0x020709, .93)
        .setOrigin(0).setStrokeStyle(2, 0x34484a));
      fixed(scene.add.text(x + 10, 797, `${index + 1}`, {
        fontFamily: "Kenney Future", fontSize: "14px", color: "#ffffff",
      }));
      fixed(scene.add.image(x + 81, 820, `weapon-${id}`).setDisplaySize(72, 29));
      const label = fixed(scene.add.text(x + 12, 849, WEAPONS[id].name.split(" ")[0], {
        fontFamily: "Kenney Future", fontSize: "9px", color: "#768d8e",
      }));
      const ammo = fixed(scene.add.text(x + 154, 846, "0/0", {
        fontFamily: "Kenney Future", fontSize: "12px", color: "#ffffff",
      }).setOrigin(1, 0));
      this.weaponSlots.set(id, { frame, ammo, label });
    });

    panel(1220, 772, 352, 98);
    this.weaponText = fixed(scene.add.text(1240, 790, "MK-9 PISTOL", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#7dece4",
    }));
    this.ammoText = fixed(scene.add.text(1548, 810, "12", {
      fontFamily: "Kenney Future", fontSize: "36px", color: "#ffffff",
    }).setOrigin(1, 0));
    fixed(scene.add.text(1548, 849, "R  RELOAD", {
      fontFamily: "Kenney Future", fontSize: "10px", color: "#6f8586",
    }).setOrigin(1, 0));
  }

  private createMobile(
    scene: Phaser.Scene,
    fixed: <
      T extends Phaser.GameObjects.GameObject &
      Phaser.GameObjects.Components.ScrollFactor &
      Phaser.GameObjects.Components.Depth
    >(object: T, depth?: number) => T,
    panel: (x: number, y: number, width: number, height: number) => Phaser.GameObjects.Rectangle,
  ) {
    this.healthBar = fixed(scene.add.rectangle(-1000, -1000, 1, 1, 0xf04439).setOrigin(0).setAlpha(0));
    this.armorBar = fixed(scene.add.rectangle(-1000, -1000, 1, 1, 0x2b91d8).setOrigin(0).setAlpha(0));
    this.healthText = fixed(scene.add.text(-1000, -1000, "", {
      fontFamily: "Kenney Future", fontSize: "1px",
    }).setAlpha(0));
    this.armorText = fixed(scene.add.text(-1000, -1000, "", {
      fontFamily: "Kenney Future", fontSize: "1px",
    }).setAlpha(0));

    panel(610, 76, 380, 74).setAlpha(.54);
    this.waveText = fixed(scene.add.text(800, 84, "WAVE 0", {
      fontFamily: "Kenney Future", fontSize: "32px", color: "#ffffff",
      stroke: "#020303", strokeThickness: 6,
    }).setOrigin(.5, 0));
    this.remainingText = fixed(scene.add.text(800, 123, "READY", {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#69eee4",
    }).setOrigin(.5, 0));
    fixed(scene.add.rectangle(690, 143, 220, 6, 0x10292b).setOrigin(0).setAlpha(.8));
    this.waveBar = fixed(scene.add.rectangle(690, 143, 220, 6, 0x4de5d8).setOrigin(0));

    this.scoreText = fixed(scene.add.text(1518, 82, "0", {
      fontFamily: "Kenney Future", fontSize: "24px", color: "#ffffff",
      stroke: "#020303", strokeThickness: 5,
    }).setOrigin(1, 0));
    this.killsText = fixed(scene.add.text(1518, 114, "KILLS 0", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#c8dcdd",
      stroke: "#020303", strokeThickness: 4,
    }).setOrigin(1, 0));
    this.accuracyText = fixed(scene.add.text(-1000, -1000, "", {
      fontFamily: "Kenney Future", fontSize: "1px",
    }).setAlpha(0));
    this.comboText = fixed(scene.add.text(1518, 136, "x1", {
      fontFamily: "Kenney Future", fontSize: "15px", color: "#ffc63b",
      stroke: "#020303", strokeThickness: 4,
    }).setOrigin(1, 0));
    this.comboBar = fixed(scene.add.rectangle(1398, 160, 22, 5, 0xffbd28).setOrigin(0));

    this.weaponText = fixed(scene.add.text(80, 82, "MK-9 PISTOL", {
      fontFamily: "Kenney Future", fontSize: "15px", color: "#7dece4",
      stroke: "#020303", strokeThickness: 5,
    }));
    this.ammoText = fixed(scene.add.text(995, 744, "12 / ∞", {
      fontFamily: "Kenney Future", fontSize: "32px", color: "#ffffff",
    }).setOrigin(1, 0));

    panel(-1000, -1000, 1, 1).setAlpha(0);
    this.timerText = fixed(scene.add.text(82, 214, "00:00", {
      fontFamily: "Kenney Future", fontSize: "14px", color: "#ffffff",
      stroke: "#020303", strokeThickness: 4,
    }));
    this.statusText = fixed(scene.add.text(530, 220, "OK", {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#67e9df",
      stroke: "#020303", strokeThickness: 4,
    }));
    this.timerText.setPosition(80, 148);
    this.statusText.setPosition(80, 170).setOrigin(0);
    fixed(scene.add.rectangle(80, 198, 230, 8, 0x173016).setOrigin(0).setAlpha(.8));
    this.mutationBar = fixed(scene.add.rectangle(80, 198, 0, 8, 0x78ff45).setOrigin(0));
    this.mutationText = fixed(scene.add.text(80, 212, "MUTATION 0%", {
      fontFamily: "Kenney Future", fontSize: "10px", color: "#adff75",
      stroke: "#020303", strokeThickness: 3,
    }));

    const slotWidth = 72;
    const startX = 610;
    WEAPON_ORDER.forEach((id, index) => {
      const x = startX + index * 78;
      const frame = fixed(scene.add.rectangle(x, 770, 68, 42, 0x020709, .9)
        .setOrigin(0).setStrokeStyle(2, 0x34484a));
      frame.setVisible(false);
      fixed(scene.add.image(x + 34, 785, `weapon-${id}`).setDisplaySize(50, 20)).setVisible(false);
      const label = fixed(scene.add.text(x + 34, 798, `${index + 1}`, {
        fontFamily: "Kenney Future", fontSize: "10px", color: "#ffffff",
      }).setOrigin(.5, 0).setVisible(false));
      const ammo = fixed(scene.add.text(x + slotWidth, 798, "", {
        fontFamily: "Kenney Future", fontSize: "1px", color: "#ffffff",
      }).setAlpha(0).setVisible(false));
      this.weaponSlots.set(id, { frame, ammo, label });
    });
  }

  update(
    player: PlayerView,
    stats: RunStats,
    wave: number,
    remaining: number,
    waveTotal: number,
    combo: number,
    now: number,
  ) {
    const healthWidth = this.mobile ? 345 : 238;
    const armorWidth = this.mobile ? 345 : 238;
    this.healthBar.width = healthWidth * Math.max(0, player.health / 100);
    this.armorBar.width = armorWidth * Math.max(0, player.armor / 75);
    this.healthText.setText(`${Math.ceil(player.health)}`);
    this.armorText.setText(`${Math.ceil(player.armor)}`);
    this.waveText.setText(`WAVE ${wave}`);
    this.remainingText.setText(remaining > 0 ? `THREAT COUNT // ${remaining}` : "SECTOR SECURE // RESUPPLY");
    this.waveBar.width = (this.mobile ? 220 : 300) * (waveTotal > 0 ? Math.max(0, 1 - remaining / waveTotal) : 1);
    this.scoreText.setText(stats.score.toLocaleString("en-US"));
    this.killsText.setText(`KILLS  ${stats.kills}`);
    const accuracy = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    this.accuracyText.setText(`ACC  ${accuracy}%`);
    this.comboText.setText(`x${Math.max(1, combo)} CHAIN`);
    this.comboBar.width = (this.mobile ? 90 : 318) * Math.min(1, Math.max(1, combo) / 12);

    const seconds = Math.floor(stats.survivedMs / 1000);
    this.timerText.setText(`${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`);
    this.statusText.setText(
      player.reloadingUntil > now ? "RELOADING" :
      player.overdriveUntil > now ? "OVERDRIVE ACTIVE" :
      player.armor <= 0 ? "ARMOR BROKEN" : "SYSTEMS NOMINAL",
    );
    this.statusText.setColor(
      player.reloadingUntil > now ? "#ffffff" :
      player.overdriveUntil > now ? "#ffbd36" :
      player.armor <= 0 ? "#ff594b" : "#67e9df",
    );
    if (player.isMutant) {
      const remaining = Math.max(0, player.mutantUntil - now);
      this.mutationBar.width = (this.mobile ? 230 : 210) * remaining / 6000;
      this.mutationText.setText(`MUTANT ${Math.ceil(remaining / 1000)}S // SPACE`);
      this.mutationText.setColor("#adff75");
    } else {
      this.mutationBar.width = (this.mobile ? 230 : 210) * player.mutation / 100;
      this.mutationText.setText(player.mutation >= 100 ? "Q MUTATION READY" : `Q MUTATION ${Math.floor(player.mutation)}%`);
      this.mutationText.setColor(player.mutation >= 100 ? "#adff75" : "#6e8b6c");
    }

    const activeAmmo = player.ammo[player.weapon];
    this.weaponText.setText(player.isMutant ? "MUTATION OVERDRIVE" : WEAPONS[player.weapon].name);
    this.ammoText.setText(
      player.isMutant ? "SMASH" :
      player.weapon === "pistol" ? `${activeAmmo.mag} / ∞` :
      `${activeAmmo.mag} / ${activeAmmo.reserve}`,
    );
    this.weaponSlots.forEach((slot, id) => {
      const selected = id === player.weapon;
      const unlocked = player.unlockedWeapons.has(id);
      slot.frame.setStrokeStyle(selected ? 3 : 2, selected ? 0x50f3e5 : unlocked ? 0x34484a : 0x242b2c);
      slot.frame.setFillStyle(selected ? 0x092022 : 0x020709, selected ? .98 : unlocked ? .93 : .78);
      slot.label.setText(unlocked ? WEAPONS[id].name.split(" ")[0] : "LOCKED");
      slot.label.setColor(selected ? "#74f4e8" : unlocked ? "#768d8e" : "#4a5556");
      const ammo = player.ammo[id];
      slot.ammo.setText(unlocked ? id === "pistol" ? `${ammo.mag}/∞` : `${ammo.mag}/${ammo.reserve}` : "—");
      slot.ammo.setColor(!unlocked ? "#4a5556" : ammo.mag === 0 ? "#ff5548" : "#ffffff");
    });
  }
}
