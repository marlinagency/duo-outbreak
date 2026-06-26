import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#05090b",
  width: 1600,
  height: 900,
  physics: {
    default: "arcade",
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
});

const refreshMobileViewport = () => {
  game.scale.refresh();
};

window.addEventListener("resize", refreshMobileViewport);
window.addEventListener("orientationchange", () => window.setTimeout(refreshMobileViewport, 180));
