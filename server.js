require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  hostName: { type: String, required: true, trim: true, maxlength: 32 },
  hostNteId: { type: String, required: true, trim: true, maxlength: 40 },
  serverRegion: { type: String, default: 'Asia' },
  activity: { type: String, default: 'Explore' },
  maxPlayers: { type: Number, default: 4, min: 2, max: 8 },
  currentPlayers: { type: Number, default: 1, min: 1 },
  note: { type: String, default: '', trim: true, maxlength: 160 },
  isLocked: { type: Boolean, default: false },
  password: { type: String, default: '' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000), index: { expires: 0 } }
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

function cleanRoom(room, revealId = false) {
  return {
    code: room.code,
    title: room.title,
    hostName: room.hostName,
    hostNteId: revealId ? room.hostNteId : null,
    serverRegion: room.serverRegion,
    activity: room.activity,
    maxPlayers: room.maxPlayers,
    currentPlayers: room.currentPlayers,
    note: room.note,
    isLocked: room.isLocked,
    expiresAt: room.expiresAt,
    createdAt: room.createdAt
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'NTE Room Finder' });
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(rooms.map(room => cleanRoom(room, false)));
  } catch (error) {
    res.status(500).json({ message: 'Өрөөнүүдийг ачаалж чадсангүй.' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { title, hostName, hostNteId, serverRegion, activity, maxPlayers, note, password } = req.body;

    if (!title || !hostName || !hostNteId) {
      return res.status(400).json({ message: 'Room name, host name, NTE ID шаардлагатай.' });
    }

    const room = await Room.create({
      code: nanoid(7).toUpperCase(),
      title,
      hostName,
      hostNteId,
      serverRegion,
      activity,
      maxPlayers: Number(maxPlayers) || 4,
      note,
      isLocked: Boolean(password),
      password: password || ''
    });

    res.status(201).json(cleanRoom(room, true));
  } catch (error) {
    res.status(500).json({ message: 'Өрөө үүсгэж чадсангүй.' });
  }
});

app.post('/api/rooms/:code/join', async (req, res) => {
  try {
    const { password } = req.body;
    const room = await Room.findOne({ code: req.params.code.toUpperCase(), expiresAt: { $gt: new Date() } });

    if (!room) return res.status(404).json({ message: 'Өрөө олдсонгүй эсвэл хугацаа дууссан байна.' });
    if (room.currentPlayers >= room.maxPlayers) return res.status(400).json({ message: 'Өрөө дүүрсэн байна.' });
    if (room.isLocked && room.password !== password) return res.status(401).json({ message: 'Нууц үг буруу байна.' });

    room.currentPlayers += 1;
    await room.save();

    res.json(cleanRoom(room, true));
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while entering the room.' });
  }
});

app.delete('/api/rooms/:code', async (req, res) => {
  try {
    const deleted = await Room.findOneAndDelete({ code: req.params.code.toUpperCase() });
    if (!deleted) return res.status(404).json({ message: 'Өрөө олдсонгүй.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Өрөө устгаж чадсангүй.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`NTE Room Finder running on port ${PORT}`));
  });
}

module.exports = app;
