import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import publicationRoutes from './routes/publicationRoutes.js';
import reqLogMiddleware from './middleware/reqLogMiddleware.js';
import authMiddleware from './middleware/authMiddleware.js';
import { logger } from './services/logging.js';

const app = express();
const PORT = process.env.PORT || 8080;
const serverName = process.env.SERVER_NAME || "Unnamed"

// File locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Define public folder location

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve HTML from public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes
app.use('/auth', reqLogMiddleware, authRoutes);
app.use('/publication', authMiddleware, publicationRoutes);

// Start server
app.listen(PORT, () => {
    console.clear()
    logger.success('SERVER', `${serverName} Backend Server (HTTP) has started on port ${PORT}`)
});