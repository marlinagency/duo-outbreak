import { Client, type Room } from "@colyseus/sdk";
import {
  NET_MESSAGES,
  ROOM,
  ROOM_NAME,
  type NetworkInputFrame,
} from "@duo-outbreak/shared";

export type NetworkPlayerState = {
  id: string;
  nickname: string;
  x: number;
  y: number;
  rotation: number;
  moveX: number;
  moveY: number;
  shooting: boolean;
  weapon: string;
  color: number;
  health: number;
  armor: number;
  score: number;
  kills: number;
  mutation: number;
  mutantUntil: number;
  weaponLevel: number;
  connected: boolean;
};

export type NetworkZombieState = {
  id: string;
  kind: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  maxHealth: number;
};

export type NetworkBulletState = {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: number;
  width: number;
  hostile: boolean;
  radius: number;
};

export type NetworkPickupState = {
  id: string;
  kind: string;
  x: number;
  y: number;
};

export type NetworkGameState = {
  players: Map<string, NetworkPlayerState>;
  zombies: Map<string, NetworkZombieState>;
  bullets: Map<string, NetworkBulletState>;
  pickups: Map<string, NetworkPickupState>;
  roomCode: string;
  serverTime: number;
  wave: number;
  pending: number;
  alive: number;
  waveTotal: number;
  kills: number;
  score: number;
  gameOver: boolean;
};

export class RoomClient {
  private readonly client: Client;
  private room?: Room<unknown, NetworkGameState>;
  private lastInputAt = 0;

  constructor(endpoint = defaultEndpoint()) {
    this.client = new Client(endpoint);
  }

  get currentRoom() { return this.room; }
  get sessionId() { return this.room?.sessionId; }
  get roomId() { return this.room?.roomId; }
  get state() { return this.room?.state; }
  get isConnected() { return Boolean(this.room?.connection?.isOpen); }

  async createRoom(nickname: string, color: number) {
    this.room = await this.client.create<NetworkGameState>(ROOM_NAME, { nickname, color });
    return this.room;
  }

  async joinRoom(roomId: string, nickname: string, color: number) {
    this.room = await this.client.joinById<NetworkGameState>(roomId, { nickname, color });
    return this.room;
  }

  sendInput(input: NetworkInputFrame, now: number) {
    if (!this.room || now - this.lastInputAt < 1000 / ROOM.inputHz) return;
    this.lastInputAt = now;
    this.room.send(NET_MESSAGES.input, input);
  }

  leave() {
    this.room?.leave();
    this.room = undefined;
  }
}

function defaultEndpoint() {
  const envUrl = import.meta.env.VITE_COLYSEUS_URL as string | undefined;
  if (envUrl) return envUrl;
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const host = window.location.hostname || "localhost";
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.");
  if (isLocalHost && window.location.port !== "2567") return `${protocol}://${host}:2567`;
  return window.location.origin;
}
