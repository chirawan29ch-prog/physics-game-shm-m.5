const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/em", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_em.html"));
});
app.get("/index_em.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_em.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const TOTAL = 30;
const Q_STEPS = new Set([3,6,9,12,15,17,20,22,24,26,28]);
const TRAPS   = new Set([5,11,16,23,27]);
const BOOSTS  = new Set([7,13,19,25]);

const QUESTIONS = [
  { step:3,  ans:1 },
  { step:6,  ans:2 },
  { step:9,  ans:1 },
  { step:12, ans:1 },
  { step:15, ans:1 },
  { step:17, ans:2 },
  { step:20, ans:1 },
  { step:22, ans:0 },
  { step:24, ans:1 },
  { step:26, ans:1 },
  { step:28, ans:1 },
];

const PALETTE = [
  {color:"#EC4899",emoji:"🌸"},{color:"#06B6D4",emoji:"🌊"},
  {color:"#10B981",emoji:"🍀"},{color:"#F59E0B",emoji:"⚡"},
  {color:"#A78BFA",emoji:"🔮"},{color:"#EF4444",emoji:"🔥"},
  {color:"#F97316",emoji:"🦊"},{color:"#84CC16",emoji:"🌿"},
  {color:"#14B8A6",emoji:"🐢"},{color:"#8B5CF6",emoji:"🦄"},
  {color:"#F43F5E",emoji:"🌹"},{color:"#0EA5E9",emoji:"🐬"},
  {color:"#22C55E",emoji:"🐸"},{color:"#EAB308",emoji:"🌟"},
  {color:"#6366F1",emoji:"🔷"},{color:"#D946EF",emoji:"🦋"},
  {color:"#FB923C",emoji:"🍊"},{color:"#4ADE80",emoji:"🌱"},
  {color:"#38BDF8",emoji:"❄️"},{color:"#C084FC",emoji:"🍇"},
  {color:"#FB7185",emoji:"🌺"},{color:"#34D399",emoji:"🐉"},
  {color:"#FBBF24",emoji:"🌻"},{color:"#60A5FA",emoji:"🐳"},
  {color:"#F472B6",emoji:"🦩"},{color:"#A3E635",emoji:"🥝"},
  {color:"#2DD4BF",emoji:"🐠"},{color:"#E879F9",emoji:"🦚"},
  {color:"#FCA5A5",emoji:"🍓"},{color:"#6EE7B7",emoji:"🌴"},
  {color:"#93C5FD",emoji:"🐧"},{color:"#DDD6FE",emoji:"🌙"},
  {color:"#FDE68A",emoji:"🌈"},{color:"#FBCFE8",emoji:"🦢"},
  {color:"#BAE6FD",emoji:"🐋"},
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
    socket.emit("room_created", { code });
    broadcast(code);
  });

  socket.on("join_room", ({ code, teamName }) => {
    const room = rooms[code];
    if (!room) return socket.emit("err", "ไม่พบห้อง");
    if (room.status !== "waiting") return socket.emit("err", "เกมเริ่มไปแล้ว");
    const count = Object.keys(room.teams).length;
    if (count >= 35) return socket.emit("err", "ทีมเต็มแล้ว");
    const style = PALETTE[count % PALETTE.length];
    const tid = socket.id;
    room.teams[tid] = {
      id: tid,
      name: teamName.trim().slice(0, 20),
      color: style.color,
      emoji: style.emoji,
      pos: 1,
      log: [`${style.emoji} ${teamName.trim()} เข้าร่วมแล้ว!`],
      pendingQ: null,
      finished: false,
      finishedAt: null,
    };
    socket.join(code);
    socket.data.code = code;
    socket.emit("joined", { code, teamId: tid });
    broadcast(code);
  });

  socket.on("watch_room", ({ code }) => {
    const room = rooms[code];
    if (!room) return socket.emit("err", "ไม่พบห้อง");
    socket.join(code);
    socket.data.code = code;
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
      t.pos = 1;
      t.log = [`${t.emoji} รีเซ็ต!`];
      t.pendingQ = null;
      t.finished = false;
      t.finishedAt = null;
    });
    room.status = "playing";
    broadcast(code);
  });

  // ── ROLL: server ทอยเท่านั้น ──────────────────────────────────────────────
  socket.on("roll_dice", ({ code }) => {
    const room = rooms[code];
    if (!room || room.status !== "playing") return;
    const t = room.teams[socket.id];
    if (!t || t.pendingQ || t.finished) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const oldPos = t.pos;
    const landPos = Math.min(oldPos + roll, TOTAL); // ช่องที่ลงก่อน trap/boost

    t.log.unshift(`🎲 ทอยได้ ${roll} → จากช่องที่ ${oldPos} ไปช่องที่ ${landPos}`);

    // ตรวจช่องคำถาม — finalPos = landPos (ยังไม่ขยับ)
    const q = QUESTIONS.find(q => q.step === landPos);
    if (q) {
      t.pos = landPos;
      t.pendingQ = landPos;
      t.log.unshift(`❓ เจอคำถามช่องที่ ${landPos}! ตอบก่อนทอยต่อ`);
      // ส่ง dice_result พร้อม finalPos = landPos
      socket.emit("dice_result", { roll, oldPos, newPos: landPos, finalPos: landPos });
      broadcast(code);
      return;
    }

    // ช่องปกติ — คำนวณ finalPos หลัง trap/boost
    t.pos = landPos;
    let finalPos = landPos;

    if (TRAPS.has(landPos)) {
      finalPos = Math.max(1, landPos - 2);
      t.pos = finalPos;
      t.log.unshift(`🦈 กับดัก! ถอยหลัง 2 → ช่องที่ ${finalPos}`);
    } else if (BOOSTS.has(landPos)) {
      finalPos = Math.min(TOTAL, landPos + 2);
      t.pos = finalPos;
      t.log.unshift(`⚓ บูสต์! เดินหน้า 2 → ช่องที่ ${finalPos}`);
    }

    if (t.pos >= TOTAL) {
      t.pos = TOTAL;
      finalPos = TOTAL;
      t.finished = true;
      t.finishedAt = Date.now();
      t.log.unshift("🏆 ถึงเป้าหมายแล้ว!");
    }

    // ส่ง dice_result พร้อม finalPos จริง
    socket.emit("dice_result", { roll, oldPos, newPos: landPos, finalPos });
    broadcast(code);
  });

  // ── ANSWER ────────────────────────────────────────────────────────────────
  socket.on("answer_question", ({ code, answerIdx }) => {
    const room = rooms[code];
    if (!room) return;
    const t = room.teams[socket.id];
    if (!t || !t.pendingQ) return;

    const q = QUESTIONS.find(q => q.step === t.pendingQ);
    if (!q) { t.pendingQ = null; broadcast(code); return; }

    t.pendingQ = null; // ล้างคำถามค้างทุกกรณี

    if (answerIdx === q.ans) {
      // ✅ ตอบถูก → ยังอยู่ช่องเดิม รอทอยต่อ
      t.log.unshift("✅ ตอบถูก! ทอยลูกเต๋าต่อได้เลย 🌸");
      if (t.pos >= TOTAL) {
        t.finished = true;
        t.finishedAt = Date.now();
        t.log.unshift("🏆 ถึงเป้าหมายแล้ว!");
      }
    } else {
      // ❌ ตอบผิด → ถอยหลัง 3 ช่อง
      const back = Math.max(1, t.pos - 3);
      t.pos = back;
      t.log.unshift(`❌ ตอบผิด! ถอยหลัง 3 ช่อง → ช่องที่ ${back}`);
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

// cleanup rooms > 3h
setInterval(() => {
  const cut = Date.now() - 3 * 60 * 60 * 1000;
  Object.keys(rooms).forEach(code => {
    if (!rooms[code]._ts) rooms[code]._ts = Date.now();
    if (rooms[code]._ts < cut) delete rooms[code];
  });
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 Server running on port", PORT));

