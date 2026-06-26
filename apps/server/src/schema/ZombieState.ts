import { defineTypes, Schema } from "@colyseus/schema";
import type { ZombieKind } from "@duo-outbreak/shared";

export class ZombieState extends Schema {
  declare id: string;
  declare kind: ZombieKind;
  declare x: number;
  declare y: number;
  declare rotation: number;
  declare health: number;
  declare maxHealth: number;
  declare speed: number;
  declare damage: number;
  declare scoreValue: number;
  declare nextAttackAt: number;
  declare nextRangedAt: number;
  declare chargingUntil: number;

  constructor() {
    super();
    this.id = "";
    this.kind = "walker";
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.health = 1;
    this.maxHealth = 1;
    this.speed = 1;
    this.damage = 1;
    this.scoreValue = 1;
    this.nextAttackAt = 0;
    this.nextRangedAt = 0;
    this.chargingUntil = 0;
  }
}

defineTypes(ZombieState, {
  id: "string",
  kind: "string",
  x: "number",
  y: "number",
  rotation: "number",
  health: "number",
  maxHealth: "number",
  speed: "number",
  damage: "number",
  scoreValue: "number",
  nextAttackAt: "number",
  nextRangedAt: "number",
  chargingUntil: "number",
});
