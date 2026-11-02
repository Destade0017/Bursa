/**
 * Main Server Entry Point
 * Configures environment and starts the HTTP server on configured PORT.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5001;

// Start Server
app.listen(PORT, () => {
  console.log(`Bursar Server running on port ${PORT}`);
});
