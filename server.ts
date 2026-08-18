import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import db from './db.js';

const app = express();
const server = http.createServer(app);

// 1. Configure CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Respond immediately to OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 2. Fallback CORS helper
app.use(cors());

// 3. Body parsers with increased limits for Base64 image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. Configure Socket.io
const io = new Server(server, {
  cors: { 
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  },
  transports: ['websocket', 'polling']
});

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send('🚨 FRSC Highway Emergency API is active.');
});

// 1. Get All Incidents
app.get('/api/incidents', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM incidents ORDER BY timestamp DESC');
    const incidents = stmt.all();
    res.json(incidents);
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// 2. Submit / Sync Incident (From Mobile App)
app.post('/api/incidents', (req, res) => {
  const { id, highway, severity, description, latitude, longitude, image, timestamp } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO incidents (id, highway, severity, description, latitude, longitude, image, timestamp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `);

    stmt.run(
      id || `INC-${Date.now()}`,
      highway || 'Unknown Highway',
      severity || 'Minor',
      description || '',
      latitude ? Number(latitude) : 0,
      longitude ? Number(longitude) : 0,
      image || null,
      timestamp || new Date().toISOString()
    );

    const newIncident = { 
      id: id || `INC-${Date.now()}`, 
      highway: highway || 'Unknown Highway', 
      severity: severity || 'Minor', 
      description: description || '', 
      latitude: latitude ? Number(latitude) : 0, 
      longitude: longitude ? Number(longitude) : 0, 
      image: image || null, 
      timestamp: timestamp || new Date().toISOString(), 
      status: 'Pending' 
    };

    io.emit('new_incident', newIncident);

    res.status(201).json({ success: true, incident: newIncident });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ error: 'Failed to record incident', details: String(error) });
  }
});

// 3. Update Incident Status
app.patch('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const stmt = db.prepare('UPDATE incidents SET status = ? WHERE id = ?');
    stmt.run(status, id);

    io.emit('status_updated', { id, status });
    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Client connected to Control Center socket:', socket.id);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FRSC Highway API running on port ${PORT}`);
});