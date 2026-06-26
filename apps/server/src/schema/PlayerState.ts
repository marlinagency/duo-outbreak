import { defineTypes, Schema } from "@colyseus/schema";
import { PLAYER, type WeaponId } from "@duo-outbreak/shared";

export class PlayerState extends Schema {
  declare id: string;
  declare nickname: string;
  declare x: number;
  declare y: number;
  declare rotation: number;
  declare moveX: number;
  declare moveY: number;
  declare shooting: boolean;
  declare weapon: WeaponId;
  declare color: number;
  declare health: number;
  declare armor: number;
  declare score: number;
  declare kills: number;
  declare nextShotAt: number;
  declare invulnerableUntil: number;
  declare mutation: number;
  declare mutantUntil: number;
  declare nextShockwaveAt: number;
  declare weaponLevel: number;
  declare connected: boolean;

  constructor() {
    super();
    this.id = "";
    this.nickname = "survivor";
    this.x = 800;
    this.y = 450;
    this.rotation = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.shooting = false;
    this.weapon = "pistol";
    this.color = 0x52eadc;
    this.health = PLAYER.maxHealth;
    this.armor = 38;
    this.score = 0;
    this.kills = 0;
    this.nextShotAt = 0;
    this.invulnerableUntil = 0;
    this.mutation = 0;
    this.mutantUntil = 0;
    this.nextShockwaveAt = 0;
    this.weaponLevel = 0;
    this.connected = true;
  }
}

defineTypes(PlayerState, {
  id: "string",
  nickname: "string",
  x: "number",
  y: "number",
  rotation: "number",
  moveX: "number",
  moveY: "number",
  shooting: "boolean",
  weapon: "string",
  color: "number",
  health: "number",
  armor: "number",
  score: "number",
  kills: "number",
  nextShotAt: "number",
  invulnerableUntil: "number",
  mutation: "number",
  mutantUntil: "number",
  nextShockwaveAt: "number",
  weaponLevel: "number",
  connected: "boolean",
});
