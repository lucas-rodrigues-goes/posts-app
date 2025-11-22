import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import publicationRoutes from './routes/publicationRoutes.js';
import reqLogMiddleware from './middleware/reqLogMiddleware.js';
import { logger } from './services/logging.js';

const app = express();
const PORT = process.env.PORT || 8080;

// File locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Define public folder location

// Serve HTML from public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes
app.use('/user', reqLogMiddleware, userRoutes);
app.use('/publication', reqLogMiddleware, publicationRoutes);

// Start server
app.listen(PORT, () => {
    console.clear()
    logger.success('SERVER', `Database Server (HTTP) has started on port ${PORT}`)
});