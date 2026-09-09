/**
 * Main Server Entry Point
 * Configures Express application middleware, routes, and starts the HTTP servers.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import healthRoutes from './routes/healthRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import paystackWebhookRoutes from './routes/paystackWebhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import feeScheduleRoutes from './routes/feeScheduleRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import cashDrawerRoutes from './routes/cashDrawerRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5001;

// Enable Cross-Origin Resource Sharing (CORS) with support for local dev and cloud production frontend URLs
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or any domain in development/production
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for production deployments
      }
    },
    credentials: true
  })
);

// Serve uploads statically for school logos, receipt slips, etc.
app.use('/uploads', express.static(uploadsDir));

// Middleware to parse incoming JSON payloads with rawBody buffer capture for HMAC verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// Register API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'BURSA API Server is running live.',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', paymentRoutes);
app.use('/api', paystackWebhookRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/schools', cashDrawerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fee-schedules', feeScheduleRoutes);
app.use('/api/public', publicRoutes);

// Global 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on BURSA API.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Bursar Server running on port ${PORT}`);
});
