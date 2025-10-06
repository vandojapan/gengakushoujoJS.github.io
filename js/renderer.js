// js/renderer.js
import { CONFIG } from "./config.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.tileSize = CONFIG.canvas.tile;
    this.tilesX = 16; // chip.png の横タイル数
    this.tilesY = 30; // 縦タイル数
    this.image = new Image();
    this.loaded = false;

    // 読み込み開始
    this.image.onload = () => {
      this.loaded = true;
      console.log("[Renderer] Chipset loaded:", this.image.width, "x", this.image.height);
      this.tilesX = Math.floor(this.image.width / this.tileSize);
      this.tilesY = Math.floor(this.image.height / this.tileSize);
    };
    this.image.src = "assets/Chipset/chip.png";
  }

  draw(map, cameraX, player) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 背景色
    ctx.fillStyle = "#0e1726";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // タイル描画（下層のみ）
    const startCol = Math.floor(cameraX / ts);
    const cols = Math.ceil(this.canvas.width / ts) + 2;

    for (let y = 0; y < map.height; y++) {
      for (let x = startCol; x < startCol + cols; x++) {
        if (x < 0 || x >= map.width) continue;
        const id = map.tiles[y][x];
        if (id <= 0) continue;

        if (this.loaded) {
          const sx = (id % this.tilesX) * ts;
          const sy = Math.floor(id / this.tilesX) * ts;
          ctx.drawImage(this.image, sx, sy, ts, ts, x * ts - cameraX, y * ts, ts, ts);
        } else {
          ctx.fillStyle = CONFIG.palette(id) || "#888";
          ctx.fillRect(x * ts - cameraX, y * ts, ts, ts);
        }
      }
    }

    // プレイヤー描画
    ctx.fillStyle = "#ffd38a";
    ctx.fillRect(Math.floor(player.x - cameraX), Math.floor(player.y), player.w, player.h);
    ctx.fillStyle = "#000";
    ctx.fillRect(Math.floor(player.x - cameraX + (player.dir > 0 ? 9 : 3)), Math.floor(player.y + 4), 2, 2);
  }
}
