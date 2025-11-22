import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../services/logging.js'

const router = express.Router();
const salt = 5

// Register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        logger.warn('AUTH', `Missing credentials - username: ${!!username}, password: ${!!password}`);
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, salt);

    try {
        // Send request to database server to create user
        const dbResponse = await fetch(`${process.env.DATABASE_ADDRESS}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: hashedPassword
            })
        });

        if (!dbResponse.ok) {
            const errorData = await dbResponse.json();
            
            if (dbResponse.status === 409) {
                logger.warn('AUTH', `Username already exists: ${username}`);
                return res.status(409).json({ error: 'Username already exists' });
            }
            
            logger.error('AUTH', `Database server error during registration: ${dbResponse.status} - ${errorData.error}`);
            return res.status(503).json({ error: 'Service unavailable' });
        }

        const { user } = await dbResponse.json();
        
        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        logger.success('AUTH', `User registered successfully: ${username} (ID: ${user.id})`);
        res.status(201).json({ 
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
        
    } catch (err) {
        logger.error('AUTH', `Registration error for ${username}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        logger.warn('AUTH', `Missing login credentials - username: ${!!username}, password: ${!!password}`);
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Use the username search endpoint
        const dbResponse = await fetch(`${process.env.DATABASE_ADDRESS}/user/username/${encodeURIComponent(username)}`);
        
        if (!dbResponse.ok) {
            if (dbResponse.status === 404) {
                logger.warn('AUTH', `User not found: ${username}`);
                return res.status(404).json({ error: 'User not found' });
            }
            logger.error('AUTH', `Database server error during login: ${dbResponse.status}`);
            return res.status(503).json({ error: 'Service unavailable' });
        }

        const { user } = await dbResponse.json();
        
        // Verify password
        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            logger.warn('AUTH', `Invalid password for user: ${username}`);
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        logger.success('AUTH', `User logged in successfully: ${username} (ID: ${user.id})`);
        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (err) {
        logger.error('AUTH', `Login error for ${username}: ${err.message}`);
        res.status(503).json({ error: 'Service unavailable' });
    }
});

// Verify Token (optional endpoint)
router.post('/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        logger.warn('AUTH', 'Verify token request without token');
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.debug('AUTH', `Token verified for user ID: ${decoded.id}`);
        res.json({ valid: true, user: { id: decoded.id } });
    } catch (err) {
        logger.warn('AUTH', `Invalid token: ${err.message}`);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Log when routes are initialized
logger.info('AUTH', 'Authentication routes initialized');

export default router;