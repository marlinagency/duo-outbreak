import Phaser from "phaser";
import {
  PLAYER,
  SIMULATION,
  WORLD,
  type GameLaunchOptions,
  type NetworkInputFrame,
  type PickupKind,
  type RunStats,
  type WeaponId,
  type ZombieKind,
} from "@duo-outbreak/shared";
import { WEAPONS, ZOMBIES } from "../config/gameConfig";
import { BulletView } from "../entities/BulletView";
import { EnemyProjectileView } from "../entities/EnemyProjectileView";
import { PlayerView } from "../entities/PlayerView";
import { ZombieView } from "../entities/ZombieView";
import { DesktopControls } from "../input/DesktopControls";
import {
  RoomClient,
  type NetworkBulletState,
  type NetworkPickupState,
  type NetworkPlayerState,
  type NetworkZombieState,
} from "../net/roomClient";
import { WaveDirector } from "../systems/WaveDirector";
import { Hud } from "../ui/Hud";

type Pickup = Phaser.Physics.Arcade.Image & {
  kind?: PickupKind;
  expiresAt?: number;
  weaponId?: WeaponId;
  label?: Phaser.GameObjects.Text;
};
type Barrel = Phaser.Physics.Arcade.Image & { health?: number; armed?: boolean };
type OnlineLaunchOptions = GameLaunchOptions & { roomClient?: RoomClient };
type RemotePlayerView = {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
};
type OnlineZombieView = {
  sprite: Phaser.GameObjects.Sprite;
  hp: Phaser.GameObjects.Rectangle;
};
type OnlinePickupView = Phaser.GameObjects.Image & { kind?: string };

export class GameScene extends Phaser.Scene {
  private player!: PlayerView;
  private controls!: DesktopControls;
  private hud!: Hud;
  private director!: WaveDirector;
  private zombies!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private enemyProjectiles!: Phaser.GameObjects.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private barrels!: Phaser.Physics.Arcade.StaticGroup;
  private stats!: RunStats;
  private runStartedAt = 0;
  private combo = 1;
  private comboExpiresAt = 0;
  private zombieSequence = 0;
  private paused = false;
  private roomClient?: RoomClient;
  private remotePlayers = new Map<string, RemotePlayerView>();
  private onlineZombies = new Map<string, OnlineZombieView>();
  private onlineBullets = new Map<string, Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image>();
  private onlinePickups = new Map<string, OnlinePickupView>();
  private queuedUnlocks = new Set<WeaponId>();
  private playerVitalBg!: Phaser.GameObjects.Rectangle;
  private playerHealthBar!: Phaser.GameObjects.Rectangle;
  private playerArmorBar!: Phaser.GameObjects.Rectangle;
  private lastSparkAt = 0;
  private lastHitSoundAt = 0;
  private weaponUnlocks: Array<{ weapon: WeaponId; kills: number }> = [
    { weapon: "smg", kills: 12 },
    { weapon: "shotgun", kills: 28 },
    { weapon: "rifle", kills: 50 },
    { weapon: "magnum", kills: 80 },
  ];
  private spawnPoints = [
    { x: 800, y: 150 },
    { x: 800, y: 750 },
  ];

  constructor() { super("game"); }

  create(data?: OnlineLaunchOptions) {
    this.roomClient = data?.mode === "online" ? data.roomClient : undefined;
    this.physics.world.setBounds(WORLD.margin, WORLD.margin, WORLD.width - WORLD.margin * 2, WORLD.height - WORLD.margin * 2);
    this.createArena();
    this.createPools(Boolean(this.roomClient));

    this.player = new PlayerView(this, 800, 460);
    this.createPlayerVitals();
    this.controls = new DesktopControls(this);
    this.director = new WaveDirector();
    if (new URLSearchParams(window.location.search).has("qa")) {
      this.director.wave = 5;
      this.director.intermissionUntil = 250;
      this.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    }
    this.hud = new Hud(this);
    this.stats = { wave: 0, kills: 0, score: 0, shots: 0, hits: 0, survivedMs: 0, bestCombo: 1 };
    if (new URLSearchParams(window.location.search).get("qa") === "progress") {
      this.stats.kills = 11;
      this.time.delayedCall(700, () => {
        this.spawnWeaponPickup(735, 460, "smg");
        this.spawnResourcePickup(850, 420, "health");
        this.spawnResourcePickup(900, 500, "armor");
      });
    }
    if (new URLSearchParams(window.location.search).get("qa") === "hulk") {
      this.player.mutation = 100;
      this.time.delayedCall(900, () => {
        if (this.player.activateMutation(this.time.now)) {
          this.player.mutantUntil = this.time.now + 60000;
          this.beginMutation();
          this.time.delayedCall(900, () => this.mutantShockwave(this.time.now));
        }
      });
    }
    this.runStartedAt = this.time.now;

    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.barrels);
    this.physics.add.collider(this.zombies, this.obstacles);
    this.physics.add.collider(this.zombies, this.barrels);
    this.physics.add.collider(
      this.bullets, this.obstacles,
      this.onBulletObstacle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.collider(
      this.enemyProjectiles, this.obstacles,
      this.onEnemyProjectileObstacle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.collider(
      this.enemyProjectiles, this.barrels,
      this.onEnemyProjectileObstacle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.overlap(
      this.player, this.enemyProjectiles,
      this.onEnemyProjectilePlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.overlap(
      this.bullets, this.barrels,
      this.onBulletBarrel as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );
    this.physics.add.overlap(
      this.player, this.pickups,
      this.collectPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this,
    );

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.fadeIn(420, 0, 0, 0);
    if (this.roomClient) {
      this.add.text(800, 104, `ONLINE ROOM // ${this.roomClient.roomId}`, {
        fontFamily: "Kenney Future", fontSize: "15px", color: "#2d6f73",
        backgroundColor: "#f4f7f8cc", padding: { x: 12, y: 5 },
      }).setOrigin(.5).setScrollFactor(0).setDepth(305);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.roomClient?.leave());
      this.showBanner("ONLINE ROOM READY", "PHASE 3 // SERVER AUTHORITY", 1200);
    } else {
      this.showBanner("BLACKOUT PROTOCOL", "HOLD THE LOADING YARD", 1200);
    }
  }

  update(time: number) {
    if (this.paused) return;
    const input = this.controls.read(this.player);
    if (input.pause) {
      this.paused = true;
      this.physics.pause();
      const pauseText = this.add.text(800, 450, "PAUSED\nESC TO RESUME", {
        fontFamily: "Kenney Future", fontSize: "38px", color: "#ffffff",
        align: "center", backgroundColor: "#030708dd", padding: { x: 44, y: 28 },
      }).setOrigin(.5).setDepth(500).setScrollFactor(0);
      this.input.keyboard?.once("keydown-ESC", () => {
        pauseText.destroy();
        this.physics.resume();
        this.paused = false;
      });
      return;
    }

    this.player.updateMutation(time);
    if (this.roomClient) {
      this.predictOnlinePlayer(input.moveX, input.moveY, input.aimAngle);
      const networkInput: NetworkInputFrame = { ...input, dt: this.game.loop.delta };
      this.roomClient.sendInput(networkInput, time);
      this.applyOnlineState(time, input.aimAngle);
      return;
    }
    const moveSpeed = this.player.isMutant ? 345 : PLAYER.speed;
    this.player.setVelocity(input.moveX * moveSpeed, input.moveY * moveSpeed);
    if (!this.player.isMutant) this.player.setWeapon(input.weapon);
    this.player.updateReload(time);
    this.player.rotation = input.aimAngle;
    this.animatePlayer(time, input.moveX, input.moveY);
    if (input.activateSpecial && this.player.activateMutation(time)) this.beginMutation();
    if (!this.player.isMutant && input.reload) this.player.startReload(time);
    if (input.shooting) {
      if (this.player.isMutant) this.mutantStrike(time, input.aimAngle);
      else this.tryShoot(time, input.aimAngle);
    }
    if (this.player.isMutant && input.mutantShockwave) this.mutantShockwave(time);
    this.updateZombies(time);
    this.updateBullets(time);
    this.updateEnemyProjectiles(time);
    this.updatePickups(time);
    this.director.update(time, (kind) => this.spawnZombie(kind), (wave) => this.startWave(wave));
    if (time > this.comboExpiresAt) this.combo = 1;

    this.stats.wave = this.director.wave;
    this.stats.survivedMs = time - this.runStartedAt;
    this.hud.update(
      this.player, this.stats, this.director.wave, this.director.remaining,
      this.director.waveTotal, this.combo, time,
    );
    this.updatePlayerVitals();
  }

  private predictOnlinePlayer(moveX: number, moveY: number, aimAngle: number) {
    const dt = Math.min(this.game.loop.delta / 1000, 0.05);
    const speed = this.player.isMutant ? 345 : PLAYER.speed;
    this.player.x = Phaser.Math.Clamp(this.player.x + moveX * speed * dt, WORLD.margin, WORLD.width - WORLD.margin);
    this.player.y = Phaser.Math.Clamp(this.player.y + moveY * speed * dt, WORLD.margin, WORLD.height - WORLD.margin);
    this.player.rotation = aimAngle;
    this.animatePlayer(this.time.now, moveX, moveY);
  }

  private createPlayerVitals() {
    this.playerVitalBg = this.add.rectangle(this.player.x, this.player.y - 62, 56, 9, 0x020506, .36)
      .setOrigin(.5, .5).setDepth(34);
    this.playerHealthBar = this.add.rectangle(this.player.x - 27, this.player.y - 64, 54, 4, 0xf04439, .82)
      .setOrigin(0, .5).setDepth(35);
    this.playerArmorBar = this.add.rectangle(this.player.x - 27, this.player.y - 58, 54, 3, 0x2b91d8, .7)
      .setOrigin(0, .5).setDepth(35);
  }

  private updatePlayerVitals() {
    const x = this.player.x;
    const y = this.player.y - (this.player.isMutant ? 78 : 62);
    this.playerVitalBg.setPosition(x, y);
    this.playerHealthBar
      .setPosition(x - 27, y - 2)
      .setSize(54 * Phaser.Math.Clamp(this.player.health / 100, 0, 1), 4);
    this.playerArmorBar
      .setPosition(x - 27, y + 4)
      .setSize(54 * Phaser.Math.Clamp(this.player.armor / 75, 0, 1), 3)
      .setAlpha(this.player.armor > 0 ? .7 : .12);
  }

  private applyOnlineState(time: number, fallbackAim: number) {
    const room = this.roomClient;
    const state = room?.state;
    const sessionId = room?.sessionId;
    if (!state?.players || !sessionId) return;
    const ownState = state.players.get(sessionId);
    if (ownState) {
      const correctionDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, ownState.x, ownState.y);
      const correction = correctionDistance > 110 ? .85 : correctionDistance > 32 ? .22 : .07;
      this.player.setPosition(
        Phaser.Math.Linear(this.player.x, ownState.x, correction),
        Phaser.Math.Linear(this.player.y, ownState.y, correction),
      );
      this.player.rotation = ownState.rotation || fallbackAim;
      this.player.health = ownState.health;
      this.player.armor = ownState.armor;
      this.player.mutation = ownState.mutation ?? 0;
      this.player.mutantUntil = ownState.mutantUntil && this.roomClient?.state
        ? time + Math.max(0, ownState.mutantUntil - this.roomClient.state.serverTime)
        : 0;
      this.syncOnlineWeaponUnlocks(ownState.weaponLevel ?? 0);
      this.player.restoreAppearance();
      if (!this.player.isMutant) this.player.setWeapon((ownState.weapon as WeaponId) || "pistol");
    }
    this.updateRemotePlayers();
    this.updateOnlineZombies(time);
    this.updateOnlineBullets();
    this.updateOnlinePickups(time);
    this.stats.wave = state.wave ?? 0;
    this.stats.kills = state.kills ?? 0;
    this.stats.score = state.score ?? 0;
    this.stats.survivedMs = time - this.runStartedAt;
    this.hud.update(
      this.player, this.stats, state.wave ?? 0, (state.pending ?? 0) + (state.alive ?? 0),
      state.waveTotal ?? 0, 1, time,
    );
    this.updatePlayerVitals();
    if (state.gameOver) {
      this.physics.pause();
      this.cameras.main.fadeOut(700, 35, 0, 0);
      this.time.delayedCall(760, () => this.scene.start("gameover", this.stats));
    }
  }

  private updateRemotePlayers() {
    const room = this.roomClient;
    const state = room?.state;
    const sessionId = room?.sessionId;
    if (!state?.players || !sessionId) return;
    const seen = new Set<string>();
    state.players.forEach((playerState: NetworkPlayerState, id: string) => {
      seen.add(id);
      if (id === sessionId) return;
      const remote = this.getOrCreateRemotePlayer(id, playerState);
      remote.shadow.setPosition(
        Phaser.Math.Linear(remote.shadow.x, playerState.x, .28),
        Phaser.Math.Linear(remote.shadow.y, playerState.y + 24, .28),
      );
      remote.sprite.setPosition(
        Phaser.Math.Linear(remote.sprite.x, playerState.x, .28),
        Phaser.Math.Linear(remote.sprite.y, playerState.y, .28),
      );
      remote.sprite.rotation = Phaser.Math.Angle.RotateTo(remote.sprite.rotation, playerState.rotation, .2);
      remote.sprite.setAlpha(playerState.connected ? 1 : .38);
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - 56);
      const labelText = playerState.connected ? playerState.nickname : `${playerState.nickname} // OFFLINE`;
      if (remote.label.text !== labelText) remote.label.setText(labelText);
    });
    [...this.remotePlayers.entries()].forEach(([id, remote]) => {
      if (seen.has(id)) return;
      remote.sprite.destroy();
      remote.label.destroy();
      remote.shadow.destroy();
      this.remotePlayers.delete(id);
    });
  }

  private getOrCreateRemotePlayer(id: string, state: NetworkPlayerState) {
    const existing = this.remotePlayers.get(id);
    if (existing) return existing;
    const shadow = this.add.ellipse(state.x, state.y + 24, 58, 24, 0x102326, .18).setDepth(18);
    const sprite = this.add.sprite(state.x, state.y, "player-pistol")
      .setScale(.94).setTint(state.color).setDepth(21);
    const label = this.add.text(state.x, state.y - 56, state.nickname, {
      fontFamily: "Kenney Future", fontSize: "13px", color: "#102326",
      backgroundColor: "#ffffffcc", padding: { x: 7, y: 4 },
    }).setOrigin(.5).setDepth(306);
    const remote = { sprite, label, shadow };
    this.remotePlayers.set(id, remote);
    return remote;
  }

  private updateOnlineZombies(time: number) {
    const state = this.roomClient?.state;
    if (!state?.zombies) return;
    const seen = new Set<string>();
    state.zombies.forEach((zombieState: NetworkZombieState, id: string) => {
      seen.add(id);
      const view = this.getOrCreateOnlineZombie(id, zombieState);
      view.sprite.setPosition(
        Phaser.Math.Linear(view.sprite.x, zombieState.x, .32),
        Phaser.Math.Linear(view.sprite.y, zombieState.y, .32),
      );
      view.sprite.rotation = Phaser.Math.Angle.RotateTo(view.sprite.rotation, zombieState.rotation, .2);
      const pulse = 1 + Math.sin(time * .014 + id.length) * .035;
      const cfg = ZOMBIES[(zombieState.kind as ZombieKind) || "walker"];
      if (zombieState.kind === "runner") view.sprite.setDisplaySize(82 * pulse, 82 / pulse);
      else view.sprite.setScale(cfg.scale * pulse, cfg.scale / pulse);
      view.hp.setPosition(view.sprite.x - 24, view.sprite.y - 42);
      view.hp.width = 48 * Math.max(0, zombieState.health / Math.max(1, zombieState.maxHealth));
    });
    [...this.onlineZombies.entries()].forEach(([id, view]) => {
      if (seen.has(id)) return;
      this.hitSpark(view.sprite.x, view.sprite.y, 0x86d96b);
      view.sprite.destroy();
      view.hp.destroy();
      this.onlineZombies.delete(id);
    });
  }

  private getOrCreateOnlineZombie(id: string, state: NetworkZombieState) {
    const existing = this.onlineZombies.get(id);
    if (existing) return existing;
    const kind = (state.kind as ZombieKind) || "walker";
    const cfg = ZOMBIES[kind];
    const sprite = this.add.sprite(state.x, state.y, kind === "runner" ? "spitter" : "zombie")
      .setTint(cfg.tint).setDepth(12);
    if (kind === "runner") sprite.setDisplaySize(82, 82);
    else sprite.setScale(cfg.scale);
    const hp = this.add.rectangle(state.x - 24, state.y - 42, 48, 5, 0xf04439, .88)
      .setOrigin(0, .5).setDepth(13);
    const view = { sprite, hp };
    this.onlineZombies.set(id, view);
    return view;
  }

  private updateOnlineBullets() {
    const state = this.roomClient?.state;
    if (!state?.bullets) return;
    const seen = new Set<string>();
    state.bullets.forEach((bulletState: NetworkBulletState, id: string) => {
      seen.add(id);
      let bullet = this.onlineBullets.get(id);
      if (!bullet) {
        bullet = bulletState.hostile
          ? this.add.image(bulletState.x, bulletState.y, "spitter-orb").setDisplaySize(34, 34).setDepth(19)
          : this.add.rectangle(bulletState.x, bulletState.y, bulletState.width, Math.max(4, bulletState.width * .28), bulletState.color)
            .setDepth(18);
        this.onlineBullets.set(id, bullet);
      }
      bullet.setPosition(bulletState.x, bulletState.y);
      bullet.rotation = bulletState.angle;
    });
    [...this.onlineBullets.entries()].forEach(([id, bullet]) => {
      if (seen.has(id)) return;
      bullet.destroy();
      this.onlineBullets.delete(id);
    });
  }

  private syncOnlineWeaponUnlocks(level: number) {
    const order: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "magnum"];
    order.forEach((weapon, index) => {
      if (index <= level) this.player.unlockedWeapons.add(weapon);
    });
  }

  private updateOnlinePickups(time: number) {
    const state = this.roomClient?.state;
    if (!state?.pickups) return;
    const seen = new Set<string>();
    state.pickups.forEach((pickupState: NetworkPickupState, id: string) => {
      seen.add(id);
      let pickup = this.onlinePickups.get(id);
      if (!pickup) {
        const texture =
          pickupState.kind === "health" ? "pickup-medkit-custom" :
          pickupState.kind === "armor" ? "pickup-armor-custom" : "pickup-ammo";
        pickup = this.add.image(pickupState.x, pickupState.y, texture) as OnlinePickupView;
        pickup.kind = pickupState.kind;
        pickup.setDisplaySize(pickupState.kind === "ammo" ? 52 : 44, pickupState.kind === "ammo" ? 34 : 44)
          .setDepth(15);
        this.onlinePickups.set(id, pickup);
      }
      pickup.setPosition(pickupState.x, pickupState.y + Math.sin(time * .006 + id.length) * 8);
    });
    [...this.onlinePickups.entries()].forEach(([id, pickup]) => {
      if (seen.has(id)) return;
      pickup.destroy();
      this.onlinePickups.delete(id);
    });
  }

  private createArena() {
    const floor = this.add.graphics().setDepth(0);
    floor.fillStyle(0xe7eaec, 1).fillRect(0, 0, WORLD.width, WORLD.height);
    floor.fillStyle(0xf4f5f6, 1).fillRoundedRect(52, 52, 1496, 796, 18);
    floor.lineStyle(2, 0xc6ccd0, .75);
    for (let x = 80; x < WORLD.width; x += 80) floor.lineBetween(x, 52, x, 848);
    for (let y = 80; y < WORLD.height; y += 80) floor.lineBetween(52, y, 1548, y);
    floor.lineStyle(4, 0xb7bec3, .8).strokeRoundedRect(52, 52, 1496, 796, 18);
    floor.lineStyle(2, 0xffffff, .9).strokeRoundedRect(66, 66, 1468, 768, 12);

    this.obstacles = this.physics.add.staticGroup();
    this.barrels = this.physics.add.staticGroup();
    const wall = (x: number, y: number, w: number, h: number) => {
      const block = this.obstacles.create(x, y, "wall") as Phaser.Physics.Arcade.Image;
      block.setDisplaySize(w, h).setTint(0xd0d5d8).setAlpha(.01).setDepth(1).refreshBody();
    };
    wall(800, 24, 1600, 48); wall(800, 876, 1600, 48);
    wall(24, 450, 48, 900); wall(1576, 450, 48, 900);

    const centerMark = this.add.graphics().setDepth(1);
    centerMark.lineStyle(3, 0xbfc5c9, .55).strokeCircle(800, 450, 112);
    centerMark.lineStyle(2, 0xcbd0d3, .5).strokeCircle(800, 450, 64);
    centerMark.lineBetween(688, 450, 912, 450);
    centerMark.lineBetween(800, 338, 800, 562);

    this.createSpawnPortal(800, 150, -1);
    this.createSpawnPortal(800, 750, 1);
  }

  private createSpawnPortal(x: number, y: number, labelDirection: number) {
    const halo = this.add.ellipse(x, y, 270, 92, 0x20c7d0, .12).setDepth(2);
    const outer = this.add.ellipse(x, y, 230, 66).setStrokeStyle(5, 0x1da6b1, .75).setDepth(3);
    const inner = this.add.ellipse(x, y, 160, 42).setStrokeStyle(3, 0x7af5f0, .9).setDepth(3);
    const core = this.add.ellipse(x, y, 112, 26, 0x113b42, .78).setDepth(2);
    const label = this.add.text(x, y + labelDirection * 49, "HOSTILE ENTRY", {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#527b80",
    }).setOrigin(.5).setDepth(3);
    this.tweens.add({ targets: halo, scaleX: 1.18, scaleY: 1.34, alpha: .02, duration: 850, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: outer, scaleX: .82, alpha: .25, duration: 1100, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: inner, scaleX: 1.25, alpha: .25, duration: 720, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: core, alpha: .95, duration: 430, yoyo: true, repeat: -1 });
    label.setAlpha(.8);
  }

  private createPools(online = false) {
    const maxZombies = online ? 12 : SIMULATION.maxZombies;
    const maxBullets = online ? 18 : SIMULATION.maxBullets;
    this.zombies = this.add.group({
      classType: ZombieView,
      maxSize: maxZombies,
      runChildUpdate: false,
      createCallback: (item) => (item as ZombieView).setActive(false).setVisible(false),
    });
    for (let i = 0; i < maxZombies; i++) this.zombies.add(new ZombieView(this));

    this.bullets = this.add.group({
      classType: BulletView,
      maxSize: maxBullets,
      runChildUpdate: false,
      createCallback: (item) => (item as BulletView).setActive(false).setVisible(false),
    });
    for (let i = 0; i < maxBullets; i++) this.bullets.add(new BulletView(this));
    this.enemyProjectiles = this.add.group({
      classType: EnemyProjectileView,
      maxSize: 36,
      runChildUpdate: false,
      createCallback: (item) => (item as EnemyProjectileView).setActive(false).setVisible(false),
    });
    for (let i = 0; i < 36; i++) this.enemyProjectiles.add(new EnemyProjectileView(this));
    this.pickups = this.physics.add.group({ maxSize: 24 });
  }

  private spawnZombie(kind: ZombieKind) {
    if (kind === "runner") {
      const activeSpitters = this.zombies.getChildren().filter((child) => {
        const zombie = child as ZombieView;
        return zombie.active && zombie.kind === "runner";
      }).length;
      const cap = this.director.wave <= 4 ? 2 : this.director.wave <= 8 ? 3 : 4;
      if (activeSpitters >= cap) kind = "walker";
    }
    const zombie = this.zombies.getFirstDead(false) as ZombieView | null;
    if (!zombie) return false;
    const point = Phaser.Utils.Array.GetRandom(this.spawnPoints);
    const spawnX = point.x + Phaser.Math.Between(-88, 88);
    const spawnY = point.y + Phaser.Math.Between(-12, 12);
    zombie.spawn(`z-${++this.zombieSequence}`, spawnX, spawnY, kind, this.director.wave);
    zombie.setAlpha(0).setScale(.15);
    this.tweens.add({
      targets: zombie,
      alpha: 1,
      scaleX: kind === "runner" ? 1 : ZOMBIES[kind].scale,
      scaleY: kind === "runner" ? 1 : ZOMBIES[kind].scale,
      duration: 240,
      ease: "Back.Out",
    });
    const portalBurst = this.add.ellipse(spawnX, spawnY, 26, 12, 0x46eee9, .8)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
    this.tweens.add({
      targets: portalBurst, scaleX: 4.5, scaleY: 3, alpha: 0,
      duration: 320, onComplete: () => portalBurst.destroy(),
    });
    return true;
  }

  private updateZombies(time: number) {
    const playerVelocity = this.player.body!.velocity;
    const obstacles = this.obstacles.getChildren() as Phaser.Physics.Arcade.Image[];
    this.zombies.getChildren().forEach((child) => {
      const zombie = child as ZombieView;
      if (!zombie.active) return;
      const lead = zombie.kind === "runner" ? .18 : 0;
      const ringRadius = zombie.kind === "brute" ? 15 : zombie.kind === "runner" ? 285 : 82;
      const targetX = this.player.x + playerVelocity.x * lead + Math.cos(zombie.orbitAngle) * ringRadius;
      const targetY = this.player.y + playerVelocity.y * lead + Math.sin(zombie.orbitAngle) * ringRadius;
      const targetAngle = Phaser.Math.Angle.Between(zombie.x, zombie.y, targetX, targetY);
      let steerX = Math.cos(targetAngle);
      let steerY = Math.sin(targetAngle);
      const directDistance = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);
      if (zombie.kind === "runner") {
        const directAngle = Phaser.Math.Angle.Between(zombie.x, zombie.y, this.player.x, this.player.y);
        if (directDistance < 215) {
          steerX = -Math.cos(directAngle);
          steerY = -Math.sin(directAngle);
        } else if (directDistance <= 360) {
          steerX = -Math.sin(directAngle) * zombie.steerSign * .55;
          steerY = Math.cos(directAngle) * zombie.steerSign * .55;
        }

        if (zombie.chargingUntil > 0) {
          steerX *= .12;
          steerY *= .12;
          zombie.setTintFill(0xffb13b);
          if (time >= zombie.chargingUntil) {
            zombie.chargingUntil = 0;
            zombie.nextRangedAt = time + Phaser.Math.Between(2100, 3100);
            zombie.setTint(0xff6048);
            this.fireSpitterOrb(zombie);
          }
        } else if (directDistance >= 190 && directDistance <= 390 && time >= zombie.nextRangedAt) {
          zombie.chargingUntil = time + 520;
          steerX = 0;
          steerY = 0;
        }
      }

      obstacles.forEach((object) => {
        const body = object.body as Phaser.Physics.Arcade.StaticBody;
        const nearestX = Phaser.Math.Clamp(zombie.x, body.left, body.right);
        const nearestY = Phaser.Math.Clamp(zombie.y, body.top, body.bottom);
        const dx = zombie.x - nearestX;
        const dy = zombie.y - nearestY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 95) {
          const pressure = (95 - distance) / 95;
          steerX += dx / distance * pressure * 2.4;
          steerY += dy / distance * pressure * 2.4;
          steerX += -dy / distance * pressure * zombie.steerSign * .85;
          steerY += dx / distance * pressure * zombie.steerSign * .85;
        }
      });

      if (time - zombie.lastProgressAt > 520) {
        const progressed = Phaser.Math.Distance.Between(
          zombie.x, zombie.y, zombie.lastProgressX, zombie.lastProgressY,
        );
        if (progressed < 14) {
          zombie.forcedSteerUntil = time + 700;
          zombie.steerSign *= -1;
        }
        zombie.lastProgressAt = time;
        zombie.lastProgressX = zombie.x;
        zombie.lastProgressY = zombie.y;
      }
      if (time < zombie.forcedSteerUntil) {
        steerX += -Math.sin(targetAngle) * zombie.steerSign * 2.2;
        steerY += Math.cos(targetAngle) * zombie.steerSign * 2.2;
      }

      const length = Math.hypot(steerX, steerY) || 1;
      const velocityX = steerX / length * zombie.speed;
      const velocityY = steerY / length * zombie.speed;
      zombie.setVelocity(velocityX, velocityY);
      const walkPulse = 1 + Math.sin(time * .014 + zombie.orbitAngle * 3) * .055;
      if (zombie.kind === "runner") zombie.setDisplaySize(82 * walkPulse, 82 / walkPulse);
      else zombie.setScale(ZOMBIES[zombie.kind].scale * walkPulse, ZOMBIES[zombie.kind].scale / walkPulse);
      zombie.rotation = zombie.kind === "runner"
        ? Phaser.Math.Angle.Between(zombie.x, zombie.y, this.player.x, this.player.y)
        : Math.atan2(velocityY, velocityX);
      const distance = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);
      if (zombie.kind !== "runner" && distance < 48 + zombie.displayWidth * .18 && time >= zombie.nextAttackAt) {
        zombie.nextAttackAt = time + 720;
        this.damagePlayer(zombie.damage, targetAngle);
      }
    });
  }

  private fireSpitterOrb(zombie: ZombieView) {
    const projectile = this.enemyProjectiles.getFirstDead(false) as EnemyProjectileView | null;
    if (!projectile) return;
    const leadX = this.player.x + this.player.body!.velocity.x * .38;
    const leadY = this.player.y + this.player.body!.velocity.y * .38;
    const angle = Phaser.Math.Angle.Between(zombie.x, zombie.y, leadX, leadY);
    projectile.fire(
      zombie.x + Math.cos(angle) * 38,
      zombie.y + Math.sin(angle) * 38,
      angle,
      this.time.now,
    );
    const launchFlash = this.add.circle(projectile.x, projectile.y, 12, 0xff8a35, .9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(24);
    this.tweens.add({ targets: launchFlash, scale: 3.4, alpha: 0, duration: 180, onComplete: () => launchFlash.destroy() });
    const warning = this.add.circle(zombie.x, zombie.y, 30, 0xff4b24, .55).setDepth(10);
    this.tweens.add({ targets: warning, scale: 2.3, alpha: 0, duration: 260, onComplete: () => warning.destroy() });
  }

  private tryShoot(time: number, angle: number) {
    const weapon = WEAPONS[this.player.weapon];
    const ammo = this.player.ammo[this.player.weapon];
    const scaling = this.weaponScaling(this.director.wave);
    const fireRate = (this.player.overdriveUntil > time ? weapon.fireRate * .75 : weapon.fireRate) * scaling.fireRateMultiplier;
    if (time < this.player.nextShotAt) return;
    if (this.player.reloadingUntil > time) return;
    if (ammo.mag <= 0) {
      this.player.startReload(time);
      this.player.nextShotAt = time + 300;
      return;
    }
    if (this.player.weapon !== "pistol") ammo.mag--;
    this.player.nextShotAt = time + fireRate;
    this.stats.shots += weapon.pellets;
    for (let i = 0; i < weapon.pellets; i++) {
      const bullet = this.bullets.getFirstDead(false) as BulletView | null;
      if (!bullet) break;
      const shotAngle = angle + Phaser.Math.FloatBetween(-weapon.spread, weapon.spread);
      bullet.fire(
        this.player.x + Math.cos(angle) * 35,
        this.player.y + Math.sin(angle) * 35,
        shotAngle, weapon.speed, weapon.damage * scaling.damageMultiplier, time,
        weapon.color, weapon.bulletWidth, weapon.penetration,
      );
    }
    this.muzzleFlash(angle);
    this.cameras.main.shake(this.player.weapon === "shotgun" ? 70 : 35, weapon.kick);
  }

  private weaponScaling(wave: number) {
    const level = Math.max(0, wave - 1);
    return {
      damageMultiplier: 1 + Math.min(.7, level * .045),
      fireRateMultiplier: Math.max(.72, 1 - level * .018),
    };
  }

  private muzzleFlash(angle: number) {
    const x = this.player.x + Math.cos(angle) * 44;
    const y = this.player.y + Math.sin(angle) * 44;
    const flash = this.add.circle(x, y, this.player.weapon === "shotgun" ? 14 : 8, 0xffd274, .95)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(25);
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 70, onComplete: () => flash.destroy() });
    const casing = this.add.rectangle(
      this.player.x - Math.sin(angle) * 20,
      this.player.y + Math.cos(angle) * 20,
      7, 3, 0xc99035, .9,
    ).setRotation(angle + Math.PI / 2).setDepth(17);
    this.tweens.add({
      targets: casing,
      x: casing.x - Math.sin(angle) * Phaser.Math.Between(18, 34),
      y: casing.y + Math.cos(angle) * Phaser.Math.Between(18, 34),
      rotation: casing.rotation + Phaser.Math.FloatBetween(2, 5),
      alpha: 0,
      duration: 380,
      onComplete: () => casing.destroy(),
    });
  }

  private animatePlayer(time: number, moveX: number, moveY: number) {
    if (this.player.isMutant) return;
    const moving = moveX !== 0 || moveY !== 0;
    const pulse = moving ? 1 + Math.sin(time * .018) * .045 : 1 + Math.sin(time * .004) * .012;
    this.player.setScale(.94 * pulse, .94 / pulse);
  }

  private updateBullets(time: number) {
    const activeZombies = this.zombies.getChildren().filter((child) => child.active) as ZombieView[];
    this.bullets.getChildren().forEach((child) => {
      const bullet = child as BulletView;
      if (!bullet.active) return;
      if (time >= bullet.expiresAt ||
        bullet.x < WORLD.margin || bullet.x > WORLD.width - WORLD.margin ||
        bullet.y < WORLD.margin || bullet.y > WORLD.height - WORLD.margin) {
        bullet.despawn();
        return;
      }
      this.resolveBulletZombieHits(bullet, activeZombies);
    });
  }

  private resolveBulletZombieHits(bullet: BulletView, zombies: ZombieView[]) {
    let remainingHits = bullet.penetration + 1;
    for (const zombie of zombies) {
      if (!bullet.active || !zombie.active || bullet.hitIds.has(zombie.entityId)) continue;
      const radius = zombie.kind === "brute" ? 45 : zombie.kind === "runner" ? 34 : 30;
      const dx = bullet.x - zombie.x;
      const dy = bullet.y - zombie.y;
      if (dx * dx + dy * dy > radius * radius) continue;
      this.applyBulletHit(bullet, zombie);
      remainingHits--;
      if (remainingHits <= 0) break;
    }
  }

  private updateEnemyProjectiles(time: number) {
    this.enemyProjectiles.getChildren().forEach((child) => {
      const projectile = child as EnemyProjectileView;
      if (!projectile.active) return;
      projectile.rotation += .06;
      if (this.director.wave < 4 && Math.floor(time / 55) % 2 === 0) {
        const trail = this.add.circle(projectile.x, projectile.y, 6, 0xff4d1f, .34)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
        this.tweens.add({ targets: trail, scale: .15, alpha: 0, duration: 180, onComplete: () => trail.destroy() });
      }
      if (time >= projectile.expiresAt ||
        projectile.x < WORLD.margin || projectile.x > WORLD.width - WORLD.margin ||
        projectile.y < WORLD.margin || projectile.y > WORLD.height - WORLD.margin) projectile.despawn();
    });
  }

  private onEnemyProjectileObstacle(projectileObject: Phaser.GameObjects.GameObject) {
    const projectile = projectileObject as EnemyProjectileView;
    if (!projectile.active) return;
    this.hitSpark(projectile.x, projectile.y, 0xff6b2b);
    projectile.despawn();
  }

  private onEnemyProjectilePlayer(
    _playerObject: Phaser.GameObjects.GameObject,
    projectileObject: Phaser.GameObjects.GameObject,
  ) {
    const projectile = projectileObject as EnemyProjectileView;
    if (!projectile.active) return;
    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.player.x, this.player.y);
    this.damagePlayer(projectile.damage, angle);
    this.cameras.main.flash(90, 120, 20, 0, false);
    projectile.despawn();
  }

  private applyBulletHit(bullet: BulletView, zombie: ZombieView) {
    if (!bullet.active || !zombie.active || bullet.hitIds.has(zombie.entityId)) return;
    bullet.hitIds.add(zombie.entityId);
    this.stats.hits++;
    const now = this.time.now;
    if (this.director.wave < 4 || now - this.lastHitSoundAt > 42) {
      this.lastHitSoundAt = now;
      this.sound.play("hit", { volume: .18, detune: Phaser.Math.Between(-150, 120) });
    }
    this.hitSpark(bullet.x, bullet.y, zombie.kind === "runner" ? 0xff533f : 0xb9f278);
    if (zombie.hit(bullet.damage)) this.killZombie(zombie);
    if (bullet.penetration > 0) bullet.penetration--;
    else bullet.despawn();
  }

  private onBulletObstacle(bulletObject: Phaser.GameObjects.GameObject) {
    const bullet = bulletObject as BulletView;
    if (!bullet.active) return;
    this.sound.play("metal", { volume: .08, detune: Phaser.Math.Between(200, 500) });
    this.hitSpark(bullet.x, bullet.y, 0x8fe6e2);
    bullet.despawn();
  }

  private killZombie(zombie: ZombieView) {
    const x = zombie.x;
    const y = zombie.y;
    this.combo = Math.min(12, this.combo + 1);
    this.comboExpiresAt = this.time.now + 2200;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    this.stats.kills++;
    this.player.addMutation(zombie.kind === "brute" ? 28 : zombie.kind === "runner" ? 18 : 8);
    this.stats.score += zombie.scoreValue * this.combo;
    this.director.onKilled();
    const busy = this.director.wave >= 4;
    if (!busy || this.time.now - this.lastSparkAt > 45) {
      const ring = this.add.circle(x, y, 18, zombie.kind === "runner" ? 0xff532f : 0x79b956, .55).setDepth(7);
      this.tweens.add({ targets: ring, scale: 2.7, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    }
    const shardCount = busy ? 3 : 7;
    for (let i = 0; i < shardCount; i++) {
      const shard = this.add.circle(
        x, y, Phaser.Math.Between(2, 5),
        zombie.kind === "runner" ? 0xff5b32 : 0x718956, .9,
      ).setDepth(14);
      this.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-52, 52),
        y: y + Phaser.Math.Between(-52, 52),
        scale: .2,
        alpha: 0,
        duration: Phaser.Math.Between(260, 480),
        ease: "Quad.Out",
        onComplete: () => shard.destroy(),
      });
    }
    const unlock = this.weaponUnlocks.find(({ weapon, kills }) =>
      this.stats.kills >= kills &&
      !this.player.unlockedWeapons.has(weapon) &&
      !this.queuedUnlocks.has(weapon),
    );
    if (unlock) {
      this.queuedUnlocks.add(unlock.weapon);
      this.spawnWeaponPickup(x, y, unlock.weapon);
    } else {
      const needHealth = this.player.health < 55;
      const needArmor = this.player.armor < 25;
      const dropChance = needHealth || needArmor ? .27 : .16;
      if (Math.random() < dropChance) this.spawnPickup(x, y);
    }
    zombie.despawn();
  }

  private beginMutation() {
    this.cameras.main.flash(220, 90, 255, 70, false);
    this.cameras.main.shake(360, .013);
    const ring = this.add.circle(this.player.x, this.player.y, 30, 0x7cff46, .75)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(28);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.showBanner("MUTATION OVERDRIVE", "6 SECONDS // SMASH + SPACE SHOCKWAVE", 650);
  }

  private mutantStrike(time: number, angle: number) {
    if (time < this.player.nextMutantStrikeAt) return;
    this.player.nextMutantStrikeAt = time + 430;
    const centerX = this.player.x + Math.cos(angle) * 72;
    const centerY = this.player.y + Math.sin(angle) * 72;
    const blast = this.add.circle(centerX, centerY, 28, 0x9cff54, .72)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(27);
    this.tweens.add({ targets: blast, scale: 3.6, alpha: 0, duration: 210, onComplete: () => blast.destroy() });
    this.cameras.main.shake(100, .007);
    this.damageZombiesInRadius(centerX, centerY, 112, 145, true);
  }

  private mutantShockwave(time: number) {
    if (time < this.player.nextShockwaveAt) return;
    this.player.nextShockwaveAt = time + 1900;
    const wave = this.add.circle(this.player.x, this.player.y, 36, 0x62ff45, .6)
      .setStrokeStyle(7, 0xd5ff9b, .9).setDepth(26);
    this.tweens.add({ targets: wave, scale: 7.5, alpha: 0, duration: 520, onComplete: () => wave.destroy() });
    this.cameras.main.shake(300, .018);
    this.damageZombiesInRadius(this.player.x, this.player.y, 245, 210, true);
    this.enemyProjectiles.getChildren().forEach((child) => {
      const projectile = child as EnemyProjectileView;
      if (projectile.active &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, projectile.x, projectile.y) < 270) {
        projectile.despawn();
      }
    });
  }

  private damageZombiesInRadius(
    x: number, y: number, radius: number, damage: number, knockback: boolean,
  ) {
    this.zombies.getChildren().forEach((child) => {
      const zombie = child as ZombieView;
      if (!zombie.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (distance > radius) return;
      if (knockback && distance > 0) {
        zombie.setVelocity((zombie.x - x) / distance * 360, (zombie.y - y) / distance * 360);
        zombie.forcedSteerUntil = this.time.now + 230;
      }
      if (zombie.hit(damage * (1 - distance / (radius * 1.8)))) this.killZombie(zombie);
    });
  }

  private hitSpark(x: number, y: number, color: number) {
    const busy = this.director.wave >= 4;
    const now = this.time.now;
    if (busy && now - this.lastSparkAt < 34) return;
    this.lastSparkAt = now;
    const count = busy ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, .9).setDepth(24);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-24, 24),
        y: y + Phaser.Math.Between(-24, 24),
        alpha: 0,
        duration: 130,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private onBulletBarrel(bulletObject: Phaser.GameObjects.GameObject, barrelObject: Phaser.GameObjects.GameObject) {
    const bullet = bulletObject as BulletView;
    const barrel = barrelObject as Barrel;
    if (!bullet.active || !barrel.active || !barrel.armed) return;
    bullet.despawn();
    barrel.health = (barrel.health ?? 0) - bullet.damage;
    barrel.setTintFill(0xffffff);
    this.time.delayedCall(40, () => barrel.active && barrel.setTint(0xff4f32));
    if ((barrel.health ?? 0) <= 0) this.explodeBarrel(barrel);
  }

  private explodeBarrel(barrel: Barrel) {
    barrel.armed = false;
    const { x, y } = barrel;
    barrel.disableBody(true, true);
    this.sound.play("metal", { volume: .55 });
    this.cameras.main.shake(280, .012);
    const blast = this.add.circle(x, y, 28, 0xff6a22, .92).setBlendMode(Phaser.BlendModes.ADD).setDepth(30);
    this.tweens.add({ targets: blast, scale: 6.5, alpha: 0, duration: 330, onComplete: () => blast.destroy() });
    this.zombies.getChildren().forEach((child) => {
      const zombie = child as ZombieView;
      if (!zombie.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (distance < 180 && zombie.hit(220 * (1 - distance / 220))) this.killZombie(zombie);
    });
  }

  private spawnPickup(x: number, y: number) {
    const roll = Math.random();
    const kind: PickupKind =
      this.player.health < 50 && roll < .48 ? "health" :
      this.player.armor < 30 && roll < .72 ? "armor" :
      roll < .91 ? "ammo" : "overdrive";
    this.spawnResourcePickup(x, y, kind);
  }

  private spawnResourcePickup(x: number, y: number, kind: Exclude<PickupKind, "weapon">) {
    const texture =
      kind === "health" ? "pickup-medkit-custom" :
      kind === "armor" ? "pickup-armor-custom" : "pickup-ammo";
    const pickup = this.pickups.create(x, y, texture) as Pickup;
    pickup.kind = kind;
    pickup.expiresAt = this.time.now + 11000;
    pickup.setDisplaySize(kind === "health" || kind === "armor" ? 44 : 52, kind === "health" || kind === "armor" ? 44 : 34)
      .setTint(kind === "ammo" ? 0xffbf36 : kind === "overdrive" ? 0x4df4e6 : 0xffffff)
      .setDepth(15);
    this.tweens.add({ targets: pickup, y: y - 8, duration: 650, yoyo: true, repeat: -1 });
    this.addPickupAura(pickup, kind === "health" ? 0xff4f4f : kind === "armor" ? 0x36a9ff : 0xffc342);
  }

  private spawnWeaponPickup(x: number, y: number, weaponId: WeaponId) {
    const pickup = this.pickups.create(x, y, "pickup-weapon-crate") as Pickup;
    pickup.kind = "weapon";
    pickup.weaponId = weaponId;
    pickup.expiresAt = this.time.now + 30000;
    pickup.setDisplaySize(76, 56).setDepth(16);
    this.tweens.add({ targets: pickup, y: y - 10, duration: 520, yoyo: true, repeat: -1 });
    this.addPickupAura(pickup, 0xffca32);
    pickup.label = this.add.text(x, y - 48, `NEW WEAPON // ${WEAPONS[weaponId].name}`, {
      fontFamily: "Kenney Future", fontSize: "12px", color: "#ffd34f",
      backgroundColor: "#05090bdd", padding: { x: 8, y: 5 },
    }).setOrigin(.5).setDepth(17);
  }

  private addPickupAura(pickup: Pickup, color: number) {
    const aura = this.add.circle(pickup.x, pickup.y, 24, color, .12)
      .setStrokeStyle(2, color, .5).setDepth(8);
    this.tweens.add({ targets: aura, scale: 1.8, alpha: 0, duration: 820, repeat: -1 });
    const event = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!pickup.active) {
          aura.destroy();
          event.destroy();
          return;
        }
        aura.setPosition(pickup.x, pickup.y);
      },
    });
  }

  private updatePickups(time: number) {
    this.pickups.getChildren().forEach((child) => {
      const pickup = child as Pickup;
      if (pickup.active && time >= (pickup.expiresAt ?? 0)) {
        this.tweens.killTweensOf(pickup);
        pickup.label?.destroy();
        pickup.disableBody(true, true);
      } else if (pickup.active && pickup.label) {
        pickup.label.setPosition(pickup.x, pickup.y - 48);
      }
    });
  }

  private collectPickup(_player: Phaser.GameObjects.GameObject, pickupObject: Phaser.GameObjects.GameObject) {
    const pickup = pickupObject as Pickup;
    if (!pickup.active) return;
    if (pickup.kind === "health") this.player.health = Math.min(PLAYER.maxHealth, this.player.health + 30);
    if (pickup.kind === "armor") this.player.armor = Math.min(75, this.player.armor + 28);
    if (pickup.kind === "ammo") {
      this.player.ammo.smg.reserve += 54;
      this.player.ammo.shotgun.reserve += 12;
      this.player.ammo.pistol.reserve += 24;
      this.player.ammo.rifle.reserve += 36;
      this.player.ammo.magnum.reserve += 12;
    }
    if (pickup.kind === "overdrive") this.player.overdriveUntil = this.time.now + 7000;
    if (pickup.kind === "weapon" && pickup.weaponId) {
      this.player.unlockWeapon(pickup.weaponId);
      this.showBanner("WEAPON UNLOCKED", WEAPONS[pickup.weaponId].name, 900);
    }
    this.stats.score += 250;
    this.sound.play("ui-confirm", { volume: .35, detune: 220 });
    this.tweens.killTweensOf(pickup);
    pickup.label?.destroy();
    pickup.disableBody(true, true);
  }

  private damagePlayer(damage: number, angle: number) {
    if (this.time.now < this.player.invulnerableUntil) return;
    this.player.invulnerableUntil = this.time.now + PLAYER.invulnerabilityMs;
    if (this.player.isMutant) damage *= .28;
    const absorbed = Math.min(this.player.armor, Math.ceil(damage * .65));
    this.player.armor -= absorbed;
    this.player.health -= damage - absorbed;
    this.player.setTintFill(0xff4a3c);
    this.player.setVelocity(-Math.cos(angle) * 280, -Math.sin(angle) * 280);
    this.cameras.main.shake(150, .008);
    this.time.delayedCall(90, () => this.player.active && this.player.restoreAppearance());
    if (this.player.health <= 0) {
      this.stats.survivedMs = this.time.now - this.runStartedAt;
      this.physics.pause();
      this.cameras.main.fadeOut(700, 35, 0, 0);
      this.time.delayedCall(760, () => this.scene.start("gameover", this.stats));
    }
  }

  private startWave(wave: number) {
    this.sound.play("ui-wave", { volume: .42, detune: Math.min(300, wave * 18) });
    this.showBanner(`WAVE ${wave}`, wave % 5 === 0 ? "HEAVY BREACH DETECTED" : "HOSTILES INBOUND", 900);
    if (wave > 1) {
      this.player.ammo.pistol.reserve += 8;
    }
  }

  private showBanner(title: string, subtitle: string, hold: number) {
    const panel = this.add.rectangle(800, 410, 520, 118, 0x020506, .88)
      .setStrokeStyle(2, 0x3deade).setDepth(300).setScrollFactor(0).setAlpha(0);
    const main = this.add.text(800, 386, title, {
      fontFamily: "Kenney Future", fontSize: "38px", color: "#ffffff",
    }).setOrigin(.5).setDepth(301).setScrollFactor(0).setAlpha(0);
    const sub = this.add.text(800, 438, subtitle, {
      fontFamily: "Kenney Future", fontSize: "15px", color: "#52eadc",
    }).setOrigin(.5).setDepth(301).setScrollFactor(0).setAlpha(0);
    this.tweens.add({
      targets: [panel, main, sub], alpha: 1, duration: 150, hold,
      yoyo: true, onComplete: () => { panel.destroy(); main.destroy(); sub.destroy(); },
    });
  }
}
