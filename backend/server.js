require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const twilioRoutes = require('./routes/twilio.js');
const availabilityRoutes = require('./routes/availability.js');
const casesRoutes = require('./routes/cases.js');
const authRoutes = require('./routes/auth.js');
const usersRoutes = require('./routes/users.js');
const matchingRoutes = require('./routes/matching.js');
const doctorRoutes = require('./routes/doctor.js');
const consultationsRoutes = require('./routes/consultations.js');

const http = require('http');
const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const { initSocket } = require('./socket');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/twilio', twilioRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/consultations', consultationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Health check endpoint with basic checks
app.get('/api/health', async (_req, res) => {
  try {
    return res.json({ ok: true, now: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'health error' });
  }
});

initSocket(server);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
