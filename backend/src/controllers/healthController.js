/**
 * Health Check Controller
 * Handles the logic for server health check requests.
 */

export const getHealthStatus = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Bursar API is running'
  });
};
