import express from 'express';
import db from '../db.js';
import { logger } from '../services/logging.js';

const router = express.Router();

// Get All Publications (with username joined from users table)
router.get('/', (req, res) => {
    try {
        const getAllPublications = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `);
        const publications = getAllPublications.all();
        
        logger.info('PUBLICATIONS', `Retrieved ${publications.length} publications`);
        res.json({ publications });

    } catch (err) {
        logger.error('PUBLICATIONS', `Error retrieving all publications: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Get Single Publication by ID (with username joined)
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const getPublication = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `);
        const publication = getPublication.get(id);
        
        if (!publication) {
            logger.warn('PUBLICATIONS', `Publication not found with ID: ${id}`);
            return res.status(404).json({ error: 'Publication not found' });
        }
        
        logger.info('PUBLICATIONS', `Retrieved publication: "${publication.title}" (ID: ${id})`);
        res.json({ publication });

    } catch (err) {
        logger.error('PUBLICATIONS', `Error retrieving publication ${req.params.id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Get Publications by User ID
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        const getPublicationsByUser = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = ? 
            ORDER BY p.created_at DESC
        `);
        const publications = getPublicationsByUser.all(userId);
        
        logger.info('PUBLICATIONS', `Retrieved ${publications.length} publications for user ID: ${userId}`);
        res.json({ publications });

    } catch (err) {
        logger.error('PUBLICATIONS', `Error retrieving publications for user ID ${req.params.userId}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Get Publications by Username (convenience route)
router.get('/username/:username', (req, res) => {
    try {
        const { username } = req.params;
        
        const getPublicationsByUsername = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE u.username = ? 
            ORDER BY p.created_at DESC
        `);
        const publications = getPublicationsByUsername.all(username);
        
        logger.info('PUBLICATIONS', `Retrieved ${publications.length} publications for username: ${username}`);
        res.json({ publications });

    } catch (err) {
        logger.error('PUBLICATIONS', `Error retrieving publications for username ${req.params.username}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Create Publication (now uses user_id instead of username)
router.post('/', (req, res) => {
    const { user_id, title, text } = req.body;

    // Input validation
    if (!user_id || !title || !text) {
        logger.warn('PUBLICATIONS', `Missing required fields - user_id: ${!!user_id}, title: ${!!title}, text: ${!!text}`);
        return res.status(400).json({ error: 'User ID, title, and text are required' });
    }

    try {
        // Verify user exists
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(user_id);
        
        if (!user) {
            logger.warn('PUBLICATIONS', `User not found with ID: ${user_id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        const insertPublication = db.prepare(`
            INSERT INTO publications (user_id, title, text) 
            VALUES (?, ?, ?)
        `);
        const result = insertPublication.run(user_id, title, text);
        
        // Get the created publication with username joined
        const getNewPublication = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `);
        const publication = getNewPublication.get(result.lastInsertRowid);
        
        logger.success('PUBLICATIONS', `Publication created successfully: "${title}" by user ${user_id} (ID: ${result.lastInsertRowid})`);
        res.status(201).json({ publication });
        
    } catch (err) {
        logger.error('PUBLICATIONS', `Error creating publication "${title}" by user ${user_id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Update Publication (PUT - full update, now uses user_id)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { user_id, title, text } = req.body;

    // Input validation
    if (!user_id || !title || !text) {
        logger.warn('PUBLICATIONS', `Missing required fields for PUT - user_id: ${!!user_id}, title: ${!!title}, text: ${!!text}`);
        return res.status(400).json({ error: 'User ID, title, and text are required' });
    }

    try {
        // Check if publication exists
        const getPublication = db.prepare('SELECT * FROM publications WHERE id = ?');
        const existingPublication = getPublication.get(id);
        
        if (!existingPublication) {
            logger.warn('PUBLICATIONS', `Publication not found for update: ID ${id}`);
            return res.status(404).json({ error: 'Publication not found' });
        }

        // Verify user exists
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(user_id);
        
        if (!user) {
            logger.warn('PUBLICATIONS', `User not found for publication update: ID ${user_id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        logger.debug('PUBLICATIONS', `Updating publication "${existingPublication.title}" (ID: ${id}) to "${title}"`);

        // Update publication
        const updatePublication = db.prepare(`
            UPDATE publications 
            SET user_id = ?, title = ?, text = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        updatePublication.run(user_id, title, text, id);

        // Get updated publication with username
        const getUpdatedPublication = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `);
        const publication = getUpdatedPublication.get(id);
        
        logger.success('PUBLICATIONS', `Publication updated successfully: "${title}" by user ${user_id} (ID: ${id})`);
        res.json({ publication });
        
    } catch (err) {
        logger.error('PUBLICATIONS', `Error updating publication ${id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Partial Update Publication (PATCH, now uses user_id when provided)
router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const { user_id, title, text } = req.body;

    // Input validation - at least one field should be provided
    if (!user_id && !title && !text) {
        logger.warn('PUBLICATIONS', `No fields provided for PATCH update on publication ID: ${id}`);
        return res.status(400).json({ error: 'At least one field (user_id, title, or text) is required' });
    }

    try {
        // Check if publication exists
        const getPublication = db.prepare('SELECT * FROM publications WHERE id = ?');
        const existingPublication = getPublication.get(id);
        
        if (!existingPublication) {
            logger.warn('PUBLICATIONS', `Publication not found for PATCH update: ID ${id}`);
            return res.status(404).json({ error: 'Publication not found' });
        }

        // If user_id is being updated, verify the new user exists
        if (user_id) {
            const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
            const user = getUser.get(user_id);
            
            if (!user) {
                logger.warn('PUBLICATIONS', `User not found for publication PATCH update: ID ${user_id}`);
                return res.status(404).json({ error: 'User not found' });
            }
        }

        // Build dynamic update query based on provided fields
        const updateFields = [];
        const values = [];
        
        if (user_id) {
            updateFields.push('user_id = ?');
            values.push(user_id);
            logger.debug('PUBLICATIONS', `PATCH updating user_id for publication ${id}`);
        }
        
        if (title) {
            updateFields.push('title = ?');
            values.push(title);
            logger.debug('PUBLICATIONS', `PATCH updating title for publication ${id}`);
        }
        
        if (text) {
            updateFields.push('text = ?');
            values.push(text);
            logger.debug('PUBLICATIONS', `PATCH updating text for publication ${id}`);
        }
        
        // Always update the updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        values.push(id);
        
        const updateQuery = `UPDATE publications SET ${updateFields.join(', ')} WHERE id = ?`;
        const updatePublication = db.prepare(updateQuery);
        updatePublication.run(...values);

        // Get updated publication with username
        const getUpdatedPublication = db.prepare(`
            SELECT p.*, u.username 
            FROM publications p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `);
        const publication = getUpdatedPublication.get(id);
        
        logger.success('PUBLICATIONS', `Publication partially updated: "${publication.title}" (ID: ${id})`);
        res.json({ publication });
        
    } catch (err) {
        logger.error('PUBLICATIONS', `Error in PATCH update for publication ${id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Delete Publication
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if publication exists
        const getPublication = db.prepare('SELECT * FROM publications WHERE id = ?');
        const publication = getPublication.get(id);
        
        if (!publication) {
            logger.warn('PUBLICATIONS', `Publication not found for deletion: ID ${id}`);
            return res.status(404).json({ error: 'Publication not found' });
        }

        logger.debug('PUBLICATIONS', `Deleting publication: "${publication.title}" (ID: ${id})`);

        // Delete publication
        const deletePublication = db.prepare('DELETE FROM publications WHERE id = ?');
        deletePublication.run(id);
        
        logger.success('PUBLICATIONS', `Publication deleted successfully: "${publication.title}" (ID: ${id})`);
        res.status(200).json({success: true});
        
    } catch (err) {
        logger.error('PUBLICATIONS', `Error deleting publication ${req.params.id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Log when routes are initialized
logger.info('PUBLICATIONS', 'Publication routes initialized');

export default router;