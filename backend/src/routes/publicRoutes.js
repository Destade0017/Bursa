/**
 * Public Routes for BURSA Parent Portal
 * Provides unauthenticated public access for parents to lookup fees and DVA details.
 */

import express from 'express';
import {
  getPublicSchoolDetails,
  lookupStudent
} from '../controllers/parentPortalController.js';

const router = express.Router();

// Fetch basic school details by slug
router.get('/schools/:slug', getPublicSchoolDetails);

// Look up student by admission number or parent phone
router.post('/lookup-student', lookupStudent);

export default router;
