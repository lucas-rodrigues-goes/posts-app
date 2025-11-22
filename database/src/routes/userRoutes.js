import express from 'express';
import db from '../db.js';
import { logger } from '../services/logging.js';

const router = express.Router();

// Get All Users
router.get('/', (req, res) => {
    try {
        
        const getAllUsers = db.prepare('SELECT * FROM users');
        const users = getAllUsers.all();
        
        logger.info('USERS', `Retrieved ${users.length} users`);
        res.json({ users });

    } catch (err) {
        logger.error('USERS', `Error retrieving all users: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Get Single User by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(id);
        
        if (!user) {
            logger.warn('USERS', `User not found with ID: ${id}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        logger.info('USERS', `Retrieved user: ${user.username} (ID: ${id})`);
        res.json({ user });

    } catch (err) {
        logger.error('USERS', `Error retrieving user ${req.params.id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Get User by Username
router.get('/username/:username', (req, res) => {
    try {
        const { username } = req.params;
        
        const getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = getUserByUsername.get(username);
        
        if (!user) {
            logger.warn('USERS', `User not found with username: ${username}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        logger.info('USERS', `Retrieved user by username: ${username} (ID: ${user.id})`);
        res.json({ user });

    } catch (err) {
        logger.error('USERS', `Error retrieving user by username ${req.params.username}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Create User
router.post('/', (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        logger.warn('USERS', `Missing required fields - username: ${!!username}, password: ${!!password}`);
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const insertUser = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
        const result = insertUser.run(username, password);
        
        // Get the created user with all fields
        const getNewUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getNewUser.get(result.lastInsertRowid);
        
        logger.success('USERS', `User created successfully: ${username} (ID: ${result.lastInsertRowid})`);
        res.status(201).json({ user });
        
    } catch (err) {
        // Handle unique constraint violation
        if (err.message.includes('UNIQUE constraint failed')) {
            logger.warn('USERS', `Duplicate username attempt: ${username}`);
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        logger.error('USERS', `Error creating user ${username}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Update User (PUT - full update)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        logger.warn('USERS', `Missing required fields for PUT - username: ${!!username}, password: ${!!password}`);
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Check if user exists
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const existingUser = getUser.get(id);
        
        if (!existingUser) {
            logger.warn('USERS', `User not found for update: ID ${id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        logger.debug('USERS', `Updating user ${existingUser.username} (ID: ${id}) to ${username}`);

        // Update user
        const updateUser = db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ?');
        updateUser.run(username, password, id);

        // Get updated user
        const getUpdatedUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUpdatedUser.get(id);
        
        logger.success('USERS', `User updated successfully: ${username} (ID: ${id})`);
        res.json({ user });
        
    } catch (err) {
        // Handle unique constraint violation
        if (err.message.includes('UNIQUE constraint failed')) {
            logger.warn('USERS', `Duplicate username during update: ${username}`);
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        logger.error('USERS', `Error updating user ${id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Partial Update User (PATCH)
router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;

    // Input validation - at least one field should be provided
    if (!username && !password) {
        logger.warn('USERS', `No fields provided for PATCH update on user ID: ${id}`);
        return res.status(400).json({ error: 'At least one field (username or password) is required' });
    }

    try {
        // Check if user exists
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const existingUser = getUser.get(id);
        
        if (!existingUser) {
            logger.warn('USERS', `User not found for PATCH update: ID ${id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        // Build dynamic update query based on provided fields
        const updateFields = [];
        const values = [];
        
        if (username) {
            updateFields.push('username = ?');
            values.push(username);
            logger.debug('USERS', `PATCH updating username for user ${id}`);
        }
        
        if (password) {
            updateFields.push('password = ?');
            values.push(password);
            logger.debug('USERS', `PATCH updating password for user ${id}`);
        }
        
        values.push(id);
        
        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        const updateUser = db.prepare(updateQuery);
        updateUser.run(...values);

        // Get updated user
        const getUpdatedUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUpdatedUser.get(id);
        
        logger.success('USERS', `User partially updated: ${user.username} (ID: ${id})`);
        res.json({ user });
        
    } catch (err) {
        // Handle unique constraint violation
        if (err.message.includes('UNIQUE constraint failed')) {
            logger.warn('USERS', `Duplicate username during PATCH update: ${username}`);
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        logger.error('USERS', `Error in PATCH update for user ${id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Delete User
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user exists
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(id);
        
        if (!user) {
            logger.warn('USERS', `User not found for deletion: ID ${id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        logger.debug('USERS', `Deleting user: ${user.username} (ID: ${id})`);

        // Delete user
        const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
        deleteUser.run(id);
        
        logger.success('USERS', `User deleted successfully: ${user.username} (ID: ${id})`);
        res.status(204).send(); // No content
        
    } catch (err) {
        logger.error('USERS', `Error deleting user ${req.params.id}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Log when routes are initialized
logger.info('USERS', 'User routes initialized');

export default router;