require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mydatabase',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testDbConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('Successfully connected to the database');
        conn.release();
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}

// Initialize database tables
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                best_score INT DEFAULT NULL,
                best_speedrun_time INT DEFAULT NULL,
                best_block_times JSON DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Database tables initialized');
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        dbStatus: pool.pool ? 'connected' : 'disconnected'
    });
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Input validation
        if (!username || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password and email are required' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find user
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Return user data (without password)
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            bestScore: user.best_score,
            bestSpeedrunTime: user.best_speedrun_time
        };

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userData
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Save game score
app.post('/api/save-score', async (req, res) => {
    try {
        const { userId, score } = req.body;

        if (!userId || !score) {
            return res.status(400).json({
                success: false,
                message: 'User ID and score are required'
            });
        }

        // Get current best score
        const [user] = await pool.query(
            'SELECT best_score FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentBest = user[0].best_score || 0;

        // Update if new score is higher
        if (score > currentBest) {
            await pool.query(
                'UPDATE users SET best_score = ? WHERE id = ?',
                [score, userId]
            );

            return res.status(200).json({
                success: true,
                message: 'New high score saved',
                newBest: score,
                previousBest: currentBest
            });
        }

        res.status(200).json({
            success: true,
            message: 'Score not higher than current best',
            currentBest,
            submittedScore: score
        });

    } catch (err) {
        console.error('Save score error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leaderboard (classic mode)
app.get('/api/leaderboard/classic', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE best_score IS NOT NULL'
        );
        const total = countResult[0].total;

        // Get leaderboard data
        const [leaderboard] = await pool.query(
            `SELECT id, username, best_score as score 
             FROM users 
             WHERE best_score IS NOT NULL 
             ORDER BY best_score DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.status(200).json({
            success: true,
            data: leaderboard,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get leaderboard'
        });
    }
});

// Get leaderboard (speedrun mode)
app.get('/api/leaderboard/speedrun', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE best_speedrun_time IS NOT NULL'
        );
        const total = countResult[0].total;

        // Get leaderboard data
        const [leaderboard] = await pool.query(
            `SELECT id, username, best_speedrun_time as time 
             FROM users 
             WHERE best_speedrun_time IS NOT NULL 
             ORDER BY best_speedrun_time ASC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.status(200).json({
            success: true,
            data: leaderboard,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('Speedrun leaderboard error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get speedrun leaderboard'
        });
    }
});

// Save speedrun result
app.post('/api/save-speedrun', async (req, res) => {
    try {
        const { userId, time, blockTimes } = req.body;

        if (!userId || !time || !blockTimes) {
            return res.status(400).json({
                success: false,
                message: 'User ID, time and block times are required'
            });
        }

        // Get current best time
        const [user] = await pool.query(
            'SELECT best_speedrun_time, best_block_times FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentBestTime = user[0].best_speedrun_time;
        const currentBlockTimes = user[0].best_block_times 
            ? JSON.parse(user[0].best_block_times)
            : {};

        // Merge block times
        const mergedBlockTimes = { ...currentBlockTimes };
        let updated = false;

        // Check if new time is better
        if (currentBestTime === null || time < currentBestTime) {
            await pool.query(
                'UPDATE users SET best_speedrun_time = ? WHERE id = ?',
                [time, userId]
            );
            updated = true;
        }

        // Check each block time
        for (const [block, blockTime] of Object.entries(blockTimes)) {
            if (!currentBlockTimes[block] || blockTime < currentBlockTimes[block]) {
                mergedBlockTimes[block] = blockTime;
                updated = true;
            }
        }

        // Update block times if needed
        if (updated) {
            await pool.query(
                'UPDATE users SET best_block_times = ? WHERE id = ?',
                [JSON.stringify(mergedBlockTimes), userId]
            );
        }

        res.status(200).json({
            success: true,
            message: 'Speedrun results processed',
            newBestTime: currentBestTime === null || time < currentBestTime,
            updatedBlockTimes: updated
        });

    } catch (err) {
        console.error('Save speedrun error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user stats
app.get('/api/user/:id/stats', async (req, res) => {
    try {
        const userId = req.params.id;

        const [user] = await pool.query(
            `SELECT 
                best_score, 
                best_speedrun_time,
                best_block_times
             FROM users 
             WHERE id = ?`,
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const stats = {
            bestScore: user[0].best_score,
            bestSpeedrunTime: user[0].best_speedrun_time,
            bestBlockTimes: user[0].best_block_times 
                ? JSON.parse(user[0].best_block_times)
                : null
        };

        res.status(200).json({
            success: true,
            stats
        });

    } catch (err) {
        console.error('Get user stats error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
async function startServer() {
    await testDbConnection();
    await initializeDatabase();
    
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

startServer();