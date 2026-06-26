import { defineTypes, MapSchema, Schema } from "@colyseus/schema";
import { BulletState } from "./BulletState.js";
import { PickupState } from "./PickupState.js";
import { PlayerState } from "./PlayerState.js";
import { ZombieState } from "./ZombieState.js";

export class GameState extends Schema {
  declare players: MapSchema<PlayerState>;
  declare zombies: MapSchema<ZombieState>;
  declare bullets: MapSchema<BulletState>;
  declare pickups: MapSchema<PickupState>;
  declare roomCode: string;
  declare serverTime: number;
  declare wave: number;
  declare pending: number;
  declare alive: number;
  declare waveTotal: number;
  declare kills: number;
  declare score: number;
  declare gameOver: boolean;

  constructor() {
    super();
    this.players = new MapSchema<PlayerState>();
    this.zombies = new MapSchema<ZombieState>();
    this.bullets = new MapSchema<BulletState>();
    this.pickups = new MapSchema<PickupState>();
    this.roomCode = "";
    this.serverTime = 0;
    this.wave = 0;
    this.pending = 0;
    this.alive = 0;
    this.waveTotal = 0;
    this.kills = 0;
    this.score = 0;
    this.gameOver = false;
  }
}

defineTypes(GameState, {
  players: { map: PlayerState },
  zombies: { map: ZombieState },
  bullets: { map: BulletState },
  pickups: { map: PickupState },
  roomCode: "string",
  serverTime: "number",
  wave: "number",
  pending: "number",
  alive: "number",
  waveTotal: "number",
  kills: "number",
  score: "number",
  gameOver: "boolean",
});
