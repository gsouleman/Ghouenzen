const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'al-wasiyyah-secret-key-2025';

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Connection with better error handling
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database Tables
async function initDB() {
    let client;
    try {
        client = await pool.connect();
        console.log('Connected to PostgreSQL database');

        // Create Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Add role and full_name columns if they don't exist
        try {
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN 
                        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN 
                        ALTER TABLE users ADD COLUMN full_name VARCHAR(255); 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN 
                        ALTER TABLE users ADD COLUMN email VARCHAR(255); 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_islamic') THEN 
                        ALTER TABLE users ADD COLUMN is_islamic BOOLEAN DEFAULT TRUE; 
                    END IF;
                END $$;
            `);
        } catch (alterErr) {
            console.log('User column migration note:', alterErr.message);
        }

        // Create Default Admin User
        const adminCheck = await client.query("SELECT * FROM users WHERE username = 'admin'");
        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await client.query(
                "INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
                ['admin', hashedPassword, 'System Administrator', 'admin']
            );
            console.log('Default admin user created');
        } else {
            // Ensure admin has admin role if it already exists
            await client.query("UPDATE users SET role = 'admin' WHERE username = 'admin'");
        }

        // Create tables one by one to avoid syntax issues
        await client.query(`
            CREATE TABLE IF NOT EXISTS testator (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add user_id column if not exists (migration)
        try {
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='testator' AND column_name='user_id') THEN 
                        ALTER TABLE testator ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE; 
                    END IF;
                END $$;
            `);

            // Link existing testators to admin user if user_id is null
            const adminUser = await client.query("SELECT id FROM users WHERE username = 'admin'");
            if (adminUser.rows.length > 0) {
                await client.query("UPDATE testator SET user_id = $1 WHERE user_id IS NULL", [adminUser.rows[0].id]);
            }

        } catch (alterErr) {
            console.log('Column migration note:', alterErr.message);
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS heirs (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                relation VARCHAR(50) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                share_type VARCHAR(50)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS executors (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                contact VARCHAR(255)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS debtors (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                contact VARCHAR(255),
                gender VARCHAR(10) DEFAULT 'male',
                language VARCHAR(10) DEFAULT 'english'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS debtor_items (
                id SERIAL PRIMARY KEY,
                debtor_id INTEGER REFERENCES debtors(id) ON DELETE CASCADE,
                reason TEXT,
                amount DECIMAL(15,2) DEFAULT 0,
                notes TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS creditors (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                contact VARCHAR(255),
                gender VARCHAR(10) DEFAULT 'male',
                language VARCHAR(10) DEFAULT 'english'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS creditor_items (
                id SERIAL PRIMARY KEY,
                creditor_id INTEGER REFERENCES creditors(id) ON DELETE CASCADE,
                reason TEXT,
                amount DECIMAL(15,2) DEFAULT 0,
                notes TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS assets (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                location VARCHAR(255),
                estimated_value DECIMAL(15,2) DEFAULT 0,
                is_liquidated BOOLEAN DEFAULT TRUE,
                notes TEXT
            )
        `);

        // Migration: Add is_liquidated, total_area, area_to_sell columns if they don't exist
        try {
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='is_liquidated') THEN 
                        ALTER TABLE assets ADD COLUMN is_liquidated BOOLEAN DEFAULT TRUE; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='total_area') THEN 
                        ALTER TABLE assets ADD COLUMN total_area DECIMAL(15,2) DEFAULT 0; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='area_to_sell') THEN 
                        ALTER TABLE assets ADD COLUMN area_to_sell DECIMAL(15,2) DEFAULT 0; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='price_per_m2') THEN 
                        ALTER TABLE assets ADD COLUMN price_per_m2 DECIMAL(15,2) DEFAULT 0; 
                    END IF;
                END $$;
            `);
        } catch (alterErr) {
            // Fallback for non-postgres or specific errors
            console.log('Column migration note:', alterErr.message);
        }

        // Migration: Add asset_ids to beneficiaries if not exists
        try {
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='beneficiaries' AND column_name='asset_ids') THEN 
                        ALTER TABLE beneficiaries ADD COLUMN asset_ids INTEGER[]; 
                    END IF;
                END $$;
            `);
        } catch (alterErr) {
            console.log('Beneficiaries column migration note:', alterErr.message);
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS will_edits (
                id SERIAL PRIMARY KEY,
                testator_id INTEGER REFERENCES testator(id) ON DELETE CASCADE,
                section_name VARCHAR(100) NOT NULL,
                content TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Remove duplicate items (keeps the one with lowest ID)
        try {
            await client.query(`
                DELETE FROM debtor_items a
                USING debtor_items b
                WHERE a.id > b.id 
                  AND a.debtor_id = b.debtor_id 
                  AND a.amount = b.amount
                  AND COALESCE(a.reason, '') = COALESCE(b.reason, '')
            `);
            await client.query(`
                DELETE FROM creditor_items a
                USING creditor_items b
                WHERE a.id > b.id 
                  AND a.creditor_id = b.creditor_id 
                  AND a.amount = b.amount
                  AND COALESCE(a.reason, '') = COALESCE(b.reason, '')
            `);
            console.log('Duplicate items cleanup completed');
        } catch (cleanupErr) {
            console.log('Cleanup note:', cleanupErr.message);
        }

        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err.message);
        throw err;
    } finally {
        if (client) client.release();
    }
}

// Helper: Get testator for specific user
async function getTestatorForUser(userId) {
    try {
        const result = await pool.query('SELECT * FROM testator WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [userId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error getting testator:', err.message);
        return null;
    }
}

// Validation Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// API Routes

// Authentication
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check exists
        const userExist = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
            [username, hashedPassword, full_name || '', role || 'user']
        );

        res.json({ message: 'User created successfully', user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name, is_islamic: user.is_islamic },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, is_islamic: user.is_islamic } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware: Role Authorization
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

// User Management Routes (Admin Only)

// GET /api/users - List all users
app.get('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, full_name, email, role, is_islamic, created_at FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users - Create new user (Admin)
app.post('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { username, password, full_name, email, role, is_islamic } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const userExist = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExist.rows.length > 0) return res.status(400).json({ error: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, full_name, email, role, is_islamic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, email, role, is_islamic',
            [username, hashedPassword, full_name || '', email || '', role || 'user', is_islamic !== undefined ? is_islamic : true]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id - Update user (Admin)
app.put('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { full_name, email, role, is_islamic } = req.body;
        const userId = req.params.id;

        const result = await pool.query(
            'UPDATE users SET full_name = $1, email = $2, role = $3, is_islamic = $4 WHERE id = $5 RETURNING id, username, full_name, email, role, is_islamic',
            [full_name, email, role, is_islamic, userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:id - Delete user (Admin)
app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        // Prevent deleting self
        if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users/:id/reset-password - Admin Reset
app.post('/api/users/:id/reset-password', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.params.id;
        if (!newPassword) return res.status(400).json({ error: 'New password required' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/change-password - User Self-Change
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware for all other API routes
app.use('/api', (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/auth/register') {
        return next();
    }
    authenticateToken(req, res, next);
});

// Testator
app.get('/api/testator', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(404).json({ error: 'No testator found' });
        res.json(testator);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/testator', async (req, res) => {
    try {
        const { full_name, address } = req.body;
        const result = await pool.query(
            'INSERT INTO testator (user_id, full_name, address) VALUES ($1, $2, $3) RETURNING id',
            [req.user.id, full_name, address || '']
        );
        res.json({ id: result.rows[0].id, message: 'Testator created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/testator/:id', async (req, res) => {
    try {
        const { full_name, address } = req.body;
        await pool.query(
            'UPDATE testator SET full_name = $1, address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4',
            [full_name, address || '', req.params.id, req.user.id]
        );
        res.json({ message: 'Testator updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Heirs
app.get('/api/heirs', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.json([]);
        const result = await pool.query('SELECT * FROM heirs WHERE testator_id = $1 ORDER BY id', [testator.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/heirs', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(400).json({ error: 'No testator' });
        const { relation, full_name, share_type } = req.body;
        const result = await pool.query(
            'INSERT INTO heirs (testator_id, relation, full_name, share_type) VALUES ($1, $2, $3, $4) RETURNING id',
            [testator.id, relation, full_name, share_type]
        );
        res.json({ id: result.rows[0].id, message: 'Heir added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/heirs/:id', async (req, res) => {
    try {
        const { relation, full_name, share_type } = req.body;
        await pool.query(
            'UPDATE heirs SET relation = $1, full_name = $2, share_type = $3 WHERE id = $4',
            [relation, full_name, share_type, req.params.id]
        );
        res.json({ message: 'Heir updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/heirs/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM heirs WHERE id = $1', [req.params.id]);
        res.json({ message: 'Heir deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Executors
app.get('/api/executors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.json([]);
        const result = await pool.query('SELECT * FROM executors WHERE testator_id = $1 ORDER BY id', [testator.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/executors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(400).json({ error: 'No testator' });
        const { full_name, contact } = req.body;
        const result = await pool.query(
            'INSERT INTO executors (testator_id, full_name, contact) VALUES ($1, $2, $3) RETURNING id',
            [testator.id, full_name, contact || '']
        );
        res.json({ id: result.rows[0].id, message: 'Executor added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/executors/:id', async (req, res) => {
    try {
        const { full_name, contact } = req.body;
        await pool.query(
            'UPDATE executors SET full_name = $1, contact = $2 WHERE id = $3',
            [full_name, contact || '', req.params.id]
        );
        res.json({ message: 'Executor updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/executors/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM executors WHERE id = $1', [req.params.id]);
        res.json({ message: 'Executor deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Debtors
app.get('/api/debtors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.json([]);
        const debtorsResult = await pool.query('SELECT * FROM debtors WHERE testator_id = $1 ORDER BY id', [testator.id]);

        // Get items for each debtor
        const debtors = await Promise.all(debtorsResult.rows.map(async (debtor) => {
            const itemsResult = await pool.query('SELECT * FROM debtor_items WHERE debtor_id = $1 ORDER BY id', [debtor.id]);
            const items = itemsResult.rows.map(item => ({
                ...item,
                amount: parseFloat(item.amount) || 0
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return {
                ...debtor,
                items,
                amount: totalAmount
            };
        }));

        res.json(debtors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/debtors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(400).json({ error: 'No testator' });
        const { full_name, contact, gender, language, items } = req.body;

        // Insert debtor
        const result = await pool.query(
            'INSERT INTO debtors (testator_id, full_name, contact, gender, language) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [testator.id, full_name, contact || '', gender || 'male', language || 'english']
        );
        const debtorId = result.rows[0].id;

        // Insert items
        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO debtor_items (debtor_id, reason, amount, notes) VALUES ($1, $2, $3, $4)',
                    [debtorId, item.reason || '', item.amount || 0, item.notes || '']
                );
            }
        }

        res.json({ id: debtorId, message: 'Debtor added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/debtors/:id', async (req, res) => {
    try {
        const { full_name, contact, gender, language, items } = req.body;

        // Update debtor
        await pool.query(
            'UPDATE debtors SET full_name = $1, contact = $2, gender = $3, language = $4 WHERE id = $5',
            [full_name, contact || '', gender || 'male', language || 'english', req.params.id]
        );

        // Delete existing items and re-insert
        await pool.query('DELETE FROM debtor_items WHERE debtor_id = $1', [req.params.id]);

        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO debtor_items (debtor_id, reason, amount, notes) VALUES ($1, $2, $3, $4)',
                    [req.params.id, item.reason || '', item.amount || 0, item.notes || '']
                );
            }
        }

        res.json({ message: 'Debtor updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/debtors/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM debtor_items WHERE debtor_id = $1', [req.params.id]);
        await pool.query('DELETE FROM debtors WHERE id = $1', [req.params.id]);
        res.json({ message: 'Debtor deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Creditors
app.get('/api/creditors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.json([]);
        const creditorsResult = await pool.query('SELECT * FROM creditors WHERE testator_id = $1 ORDER BY id', [testator.id]);

        // Get items for each creditor
        const creditors = await Promise.all(creditorsResult.rows.map(async (creditor) => {
            const itemsResult = await pool.query('SELECT * FROM creditor_items WHERE creditor_id = $1 ORDER BY id', [creditor.id]);
            const items = itemsResult.rows.map(item => ({
                ...item,
                amount: parseFloat(item.amount) || 0
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return {
                ...creditor,
                items,
                amount: totalAmount
            };
        }));

        res.json(creditors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/creditors', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(400).json({ error: 'No testator' });
        const { full_name, contact, gender, language, items } = req.body;

        // Insert creditor
        const result = await pool.query(
            'INSERT INTO creditors (testator_id, full_name, contact, gender, language) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [testator.id, full_name, contact || '', gender || 'male', language || 'english']
        );
        const creditorId = result.rows[0].id;

        // Insert items
        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO creditor_items (creditor_id, reason, amount, notes) VALUES ($1, $2, $3, $4)',
                    [creditorId, item.reason || '', item.amount || 0, item.notes || '']
                );
            }
        }

        res.json({ id: creditorId, message: 'Creditor added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/creditors/:id', async (req, res) => {
    try {
        const { full_name, contact, gender, language, items } = req.body;

        // Update creditor
        await pool.query(
            'UPDATE creditors SET full_name = $1, contact = $2, gender = $3, language = $4 WHERE id = $5',
            [full_name, contact || '', gender || 'male', language || 'english', req.params.id]
        );

        // Delete existing items and re-insert
        await pool.query('DELETE FROM creditor_items WHERE creditor_id = $1', [req.params.id]);

        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO creditor_items (creditor_id, reason, amount, notes) VALUES ($1, $2, $3, $4)',
                    [req.params.id, item.reason || '', item.amount || 0, item.notes || '']
                );
            }
        }

        res.json({ message: 'Creditor updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/creditors/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM creditor_items WHERE creditor_id = $1', [req.params.id]);
        await pool.query('DELETE FROM creditors WHERE id = $1', [req.params.id]);
        res.json({ message: 'Creditor deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assets
app.get('/api/assets', async (req, res) => {
    try {
        let result;
        if (req.user.role === 'admin') {
            // Admin sees ALL assets
            result = await pool.query('SELECT * FROM assets ORDER BY id');
        } else {
            // Regular user only sees own assets
            const testator = await getTestatorForUser(req.user.id);
            if (!testator) return res.json([]);
            result = await pool.query('SELECT * FROM assets WHERE testator_id = $1 ORDER BY id', [testator.id]);
        }

        res.json(result.rows.map(r => ({
            ...r,
            estimated_value: parseFloat(r.estimated_value) || 0,
            total_area: parseFloat(r.total_area) || 0,
            area_to_sell: parseFloat(r.area_to_sell) || 0,
            price_per_m2: parseFloat(r.price_per_m2) || 0
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assets', async (req, res) => {
    try {
        let testator = await getTestatorForUser(req.user.id);

        // Auto-create testator if it doesn't exist
        if (!testator) {
            const testatorResult = await pool.query(
                'INSERT INTO testator (user_id, full_name, address) VALUES ($1, $2, $3) RETURNING *',
                [req.user.id, req.user.full_name || req.user.username, '']
            );
            testator = testatorResult.rows[0];
        }

        const { category, description, location, estimated_value, notes, is_liquidated, total_area, area_to_sell, price_per_m2 } = req.body;
        const result = await pool.query(
            'INSERT INTO assets (testator_id, category, description, location, estimated_value, notes, is_liquidated, total_area, area_to_sell, price_per_m2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [testator.id, category, description, location || '', estimated_value || 0, notes || '', is_liquidated !== undefined ? is_liquidated : true, total_area || 0, area_to_sell || 0, price_per_m2 || 0]
        );
        res.json({ id: result.rows[0].id, message: 'Asset added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/assets/:id', async (req, res) => {
    try {
        const { category, description, location, estimated_value, notes, is_liquidated, total_area, area_to_sell, price_per_m2 } = req.body;
        await pool.query(
            'UPDATE assets SET category = $1, description = $2, location = $3, estimated_value = $4, notes = $5, is_liquidated = $6, total_area = $7, area_to_sell = $8, price_per_m2 = $9 WHERE id = $10',
            [category, description, location || '', estimated_value || 0, notes || '', is_liquidated !== undefined ? is_liquidated : true, total_area || 0, area_to_sell || 0, price_per_m2 || 0, req.params.id]
        );
        res.json({ message: 'Asset updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assets/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
        res.json({ message: 'Asset deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Summary with Islamic inheritance calculation
app.get('/api/summary', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(404).json({ error: 'No testator found' });

        const [heirsRes, debtorsRes, creditorsRes, assetsRes, executorsRes, debtorItemsRes, creditorItemsRes] = await Promise.all([
            pool.query('SELECT * FROM heirs WHERE testator_id = $1', [testator.id]),
            pool.query('SELECT * FROM debtors WHERE testator_id = $1', [testator.id]),
            pool.query('SELECT * FROM creditors WHERE testator_id = $1', [testator.id]),
            pool.query('SELECT * FROM assets WHERE testator_id = $1', [testator.id]),
            pool.query('SELECT * FROM executors WHERE testator_id = $1', [testator.id]),
            pool.query('SELECT SUM(amount) as total FROM debtor_items WHERE debtor_id IN (SELECT id FROM debtors WHERE testator_id = $1)', [testator.id]),
            pool.query('SELECT SUM(amount) as total FROM creditor_items WHERE creditor_id IN (SELECT id FROM creditors WHERE testator_id = $1)', [testator.id])
        ]);

        const heirs = heirsRes.rows;
        const debtors = debtorsRes.rows;
        const creditors = creditorsRes.rows;
        const assets = assetsRes.rows;
        const executors = executorsRes.rows;

        const totalDebtors = parseFloat(debtorItemsRes.rows[0].total || 0);
        const totalCreditors = parseFloat(creditorItemsRes.rows[0].total || 0);
        const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);
        const immovableAssets = assets.filter(a => a.category === 'immovable').reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);
        const movableAssets = assets.filter(a => a.category === 'movable').reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);
        const otherAssets = assets.filter(a => a.category === 'other').reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);

        const totalPool = totalAssets + totalDebtors;
        const netEstate = totalPool - totalCreditors;

        const inheritance = calculateIslamicInheritance(netEstate, heirs);

        res.json({
            testator: { full_name: testator.full_name, address: testator.address },
            totals: {
                debtors: totalDebtors,
                creditors: totalCreditors,
                assets: totalAssets,
                immovable_assets: immovableAssets,
                movable_assets: movableAssets,
                other_assets: otherAssets,
                total_pool: totalPool,
                net_estate: netEstate
            },
            inheritance,
            counts: {
                heirs: heirs.length,
                executors: executors.length,
                debtors: debtors.length,
                creditors: creditors.length,
                assets: assets.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function calculateIslamicInheritance(netEstate, heirs) {
    if (netEstate <= 0) {
        return { status: 'insolvent', message: 'Estate is insolvent', shares: [] };
    }

    const shares = [];
    let remaining = netEstate;

    const wifeCount = heirs.filter(h => h.relation === 'wife').length;
    const motherCount = heirs.filter(h => h.relation === 'mother').length;
    const fatherCount = heirs.filter(h => h.relation === 'father').length;
    const sonCount = heirs.filter(h => h.relation === 'son').length;
    const daughterCount = heirs.filter(h => h.relation === 'daughter').length;
    const hasChildren = sonCount > 0 || daughterCount > 0;

    // Wife's share: 1/8 when there are children, 1/4 otherwise
    if (wifeCount > 0) {
        const wifeFraction = hasChildren ? 1 / 8 : 1 / 4;
        const wifeShare = netEstate * wifeFraction;
        heirs.filter(h => h.relation === 'wife').forEach(h => {
            shares.push({
                name: h.full_name,
                relation: 'Wife',
                fraction: hasChildren ? '1/8' : '1/4',
                amount: wifeShare / wifeCount
            });
        });
        remaining -= wifeShare;
    }

    // Mother's share: 1/6 when there are children, 1/3 otherwise
    if (motherCount > 0) {
        const motherFraction = hasChildren ? 1 / 6 : 1 / 3;
        const motherShare = netEstate * motherFraction;
        heirs.filter(h => h.relation === 'mother').forEach(h => {
            shares.push({
                name: h.full_name,
                relation: 'Mother',
                fraction: hasChildren ? '1/6' : '1/3',
                amount: motherShare / motherCount
            });
        });
        remaining -= motherShare;
    }

    // Father's share: 1/6 when there are children
    if (fatherCount > 0 && hasChildren) {
        const fatherShare = netEstate * (1 / 6);
        heirs.filter(h => h.relation === 'father').forEach(h => {
            shares.push({
                name: h.full_name,
                relation: 'Father',
                fraction: '1/6',
                amount: fatherShare / fatherCount
            });
        });
        remaining -= fatherShare;
    }

    // Children share the residue (Asaba) - sons get 2 shares, daughters get 1
    if (sonCount > 0 || daughterCount > 0) {
        const totalChildShares = (sonCount * 2) + daughterCount;
        const shareUnit = remaining / totalChildShares;

        heirs.filter(h => h.relation === 'son').forEach(h => {
            shares.push({
                name: h.full_name,
                relation: 'Son',
                fraction: `2/${totalChildShares} of residue`,
                amount: shareUnit * 2
            });
        });

        heirs.filter(h => h.relation === 'daughter').forEach(h => {
            shares.push({
                name: h.full_name,
                relation: 'Daughter',
                fraction: `1/${totalChildShares} of residue`,
                amount: shareUnit
            });
        });
    }

    return { status: 'calculated', net_estate: netEstate, shares };
}

// Load demo data
app.post('/api/load-demo', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Clear existing data
        await client.query('DELETE FROM assets');
        await client.query('DELETE FROM creditors');
        await client.query('DELETE FROM debtors');
        await client.query('DELETE FROM executors');
        await client.query('DELETE FROM heirs');
        await client.query('DELETE FROM testator');

        // Create testator
        const testatorResult = await client.query(
            'INSERT INTO testator (user_id, full_name, address) VALUES ($1, $2, $3) RETURNING id',
            [req.user.id, 'GHOUENZEN SOULEMANOU', 'Mankon-Bamenda, Cameroon']
        );
        const testatorId = testatorResult.rows[0].id;

        // Add heirs
        const heirsData = [
            ['wife', 'GHOUENZEN MEFIRE HAFSETOU', 'fixed'],
            ['mother', 'MENJIKOUE ABIBA', 'fixed'],
            ['son', 'GHOUENZEN NJOYA MOHAMED HANIF', 'residue'],
            ['son', 'GHOUENZEN SALIH NASRI SALIM', 'residue'],
            ['son', 'GHOUENZEN NJIKAM MUSTAFA HAKIM', 'residue'],
            ['daughter', 'GHOUENZEN HABIBA MARYAM IMANN', 'residue'],
            ['daughter', 'GHOUENZEN MEFIRE ZAINAB NOURA', 'residue']
        ];
        for (const h of heirsData) {
            await client.query(
                'INSERT INTO heirs (testator_id, relation, full_name, share_type) VALUES ($1, $2, $3, $4)',
                [testatorId, h[0], h[1], h[2]]
            );
        }

        // Add assets
        const assetsData = [
            ['immovable', 'Land - 400 m²', 'Foumban (West Region)', 8000000, 'Est. @ 20,000 XAF/m²'],
            ['immovable', 'Land - 4,000 m²', 'Ngombe (Littoral Region)', 40000000, 'Est. @ 10,000 XAF/m²'],
            ['immovable', 'Land - 500 m²', 'Bomono (Littoral Region)', 7500000, 'Est. @ 15,000 XAF/m²'],
            ['immovable', 'Land with Family House - 450 m²', 'Lendi (Littoral Region)', 13500000, 'Est. @ 30,000 XAF/m² (with house)'],
            ['immovable', 'Land (2nd Plot) - 450 m²', 'Lendi (Littoral Region)', 9000000, 'Est. @ 20,000 XAF/m²'],
            ['immovable', 'Land - 3,500 m²', 'Massoumbou (Littoral Region)', 24500000, 'Est. @ 7,000 XAF/m²'],
            ['immovable', 'Farmland - ~5 hectares', 'Malere (West Region)', 25000000, 'Est. @ 5M XAF/ha (agricultural)'],
            ['movable', 'Vehicle: Nissan X-Trail', 'Cameroon', 0, 'Value to be determined'],
            ['movable', 'Vehicle: Mitsubishi Single-Cabin Pickup', 'Cameroon', 0, 'Value to be determined']
        ];
        for (const a of assetsData) {
            await client.query(
                'INSERT INTO assets (testator_id, category, description, location, estimated_value, notes, is_liquidated) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [testatorId, a[0], a[1], a[2], a[3], a[4], true]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Demo data loaded successfully', testator_id: testatorId });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error loading demo data:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (client) client.release();
    }
});

// Reset data
app.post('/api/reset', async (req, res) => {
    try {
        await pool.query('DELETE FROM will_edits');
        await pool.query('DELETE FROM assets');
        await pool.query('DELETE FROM creditors');
        await pool.query('DELETE FROM debtors');
        await pool.query('DELETE FROM executors');
        await pool.query('DELETE FROM heirs');
        await pool.query('DELETE FROM testator');
        res.json({ message: 'All data cleared' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Will Edits - Save
app.post('/api/will-edits', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.status(400).json({ error: 'No testator' });

        const { edits } = req.body;

        // Clear existing edits for this testator
        await pool.query('DELETE FROM will_edits WHERE testator_id = $1', [testator.id]);

        // Insert new edits
        for (const [section, content] of Object.entries(edits)) {
            if (content && content.trim()) {
                await pool.query(
                    'INSERT INTO will_edits (testator_id, section_name, content) VALUES ($1, $2, $3)',
                    [testator.id, section, content]
                );
            }
        }

        res.json({ message: 'Will edits saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Will Edits - Load
app.get('/api/will-edits', async (req, res) => {
    try {
        const testator = await getTestatorForUser(req.user.id);
        if (!testator) return res.json({ edits: {} });

        const result = await pool.query(
            'SELECT section_name, content FROM will_edits WHERE testator_id = $1',
            [testator.id]
        );

        const edits = {};
        result.rows.forEach(row => {
            edits[row.section_name] = row.content;
        });

        res.json({ edits });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/will', (req, res) => res.sendFile(path.join(__dirname, 'public', 'will.html')));

// Start server
async function startServer() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`Al-Wasiyyah server running on port ${PORT}`);
            console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL connected' : 'No DATABASE_URL set'}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

startServer();

// ==========================================
// BENEFICIARIES ROUTES (Secular)
// ==========================================
app.get('/api/beneficiaries', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/api/beneficiaries', authenticateToken, async (req, res) => {
    const { full_name, relationship, allocation_type, allocation_value, notes, asset_ids } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO beneficiaries (user_id, full_name, relationship, allocation_type, allocation_value, notes, asset_ids) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.id, full_name, relationship, allocation_type || 'percentage', allocation_value, notes, asset_ids || []]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.put('/api/beneficiaries/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { full_name, relationship, allocation_type, allocation_value, notes, asset_ids } = req.body;
    try {
        const result = await pool.query(
            `UPDATE beneficiaries SET full_name = $1, relationship = $2, allocation_type = $3, allocation_value = $4, notes = $5, asset_ids = $6 
             WHERE id = $7 AND user_id = $8 RETURNING *`,
            [full_name, relationship, allocation_type, allocation_value, notes, asset_ids || [], id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Beneficiary not found or unauthorized' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/api/beneficiaries/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Beneficiary not found or unauthorized' });
        res.json({ msg: 'Beneficiary removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
