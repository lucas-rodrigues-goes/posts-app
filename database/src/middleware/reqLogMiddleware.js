
import { logger } from '../services/logging.js';

function reqLogMiddleware(req, res, next) {
    const {method, originalUrl} = req;
    const ip = req.ip.split(":").slice(-1)[0];
    
    // Log the incoming request
    logger.http('REQUEST', `${method} ${originalUrl} FROM ${ip}`);
    
    // Track response time
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusColor = res.statusCode >= 400 ? 'ERROR' : res.statusCode >= 300 ? 'WARN' : 'SUCCESS';
        logger[statusColor.toLowerCase()]('RESPONSE', `${method} ${originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });

    next();
};

export default reqLogMiddleware;