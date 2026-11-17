import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, dbRun, dbGet, dbAll } from './db.js';
import { setupSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SECRET_KEY = process.env.SESSION_SECRET || 'retro-photobooth-secret-for-paulene-2026';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `photo-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to generate secure signed token for photo streaming
function generateSignedPhotoToken(photoId, roomId, expiresInMinutes = 60) {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${photoId}:${roomId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

// Helper to verify signed photo token
function verifySignedPhotoToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return null;
    const [photoId, roomId, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return null;

    const expectedHmac = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${photoId}:${roomId}:${expiresAtStr}`)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { photoId, roomId };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Helper to generate retro room codes (e.g. "PAUL-99", "LOVE-24", "BOOTH-7")
function generateRoomCode() {
  const words = ['RETRO', 'BOOTH', 'SMILE', 'FLASH', 'SWEET', 'MAGIC', 'CHERI', 'HAPPY', 'LOVELY', 'VIBES'];
  const prefix = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

// ---------------- REST API ROUTES ----------------

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { ownerName = 'Host' } = req.body;
    const roomId = `room-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const ownerId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const roomCode = generateRoomCode();
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const createdAt = Date.now();
    const expiresAt = createdAt + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    await dbRun(
      'INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)',
      [ownerId, ownerName, createdAt]
    );

    // Create room with secure invite_token
    await dbRun(
      'INSERT INTO rooms (id, room_code, owner_id, invite_token, room_status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [roomId, roomCode, ownerId, inviteToken, 'active', createdAt, expiresAt]
    );

    res.json({
      success: true,
      room: {
        id: roomId,
        roomCode,
        ownerId,
        inviteToken,
        status: 'active',
        createdAt,
        expiresAt
      }
    });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ success: false, error: 'Failed to create room.' });
  }
});

// Check room info / status / validate invitation
app.get('/api/rooms/:code', async (req, res) => {
  try {
    const roomCode = req.params.code.trim().toUpperCase();
    const token = req.query.token;

    const room = await dbGet(
      `SELECT r.*, u.display_name AS owner_name 
       FROM rooms r 
       LEFT JOIN users u ON r.owner_id = u.id 
       WHERE r.room_code = ?`,
      [roomCode]
    );

    if (!room) {
      return res.status(404).json({ success: false, error: 'Photobooth room not found.' });
    }
    if (room.room_status === 'closed') {
      return res.status(410).json({ success: false, error: 'This photobooth room has been closed.' });
    }
    if (room.expires_at < Date.now()) {
      return res.status(410).json({ success: false, error: 'This photobooth room has expired.' });
    }

    // Verify invitation token if provided
    let tokenValid = true;
    if (token && room.invite_token) {
      tokenValid = (token === room.invite_token);
      if (!tokenValid) {
        return res.status(403).json({ success: false, error: 'Invalid invitation token.' });
      }
    }

    const participants = await dbAll(
      `SELECT user_id, display_name, connection_status, is_ready, joined_at 
       FROM room_participants 
       WHERE room_id = ? AND connection_status != 'disconnected'`,
      [room.id]
    );

    res.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        ownerId: room.owner_id,
        ownerName: room.owner_name || 'Host',
        inviteToken: room.invite_token,
        status: room.room_status,
        expiresAt: room.expires_at,
        participantCount: participants.length,
        isFull: participants.length >= 2
      }
    });
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch room.' });
  }
});

// Join room
app.post('/api/rooms/:code/join', async (req, res) => {
  try {
    const roomCode = req.params.code.trim().toUpperCase();
    const { displayName = 'Guest', userId, token } = req.body;

    const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [roomCode]);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Photobooth room not found.' });
    }
    if (room.room_status === 'closed') {
      return res.status(410).json({ success: false, error: 'This photobooth room has been closed.' });
    }
    if (room.expires_at < Date.now()) {
      return res.status(410).json({ success: false, error: 'This photobooth room has expired.' });
    }

    // Verify invite token if provided or configured
    if (token && room.invite_token && token !== room.invite_token) {
      return res.status(403).json({ success: false, error: 'Invalid invitation link token.' });
    }

    // Check participant limits
    const assignedUserId = userId || `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const activeParticipants = await dbAll(
      `SELECT user_id FROM room_participants WHERE room_id = ? AND connection_status != 'disconnected'`,
      [room.id]
    );

    const isExistingUser = activeParticipants.some(p => p.user_id === assignedUserId);
    if (!isExistingUser && activeParticipants.length >= 2) {
      return res.status(409).json({ 
        success: false, 
        error: 'Photobooth room is already full (maximum 2 participants).' 
      });
    }

    const now = Date.now();

    // Check if user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [assignedUserId]);
    if (!user) {
      await dbRun('INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)', [
        assignedUserId,
        displayName,
        now
      ]);
    } else if (displayName && user.display_name !== displayName) {
      await dbRun('UPDATE users SET display_name = ? WHERE id = ?', [displayName, assignedUserId]);
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        ownerId: room.owner_id,
        inviteToken: room.invite_token
      },
      user: {
        id: assignedUserId,
        displayName,
        isOwner: room.owner_id === assignedUserId
      }
    });
  } catch (err) {
    console.error('Error joining room:', err);
    res.status(500).json({ success: false, error: 'Failed to join room.' });
  }
});

// Upload a captured photograph or composite strip
app.post('/api/rooms/:code/photos', upload.single('photo'), async (req, res) => {
  try {
    const roomCode = req.params.code.trim().toUpperCase();
    const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [roomCode]);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    let filePath = '';
    if (req.file) {
      filePath = req.file.filename;
    } else if (req.body.dataUrl) {
      // Base64 data URL upload support
      const matches = req.body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, error: 'Invalid image data' });
      }
      const ext = matches[1].includes('jpeg') || matches[1].includes('jpg') ? '.jpg' : '.png';
      const filename = `photo-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(matches[2], 'base64'));
      filePath = filename;
    } else {
      return res.status(400).json({ success: false, error: 'No image provided.' });
    }

    const photoId = `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const uploadedBy = req.body.uploadedBy || 'anonymous';
    const photoType = req.body.photoType || 'composite';
    const caption = req.body.caption || '';
    const now = Date.now();

    // Insert Photo record
    await dbRun(
      `INSERT INTO photos (id, room_id, uploaded_by, storage_path, photo_type, caption, is_favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [photoId, room.id, uploadedBy, filePath, photoType, caption, now]
    );

    // Insert Metadata record
    const metadataId = `meta-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const layout = req.body.layout || 'side-by-side';
    const filter = req.body.filter || 'vintage-film';
    const dimensions = req.body.dimensions || '1200x1600';
    const adjustments = req.body.adjustments || '{}';

    await dbRun(
      `INSERT INTO photo_metadata (id, photo_id, layout, filter, dimensions, adjustments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [metadataId, photoId, layout, filter, dimensions, adjustments]
    );

    const signedToken = generateSignedPhotoToken(photoId, room.id, 120);

    // Notify room via socket that a new photo was added to gallery
    io.to(roomCode).emit('new-photo-saved', {
      photoId,
      url: `/api/photos/stream/${signedToken}`,
      photoType,
      caption,
      createdAt: now
    });

    res.json({
      success: true,
      photo: {
        id: photoId,
        url: `/api/photos/stream/${signedToken}`,
        photoType,
        caption,
        layout,
        filter,
        dimensions,
        createdAt: now
      }
    });
  } catch (err) {
    console.error('Error saving photo:', err);
    res.status(500).json({ success: false, error: 'Failed to save photograph.' });
  }
});

// Retrieve room photos (Authorized Room Gallery)
app.get('/api/rooms/:code/photos', async (req, res) => {
  try {
    const roomCode = req.params.code.trim().toUpperCase();
    const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [roomCode]);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const rows = await dbAll(
      `SELECT p.id, p.room_id, p.uploaded_by, p.storage_path, p.photo_type, p.caption, 
              p.is_favorite, p.created_at,
              m.layout, m.filter, m.dimensions, m.adjustments
       FROM photos p
       LEFT JOIN photo_metadata m ON p.id = m.photo_id
       WHERE p.room_id = ?
       ORDER BY p.created_at DESC`,
      [room.id]
    );

    // Attach signed URL with expiration to each photo
    const photos = rows.map((row) => ({
      id: row.id,
      url: `/api/photos/stream/${generateSignedPhotoToken(row.id, room.id, 180)}`,
      photoType: row.photo_type,
      caption: row.caption,
      isFavorite: Boolean(row.is_favorite),
      layout: row.layout,
      filter: row.filter,
      dimensions: row.dimensions,
      adjustments: row.adjustments ? JSON.parse(row.adjustments) : {},
      createdAt: row.created_at
    }));

    res.json({ success: true, photos });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve gallery photos.' });
  }
});

// Stream private photo using signed token (prevents direct public access or URL tampering)
app.get('/api/photos/stream/:token', async (req, res) => {
  try {
    const verified = verifySignedPhotoToken(req.params.token);
    if (!verified) {
      return res.status(403).json({ success: false, error: 'Access denied: Invalid or expired photo link.' });
    }

    const photo = await dbGet('SELECT * FROM photos WHERE id = ? AND room_id = ?', [
      verified.photoId,
      verified.roomId
    ]);
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found.' });
    }

    const filePath = path.join(UPLOADS_DIR, photo.storage_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File missing from storage.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Error streaming photo:', err);
    res.status(500).json({ success: false, error: 'Failed to stream photo.' });
  }
});

// Update caption or favorite toggle
app.patch('/api/rooms/:code/photos/:id', async (req, res) => {
  try {
    const { id, code } = req.params;
    const { caption, isFavorite } = req.body;

    const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [code.trim().toUpperCase()]);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    if (caption !== undefined) {
      await dbRun('UPDATE photos SET caption = ? WHERE id = ? AND room_id = ?', [caption, id, room.id]);
    }
    if (isFavorite !== undefined) {
      await dbRun('UPDATE photos SET is_favorite = ? WHERE id = ? AND room_id = ?', [
        isFavorite ? 1 : 0,
        id,
        room.id
      ]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating photo:', err);
    res.status(500).json({ success: false, error: 'Failed to update photo' });
  }
});

// Delete photo
app.delete('/api/rooms/:code/photos/:id', async (req, res) => {
  try {
    const { id, code } = req.params;
    const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [code.trim().toUpperCase()]);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    const photo = await dbGet('SELECT * FROM photos WHERE id = ? AND room_id = ?', [id, room.id]);
    if (photo) {
      const filePath = path.join(UPLOADS_DIR, photo.storage_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      await dbRun('DELETE FROM photos WHERE id = ?', [id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ success: false, error: 'Failed to delete photo' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Our Little Photobooth API',
    time: new Date().toISOString()
  });
});

// Serve frontend build if available
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Automatic expiration cleanup cron (every hour)
setInterval(async () => {
  try {
    const now = Date.now();
    const expiredRooms = await dbAll('SELECT id FROM rooms WHERE expires_at < ?', [now]);
    for (const r of expiredRooms) {
      const photos = await dbAll('SELECT storage_path FROM photos WHERE room_id = ?', [r.id]);
      for (const p of photos) {
        const fp = path.join(UPLOADS_DIR, p.storage_path);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch (e) {}
        }
      }
      await dbRun('DELETE FROM rooms WHERE id = ?', [r.id]);
    }
  } catch (err) {
    console.error('Error during room cleanup:', err);
  }
}, 60 * 60 * 1000);

// Initialize DB and Socket
initDb().then(() => {
  setupSocket(io);
  server.listen(PORT, () => {
    console.log(`📸 Our Little Photobooth backend server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
