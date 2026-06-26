import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { ROOM_NAME } from "@duo-outbreak/shared";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT ?? 2567);
const serveClient = process.env.SERVE_CLIENT === "1" || process.argv.includes("--serve-client");
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(serverDir, "../../client/dist");

const gameServer = new Server({
  transport: new WebSocketTransport(),
  express: (app) => {
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });
    app.use(cors({ origin: true }));
    app.get("/health", (_req, res) => {
      res.json({ ok: true, service: "duo-outbreak-server", phase: 3 });
    });
    if (serveClient) {
      app.use(express.static(clientDist));
      app.use((req, res, next) => {
        if (
          req.method === "GET" &&
          !req.path.startsWith("/matchmake") &&
          !req.path.startsWith("/health") &&
          !path.extname(req.path)
        ) {
          res.sendFile(path.join(clientDist, "index.html"));
          return;
        }
        next();
      });
    }
  },
});

gameServer.define(ROOM_NAME, GameRoom);

await gameServer.listen(port);
console.log(`Duo Outbreak Colyseus server listening on http://localhost:${port}`);
if (serveClient) console.log(`Serving client from ${clientDist}`);
