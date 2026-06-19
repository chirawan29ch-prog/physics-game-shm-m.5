const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const TOTAL = 30;
const Q_STEPS = new Set([3,6,9,12,15,17,20,22,24,26,28]);
const TRAPS   = new Set([5,11,16,23,27]);
const BOOSTS  = new Set([7,13,19,25]);

const QUESTIONS = [
  { step:3,  q:"\u0e01\u0e32\u0e23\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e41\u0e1a\u0e1a SHM \u0e40\u0e01\u0e34\u0e14\u0e02\u0e36\u0e49\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e41\u0e23\u0e07\u0e25\u0e31\u0e1e\u0e18\u0e4c\u0e17\u0e35\u0e48\u0e01\u0e23\u0e30\u0e17\u0e33\u0e15\u0e48\u0e2d\u0e27\u0e31\u0e15\u0e16\u0e38\u0e40\u0e1b\u0e47\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e44\u0e23?", ch:["\u0e04\u0e07\u0e17\u0e35\u0e48\u0e15\u0e25\u0e2d\u0e14\u0e40\u0e27\u0e25\u0e32","\u0e41\u0e1b\u0e23\u0e1c\u0e31\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e01\u0e23\u0e30\u0e08\u0e31\u0e14 \u0e1e\u0e38\u0e48\u0e07\u0e40\u0e02\u0e49\u0e32\u0e2b\u0e32\u0e2a\u0e21\u0e14\u0e38\u0e25","\u0e41\u0e1b\u0e23\u0e1c\u0e31\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e04\u0e27\u0e32\u0e21\u0e40\u0e23\u0e47\u0e27","\u0e40\u0e1b\u0e47\u0e19\u0e28\u0e39\u0e19\u0e22\u0e4c\u0e15\u0e25\u0e2d\u0e14\u0e40\u0e27\u0e25\u0e32"], ans:1, hint:"F = -kx" },
  { step:6,  q:"\u0e25\u0e39\u0e01\u0e15\u0e38\u0e49\u0e21 L=40cm, g=4.9 m/s\u00b2 \u0e04\u0e32\u0e1a T=?", ch:["0.90 s","1.26 s","1.79 s","2.00 s"], ans:2, hint:"T = 2\u03c0\u221a(0.4/4.9) \u2248 1.79 s" },
  { step:9,  q:"\u0e2a\u0e1b\u0e23\u0e34\u0e07 k=400 N/m \u0e21\u0e27\u0e25 1 kg \u0e04\u0e27\u0e32\u0e21\u0e16\u0e35\u0e48 f=?", ch:["2.0 Hz","3.2 Hz","6.3 Hz","20.0 Hz"], ans:1, hint:"f = (1/2\u03c0)\u221a400 \u2248 3.18 Hz" },
  { step:12, q:"\u0e27\u0e31\u0e15\u0e16\u0e38\u0e40\u0e23\u0e34\u0e48\u0e21\u0e17\u0e35\u0e48\u0e2a\u0e21\u0e14\u0e38\u0e25 \u0e01\u0e23\u0e32\u0e1f x(t) \u0e40\u0e1b\u0e47\u0e19\u0e2d\u0e30\u0e44\u0e23?", ch:["A cos(\u03c9t)","A sin(\u03c9t)","A tan(\u03c9t)","\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e23\u0e07"], ans:1, hint:"x = A sin(\u03c9t)" },
  { step:15, q:"\u0e2a\u0e1b\u0e23\u0e34\u0e07 k=500 N/m \u0e21\u0e27\u0e25 2 kg A=8cm v_max=?", ch:["0.63 m/s","1.26 m/s","2.00 m/s","4.00 m/s"], ans:1, hint:"v_max = 0.08\u00d7\u221a250 \u2248 1.26 m/s" },
  { step:17, q:"\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e43\u0e14 KE=PE \u0e43\u0e19 SHM?", ch:["x=0","x=\u00b1A","x=\u00b1A/\u221a2","x=\u00b1A/2"], ans:2, hint:"x = A/\u221a2" },
  { step:20, q:"\u0e21\u0e27\u0e25 0.4kg k=160 N/m A=6cm a_max=?", ch:["12 m/s\u00b2","24 m/s\u00b2","48 m/s\u00b2","96 m/s\u00b2"], ans:1, hint:"a_max = 400\u00d70.06 = 24 m/s\u00b2" },
  { step:22, q:"\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e21\u0e27\u0e25 4 \u0e40\u0e17\u0e48\u0e32 \u0e04\u0e32\u0e1a\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19?", ch:["\u0e40\u0e1e\u0e34\u0e48\u0e21 2 \u0e40\u0e17\u0e48\u0e32","\u0e40\u0e1e\u0e34\u0e48\u0e21 4 \u0e40\u0e17\u0e48\u0e32","\u0e25\u0e14 1/2","\u0e44\u0e21\u0e48\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19"], ans:0, hint:"T \u00d7\u221a4 = 2T" },
  { step:24, q:"\u0e2a\u0e1b\u0e23\u0e34\u0e07 k=300 N/m A=10cm E=?", ch:["0.75 J","1.50 J","3.00 J","6.00 J"], ans:1, hint:"E = \u00bdkA\u00b2 = 1.50 J" },
  { step:26, q:"\u0e15\u0e31\u0e14\u0e40\u0e0a\u0e37\u0e2d\u0e01 1/4 \u0e04\u0e32\u0e1a\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19?", ch:["\u0e25\u0e14 1/4","\u0e25\u0e14 1/2","\u0e40\u0e1e\u0e34\u0e48\u0e21 2 \u0e40\u0e17\u0e48\u0e32","\u0e44\u0e21\u0e48\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19"], ans:1, hint:"T\u00d7(1/2)" },
  { step:28, q:"A=10cm \u03c9=5 rad/s x=6cm v=?", ch:["0.32 m/s","0.40 m/s","0.50 m/s","0.60 m/s"], ans:1, hint:"v = 5\u00d70.08 = 0.40 m/s" },
];

const PALETTE=[{color:"#EC4899",emoji:"\uD83C\uDF38"},{color:"#06B6D4",emoji:"\uD83C\uDF0A"},{color:"#10B981",emoji:"\uD83C\uDF40"},{color:"#F59E0B",emoji:"\u26A1"},{color:"#A78BFA",emoji:"\uD83D\uDD2E"},{color:"#EF4444",emoji:"\uD83D\uDD25"}];
const rooms={};
function makeCode(){return Math.random().toString(36).slice(2,6).toUpperCase();}
function broadcast(code){if(!rooms[code])return;io.to(code).emit("room_update",rooms[code]);}

io.on("connection",(socket)=>{
  socket.on("create_room",()=>{const code=makeCode();rooms[code]={code,status:"waiting",teams:{}};socket.join(code);socket.data.code=code;socket.emit("room_created",{code});broadcast(code);});
  socket.on("join_room",({code,teamName})=>{const room=rooms[code];if(!room)return socket.emit("err","\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2b\u0e49\u0e2d\u0e07");if(room.status!=="waiting")return socket.emit("err","\u0e40\u0e01\u0e21\u0e40\u0e23\u0e34\u0e48\u0e21\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27");const count=Object.keys(room.teams).length;if(count>=6)return socket.emit("err","\u0e17\u0e35\u0e21\u0e40\u0e15\u0e47\u0e21");const style=PALETTE[count%PALETTE.length];const tid=socket.id;room.teams[tid]={id:tid,name:teamName.trim().slice(0,20),color:style.color,emoji:style.emoji,pos:1,log:[style.emoji+" "+teamName.trim()+" \u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21!"],pendingQ:null,lastRoll:null,finished:false,finishedAt:null};socket.join(code);socket.data.code=code;socket.emit("joined",{code,teamId:tid});broadcast(code);});
  socket.on("watch_room",({code})=>{const room=rooms[code];if(!room)return socket.emit("err","\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2b\u0e49\u0e2d\u0e07");socket.join(code);socket.data.code=code;socket.emit("watching",{code,status:room.status});broadcast(code);});
  socket.on("start_game",({code})=>{const room=rooms[code];if(!room)return;room.status="playing";broadcast(code);io.to(code).emit("game_started");});
  socket.on("reset_game",({code})=>{const room=rooms[code];if(!room)return;Object.values(room.teams).forEach(t=>{t.pos=1;t.log=[t.emoji+" \u0e23\u0e35\u0e40\u0e0b\u0e47\u0e15!"];t.pendingQ=null;t.lastRoll=null;t.finished=false;t.finishedAt=null;});room.status="playing";broadcast(code);});
  socket.on("roll_dice",({code})=>{const room=rooms[code];if(!room||room.status!=="playing")return;const t=room.teams[socket.id];if(!t||t.pendingQ||t.finished)return;const roll=Math.floor(Math.random()*6)+1;const oldPos=t.pos;const newPos=Math.min(oldPos+roll,TOTAL);t.log.unshift("\uD83C\uDFB2 \u0e17\u0e2d\u0e22\u0e44\u0e14\u0e49 "+roll+" \u2192 \u0e08\u0e32\u0e01\u0e0a\u0e48\u0e2d\u0e07 "+oldPos+" \u0e44\u0e1b\u0e0a\u0e48\u0e2d\u0e07 "+newPos);t.lastRoll=roll;socket.emit("dice_result",{roll,newPos});const q=QUESTIONS.find(q=>q.step===newPos);if(q){t.pos=newPos;t.pendingQ=newPos;t.log.unshift("\u2753 \u0e40\u0e08\u0e2d\u0e04\u0e33\u0e16\u0e32\u0e21\u0e0a\u0e48\u0e2d\u0e07 "+newPos+"! \u0e15\u0e2d\u0e1a\u0e01\u0e48\u0e2d\u0e19\u0e17\u0e2d\u0e22\u0e15\u0e48\u0e2d");broadcast(code);return;}t.pos=newPos;if(TRAPS.has(newPos)){t.pos=Math.max(1,newPos-2);t.log.unshift("\uD83D\uDC80 \u0e01\u0e31\u0e1a\u0e14\u0e31\u0e01! \u0e16\u0e2d\u0e22 2 \u2192 \u0e0a\u0e48\u0e2d\u0e07 "+t.pos);}else if(BOOSTS.has(newPos)){t.pos=Math.min(TOTAL,newPos+2);t.log.unshift("\u2B50 \u0e1a\u0e39\u0e2a\u0e15\u0e4c! \u0e2b\u0e19\u0e49\u0e32 2 \u2192 \u0e0a\u0e48\u0e2d\u0e07 "+t.pos);}if(t.pos>=TOTAL){t.finished=true;t.finishedAt=Date.now();t.log.unshift("\uD83C\uDFC6 \u0e16\u0e36\u0e07\u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22!");}broadcast(code);});
  socket.on("answer_question",({code,answerIdx})=>{const room=rooms[code];if(!room)return;const t=room.teams[socket.id];if(!t||!t.pendingQ)return;const q=QUESTIONS.find(q=>q.step===t.pendingQ);if(!q){t.pendingQ=null;broadcast(code);return;}t.pendingQ=null;if(answerIdx===q.ans){t.log.unshift("\u2705 \u0e15\u0e2d\u0e1a\u0e16\u0e39\u0e01! \u0e17\u0e2d\u0e22\u0e25\u0e39\u0e01\u0e40\u0e15\u0e4b\u0e32\u0e15\u0e48\u0e2d\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22 \uD83C\uDF38");if(t.pos>=TOTAL){t.finished=true;t.finishedAt=Date.now();}}else{const back=Math.max(1,t.pos-3);t.log.unshift("\u274C \u0e15\u0e2d\u0e1a\u0e1c\u0e34\u0e14! \u0e16\u0e2d\u0e22 3 \u2192 \u0e0a\u0e48\u0e2d\u0e07 "+back);t.pos=back;}broadcast(code);});
  socket.on("kick_team",({code,teamId})=>{const room=rooms[code];if(!room)return;delete room.teams[teamId];io.to(teamId).emit("kicked");broadcast(code);});
  socket.on("disconnect",()=>{const code=socket.data.code;if(!code||!rooms[code])return;if(rooms[code].teams[socket.id]){delete rooms[code].teams[socket.id];broadcast(code);}});
});

setInterval(()=>{const cut=Date.now()-3*60*60*1000;Object.keys(rooms).forEach(code=>{if(!rooms[code]._ts)rooms[code]._ts=Date.now();if(rooms[code]._ts<cut)delete rooms[code];});},60*60*1000);

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("\uD83D\uDE80 Server running on port",PORT));
