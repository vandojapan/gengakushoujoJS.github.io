import{CONFIG}from"./config.js";import{TileMap}from"./map.js";import{Player}from"./player.js";import { Renderer } from "./renderer.js"; import{fallbackMap16x16,fetchXML,parseLowerLayer}from"./dataLoader.js";import{EventInterpreter,Maniacs,executeEventCommand,parseParameters,parseEventCommands}from"./eventEngine.js";
function log(...a){const e=document.getElementById("console");if(e){e.textContent+=a.join(" ")+"\n";e.scrollTop=e.scrollHeight;}console.log(...a);}
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),keys={};window.addEventListener("keydown",e=>keys[e.key]=true);window.addEventListener("keyup",e=>keys[e.key]=false);window.EventEngine={EventInterpreter,Maniacs,executeEventCommand,parseParameters,parseEventCommands};
let map=new TileMap(fallbackMap16x16()),player=new Player(32,200),camX=0;(async()=>{try{const p=Object.values(CONFIG.dataPaths);if(p.length){const f=p[0];log("[Load]",f);const d=await fetchXML(f);const data=parseLowerLayer(d);
map=new TileMap(data);log("[OK]",f,"("+data.width+"x"+data.height+")");}else log("[Info]XMLをassets/dataに置いてconfig.jsを設定してください。");}catch(e){log("[Warn]",e.message);}})();
function upd(){player.update(keys,map);camX=Math.max(0,Math.floor(player.x-canvas.width/2));camX=Math.min(camX,map.width*CONFIG.tileSize-canvas.width);}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#102030";ctx.fillRect(0,0,canvas.width,canvas.height);map.draw(ctx,camX);player.draw(ctx,camX);}
(function loop(){upd();draw();requestAnimationFrame(loop);})();
const renderer = new Renderer(document.getElementById("game"));
