import Phaser from "phaser";
import type { WeaponId } from "@duo-outbreak/shared";

type TouchStick = {
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
};

type TouchButton = {
  hit: Phaser.GameObjects.Zone;
  ring: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  pending: boolean;
  x: number;
  y: number;
  radius: number;
};

export class DesktopControls {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private weapon: WeaponId = "pistol";
  private sequence = 0;
  private moveStick?: TouchStick;
  private aimStick?: TouchStick;
  private moveBase?: Phaser.GameObjects.Arc;
  private moveKnob?: Phaser.GameObjects.Arc;
  private aimBase?: Phaser.GameObjects.Arc;
  private aimKnob?: Phaser.GameObjects.Arc;
  private mutateButton?: TouchButton;
  private shockButton?: TouchButton;
  private weaponButton?: TouchButton;
  private touchAimAngle = 0;
  private readonly stickRadius = 116;

  constructor(private scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.keys = keyboard.addKeys("W,A,S,D,R,Q,SPACE,ONE,TWO,THREE,FOUR,FIVE,ESC") as Record<string, Phaser.Input.Keyboard.Key>;
    scene.input.addPointer(3);
    scene.input.on("wheel", (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      const order: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "magnum"];
      const index = order.indexOf(this.weapon);
      this.weapon = order[(index + (dy > 0 ? 1 : order.length - 1)) % order.length];
    });
    this.createTouchUi();
    scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    scene.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
  }

  read(player: Phaser.GameObjects.GameObject & { x: number; y: number; unlockedWeapons?: Set<WeaponId> }) {
    let moveX = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    let moveY = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);
    if (this.moveStick) {
      const touchMove = this.vectorFromStick(this.moveStick, this.stickRadius);
      moveX = touchMove.x;
      moveY = touchMove.y;
    }
    const length = Math.hypot(moveX, moveY);
    if (length > 0) { moveX /= length; moveY /= length; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.weapon = "pistol";
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.weapon = "smg";
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.weapon = "shotgun";
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) this.weapon = "rifle";
    if (Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) this.weapon = "magnum";
    if (this.consumeButton(this.weaponButton)) this.cycleWeapon(player.unlockedWeapons);
    const pointer = this.scene.input.activePointer;
    const aimAngle = this.aimStick
      ? this.touchAimAngle
      : Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    const activateSpecial = Phaser.Input.Keyboard.JustDown(this.keys.Q) || this.consumeButton(this.mutateButton);
    const mutantShockwave = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.consumeButton(this.shockButton);
    return {
      sequence: ++this.sequence,
      moveX,
      moveY,
      aimAngle,
      shooting: this.prefersTouch() ? Boolean(this.aimStick) : pointer.isDown,
      reload: Phaser.Input.Keyboard.JustDown(this.keys.R),
      activateSpecial,
      mutantShockwave,
      pause: Phaser.Input.Keyboard.JustDown(this.keys.ESC),
      weapon: this.weapon,
    };
  }

  private createTouchUi() {
    this.moveBase = this.scene.add.circle(230, 650, 120, 0x0a1d20, .36)
      .setStrokeStyle(7, 0x4ee9df, .56).setScrollFactor(0).setDepth(420);
    this.moveKnob = this.scene.add.circle(230, 650, 48, 0x52eadc, .55)
      .setStrokeStyle(3, 0xbffff9, .65).setScrollFactor(0).setDepth(421);
    this.aimBase = this.scene.add.circle(1370, 650, 120, 0x1d1302, .34)
      .setStrokeStyle(7, 0xffca3a, .56).setScrollFactor(0).setDepth(420);
    this.aimKnob = this.scene.add.circle(1370, 650, 48, 0xffca3a, .55)
      .setStrokeStyle(3, 0xfff0a4, .65).setScrollFactor(0).setDepth(421);
    this.mutateButton = this.createButton(1185, 470, "MUTATE", 0x7cff46);
    this.shockButton = this.createButton(1415, 470, "SHOCK", 0x9cff54);
    this.weaponButton = this.createButton(800, 650, "WEAPON", 0x4ee9df);
    const alpha = this.prefersTouch() ? 1 : .18;
    [this.moveBase, this.moveKnob, this.aimBase, this.aimKnob,
      this.mutateButton.ring, this.mutateButton.label, this.shockButton.ring, this.shockButton.label,
      this.weaponButton.ring, this.weaponButton.label]
      .forEach((item) => item.setAlpha(item.alpha * alpha));
  }

  private createButton(x: number, y: number, label: string, color: number): TouchButton {
    const radius = 72;
    const ring = this.scene.add.circle(x, y, radius, 0x06100a, .46)
      .setStrokeStyle(4, color, .75).setScrollFactor(0).setDepth(422);
    const text = this.scene.add.text(x, y, label, {
      fontFamily: "Kenney Future", fontSize: "17px", color: "#ecffe6",
      align: "center",
    }).setOrigin(.5).setScrollFactor(0).setDepth(423);
    const hit = this.scene.add.zone(x, y, 168, 168).setScrollFactor(0).setDepth(424).setInteractive();
    const button = { hit, ring, label: text, pending: false, x, y, radius: 92 };
    hit.on("pointerdown", () => {
      button.pending = true;
      ring.setScale(.88);
      this.scene.tweens.add({ targets: ring, scale: 1, duration: 120, ease: "Back.Out" });
    });
    return button;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    const p = this.toGamePoint(pointer);
    if (p.y < 140 || this.isOnButton(p.x, p.y)) return;
    if (p.x < 760 && !this.moveStick) {
      this.moveStick = this.makeStick(pointer, p.x, p.y);
      this.moveBase?.setPosition(p.x, p.y).setAlpha(.94);
      this.moveKnob?.setPosition(p.x, p.y).setAlpha(1);
      return;
    }
    if (p.x >= 840 && !this.aimStick) {
      this.aimStick = this.makeStick(pointer, p.x, p.y);
      this.aimBase?.setPosition(p.x, p.y).setAlpha(.94);
      this.aimKnob?.setPosition(p.x, p.y).setAlpha(1);
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    const p = this.toGamePoint(pointer);
    if (this.moveStick?.pointerId === pointer.id) {
      this.moveStick.x = p.x;
      this.moveStick.y = p.y;
      const pos = this.clampedStickPosition(this.moveStick, this.stickRadius);
      this.moveKnob?.setPosition(pos.x, pos.y);
    }
    if (this.aimStick?.pointerId === pointer.id) {
      this.aimStick.x = p.x;
      this.aimStick.y = p.y;
      const pos = this.clampedStickPosition(this.aimStick, this.stickRadius);
      this.aimKnob?.setPosition(pos.x, pos.y);
      const vector = this.vectorFromStick(this.aimStick, this.stickRadius);
      if (Math.hypot(vector.x, vector.y) > .12) this.touchAimAngle = Math.atan2(vector.y, vector.x);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.moveStick?.pointerId === pointer.id) {
      this.moveStick = undefined;
      this.moveBase?.setPosition(230, 650).setAlpha(this.prefersTouch() ? .36 : .06);
      this.moveKnob?.setPosition(230, 650).setAlpha(this.prefersTouch() ? .55 : .08);
    }
    if (this.aimStick?.pointerId === pointer.id) {
      this.aimStick = undefined;
      this.aimBase?.setPosition(1370, 650).setAlpha(this.prefersTouch() ? .34 : .05);
      this.aimKnob?.setPosition(1370, 650).setAlpha(this.prefersTouch() ? .55 : .08);
    }
  }

  private makeStick(pointer: Phaser.Input.Pointer, x: number, y: number): TouchStick {
    return { pointerId: pointer.id, startX: x, startY: y, x, y };
  }

  private vectorFromStick(stick: TouchStick, radius: number) {
    const dx = stick.x - stick.startX;
    const dy = stick.y - stick.startY;
    const distance = Math.hypot(dx, dy);
    const strength = Math.min(1, distance / radius);
    if (distance < 8) return { x: 0, y: 0 };
    return { x: dx / distance * strength, y: dy / distance * strength };
  }

  private clampedStickPosition(stick: TouchStick, radius: number) {
    const vector = this.vectorFromStick(stick, radius);
    return {
      x: stick.startX + vector.x * radius,
      y: stick.startY + vector.y * radius,
    };
  }

  private consumeButton(button?: TouchButton) {
    if (!button?.pending) return false;
    button.pending = false;
    return true;
  }

  private isOnButton(x: number, y: number) {
    return [this.mutateButton, this.shockButton, this.weaponButton].some((button) =>
      button && Math.hypot(x - button.x, y - button.y) <= button.radius,
    );
  }

  private cycleWeapon(unlockedWeapons?: Set<WeaponId>) {
    const order: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "magnum"];
    const available = order.filter((id) => unlockedWeapons?.has(id) ?? true);
    const weapons: WeaponId[] = available.length > 0 ? available : ["pistol"];
    const index = weapons.indexOf(this.weapon);
    this.weapon = weapons[(index + 1) % weapons.length];
  }

  private toGamePoint(pointer: Phaser.Input.Pointer) {
    const event = pointer.event as MouseEvent | PointerEvent | undefined;
    const canvas = this.scene.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const gameSize = this.scene.scale.gameSize;
    const clientX = typeof event?.clientX === "number" ? event.clientX : bounds.left + (pointer.x / gameSize.width) * bounds.width;
    const clientY = typeof event?.clientY === "number" ? event.clientY : bounds.top + (pointer.y / gameSize.height) * bounds.height;

    return {
      x: Phaser.Math.Clamp((clientX - bounds.left) / bounds.width * gameSize.width, 0, gameSize.width),
      y: Phaser.Math.Clamp((clientY - bounds.top) / bounds.height * gameSize.height, 0, gameSize.height),
    };
  }

  private prefersTouch() {
    return window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 900;
  }
}
