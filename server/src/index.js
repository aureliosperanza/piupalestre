const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const clientRoutes = require('./routes/clientRoutes');
const classRoutes = require('./routes/classRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const authRoutes = require('./routes/authRoutes');
const { authenticateGym } = require('./middlewares/auth');
const adminRoutes = require('./routes/adminRoutes');
const planRoutes = require('./routes/planRoutes');
const clientMembershipRoutes = require('./routes/clientMembershipRoutes');
const publicRoutes = require('./routes/publicRoutes');
const memberRoutes = require('./routes/memberRoutes');
const { memberAuth } = require('./middlewares/memberAuth');
const certificateRoutes = require('./routes/certificateRoutes');
const salesRoutes = require('./routes/salesRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors());
app.use(express.json());

// Unprotected Auth Routes
app.use('/api/auth', authRoutes);

// Public client self-registration (no auth, scoped by gym slug)
app.use('/api/public', publicRoutes);

// Member self-service area (authenticated via OTP-issued member token)
app.use('/api/member', memberAuth, memberRoutes);

// Protected API Routes (Isolated per Gym Tenant)
app.use('/api/clients', authenticateGym, clientRoutes);
app.use('/api/classes', authenticateGym, classRoutes);
app.use('/api/checkins', authenticateGym, checkinRoutes);
app.use('/api/plans', authenticateGym, planRoutes);
app.use('/api/client-memberships', authenticateGym, clientMembershipRoutes);
app.use('/api/certificates', authenticateGym, certificateRoutes);
app.use('/api/sales', authenticateGym, salesRoutes);
app.use('/api/staff', authenticateGym, staffRoutes);

// Public and Admin SaaS routes
app.use('/api', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Multer-specific upload errors (size limit, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Il file supera la dimensione massima di 5 MB' });
    }
    return res.status(400).json({ error: `Errore upload file: ${err.message}` });
  }
  // File-filter rejections surface here as a generic Error
  if (err && err.message && err.message.includes('Formato file')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
