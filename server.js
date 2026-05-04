require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// nanoid replacement
function nanoid(size = 8) {
  return crypto.randomBytes(size).toString('hex').slice(0, size);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));


// ✅ 1. SCHEMA ЭХЭЛЖ
const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  title: { type: String, required: true },
  hostName: { type: String, required: true },
  hostNteId: { type: String, required: true },
  serverRegion: { type: String, default: 'Asia' },
  activity: { type: String, default: 'Explore' },
  maxPlayers: { type: Number, default: 4 },
  currentPlayers: { type: Number, default: 1 },
  note: { type: String, default: '' },
  isLocked: { type: Boolean, default: false },
  password: { type: String, default: '' },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000),
    index: { expires: 0 }
  }
}, { timestamps: true });


// ✅ 2. ДАРАА НЬ MODEL
const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);


// ✅ 3. DB CACHE (1 удаа л!)
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
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


// ✅ 4. DB middleware (1 удаа)
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('DB ERROR:', error);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});


// 🔧 Helper
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


// API ROUTES

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(rooms.map(r => cleanRoom(r)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Can not load rooms.' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { title, hostName, hostNteId, serverRegion, activity, maxPlayers, note, password } = req.body;

    if (!title || !hostName || !hostNteId) {
      return res.status(400).json({ message: 'Required fields missing' });
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
    console.error(error);
    res.status(500).json({ message: 'Create room failed' });
  }
});

app.post('/api/rooms/:code/join', async (req, res) => {
  try {
    const { password } = req.body;

    const room = await Room.findOne({
      code: req.params.code.toUpperCase(),
      expiresAt: { $gt: new Date() }
    });

    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.currentPlayers >= room.maxPlayers) return res.status(400).json({ message: 'Room full' });
    if (room.isLocked && room.password !== password) return res.status(401).json({ message: 'Wrong password' });

    room.currentPlayers += 1;
    await room.save();

    res.json(cleanRoom(room, true));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Join failed' });
  }
});

app.delete('/api/rooms/:code', async (req, res) => {
  try {
    await Room.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Delete failed' });
  }
});


// FRONTEND fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// LOCAL ONLY
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Running on ${PORT}`));
  });
}

module.exports = app;