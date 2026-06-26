import { defineTypes, Schema } from "@colyseus/schema";
import type { PickupKind } from "@duo-outbreak/shared";

export class PickupState extends Schema {
  declare id: string;
  declare kind: PickupKind;
  declare x: number;
  declare y: number;
  declare expiresAt: number;

  constructor() {
    super();
    this.id = "";
    this.kind = "health";
    this.x = 0;
    this.y = 0;
    this.expiresAt = 0;
  }
}

defineTypes(PickupState, {
  id: "string",
  kind: "string",
  x: "number",
  y: "number",
  expiresAt: "number",
});
