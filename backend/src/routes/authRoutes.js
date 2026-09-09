/**
 * Authentication Routes for BURSA
 * POST /api/auth/login
 * GET  /api/auth/me
 */

import express from 'express';
import { login, getMe, registerSchool, changePassword } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Self-Service School Onboarding
router.post('/register-school', registerSchool);

// Staff Login
router.post('/login', login);

// Get Current User Profile (Protected)
router.get('/me', verifyToken, getMe);

// Change Password (Protected)
router.post('/change-password', verifyToken, changePassword);

export default router;

