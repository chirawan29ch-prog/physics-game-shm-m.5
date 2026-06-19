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
  { step:3,  q:"การเคลื่อนที่แบบ SHM เกิดขึ้นเมื่อแรงลัพธ์ที่กระทำต่อวัตถุเป็นอย่างไร?", ch:["คงที่ตลอดเวลา","แปรผันตรงกับการกระจัด พุ่งเข้าหาสมดุล","แปรผันตรงกับความเร็ว","เป็นศูนย์ตลอดเวลา"], ans:1, hint:"F = −kx แรงพุ่งเข้าหาตำแหน่งสมดุลเสมอ" },
  { step:6,  q:"ลูกตุ้มเชือกยาว 40 cm แกว่งบนดาวที่ g = 4.9 m/s² คาบ T = ?", ch:["0.90 s","1.26 s","1.79 s","2.00 s"], ans:2, hint:"T = 2π√(L/g) = 2π√(0.4/4.9) ≈ 1.79 s" },
  { step:9,  q:"สปริง k = 400 N/m ติดมวล 1 kg ความถี่ f = ?", ch:["2.0 Hz","3.2 Hz","6.3 Hz","20.0 Hz"], ans:1, hint:"f = (1/2π)√(k/m) = (1/2π)√400 ≈ 3.18 Hz" },
  { step:12, q:"ถ้าวัตถุเริ่มต้นที่ตำแหน่งสมดุล กราฟ x(t) มีรูปแบบใด?", ch:["A cos(ωt)","A sin(ωt)","A tan(ωt)","เส้นตรง"], ans:1, hint:"เริ่มที่ x = 0 → x = A sin(ωt)" },
  { step:15, q:"สปริง k = 500 N/m มวล 2 kg แอมพลิจูด 8 cm อัตราเร็วสูงสุด v_max = ?", ch:["0.63 m/s","1.26 m/s","2.00 m/s","4.00 m/s"], ans:1, hint:"v_max = A√(k/m) = 0.08×√250 ≈ 1.26 m/s" },
  { step:17, q:"ตำแหน่งใดใน SHM ที่พลังงานจลน์ = พลังงานศักย์?", ch:["x = 0","x = ±A","x = ±A/√2","x = ±A/2"], ans:2, hint:"½mv² = ½kx² → x = A/√2 ≈ 0.707A" },
  { step:20, q:"มวล 0.4 kg สปริง k = 160 N/m แอมพลิจูด 6 cm ความเร่งสูงสุด a_max = ?", ch:["12 m/s²","24 m/s²","48 m/s²","96 m/s²"], ans:1, hint:"a_max = (k/m)·A = (160/0.4)×0.06 = 24 m/s²" },
  { step:22, q:"ถ้าเพิ่มมวลที่ติดสปริงเป็น 4 เท่า คาบจะเปลี่ยนแปลงอย่างไร?", ch:["เพิ่มเป็น 2 เท่า","เพิ่มเป็น 4 เท่า","ลดเหลือครึ่งหนึ่ง","ไม่เปลี่ยนแปลง"], ans:0, hint:"T = 2π√(m/k) → m×4 → T×√4 = 2T" },
  { step:24, q:"สปริง k = 300 N/m แอมพลิจูด 10 cm พลังงานกลรวม E = ?", ch:["0.75 J","1.50 J","3.00 J","6.00 J"], ans:1, hint:"E = ½kA² = ½×300×(0.1)² = 1.50 J" },
  { step:26, q:"ตัดเชือกลูกตุ้มให้สั้นลงเหลือ 1/4 คาบจะเปลี่ยนอย่างไร?", ch:["ลดเหลือ 1/4","ลดเหลือ 1/2","เพิ่มเป็น 2 เท่า","ไม่เปลี่ยนแปลง"], ans:1, hint:"T = 2π√(L/g) → L×(1/4) → T×(1/2)" },
  { step:28, q:"SHM แอมพลิจูด 10 cm ω = 5 rad/s ที่ตำแหน่ง x = 6 cm อัตราเร็ว v = ?", ch:["0.32 m/s","0.40 m/s","0.50 m/s","0.60 m/s"], ans:1, hint:"v = ω√(A²−x²) = 5×√(0.01−0.0036) = 5×0.08 = 0.40 m/s" },
];

const PALETTE = [
  {color:"#EC4899",emoji:"🌸"},{color:"#06B6D4",emoji:"🌊"},
  {color:"#10B981",emoji:"🍀"},{color:"#F59E0B",emoji:"⚡"},
  {color:"#A78BFA",emoji:"🔮"},{color:"#EF4444",emoji:"🔥"},
];

const rooms = {};

function makeCode() {
  return Math.random().toString(36).slice(2,6).toUpperCase();
}

function broadcast(code) {
  if (!rooms[code]) return;
  io.to(code).emit("room_update", rooms[code]);
}

io.on("connection", (socket) => {

  socket.on("create_room", () => {
    const code = makeCode();
    rooms[code] = { code, status: "waiting", teams: {} };
    socket.join(code);
    socket.data.code = code;
    socket.data.role = "host";
    socket.emit("room_created", { code });
    broadcast(code);
  });

  socket.on("join_room", ({ code, teamName }) => {
    const room = rooms[code];
    if (!room) return socket.emit("err", "ไม่พบห้อง");
    if (room.status !== "waiting") return socket.emit("err", "เกมเริ่มไปแล้ว");
    const count = Object.keys(room.teams).length;
    if (count >= 6) return socket.emit("err", "ทีมเต็มแล้ว");
    const style = PALETTE[count % PALETTE.length];
    const tid = socket.id;
    room.teams[tid] = {
      id: tid, name: teamName.trim().slice(0,20),
      color: style.color, emoji: style.emoji,
      pos: 1, log: [`${style.emoji} ${teamName.trim()} เข้าร่วมแล้ว!`],
      pendingQ: null, finished: false, finishedAt: null,
    };
    socket.join(code);
    socket.data.code = code;
    socket.data.role = "team";
    socket.emit("joined", { code, teamId: tid });
    broadcast(code);
  });

  socket.on("watch_room", ({ code }) => {
    const room = rooms[code];
    if (!room) return socket.emit("err", "ไม่พบห้อง");
    socket.join(code);
    socket.data.code = code;
    socket.data.role = "host";
    socket.emit("watching", { code, status: room.status });
    broadcast(code);
  });

  socket.on("start_game", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    room.status = "playing";
    broadcast(code);
    io.to(code).emit("game_started");
  });

  socket.on("reset_game", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    Object.values(room.teams).forEach(t => {
      t.pos=1; t.log=[`${t.emoji} รีเซ็ต!`];
      t.pendingQ=null; t.finished=false; t.finishedAt=null;
    });
    room.status = "playing";
    broadcast(code);
  });

  socket.on("roll_dice", ({ code }) => {
    const room = rooms[code];
    if (!room || room.status !== "playing") return;
    const t = room.teams[socket.id];
    // ❌ ห้ามทอยถ้ายังมีคำถามค้างอยู่
    if (!t || t.pendingQ || t.finished) return;

    const roll = Math.floor(Math.random()*6)+1;
    let newPos = Math.min(t.pos+roll, TOTAL);
    t.log.unshift(`🎲 ทอยได้ ${roll} → ไปช่องที่ ${newPos}`);

    // ถ้าเดินถึงช่องคำถาม → หยุดรอตอบก่อน ไม่เดินต่อ
    const q = QUESTIONS.find(q => q.step === newPos);
    if (q) {
      t.pos = newPos;
      t.pendingQ = newPos;
      t.log.unshift(`❓ เจอคำถามช่องที่ ${newPos}! ตอบก่อนแล้วค่อยทอยต่อ`);
      broadcast(code);
      return;
    }

    // ช่องปกติ กับดัก บูสต์
    t.pos = newPos;
    if (TRAPS.has(newPos)) {
      t.pos = Math.max(1, newPos-2);
      t.log.unshift(`💀 กับดัก! ถอยหลัง 2 ช่อง → ช่องที่ ${t.pos}`);
    } else if (BOOSTS.has(newPos)) {
      t.pos = Math.min(TOTAL, newPos+2);
      t.log.unshift(`⭐ บูสต์! เดินหน้า 2 ช่อง → ช่องที่ ${t.pos}`);
    }

    if (t.pos >= TOTAL) {
      t.finished = true; t.finishedAt = Date.now();
      t.log.unshift("🏆 ถึงเป้าหมายแล้ว!");
      io.to(code).emit("team_finished", { name: t.name, emoji: t.emoji });
    }
    broadcast(code);
  });

  socket.on("answer_question", ({ code, answerIdx }) => {
    const room = rooms[code];
    if (!room) return;
    const t = room.teams[socket.id];
    if (!t || !t.pendingQ) return;
    const q = QUESTIONS.find(q => q.step === t.pendingQ);
    if (!q) { t.pendingQ = null; broadcast(code); return; }

    t.pendingQ = null;

    if (answerIdx === q.ans) {
      // ✅ ตอบถูก → ยังอยู่ที่ช่องเดิม รอทอยลูกเต๋าต่อ
      t.log.unshift("✅ ตอบถูก! ทอยลูกเต๋าต่อได้เลย 🌸");
      if (t.pos >= TOTAL) {
        t.finished = true; t.finishedAt = Date.now();
        t.log.unshift("🏆 ถึงเป้าหมายแล้ว!");
      }
    } else {
      // ❌ ตอบผิด → ถอยหลัง 3 ช่อง
      const back = Math.max(1, t.pos - 3);
      t.log.unshift(`❌ ตอบผิด! ถอยหลัง 3 ช่อง → ช่องที่ ${back}`);
      t.pos = back;
    }
    broadcast(code);
  });

  socket.on("kick_team", ({ code, teamId }) => {
    const room = rooms[code];
    if (!room) return;
    delete room.teams[teamId];
    io.to(teamId).emit("kicked");
    broadcast(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.code;
    if (!code || !rooms[code]) return;
    if (rooms[code].teams[socket.id]) {
      delete rooms[code].teams[socket.id];
      broadcast(code);
    }
  });
});

setInterval(() => {
  const cut = Date.now() - 3*60*60*1000;
  Object.keys(rooms).forEach(code => {
    if (!rooms[code]._ts) rooms[code]._ts = Date.now();
    if (rooms[code]._ts < cut) delete rooms[code];
  });
}, 60*60*1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 Server running on port", PORT));

