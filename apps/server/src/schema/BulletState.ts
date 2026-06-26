import { defineTypes, Schema } from "@colyseus/schema";

export class BulletState extends Schema {
  declare id: string;
  declare ownerId: string;
  declare x: number;
  declare y: number;
  declare angle: number;
  declare damage: number;
  declare speed: number;
  declare expiresAt: number;
  declare color: number;
  declare width: number;
  declare hostile: boolean;
  declare radius: number;

  constructor() {
    super();
    this.id = "";
    this.ownerId = "";
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.damage = 0;
    this.speed = 0;
    this.expiresAt = 0;
    this.color = 0xffd36a;
    this.width = 16;
    this.hostile = false;
    this.radius = 8;
  }
}

defineTypes(BulletState, {
  id: "string",
  ownerId: "string",
  x: "number",
  y: "number",
  angle: "number",
  damage: "number",
  speed: "number",
  expiresAt: "number",
  color: "number",
  width: "number",
  hostile: "boolean",
  radius: "number",
});
