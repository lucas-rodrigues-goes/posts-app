import express from 'express';
import { logger } from '../services/logging.js';

const router = express.Router();
const DATABASE_SERVER_URL = process.env.DATABASE_URL || 'http://localhost:5000';

// Helper function to forward requests
async function forwardRequest(req, res, path) {
    try {
        const url = `${DATABASE_SERVER_URL}${path}`;
        
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // Only add body for POST, PUT, PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            // Prepare request body with user_id
            let requestBody = req.body || {};
            requestBody = { ...requestBody, user_id: req.userId };
            options.body = JSON.stringify(requestBody);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        res.status(response.status).json(data);

    } catch (err) {
        logger.error('PUBLICATIONS', `Error forwarding to database server: ${err.message}`);
        res.status(503).json({ error: 'Database server unavailable' });
    }
}

// Get all publications
router.get('/', async (req, res) => {
    logger.info('PUBLICATIONS', `User ${req.userId} fetching all publications`);
    await forwardRequest(req, res, '/publication');
});

// Get single publication by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    logger.info('PUBLICATIONS', `User ${req.userId} fetching publication ${id}`);
    await forwardRequest(req, res, `/publication/${id}`);
});

// Get publications by username
router.get('/username/:username', async (req, res) => {
    const { username } = req.params;
    logger.info('PUBLICATIONS', `User ${req.userId} fetching publications for ${username}`);
    await forwardRequest(req, res, `/publication/username/${username}`);
});

// Create new publication
router.post('/', async (req, res) => {
    logger.info('PUBLICATIONS', `User ${req.userId} creating publication`);
    await forwardRequest(req, res, '/publication');
});

// Update publication (full update)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    logger.info('PUBLICATIONS', `User ${req.userId} updating publication ${id}`);
    await forwardRequest(req, res, `/publication/${id}`);
});

// Partial update publication
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    logger.info('PUBLICATIONS', `User ${req.userId} partially updating publication ${id}`);
    await forwardRequest(req, res, `/publication/${id}`);
});

// Delete publication
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    logger.info('PUBLICATIONS', `User ${req.userId} deleting publication ${id}`);
    await forwardRequest(req, res, `/publication/${id}`);
});

export default router;