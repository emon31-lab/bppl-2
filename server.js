require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '62516521';
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD + '_bppl_v1').digest('hex');

/* ═════════ MONGODB ATLAS CONNECTION ═════════ */
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing! Add it to .env (local) or Render Environment Variables.');
  process.exit(1);
}

let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  try {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10
    });
    await client.connect();
    cachedClient = client;
    cachedDb = client.db('bppl_db');
    console.log('✅ Connected to MongoDB Atlas');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

/* ═════════ STATIC FILES ═════════ */
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.json());
app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  setHeaders: (res, p) => {
    if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

/* ═════════ TEAM DATA ═════════ */
const TEAMS = [
  { id: 'beast', name: 'FC BEAST', color: '#ef4444', logo: 'teams/FC BEAST.jpeg', formation: '1-1-1-1', players: [
    { name: 'SADOR', role: 'ST', captain: true, photo: 'players/SADOR.jpeg' },
    { name: 'AMIN', role: 'CB', captain: false, photo: 'players/AMIN.jpeg' },
    { name: 'HAMIM', role: 'GK', captain: false, photo: 'players/HAMIM.jpeg' },
    { name: 'SADMAN', role: 'AMF', captain: false, photo: 'players/SADMAN.jpeg' }
  ]},
  { id: 'thunder', name: 'FC THUNDER', color: '#eab308', logo: 'teams/FC THUNDER.jpeg', formation: '1-1-1-1', players: [
    { name: 'SAYEM', role: 'ST', captain: true, photo: 'players/SAYEM.jpeg' },
    { name: 'NOYON', role: 'GK', captain: false, photo: 'players/NOYON.jpeg' },
    { name: 'SIAM M.T.', role: 'AMF', captain: false, photo: 'players/SIAM_MT.jpeg' },
    { name: 'RAFAN', role: 'CB', captain: false, photo: 'players/RAFAN.jpeg' }
  ]},
  { id: 'warrior', name: 'FC WARRIOR', color: '#f97316', logo: 'teams/FC WARRIOR.jpeg', formation: '1-1-1-1', players: [
    { name: 'MARUF', role: 'ST', captain: true, photo: 'players/MARUF.jpeg' },
    { name: 'NUJRUL', role: 'AMF', captain: false, photo: 'players/NUJRUL.jpeg' },
    { name: 'ROBIUL', role: 'GK', captain: false, photo: 'players/ROBIUL.jpeg' },
    { name: 'IFTI K.T', role: 'CB', captain: false, photo: 'players/IFTI_KT.jpeg' }
  ]},
  { id: 'stricker', name: 'FC STRICKER', color: '#10b981', logo: 'teams/FC STRICKER.jpeg', formation: '1-1-1-1', players: [
    { name: 'SIAM', role: 'CB', captain: true, photo: 'players/SIAM.jpeg' },
    { name: 'SUMON', role: 'GK', captain: false, photo: 'players/SUMON.jpeg' },
    { name: 'LABIB', role: 'AMF', captain: false, photo: 'players/LABIB.jpeg' },
    { name: 'ESHAN', role: 'ST', captain: false, photo: 'players/ESHAN.jpeg' }
  ]},
  { id: 'eagle', name: 'FC EAGLE', color: '#06b6d4', logo: 'teams/FC EAGLE.jpeg', formation: '1-1-1-1', players: [
    { name: 'EMON', role: 'ST', captain: true, photo: 'players/EMON.jpeg' },
    { name: 'SIJAN', role: 'AMF', captain: false, photo: 'players/SIJAN.jpeg' },
    { name: 'MIRAZ', role: 'GK', captain: false, photo: 'players/MIRAZ.jpeg' },
    { name: 'SAMIR', role: 'CB', captain: false, photo: 'players/SAMIR.jpeg' }
  ]},
  { id: 'united', name: 'FC UNITED', color: '#3b82f6', logo: 'teams/FC UNITED.jpeg', formation: '1-1-1-1', players: [
    { name: 'MEHERAJ', role: 'ST', captain: true, photo: 'players/MEHERAJ.jpeg' },
    { name: 'FAHAD', role: 'AMF', captain: false, photo: 'players/FAHAD.jpeg' },
    { name: 'ONI', role: 'CB', captain: false, photo: 'players/ONI.jpeg' },
    { name: 'SADMAN B.N', role: 'GK', captain: false, photo: 'players/SADMAN_BN.jpeg' }
  ]},
  { id: 'king', name: 'FC KING', color: '#f59e0b', logo: 'teams/FC KING.jpeg', formation: '1-1-1-1', players: [
    { name: 'M.SHAWON 09', role: 'CB', captain: true, photo: 'players/M_SHAWON.jpeg' },
    { name: 'RASEL', role: 'ST', captain: false, photo: 'players/RASEL.jpeg' },
    { name: 'ARAFAT', role: 'AMF', captain: false, photo: 'players/ARAFAT.jpeg' },
    { name: 'MONIR', role: 'GK', captain: false, photo: 'players/MONIR.jpeg' }
  ]},
  { id: 'falcon', name: 'FC FALCON', color: '#8b5cf6', logo: 'teams/FC FALCON.jpeg', formation: '1-1-1-1', players: [
    { name: 'RIAZ', role: 'ST', captain: true, photo: 'players/RIAZ.jpeg' },
    { name: 'B.IFTI', role: 'AMF', captain: false, photo: 'players/B_IFTI.jpeg' },
    { name: 'SHIHAB', role: 'GK', captain: false, photo: 'players/SHIHAB.jpeg' },
    { name: 'AYMON', role: 'CB', captain: false, photo: 'players/AYMON.jpeg' }
  ]},
  { id: 'lion', name: 'FC LION', color: '#ec4899', logo: 'teams/FC LION.jpeg', formation: '1-1-1-1', players: [
    { name: 'JAMIL', role: 'GK', captain: true, photo: 'players/JAMIL.jpeg' },
    { name: 'EMON', role: 'ST', captain: false, photo: 'players/EMON_NJ.jpeg' },
    { name: 'ABID', role: 'AMF', captain: false, photo: 'players/ABID.jpeg' },
    { name: 'ANAM', role: 'CB', captain: false, photo: 'players/ANAM.jpeg' }
  ]},
  { id: 'royal', name: 'FC ROYAL', color: '#6366f1', logo: 'teams/FC ROYAL.jpeg', formation: '1-1-1-1', players: [
    { name: 'SAKIB', role: 'ST', captain: true, photo: 'players/SAKIB.jpeg' },
    { name: 'IBRAHIM', role: 'CB', captain: false, photo: 'players/IBRAHIM.jpeg' },
    { name: 'ISTIAK', role: 'AMF', captain: false, photo: 'players/ISTIAK.jpeg' },
    { name: 'SOURAV', role: 'GK', captain: false, photo: 'players/SOURAV.jpeg' }
  ]}
];

/* ═════════ STATE HELPERS (MongoDB) ═════════ */
const STATE_ID = 'main_state';

function emptyState() {
  return { _id: STATE_ID, groupA: [], groupB: [], matches: [], approved: false, updatedAt: 0 };
}

async function getState() {
  const db = await connectDB();
  const col = db.collection('tournament');
  let state = await col.findOne({ _id: STATE_ID });
  if (!state) {
    state = emptyState();
    await col.insertOne(state);
  }
  return state;
}

async function saveState(newState) {
  const db = await connectDB();
  const col = db.collection('tournament');
  newState.updatedAt = Date.now();
  const { _id, ...rest } = newState;
  await col.updateOne({ _id: STATE_ID }, { $set: rest }, { upsert: true });
  return { _id: STATE_ID, ...rest };
}

/* ═════════ AUTH MIDDLEWARE ═════════ */
function auth(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/* ═════════ API ROUTES ═════════ */
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true, token: ADMIN_TOKEN });
  res.status(401).json({ error: 'Wrong password' });
});

app.get('/api/teams', (req, res) => res.json(TEAMS));

app.get('/api/state', async (req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (e) {
    console.error('GET /api/state:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/assign', auth, async (req, res) => {
  try {
    let state = await getState();
    if (state.approved) return res.status(400).json({ error: 'Groups already approved' });
    const { teamId, group } = req.body || {};
    if (!TEAMS.find(t => t.id === teamId)) return res.status(400).json({ error: 'Invalid team' });
    if (group !== 'A' && group !== 'B') return res.status(400).json({ error: 'Invalid group' });
    if (state.groupA.includes(teamId) || state.groupB.includes(teamId)) return res.status(400).json({ error: 'Already assigned' });
    const list = group === 'A' ? state.groupA : state.groupB;
    if (list.length >= 5) return res.status(400).json({ error: `Group ${group} is full` });
    list.push(teamId);
    state = await saveState(state);
    res.json(state);
  } catch (e) {
    console.error('POST /api/assign:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/unassign', auth, async (req, res) => {
  try {
    let state = await getState();
    if (state.approved) return res.status(400).json({ error: 'Groups already approved' });
    const { teamId } = req.body || {};
    state.groupA = state.groupA.filter(id => id !== teamId);
    state.groupB = state.groupB.filter(id => id !== teamId);
    state = await saveState(state);
    res.json(state);
  } catch (e) {
    console.error('POST /api/unassign:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/approve', auth, async (req, res) => {
  try {
    let state = await getState();
    if (state.approved) return res.status(400).json({ error: 'Already approved' });
    if (state.groupA.length !== 5 || state.groupB.length !== 5) {
      return res.status(400).json({ error: 'Need exactly 5 teams in each group' });
    }
    state.matches = generateSchedule(state.groupA, state.groupB);
    state.approved = true;
    state = await saveState(state);
    res.json(state);
  } catch (e) {
    console.error('POST /api/approve:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/matches/:id', auth, async (req, res) => {
  try {
    let state = await getState();
    const m = state.matches.find(x => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Match not found' });

    const { status, homeScore, awayScore, date, time, winnerId, scorers } = req.body || {};

    if (status && ['UPCOMING', 'LIVE', 'FT'].includes(status)) m.status = status;
    if (typeof homeScore === 'number') m.homeScore = Math.max(0, Math.floor(homeScore));
    if (typeof awayScore === 'number') m.awayScore = Math.max(0, Math.floor(awayScore));
    if (date !== undefined) m.date = date;
    if (time !== undefined) m.time = time;
    if (winnerId !== undefined) m.winnerId = winnerId;
    if (scorers !== undefined) {
      m.scorers = Array.isArray(scorers)
        ? scorers.filter(s => s && typeof s.name === 'string' && s.name.trim())
        : [];
    }

    state = await saveState(state);
    res.json(state);
  } catch (e) {
    console.error('PUT /api/matches:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reset', auth, async (req, res) => {
  try {
    const fresh = { groupA: [], groupB: [], matches: [], approved: false, updatedAt: 0 };
    const state = await saveState(fresh);
    res.json(state);
  } catch (e) {
    console.error('POST /api/reset:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ═════════ SCHEDULE GENERATOR ═════════ */
function roundRobin(ids) {
  const arr = [...ids, null];
  const rounds = [];
  for (let r = 0; r < 5; r++) {
    const pairs = [];
    for (let i = 0; i < 3; i++) {
      const h = arr[i], a = arr[5 - i];
      if (h && a) pairs.push([h, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

function formatTime(slotIdx) {
  const totalMinutes = 18 * 60 + slotIdx * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSchedule(groupA, groupB) {
  const roundsA = roundRobin(groupA);
  const roundsB = roundRobin(groupB);
  const matches = [];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let n = 1, slot = 0;

  // Group A: 18:00 → 20:15
  for (let r = 0; r < 5; r++) {
    roundsA[r].forEach((pair) => {
      matches.push({
        id: 'M' + String(n).padStart(2, '0'), matchNo: n++,
        stage: 'GROUP', group: 'A', round: r + 1,
        homeId: pair[0], awayId: pair[1],
        date: today, time: formatTime(slot++),
        status: 'UPCOMING', homeScore: 0, awayScore: 0,
        scorers: [], winnerId: ''
      });
    });
  }

  // Group B: 20:30 → 22:45
  for (let r = 0; r < 5; r++) {
    roundsB[r].forEach((pair) => {
      matches.push({
        id: 'M' + String(n).padStart(2, '0'), matchNo: n++,
        stage: 'GROUP', group: 'B', round: r + 1,
        homeId: pair[0], awayId: pair[1],
        date: today, time: formatTime(slot++),
        status: 'UPCOMING', homeScore: 0, awayScore: 0,
        scorers: [], winnerId: ''
      });
    });
  }

  // Knockout Stage (Tomorrow)
  const koMatches = [
    { id: 'QF1', label: 'Quarter-Final 1 (A1 vs B4)', time: '18:00' },
    { id: 'QF2', label: 'Quarter-Final 2 (A2 vs B3)', time: '18:30' },
    { id: 'QF3', label: 'Quarter-Final 3 (B1 vs A4)', time: '19:00' },
    { id: 'QF4', label: 'Quarter-Final 4 (B2 vs A3)', time: '19:30' },
    { id: 'SF1', label: 'Semi-Final 1 (W-QF1 vs W-QF2)', time: '20:30' },
    { id: 'SF2', label: 'Semi-Final 2 (W-QF3 vs W-QF4)', time: '21:15' },
    { id: 'FINAL', label: 'Grand Final', time: '22:30' }
  ];

  koMatches.forEach(k => {
    matches.push({
      id: k.id, matchNo: n++,
      stage: 'KO', group: 'KO', label: k.label,
      homeId: null, awayId: null,
      date: tomorrow, time: k.time,
      status: 'UPCOMING', homeScore: 0, awayScore: 0,
      scorers: [], winnerId: ''
    });
  });

  return matches;
}

/* ═════════ ERROR HANDLER ═════════ */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

/* ═════════ START SERVER ═════════ */
(async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`⚽ BPPL running → http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') console.error(`❌ Port ${PORT} already in use.`);
      else console.error('❌ Server error:', err);
    });
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      if (cachedClient) await cachedClient.close();
      server.close(() => process.exit(0));
    });
  } catch (e) {
    console.error('❌ Boot failed:', e.message);
    process.exit(1);
  }
})();