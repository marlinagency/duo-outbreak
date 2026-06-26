import Phaser from "phaser";
import { RoomClient } from "../net/roomClient";

export class MenuScene extends Phaser.Scene {
  constructor() { super("menu"); }

  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x071317, 0x071317, 0x020405, 0x020405, 1);
    g.fillRect(0, 0, width, height);

    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      this.add.circle(x, y, Phaser.Math.Between(1, 3), 0x3de8da, Phaser.Math.FloatBetween(.08, .24));
    }

    this.add.text(width / 2, 190, "DUO OUTBREAK", {
      fontFamily: "Kenney Future",
      fontSize: "82px",
      color: "#f4f8f5",
      stroke: "#071011",
      strokeThickness: 10,
    }).setOrigin(.5);
    this.add.text(width / 2, 270, "INDUSTRIAL BLACKOUT", {
      fontFamily: "Kenney Future",
      fontSize: "24px",
      color: "#52eadc",
      letterSpacing: 8,
    }).setOrigin(.5);

    const panel = this.add.rectangle(width / 2, 505, 720, 340, 0x081012, .92)
      .setStrokeStyle(2, 0x24565a, 1);
    panel.setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 402, "SECTOR 04 // LOADING YARD", {
      fontFamily: "Kenney Future", fontSize: "19px", color: "#8ba6a7",
    }).setOrigin(.5);
    this.add.text(width / 2, 470, "SURVIVE THE BREACH", {
      fontFamily: "Kenney Future", fontSize: "34px", color: "#ffffff",
    }).setOrigin(.5);

    const start = this.add.rectangle(width / 2 - 195, 570, 320, 68, 0x35d8ca, 1)
      .setStrokeStyle(3, 0xa4fff5).setInteractive({ useHandCursor: true });
    const startText = this.add.text(width / 2 - 195, 570, "LOCAL DEPLOY", {
      fontFamily: "Kenney Future", fontSize: "28px", color: "#03100f",
    }).setOrigin(.5);
    const deploy = () => {
      this.sound.play("ui-confirm", { volume: .45 });
      this.scene.start("game", { mode: "local" });
    };
    start.on("pointerover", () => start.setFillStyle(0x78fff1));
    start.on("pointerout", () => start.setFillStyle(0x35d8ca));
    start.on("pointerdown", deploy);
    startText.setInteractive({ useHandCursor: true }).on("pointerdown", deploy);

    const online = this.add.rectangle(width / 2 + 195, 570, 320, 68, 0xffca3a, 1)
      .setStrokeStyle(3, 0xfff0a4).setInteractive({ useHandCursor: true });
    const onlineText = this.add.text(width / 2 + 195, 570, "ONLINE ROOM", {
      fontFamily: "Kenney Future", fontSize: "28px", color: "#130d01",
    }).setOrigin(.5);
    const status = this.add.text(width / 2, 624, "", {
      fontFamily: "Kenney Future", fontSize: "14px", color: "#ffd66a",
    }).setOrigin(.5);
    const launchOnline = () => void this.openOnlineRoom(status);
    online.on("pointerover", () => online.setFillStyle(0xffdd68));
    online.on("pointerout", () => online.setFillStyle(0xffca3a));
    online.on("pointerdown", launchOnline);
    onlineText.setInteractive({ useHandCursor: true }).on("pointerdown", launchOnline);

    const roomFromUrl = new URLSearchParams(window.location.search).get("room");
    if (roomFromUrl) status.setText(`INVITE FOUND // TAP ONLINE ROOM TO JOIN ${roomFromUrl}`);

    this.add.text(width / 2, 676, "DESKTOP: WASD + MOUSE  //  MOBILE: LEFT STICK MOVE + RIGHT DRAG FIRE  //  Q/SPACE OR TOUCH BUTTONS", {
      fontFamily: "Kenney Future", fontSize: "15px", color: "#6d8586",
    }).setOrigin(.5);
    this.add.text(width / 2, height - 52, "PHASE 2 // ONLINE ROOM MOVEMENT PROTOTYPE", {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#365154",
    }).setOrigin(.5);
  }

  private async openOnlineRoom(status: Phaser.GameObjects.Text) {
    const params = new URLSearchParams(window.location.search);
    const nickname = (params.get("nick") || window.localStorage.getItem("duo:nick") || "survivor").trim().slice(0, 16) || "survivor";
    const roomId = params.get("room")?.trim();
    const client = new RoomClient();
    status.setText(roomId ? "JOINING ONLINE ROOM..." : "CREATING ONLINE ROOM...");
    try {
      const color = roomId ? 0xffca3a : 0x52eadc;
      let room;
      try {
        room = roomId
          ? await client.joinRoom(roomId, nickname, color)
          : await client.createRoom(nickname, color);
      } catch (joinError) {
        if (!roomId) throw joinError;
        console.warn("Invite room could not be joined; creating a fresh room instead.", joinError);
        status.setText("OLD ROOM EXPIRED // CREATING NEW ROOM...");
        params.delete("room");
        room = await client.createRoom(nickname, 0x52eadc);
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", room.roomId);
      window.history.replaceState({}, "", url);
      status.setText(`ROOM READY // ${room.roomId}`);
      this.scene.start("game", {
        mode: "online",
        roomId: room.roomId,
        nickname,
        color,
        roomClient: client,
      });
    } catch (error) {
      console.error(error);
      status.setText("ONLINE SERVER NOT REACHABLE // REFRESH OR CHECK TUNNEL");
    }
  }
}
