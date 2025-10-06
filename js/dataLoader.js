function log(...a){const e=document.getElementById("console");if(e){e.textContent+=a.join(" ")+"\n";e.scrollTop=e.scrollHeight;}console.log(...a);}
export async function fetchXML(p){const r=await fetch(p);if(!r.ok)throw new Error("Failed "+p);const t=await r.text();return new DOMParser().parseFromString(t,"application/xml");}
export function parseLowerLayer(d){const l=d.querySelector("lower_layer"),w=Number(d.querySelector("width")?.textContent||"0"),h=Number(d.querySelector("height")?.textContent||"0");
if(!l||!w||!h)throw new Error("Map lower_layer missing");const n=l.textContent.trim().split(/\s+/).map(Number),g=[];for(let y=0;y<h;y++){g.push(n.slice(y*w,(y+1)*w));}return{width:w,height:h,tiles:g};}
export function tileColor(id){if(id===0)return null;if(id>=5000)return"#5aa";if(id>=4000)return"#3a6";return"#a55";}
export function fallbackMap16x16(){const w=80,h=15,t=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>{if(y===h-1)return 1;if(x%11===0&&y>5)return 1;return 0;}));
for(let x=10;x<15;x++)t[h-2][x]=1;for(let x=20;x<28;x++)t[h-3][x]=1;for(let x=30;x<40;x++)t[h-4][x]=1;return{width:w,height:h,tiles:t};}