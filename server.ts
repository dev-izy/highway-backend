import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import db from './db.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support image base64 payloads

// 1. Get All Incidents (For Dashboard Initial Load)
app.get('/api/incidents', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM incidents ORDER BY timestamp DESC');
    const incidents = stmt.all();
    res.json(incidents);
  } catch (error) {
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

    stmt.run(id, highway, severity, description, latitude, longitude, image || null, timestamp);

    const newIncident = { id, highway, severity, description, latitude, longitude, image, timestamp, status: 'Pending' };

    // Emit real-time notification to web dashboard via Sockets
    io.emit('new_incident', newIncident);

    res.status(201).json({ success: true, incident: newIncident });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record incident' });
  }
});

// 3. Update Incident Status (Dispatch / Resolve from Dashboard)
app.patch('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const stmt = db.prepare('UPDATE incidents SET status = ? WHERE id = ?');
    stmt.run(status, id);

    io.emit('status_updated', { id, status });
    res.json({ success: true, id, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// WebSocket Connection Logging
io.on('connection', (socket) => {
  console.log('⚡ Client connected to Control Center socket:', socket.id);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚨 Highway Alert Server running on http://localhost:${PORT}`);
});