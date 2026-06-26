import Phaser from "phaser";
import type { RunStats } from "@duo-outbreak/shared";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("gameover"); }

  create(stats: RunStats) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x020405, .96).setOrigin(0);
    this.add.text(width / 2, 120, "SECTOR LOST", {
      fontFamily: "Kenney Future", fontSize: "70px", color: "#ff4b3e",
    }).setOrigin(.5);
    this.add.text(width / 2, 198, `WAVE ${stats.wave} REACHED`, {
      fontFamily: "Kenney Future", fontSize: "24px", color: "#c5dddd",
    }).setOrigin(.5);
    const accuracy = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    const rows = [
      ["SCORE", stats.score.toLocaleString("en-US")],
      ["ELIMINATIONS", `${stats.kills}`],
      ["ACCURACY", `${accuracy}%`],
      ["BEST CHAIN", `x${stats.bestCombo}`],
      ["SURVIVAL", `${Math.floor(stats.survivedMs / 60000)}:${String(Math.floor(stats.survivedMs / 1000) % 60).padStart(2, "0")}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 300 + i * 58;
      this.add.text(570, y, label, { fontFamily: "Kenney Future", fontSize: "18px", color: "#6f8c8e" });
      this.add.text(1030, y, value, { fontFamily: "Kenney Future", fontSize: "22px", color: "#ffffff" }).setOrigin(1, 0);
    });
    const button = this.add.rectangle(width / 2, 670, 360, 70, 0x44e4d7)
      .setStrokeStyle(3, 0xa7fff7).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 670, "REDEPLOY", {
      fontFamily: "Kenney Future", fontSize: "26px", color: "#03100f",
    }).setOrigin(.5);
    button.on("pointerdown", () => this.scene.start("game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("game"));
  }
}
