const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe');
const { processAndStoreImage, deleteImage, STORAGE_MODE } = require('./storage');

dotenv.config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP, or GIF images allowed'));
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log(`📦 Storage mode: ${STORAGE_MODE}`);
const PORT = process.env.PORT || 5000;
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '';
const MPESA_ENVIRONMENT = (process.env.MPESA_ENVIRONMENT || 'sandbox').toLowerCase();
const MPESA_BASE_URL = process.env.MPESA_BASE_URL || (MPESA_ENVIRONMENT === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke');
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || `http://localhost:${PORT}/api/mpesa/callback`;

async function requestJson(urlString, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || 443,
            path: `${url.pathname}${url.search}`,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = https.request(requestOptions, (res) => {
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                if (!raw) {
                    return resolve({});
                }
                try {
                    const parsed = JSON.parse(raw);
                    if (res.statusCode >= 400) {
                        return reject(new Error(parsed?.errorMessage || parsed?.message || `HTTP ${res.statusCode}`));
                    }
                    resolve(parsed);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function getMpesaAccessToken() {
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
        throw new Error('M-Pesa consumer key and secret are not configured');
    }

    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await requestJson(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.access_token) {
        throw new Error('Failed to generate M-Pesa access token');
    }

    return response.access_token;
}

async function initiateMpesaStkPush({ amount, phoneNumber, orderId, description }) {
    if (!MPESA_SHORTCODE || !MPESA_PASSKEY) {
        throw new Error('M-Pesa shortcode and passkey are not configured');
    }

    const cleanPhone = String(phoneNumber || '').replace(/\s+/g, '').replace(/^\+/, '');
    const normalizedPhone = cleanPhone.startsWith('0') ? `254${cleanPhone.slice(1)}` : cleanPhone;

    if (!/^254\d{9}$/.test(normalizedPhone)) {
        throw new Error('Invalid M-Pesa phone number');
    }

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const accountReference = `ORDER-${orderId}`;
    const requestBody = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Number(amount),
        PartyA: normalizedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: normalizedPhone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: description || `Order ${orderId} payment`
    };

    const token = await getMpesaAccessToken();

    const response = await requestJson(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: requestBody
    });

    return {
        checkoutRequestId: response.CheckoutRequestID || null,
        merchantRequestId: response.MerchantRequestID || null,
        customerMessage: response.CustomerMessage || null,
        responseCode: response.ResponseCode || null,
        responseDescription: response.ResponseDescription || null
    };
}

async function ensureMpesaOrderColumns() {
    const [columns] = await db.promise().query('SHOW COLUMNS FROM orders');
    const existing = new Set(columns.map(column => column.Field));
    const requiredColumns = [
        { name: 'checkout_request_id', def: 'VARCHAR(255) NULL' },
        { name: 'merchant_request_id', def: 'VARCHAR(255) NULL' },
        { name: 'mpesa_receipt_number', def: 'VARCHAR(255) NULL' },
        { name: 'phone_number', def: 'VARCHAR(30) NULL' },
        { name: 'callback_metadata', def: 'JSON NULL' },
        { name: 'payment_initiated_at', def: 'TIMESTAMP NULL' },
        { name: 'payment_confirmed_at', def: 'TIMESTAMP NULL' }
    ];

    for (const column of requiredColumns) {
        if (!existing.has(column.name)) {
            await db.promise().query(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.def}`);
        }
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Use a pool so dropped MySQL connections are replaced automatically.
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_delivery',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.query('SELECT 1', async (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
    try {
        await ensureMpesaOrderColumns();
        console.log('Verified M-Pesa order columns');
    } catch (error) {
        console.error('Failed to verify M-Pesa order columns:', error.message);
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@fooddelivery.local';

async function sendAppEmail({ to, subject, text, html }) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn('SMTP credentials are not configured; skipping email send.');
        return { ok: false, reason: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            text,
            html
        });
        return { ok: true };
    } catch (error) {
        console.error('Failed to send email:', error.message);
        return { ok: false, reason: error.message };
    }
}

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Role middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, hotelName } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, ?, ?)';
        const isApproved = role === 'admin' ? true : false;
        
        db.query(query, [name, email, hashedPassword, role, isApproved], async (err, result) => {
            if (err) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            if (role === 'manager') {
                const requestedHotel = hotelName || 'New Hotel';
                const existingHotelQuery = 'SELECT id FROM hotels WHERE name = ? AND manager_id IS NULL LIMIT 1';
                db.query(existingHotelQuery, [requestedHotel], async (hotelLookupError, hotels) => {
                    if (hotelLookupError) {
                        return res.status(500).json({ message: 'Failed to assign hotel' });
                    }

                    const finishRegistration = async (hotelError) => {
                        if (hotelError) {
                            return res.status(400).json({ message: 'Failed to assign hotel' });
                        }

                        await sendAppEmail({
                            to: email,
                            subject: 'Your manager account is pending approval',
                            text: `Hello ${name},\n\nYour manager account has been created and is awaiting admin approval. Once approved, you can log in and manage your hotel menu.`,
                            html: `<p>Hello ${name},</p><p>Your manager account has been created and is awaiting admin approval. Once approved, you can log in and manage your hotel menu.</p>`
                        });

                        res.status(201).json({ message: 'Manager registered, awaiting admin approval' });
                    };

                    if (hotels.length > 0) {
                        db.query('UPDATE hotels SET manager_id = ? WHERE id = ?', [result.insertId, hotels[0].id], finishRegistration);
                    } else {
                        db.query('INSERT INTO hotels (name, manager_id) VALUES (?, ?)', [requestedHotel, result.insertId], finishRegistration);
                    }
                });
            } else {
                await sendAppEmail({
                    to: email,
                    subject: 'Welcome to the food delivery app',
                    text: `Hello ${name},\n\nYour account has been created successfully. You can now log in and start using the platform.`,
                    html: `<p>Hello ${name},</p><p>Your account has been created successfully. You can now log in and start using the platform.</p>`
                });
                res.status(201).json({ message: 'User registered successfully' });
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = results[0];
        if (!user.is_approved && user.role === 'manager') {
            return res.status(403).json({ message: 'Account pending admin approval' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, hotel_id: user.hotel_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hotel_id: user.hotel_id
            }
        });
    });
});

// ========== ADMIN ROUTES ==========

// Get pending managers
app.get('/api/admin/pending-managers', authenticate, authorize('admin'), (req, res) => {
    db.query('SELECT * FROM users WHERE role = "manager" AND is_approved = FALSE', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Approve manager
app.put('/api/admin/approve-manager/:id', authenticate, authorize('admin'), (req, res) => {
    const managerId = req.params.id;

    db.query('SELECT name, email FROM users WHERE id = ? AND role = "manager"', [managerId], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!results.length) return res.status(404).json({ message: 'Manager not found' });

        const manager = results[0];

        db.query('UPDATE users SET is_approved = TRUE WHERE id = ? AND role = "manager"', [managerId], async (updateErr) => {
            if (updateErr) return res.status(500).json({ message: 'Database error' });

            await sendAppEmail({
                to: manager.email,
                subject: 'Your manager account has been approved',
                text: `Hello ${manager.name},\n\nYour manager account has been approved. You can now log in and manage your hotel.`,
                html: `<p>Hello ${manager.name},</p><p>Your manager account has been approved. You can now log in and manage your hotel.</p>`
            });

            res.json({ message: 'Manager approved successfully' });
        });
    });
});

// Get all hotels
app.get('/api/admin/hotels', authenticate, authorize('admin'), (req, res) => {
    db.query('SELECT * FROM hotels', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Toggle hotel active status
app.put('/api/admin/hotels/:id/status', authenticate, authorize('admin'), (req, res) => {
    const { is_active } = req.body;
    const hotelId = req.params.id;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ message: 'is_active must be boolean' });
    }

    db.query('UPDATE hotels SET is_active = ? WHERE id = ?', [is_active, hotelId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Hotel not found' });
        res.json({ message: `Hotel ${is_active ? 'activated' : 'deactivated'} successfully` });
    });
});

// Delete a hotel
app.delete('/api/admin/hotels/:id', authenticate, authorize('admin'), (req, res) => {
    const hotelId = req.params.id;

    db.query('DELETE FROM hotels WHERE id = ?', [hotelId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Hotel not found' });
        res.json({ message: 'Hotel deleted successfully' });
    });
});

// Get all orders
app.get('/api/admin/orders', authenticate, authorize('admin'), (req, res) => {
    const query = `
        SELECT o.*, u.name as user_name, h.name as hotel_name 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN hotels h ON o.hotel_id = h.id
        ORDER BY o.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Get commission report
app.get('/api/admin/commission-report', authenticate, authorize('admin'), (req, res) => {
    const query = `
        SELECT 
            h.name as hotel_name,
            COUNT(o.id) as total_orders,
            SUM(o.total_amount) as total_sales,
            SUM(o.admin_commission) as total_commission
        FROM hotels h
        LEFT JOIN orders o ON h.id = o.hotel_id
        WHERE o.id IS NOT NULL
        GROUP BY h.id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// ========== MANAGER ROUTES ==========

// Get manager's hotel
app.get('/api/manager/hotel', authenticate, authorize('manager'), (req, res) => {
    const userId = req.user.id;
    
    db.query('SELECT * FROM hotels WHERE manager_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) {
            return res.status(404).json({ message: 'Hotel not found' });
        }
        res.json(results[0]);
    });
});

// Get menu items for manager's hotel
app.get('/api/manager/menu', authenticate, authorize('manager'), (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT fi.* FROM food_items fi
        JOIN hotels h ON fi.hotel_id = h.id
        WHERE h.manager_id = ?
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Add food item
app.post('/api/manager/menu', authenticate, authorize('manager'), upload.single('image'), async (req, res) => {
    const { name, description, price, category, image_url } = req.body;
    const userId = req.user.id;

    try {
        const [hotelResults] = await db.promise().query('SELECT id FROM hotels WHERE manager_id = ?', [userId]);
        if (!hotelResults.length) {
            return res.status(404).json({ message: 'Hotel not found' });
        }

        const hotelId = hotelResults[0].id;
        let finalImageUrl = image_url || null;

        if (req.file) {
            const stored = await processAndStoreImage(req.file.buffer, 'food');
            finalImageUrl = stored.url;
        }

        const query = 'INSERT INTO food_items (hotel_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.promise().query(query, [hotelId, name, description, price, category, finalImageUrl]);
        res.status(201).json({ message: 'Food item added successfully', id: result.insertId });
    } catch (error) {
        console.error('Add menu item error:', error.message);
        res.status(500).json({ message: 'Failed to add food item' });
    }
});

// Update food item
app.put('/api/manager/menu/:id', authenticate, authorize('manager'), upload.single('image'), async (req, res) => {
    const { name, description, price, category, is_available, image_url } = req.body;
    const foodId = req.params.id;
    const userId = req.user.id;

    try {
        let finalImageUrl = image_url || null;

        if (req.file) {
            const stored = await processAndStoreImage(req.file.buffer, 'food');
            finalImageUrl = stored.url;
        }

        const query = `
            UPDATE food_items fi
            JOIN hotels h ON fi.hotel_id = h.id
            SET fi.name = ?, fi.description = ?, fi.price = ?, fi.category = ?, fi.is_available = ?, fi.image_url = ?
            WHERE fi.id = ? AND h.manager_id = ?
        `;
        await db.promise().query(query, [name, description, price, category, is_available, finalImageUrl, foodId, userId]);
        res.json({ message: 'Food item updated successfully' });
    } catch (error) {
        console.error('Update menu item error:', error.message);
        res.status(500).json({ message: 'Failed to update food item' });
    }
});

// Delete food item
app.delete('/api/manager/menu/:id', authenticate, authorize('manager'), (req, res) => {
    const foodId = req.params.id;
    const userId = req.user.id;
    
    const query = `
        DELETE fi FROM food_items fi
        JOIN hotels h ON fi.hotel_id = h.id
        WHERE fi.id = ? AND h.manager_id = ?
    `;
    db.query(query, [foodId, userId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Food item deleted successfully' });
    });
});

// Get orders for manager's hotel
app.get('/api/manager/orders', authenticate, authorize('manager'), (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT o.*, u.name as user_name 
        FROM orders o
        JOIN hotels h ON o.hotel_id = h.id
        JOIN users u ON o.user_id = u.id
        WHERE h.manager_id = ?
        ORDER BY o.created_at DESC
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Update order status
app.put('/api/manager/orders/:id/status', authenticate, authorize('manager'), (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const userId = req.user.id;
    
    const query = `
        UPDATE orders o
        JOIN hotels h ON o.hotel_id = h.id
        SET o.status = ?
        WHERE o.id = ? AND h.manager_id = ?
    `;
    db.query(query, [status, orderId, userId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Order status updated successfully' });
    });
});

// Get manager earnings
app.get('/api/manager/earnings', authenticate, authorize('manager'), (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            SUM(o.manager_amount) as total_earnings,
            COUNT(o.id) as total_orders
        FROM orders o
        JOIN hotels h ON o.hotel_id = h.id
        WHERE h.manager_id = ? AND o.status = 'completed'
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results[0] || { total_earnings: 0, total_orders: 0 });
    });
});

// ========== USER ROUTES ==========

// Get all hotels
app.get('/api/hotels', (req, res) => {
  const query = `
    SELECT h.*,
      COALESCE((SELECT MIN(fi.price) FROM food_items fi WHERE fi.hotel_id = h.id AND fi.is_available = TRUE), 0) AS min_dish_price,
      COALESCE((SELECT MAX(fi.price) FROM food_items fi WHERE fi.hotel_id = h.id AND fi.is_available = TRUE), 0) AS max_dish_price
    FROM hotels h
    WHERE h.is_active = TRUE
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

// Get hotel details with menu
app.get('/api/hotels/:id', (req, res) => {
    const hotelId = req.params.id;
    
    const hotelQuery = 'SELECT * FROM hotels WHERE id = ?';
    db.query(hotelQuery, [hotelId], (err, hotelResults) => {
        if (err || hotelResults.length === 0) {
            return res.status(404).json({ message: 'Hotel not found' });
        }
        
        const menuQuery = 'SELECT * FROM food_items WHERE hotel_id = ? AND is_available = TRUE';
        db.query(menuQuery, [hotelId], (err, menuResults) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({
                hotel: hotelResults[0],
                menu: menuResults
            });
        });
    });
});

// Create order
app.post('/api/orders', authenticate, authorize('user'), async (req, res) => {
    const { hotel_id, items, delivery_address, payment_method, phone_number } = req.body;
    const user_id = req.user.id;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Order items are required' });
    }

    const orderItems = items.map(item => {
        const price = Number(item.price || 0);
        const quantity = Number(item.quantity || 0);
        return {
            food_item_id: item.food_item_id,
            quantity,
            price,
            subtotal: price * quantity
        };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const commissionRate = 10;
    const adminCommission = totalAmount * (commissionRate / 100);
    const managerAmount = totalAmount - adminCommission;

    const orderPayload = {
        user_id,
        hotel_id,
        total_amount: totalAmount,
        delivery_address,
        payment_method,
        payment_status: 'pending',
        commission_rate: commissionRate,
        admin_commission: adminCommission,
        manager_amount: managerAmount,
        phone_number: phone_number || req.body.mpesa_number || null
    };

    try {
        const [result] = await db.promise().query(
            `INSERT INTO orders
             (user_id, hotel_id, total_amount, delivery_address, payment_method,
              payment_status, commission_rate, admin_commission, manager_amount, phone_number, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                orderPayload.user_id,
                orderPayload.hotel_id,
                orderPayload.total_amount,
                orderPayload.delivery_address,
                orderPayload.payment_method,
                orderPayload.payment_status,
                orderPayload.commission_rate,
                orderPayload.admin_commission,
                orderPayload.manager_amount,
                orderPayload.phone_number
            ]
        );

        const orderId = result.insertId;

        await Promise.all(orderItems.map(item => {
            return db.promise().query(
                'INSERT INTO order_items (order_id, food_item_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.food_item_id, item.quantity, item.price, item.subtotal]
            );
        }));

        if (payment_method === 'mpesa') {
            const phoneNumber = orderPayload.phone_number || req.body.mpesa_number || null;
            const paymentResponse = await initiateMpesaStkPush({
                amount: Math.ceil(totalAmount),
                phoneNumber,
                orderId,
                description: `Order #${orderId} payment`
            });

            await db.promise().query(
                'UPDATE orders SET checkout_request_id = ?, merchant_request_id = ?, payment_initiated_at = NOW() WHERE id = ?',
                [paymentResponse.checkoutRequestId, paymentResponse.merchantRequestId, orderId]
            );

            return res.status(201).json({
                message: 'Order created and M-Pesa payment initiated',
                order_id: orderId,
                total_amount: totalAmount,
                admin_commission: adminCommission,
                manager_amount: managerAmount,
                payment_status: 'pending',
                checkout_request_id: paymentResponse.checkoutRequestId,
                merchant_request_id: paymentResponse.merchantRequestId,
                customer_message: paymentResponse.customerMessage || 'M-Pesa prompt sent'
            });
        }

        await db.promise().query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', orderId]);

        return res.status(201).json({
            message: 'Order placed successfully',
            order_id: orderId,
            total_amount: totalAmount,
            admin_commission: adminCommission,
            manager_amount: managerAmount,
            payment_status: 'paid'
        });
    } catch (error) {
        console.error('Create order error:', error.message);
        return res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
});

// Get user orders
app.get('/api/users/orders', authenticate, authorize('user'), (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT o.*, h.name as hotel_name 
        FROM orders o
        JOIN hotels h ON o.hotel_id = h.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Confirm delivery
app.put('/api/orders/:id/confirm-delivery', authenticate, authorize('user'), (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    
    db.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const order = results[0];
        if (order.is_delivered) {
            return res.status(400).json({ message: 'Order already delivered' });
        }
        
        const query = `
            UPDATE orders 
            SET status = 'completed', is_delivered = TRUE, delivery_confirmed_at = NOW()
            WHERE id = ?
        `;
        db.query(query, [orderId], (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ message: 'Delivery confirmed successfully' });
        });
    });
});

// M-Pesa callback endpoint
app.post('/api/mpesa/callback', express.json(), async (req, res) => {
    try {
        const body = req.body || {};
        const callback = body.Body?.stkCallback || {};
        const resultCode = callback.ResultCode;
        const resultDesc = callback.ResultDesc || 'STK callback received';
        const metadata = callback.CallbackMetadata?.Item || [];
        const dataMap = {};

        metadata.forEach(item => {
            dataMap[item.Name] = item.Value;
        });

        const checkoutRequestId = dataMap.CheckoutRequestID || null;
        const merchantRequestId = dataMap.MerchantRequestID || null;
        const mpesaReceiptNumber = dataMap.ReceiptNumber || null;
        const phoneNumber = dataMap.PhoneNumber || null;
        const transactionDate = dataMap.TransactionDate || null;

        if (checkoutRequestId) {
            await db.promise().query(
                `UPDATE orders
                 SET payment_status = ?,
                     mpesa_receipt_number = ?,
                     callback_metadata = ?,
                     phone_number = ?,
                     payment_confirmed_at = NOW()
                 WHERE checkout_request_id = ?`,
                [
                    resultCode === 0 ? 'paid' : 'failed',
                    mpesaReceiptNumber,
                    JSON.stringify({ resultCode, resultDesc, metadata, transactionDate }),
                    phoneNumber,
                    checkoutRequestId
                ]
            );
        }

        if (resultCode === 0) {
            await db.promise().query(
                `UPDATE orders
                 SET status = 'confirmed', payment_status = 'paid'
                 WHERE checkout_request_id = ? AND status = 'pending'`,
                [checkoutRequestId]
            );
        }

        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Accepted'
        });
    } catch (error) {
        console.error('M-Pesa callback error:', error.message);
        return res.status(500).json({
            ResultCode: 1,
            ResultDesc: 'Failed to process callback'
        });
    }
});

// Payment status lookup
app.get('/api/orders/:id/payment-status', authenticate, authorize('user'), async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            'SELECT payment_status, checkout_request_id, mpesa_receipt_number, status FROM orders WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch payment status' });
    }
});

// Stripe Payment Intent endpoint
app.post('/api/stripe/create-payment-intent', authenticate, authorize('user'), async (req, res) => {
    try {
        const { amount, orderId, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Create payment intent
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                orderId: orderId,
                userId: req.user.id,
                description: description || `Order #${orderId}`
            },
            description: description || `Order #${orderId} payment`
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
    }
});

// Stripe Webhook endpoint (for production use)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
        const event = stripeClient.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'test_secret'
        );

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const { orderId } = paymentIntent.metadata;

            // Update order payment status
            await db.promise().query(
                'UPDATE orders SET payment_status = ?, stripe_payment_id = ? WHERE id = ?',
                ['paid', paymentIntent.id, orderId]
            );

            console.log(`✅ Payment succeeded for order ${orderId}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

const http = require('http');
const { initSocket, emitToUser, emitToRole } = require('./socket');

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the backend at http://localhost:${PORT}/api/test`);
});

// Release a completed order's manager funds
app.put('/api/admin/orders/:id/release-funds', authenticate, authorize('admin'), (req, res) => {
    db.query('UPDATE orders SET funds_released = TRUE, funds_released_at = NOW() WHERE id = ? AND status = "completed"', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(400).json({ message: 'Only completed orders can release funds' });
        res.json({ message: 'Funds released to hotel successfully' });
    });
});

// Admin confirmation for delivery exceptions or manual reconciliation
app.put('/api/admin/orders/:id/confirm-delivery', authenticate, authorize('admin'), (req, res) => {
    db.query('UPDATE orders SET status = "completed", is_delivered = TRUE, delivery_confirmed_at = NOW() WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
        res.json({ message: 'Delivery confirmed successfully' });
    });
});

// Get random offer item (10% off)
app.get('/api/offers/random', (req, res) => {
    const query = `
        SELECT fi.*, h.name as hotel_name, 
               ROUND(fi.price * 0.9, 2) as discounted_price,
               '10% OFF' as offer_label
        FROM food_items fi
        JOIN hotels h ON fi.hotel_id = h.id
        WHERE fi.is_available = TRUE
        ORDER BY RAND()
        LIMIT 1
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.json(null);
        }
    });
});

// Get hotels by cuisine type
app.get('/api/hotels/cuisine/:type', (req, res) => {
    const { type } = req.params;
    const query = 'SELECT * FROM hotels WHERE cuisine_type LIKE ? AND is_active = TRUE';
    db.query(query, [`%${type}%`], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// Get featured hotels (top rated)
app.get('/api/hotels/featured', (req, res) => {
    const query = 'SELECT * FROM hotels WHERE rating >= 4.0 AND is_active = TRUE ORDER BY rating DESC LIMIT 4';
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// ========== NEW: Nearby Hotels ==========
app.get('/api/hotels/nearby', (req, res) => {
    const { lat, lng, maxDistance = 10 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and longitude required' });
    }

    const query = `
        SELECT *,
        (6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
        )) AS distance_km
        FROM hotels
        WHERE is_active = TRUE
        HAVING distance_km <= ?
        ORDER BY distance_km ASC
    `;
    
    db.query(query, [lat, lng, lat, maxDistance], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// ========== NEW: Budget Filter ==========
app.get('/api/hotels/budget/:range', (req, res) => {
    const ranges = {
        'budget': [0, 700],
        'mid': [700, 1500],
        'premium': [1500, 3000],
        'luxury': [3000, 100000]
    };
    
    const range = ranges[req.params.range];
    if (!range) return res.status(400).json({ message: 'Invalid budget range' });
    
    const query = `
        SELECT h.*, 
               MIN(fi.price) as min_price,
               COUNT(fi.id) as item_count
        FROM hotels h
        JOIN food_items fi ON h.id = fi.hotel_id
        WHERE fi.price BETWEEN ? AND ? AND fi.is_available = TRUE
        GROUP BY h.id
        HAVING item_count > 0
        ORDER BY min_price ASC
    `;
    
    db.query(query, [range[0], range[1]], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Budget-filtered food items endpoint
app.get('/api/food-items/by-budget', (req, res) => {
    const { range = 'all' } = req.query;
    
    const ranges = {
        'budget': [0, 700],
        'mid': [700, 1500],
        'premium': [1500, 3000],
        'luxury': [3000, 100000]
    };
    
    const priceRange = ranges[range];
    if (!priceRange) return res.status(400).json({ message: 'Invalid budget range' });
    
    const query = `
        SELECT 
            fi.id, fi.name, fi.price, fi.description, fi.category, fi.image_url,
            fi.is_available, fi.is_on_offer, fi.discount_percent, fi.hotel_id,
            h.name as hotel_name, h.emoji as hotel_emoji, h.brand_color as hotel_color,
            h.cuisine_type, h.rating as hotel_rating, h.vibe as hotel_vibe,
            h.delivery_time_min, h.delivery_time_max
        FROM food_items fi
        JOIN hotels h ON fi.hotel_id = h.id
        WHERE CAST(fi.price AS DECIMAL(10,2)) BETWEEN ? AND ? 
          AND fi.is_available = TRUE 
          AND h.is_active = TRUE
        ORDER BY CAST(fi.price AS DECIMAL(10,2)) ASC, fi.name ASC
        LIMIT 100
    `;
    
    db.query(query, [priceRange[0], priceRange[1]], (err, items) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ items: items || [] });
    });
});

// ========== NEW: Order Tracking ==========
app.get('/api/orders/:id/track', authenticate, (req, res) => {
    const orderId = req.params.id;
    
    const query = `
        SELECT o.*, 
               h.name as hotel_name, h.latitude as hotel_lat, h.longitude as hotel_lng,
               h.brand_color as hotel_color, h.emoji as hotel_emoji,
               u.name as customer_name
        FROM orders o
        JOIN hotels h ON o.hotel_id = h.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;
    
    db.query(query, [orderId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const order = results[0];
        
        // Simulate delivery person position based on order status
        const deliveryProgress = {
            'pending': 0,
            'confirmed': 0.1,
            'preparing': 0.3,
            'ready': 0.5,
            'delivered': 0.8,
            'completed': 1.0
        }[order.status] || 0;
        
        // Simulate delivery person moving from hotel to customer
        const deliveryLat = order.hotel_lat + (order.delivery_lat - order.hotel_lat) * deliveryProgress;
        const deliveryLng = order.hotel_lng + (order.delivery_lng - order.hotel_lng) * deliveryProgress;
        
        res.json({
            ...order,
            delivery_person: {
                name: 'James Mwangi',
                phone: '+254712345678',
                lat: deliveryLat || order.hotel_lat,
                lng: deliveryLng || order.hotel_lng,
                progress: deliveryProgress
            }
        });
    });
});

// ============================================
// RATINGS & REVIEWS
// ============================================

app.get('/api/hotels/:id/reviews', (req, res) => {
  const hotelId = req.params.id;
  const limit = parseInt(req.query.limit) || 20;
  const query = `
    SELECT r.id, r.rating, r.food_rating, r.delivery_rating,
           r.title, r.review, r.tags, r.created_at,
           u.name AS customer_name, o.order_number
    FROM ratings r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN orders o ON r.order_id = o.id
    WHERE r.hotel_id = ? AND r.is_visible = TRUE
    ORDER BY r.created_at DESC
    LIMIT ?
  `;
  db.query(query, [hotelId, limit], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

app.get('/api/hotels/:id/reviews/summary', (req, res) => {
  const query = `
    SELECT COUNT(*) AS total, AVG(rating) AS avg_rating,
      AVG(food_rating) AS avg_food, AVG(delivery_rating) AS avg_delivery,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star
    FROM ratings WHERE hotel_id = ? AND is_visible = TRUE
  `;
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results[0]);
  });
});

app.get('/api/users/pending-reviews', authenticate, authorize('user'), (req, res) => {
  const query = `
    SELECT o.id AS order_id, o.order_number, o.created_at, o.delivery_confirmed_at,
           h.id AS hotel_id, h.name AS hotel_name, h.emoji AS hotel_emoji,
           h.brand_color AS hotel_color, h.cuisine_type
    FROM orders o
    JOIN hotels h ON o.hotel_id = h.id
    LEFT JOIN ratings r ON r.order_id = o.id AND r.user_id = o.user_id
    WHERE o.user_id = ? AND o.status = 'completed' AND r.id IS NULL
    ORDER BY o.created_at DESC
  `;
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

app.post('/api/reviews', authenticate, authorize('user'), (req, res) => {
  const userId = req.user.id;
  const { order_id, rating, food_rating, delivery_rating, title, review, tags } = req.body;

  if (!order_id || !rating) return res.status(400).json({ message: 'Order ID and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

  db.query('SELECT hotel_id, user_id, status FROM orders WHERE id = ?', [order_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });
    const order = results[0];
    if (order.user_id !== userId) return res.status(403).json({ message: 'Not your order' });
    if (order.status !== 'completed') return res.status(400).json({ message: 'Can only review completed orders' });

    db.query('SELECT id FROM ratings WHERE order_id = ? AND user_id = ?', [order_id, userId], (err, existing) => {
      if (existing && existing.length > 0) return res.status(400).json({ message: 'Already reviewed' });

      const insertQuery = `
        INSERT INTO ratings (order_id, user_id, hotel_id, rating, food_rating, delivery_rating, title, review, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, [order_id, userId, order.hotel_id, rating,
        food_rating || rating, delivery_rating || rating,
        title || null, review || null, tags || null], (err, insertResult) => {
        if (err) return res.status(500).json({ message: 'Failed to save review' });

        db.query(`
          UPDATE hotels SET
            rating = (SELECT AVG(rating) FROM ratings WHERE hotel_id = ? AND is_visible = TRUE),
            rating_count = (SELECT COUNT(*) FROM ratings WHERE hotel_id = ? AND is_visible = TRUE)
          WHERE id = ?
        `, [order.hotel_id, order.hotel_id, order.hotel_id]);

        res.status(201).json({ message: 'Review submitted', id: insertResult.insertId });
      });
    });
  });
});

app.get('/api/admin/reviews', authenticate, authorize('admin'), (req, res) => {
  const query = `
    SELECT r.*, u.name AS customer_name, u.email AS customer_email,
           h.name AS hotel_name, h.emoji AS hotel_emoji, o.order_number
    FROM ratings r
    JOIN users u ON r.user_id = u.id
    JOIN hotels h ON r.hotel_id = h.id
    LEFT JOIN orders o ON r.order_id = o.id
    ORDER BY r.created_at DESC LIMIT 100
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

app.put('/api/admin/reviews/:id/visibility', authenticate, authorize('admin'), (req, res) => {
  const { is_visible } = req.body;
  const reviewId = req.params.id;
  db.query('SELECT hotel_id FROM ratings WHERE id = ?', [reviewId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'Not found' });
    const hotelId = results[0].hotel_id;
    db.query('UPDATE ratings SET is_visible = ? WHERE id = ?', [is_visible, reviewId], (err) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      db.query(`
        UPDATE hotels SET
          rating = COALESCE((SELECT AVG(rating) FROM ratings WHERE hotel_id = ? AND is_visible = TRUE), 0),
          rating_count = (SELECT COUNT(*) FROM ratings WHERE hotel_id = ? AND is_visible = TRUE)
        WHERE id = ?
      `, [hotelId, hotelId, hotelId]);
      res.json({ message: `Review ${is_visible ? 'shown' : 'hidden'}` });
    });
  });
  // ============================================
// IMAGE AUTO-SUGGEST
// ============================================

const FOOD_IMAGE_BANK = {
  pizza: [
    'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&q=80',
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
    'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&q=80'
  ],
  chicken: [
    'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&q=80',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80',
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80',
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80'
  ],
  pasta: [
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80',
    'https://images.unsplash.com/photo-1645112411342-4665a10d6f7d?w=600&q=80',
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
    'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=600&q=80'
  ],
  sushi: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80',
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&q=80',
    'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=600&q=80',
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600&q=80',
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=600&q=80'
  ],
  salad: [
    'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80',
    'https://images.unsplash.com/photo-1592417817098-8fd3d9a2d8d7?w=600&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
    'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600&q=80'
  ],
  dessert: [
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291779?w=600&q=80',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
    'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=600&q=80',
    'https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=600&q=80',
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&q=80'
  ],
  fries: [
    'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&q=80',
    'https://images.unsplash.com/photo-1589905462107-ec7f8c918b7a?w=600&q=80',
    'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80',
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80',
    'https://images.unsplash.com/photo-1630431341973-02e1b662ec35?w=600&q=80'
  ],
  drinks: [
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
    'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80',
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=80',
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80',
    'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&q=80'
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
    'https://images.unsplash.com/photo-1574486838756-379b9f99be6d?w=600&q=80',
    'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=600&q=80',
    'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=600&q=80',
    'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',
    'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80'
  ],
  steak: [
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80',
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&q=80',
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600&q=80'
  ],
  fish: [
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
    'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=600&q=80',
    'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600&q=80',
    'https://images.unsplash.com/photo-1611599537845-1c7aca0091c0?w=600&q=80',
    'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&q=80'
  ],
  rice: [
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80',
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80',
    'https://images.unsplash.com/photo-1567337710282-00832b415979?w=600&q=80',
    'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80',
    'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&q=80'
  ],
  wrap: [
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80',
    'https://images.unsplash.com/photo-1600850056064-a8b380df8395?w=600&q=80',
    'https://images.unsplash.com/photo-1628191010210-a59de2ea65ce?w=600&q=80',
    'https://images.unsplash.com/photo-1562059390-a761a084768e?w=600&q=80',
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&q=80',
    'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=600&q=80'
  ]
};

const KEYWORD_MAP = {
  pizza: 'pizza', margherita: 'pizza', pepperoni: 'pizza', bbq: 'pizza',
  burger: 'burger', cheeseburger: 'burger', hamburger: 'burger',
  chicken: 'chicken', wings: 'chicken', nuggets: 'chicken', tenders: 'chicken',
  pasta: 'pasta', spaghetti: 'pasta', alfredo: 'pasta', carbonara: 'pasta',
  macaroni: 'pasta', fettuccine: 'pasta', linguine: 'pasta', lasagna: 'pasta',
  sushi: 'sushi', roll: 'sushi', sashimi: 'sushi',
  salad: 'salad', caesar: 'salad', caprese: 'salad',
  cake: 'dessert', tiramisu: 'dessert', brulee: 'dessert', dessert: 'dessert',
  chocolate: 'dessert', lava: 'dessert',
  fries: 'fries', chips: 'fries',
  drink: 'drinks', soda: 'drinks', juice: 'drinks', wine: 'drinks',
  milkshake: 'drinks', coffee: 'drinks', tea: 'drinks',
  soup: 'soup', bisque: 'soup', broth: 'soup',
  steak: 'steak', beef: 'steak', ribs: 'steak',
  salmon: 'fish', fish: 'fish', tuna: 'fish', seafood: 'fish',
  rice: 'rice', biryani: 'rice', pilau: 'rice', risotto: 'rice',
  wrap: 'wrap', burrito: 'wrap', shawarma: 'wrap', taco: 'wrap'
};

app.get('/api/manager/menu/suggest-images', authenticate, authorize('manager'), (req, res) => {
  const name = (req.query.name || '').toLowerCase().trim();
  if (!name) return res.json({ images: [], category: null });

  let matchedCategory = null;
  for (const keyword of Object.keys(KEYWORD_MAP)) {
    if (name.includes(keyword)) {
      matchedCategory = KEYWORD_MAP[keyword];
      break;
    }
  }
  if (!matchedCategory) matchedCategory = 'pizza';

  const images = FOOD_IMAGE_BANK[matchedCategory] || [];
  res.json({ images, category: matchedCategory });
});
// ============================================
// MULTIPLE PHOTOS
// ============================================

app.get('/api/food-items/:id/images', (req, res) => {
  db.query(
    'SELECT * FROM food_images WHERE food_item_id = ? ORDER BY is_primary DESC, display_order ASC',
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.post(
  '/api/manager/menu/:id/images',
  authenticate,
  authorize('manager'),
  upload.single('image'),
  async (req, res) => {
    const itemId = req.params.id;
    const userId = req.user.id;
    const { image_url } = req.body;

    const check = `
      SELECT fi.id FROM food_items fi
      JOIN hotels h ON fi.hotel_id = h.id
      WHERE fi.id = ? AND h.manager_id = ?
    `;
    db.query(check, [itemId, userId], async (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ message: 'Item not found' });

      let finalUrl = image_url;
      if (req.file) {
        const stored = await processAndStoreImage(req.file.buffer, 'food');
        finalUrl = stored.url;
      }
      if (!finalUrl) return res.status(400).json({ message: 'Image required' });

      db.query(
        'INSERT INTO food_images (food_item_id, image_url, is_primary) VALUES (?, ?, FALSE)',
        [itemId, finalUrl],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Database error' });
          res.status(201).json({ id: result.insertId, image_url: finalUrl });
        }
      );
    });
  }
);

app.delete('/api/manager/menu/:itemId/images/:imageId', authenticate, authorize('manager'), (req, res) => {
  const { itemId, imageId } = req.params;
  const userId = req.user.id;

  const check = `
    SELECT fi.id FROM food_items fi
    JOIN hotels h ON fi.hotel_id = h.id
    WHERE fi.id = ? AND h.manager_id = ?
  `;
  db.query(check, [itemId, userId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'Item not found' });

    db.query('DELETE FROM food_images WHERE id = ? AND food_item_id = ?', [imageId, itemId], (err) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json({ message: 'Deleted' });
    });
  });
});

app.put('/api/manager/menu/:itemId/images/:imageId/primary', authenticate, authorize('manager'), (req, res) => {
  const { itemId, imageId } = req.params;
  const userId = req.user.id;

  const check = `
    SELECT fi.id FROM food_items fi
    JOIN hotels h ON fi.hotel_id = h.id
    WHERE fi.id = ? AND h.manager_id = ?
  `;
  db.query(check, [itemId, userId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'Item not found' });

    db.query('UPDATE food_images SET is_primary = FALSE WHERE food_item_id = ?', [itemId], () => {
      db.query('UPDATE food_images SET is_primary = TRUE WHERE id = ?', [imageId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        db.query('SELECT image_url FROM food_images WHERE id = ?', [imageId], (err, r) => {
          if (!err && r.length > 0) {
            db.query('UPDATE food_items SET image_url = ? WHERE id = ?', [r[0].image_url, itemId]);
          }
          res.json({ message: 'Primary updated' });
        });
      });
      // ============================================
// RELATED ITEMS + VIEW TRACKING + ANALYTICS
// ============================================

app.post('/api/food-items/:id/view', (req, res) => {
  const itemId = req.params.id;
  const userId = req.user?.id || null;
  db.query(
    'INSERT INTO item_views (food_item_id, user_id) VALUES (?, ?)',
    [itemId, userId],
    () => res.json({ ok: true })
  );
});

app.get('/api/food-items/:id/related', (req, res) => {
  const itemId = req.params.id;
  const query = `
    SELECT fi.*, h.name AS hotel_name, h.emoji AS hotel_emoji, h.brand_color,
           COUNT(*) AS co_count
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi2.food_item_id != oi1.food_item_id
    JOIN food_items fi ON oi2.food_item_id = fi.id
    JOIN hotels h ON fi.hotel_id = h.id
    WHERE oi1.food_item_id = ? AND fi.is_available = TRUE
    GROUP BY fi.id
    ORDER BY co_count DESC
    LIMIT 6
  `;
  db.query(query, [itemId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

app.get('/api/manager/analytics', authenticate, authorize('manager'), (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT fi.id, fi.name, fi.category, fi.price, fi.image_url,
           COALESCE(v.view_count, 0) AS views,
           COALESCE(o.order_count, 0) AS orders,
           COALESCE(o.total_revenue, 0) AS revenue
    FROM food_items fi
    JOIN hotels h ON fi.hotel_id = h.id
    LEFT JOIN (SELECT food_item_id, COUNT(*) AS view_count FROM item_views GROUP BY food_item_id) v
      ON v.food_item_id = fi.id
    LEFT JOIN (
      SELECT oi.food_item_id, SUM(oi.quantity) AS order_count, SUM(oi.subtotal) AS total_revenue
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' GROUP BY oi.food_item_id
    ) o ON o.food_item_id = fi.id
    WHERE h.manager_id = ?
    ORDER BY orders DESC, views DESC
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});
app.get('/api/manager/analytics/charts', authenticate, authorize('manager'), (req, res) => {
  const userId = req.user.id;
  const days = parseInt(req.query.days) || 30;

  const statsQuery = `
    SELECT DATE(o.created_at) AS day, COUNT(*) AS orders,
           SUM(o.total_amount) AS revenue, SUM(o.manager_amount) AS manager_earnings
    FROM orders o JOIN hotels h ON o.hotel_id = h.id
    WHERE h.manager_id = ? AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND o.status = 'completed'
    GROUP BY DATE(o.created_at) ORDER BY day ASC
  `;
  const topItemsQuery = `
    SELECT fi.name, SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
    FROM order_items oi
    JOIN food_items fi ON oi.food_item_id = fi.id
    JOIN orders o ON oi.order_id = o.id
    JOIN hotels h ON fi.hotel_id = h.id
    WHERE h.manager_id = ? AND o.status = 'completed'
    GROUP BY fi.id ORDER BY revenue DESC LIMIT 8
  `;
  const hourlyQuery = `
    SELECT HOUR(o.created_at) AS hour, COUNT(*) AS orders
    FROM orders o JOIN hotels h ON o.hotel_id = h.id
    WHERE h.manager_id = ? AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY HOUR(o.created_at) ORDER BY hour ASC
  `;
  const statusQuery = `
    SELECT o.status, COUNT(*) AS count
    FROM orders o JOIN hotels h ON o.hotel_id = h.id
    WHERE h.manager_id = ? GROUP BY o.status
  `;

  Promise.all([
    new Promise((r) => db.query(statsQuery, [userId, days], (e, rows) => r(rows || []))),
    new Promise((r) => db.query(topItemsQuery, [userId], (e, rows) => r(rows || []))),
    new Promise((r) => db.query(hourlyQuery, [userId], (e, rows) => r(rows || []))),
    new Promise((r) => db.query(statusQuery, [userId], (e, rows) => r(rows || [])))
  ]).then(([trend, topItems, hourly, statusDist]) => {
    res.json({ trend, topItems, hourly, statusDist });
  });
});

app.get('/api/admin/analytics/charts', authenticate, authorize('admin'), (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const revenueQuery = `
    SELECT DATE(created_at) AS day, COUNT(*) AS orders,
           SUM(total_amount) AS revenue, SUM(admin_commission) AS commission
    FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND status = 'completed'
    GROUP BY DATE(created_at) ORDER BY day ASC
  `;
  const topHotelsQuery = `
    SELECT h.name, h.emoji, h.brand_color, COUNT(o.id) AS orders,
           SUM(o.total_amount) AS revenue, SUM(o.admin_commission) AS commission
    FROM hotels h LEFT JOIN orders o ON h.id = o.hotel_id AND o.status = 'completed'
    GROUP BY h.id ORDER BY revenue DESC
  `;
  const statusQuery = `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`;

  Promise.all([
    new Promise((r) => db.query(revenueQuery, [days], (e, rows) => r(rows || []))),
    new Promise((r) => db.query(topHotelsQuery, (e, rows) => r(rows || []))),
    new Promise((r) => db.query(statusQuery, (e, rows) => r(rows || [])))
  ]).then(([trend, topHotels, statusDist]) => {
    res.json({ trend, topHotels, statusDist });
  });
});

app.get('/api/users/notifications', authenticate, (req, res) => {
  db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.put('/api/users/notifications/read-all', authenticate, (req, res) => {
  db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'All marked read' });
  });
});

app.get('/api/orders/:id/chat', authenticate, (req, res) => {
  const orderId = req.params.id;
  db.query(
    `SELECT c.*, u.name AS sender_name FROM chats c
     JOIN users u ON c.sender_id = u.id
     WHERE c.order_id = ? ORDER BY c.created_at ASC`,
    [orderId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      db.query('UPDATE chats SET is_read = TRUE WHERE order_id = ? AND sender_id != ?', [orderId, req.user.id]);
      res.json(results);
    }
  );
});

app.post('/api/orders/:id/chat', authenticate, (req, res) => {
  const orderId = req.params.id;
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ message: 'Message required' });

  db.query(
    'INSERT INTO chats (order_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
    [orderId, req.user.id, req.user.role, message.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error' });

      db.query(`
        SELECT o.user_id, h.manager_id FROM orders o
        JOIN hotels h ON o.hotel_id = h.id WHERE o.id = ?
      `, [orderId], (err, rows) => {
        if (!err && rows[0]) {
          const { user_id, manager_id } = rows[0];
          const recipientId = req.user.id === user_id ? manager_id : user_id;
          if (recipientId) emitToUser(recipientId, 'new_chat_message', {
            title: '💬 New message',
            message: message.slice(0, 60),
            order_id: orderId
          });
        }
      });

      res.status(201).json({ id: result.insertId, message: message.trim() });
    }
  );
});

app.post('/api/manager/menu/generate-description', authenticate, authorize('manager'), async (req, res) => {
  const { name, category, price } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Dish name required' });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    const templates = [
      `${name} — a house favorite, prepared fresh daily with the finest local ingredients.`,
      `Our signature ${name}, made with care. Rich flavors, generous portions.`,
      `Experience ${name} done right. Chef-crafted using traditional recipes.`
    ];
    return res.json({
      description: templates[Math.floor(Math.random() * templates.length)],
      source: 'fallback'
    });
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Kenyan restaurant menu copywriter. Always respond with only the description, no preamble.' },
        { role: 'user', content: `Write a short, appetizing menu description for: ${name} (${category || 'Main'}). 2 short sentences max (under 30 words). Warm tone. Mention 1-2 key ingredients. No clichés. Return only the description text.` }
      ],
      max_tokens: 120,
      temperature: 0.85
    });
    res.json({
      description: completion.choices[0]?.message?.content?.trim() || '',
      source: 'openai'
    });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ message: 'Failed to generate description' });
  }
});
// ============================================
// FAVORITES
// ============================================

// Get user's favorites
app.get('/api/users/favorites', authenticate, (req, res) => {
  db.query(
    `SELECT h.*, f.created_at AS favorited_at
     FROM favorites f
     JOIN hotels h ON f.hotel_id = h.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

// Get user's favorite hotel IDs (for quick lookup)
app.get('/api/users/favorites/ids', authenticate, (req, res) => {
  db.query(
    'SELECT hotel_id FROM favorites WHERE user_id = ?',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results.map(r => r.hotel_id));
    }
  );
});

// Toggle favorite
app.post('/api/favorites/:hotelId/toggle', authenticate, (req, res) => {
  const hotelId = req.params.hotelId;
  const userId = req.user.id;

  db.query(
    'SELECT id FROM favorites WHERE user_id = ? AND hotel_id = ?',
    [userId, hotelId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });

      if (results.length > 0) {
        db.query(
          'DELETE FROM favorites WHERE user_id = ? AND hotel_id = ?',
          [userId, hotelId],
          (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ favorited: false });
          }
        );
      } else {
        db.query(
          'INSERT INTO favorites (user_id, hotel_id) VALUES (?, ?)',
          [userId, hotelId],
          (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ favorited: true });
          }
        );
      }
    }
  );
});

// ============================================
// HERO FEATURED HOTELS (top 3 for carousel)
// ============================================

app.get('/api/hotels/hero-featured', (req, res) => {
  const query = `
    SELECT h.*,
           COUNT(o.id) AS order_count,
           COALESCE(AVG(r.rating), h.rating) AS effective_rating
    FROM hotels h
    LEFT JOIN orders o ON h.id = o.hotel_id AND o.status = 'completed'
    LEFT JOIN ratings r ON h.id = r.hotel_id AND r.is_visible = TRUE
    WHERE h.is_active = TRUE
    GROUP BY h.id
    ORDER BY order_count DESC, effective_rating DESC
    LIMIT 3
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});
// ============================================
// HOTELS — SMART SEARCH + PRICE FILTERING
// ============================================

app.get('/api/hotels/search', (req, res) => {
  const {
    q = '',              // search query
    cuisine = '',        // cuisine filter
    minPrice,            // price range min
    maxPrice,            // price range max
    minRating,           // min rating
    openNow,             // 'true' | 'false'
    sort = 'recommended' // recommended | rating | fastest | cheapest | nearest
  } = req.query;

  const searchTerm = q.trim().toLowerCase();
  const params = [];

  // Base query — hotels + aggregated stats + matched dish info
  let query = `
    SELECT 
      h.*,
      COALESCE((SELECT COUNT(*) FROM orders o WHERE o.hotel_id = h.id AND o.status = 'completed'), 0) AS order_count,
      COALESCE((SELECT AVG(r.rating) FROM ratings r WHERE r.hotel_id = h.id AND r.is_visible = TRUE), h.rating, 0) AS effective_rating,
      COALESCE((SELECT MIN(CAST(fi.price AS DECIMAL(10,2))) FROM food_items fi WHERE fi.hotel_id = h.id AND fi.is_available = TRUE), 0) AS min_dish_price,
      COALESCE((SELECT MAX(CAST(fi.price AS DECIMAL(10,2))) FROM food_items fi WHERE fi.hotel_id = h.id AND fi.is_available = TRUE), 0) AS max_dish_price
    FROM hotels h
    WHERE h.is_active = TRUE
  `;

  // Price filtering — based on actual dish prices
  if (minPrice !== undefined && maxPrice !== undefined) {
    query += ` AND EXISTS (
      SELECT 1 FROM food_items fi
      WHERE fi.hotel_id = h.id 
        AND fi.is_available = TRUE
        AND CAST(fi.price AS DECIMAL(10,2)) BETWEEN ? AND ?
    )`;
    params.push(parseFloat(minPrice), parseFloat(maxPrice));
  }

  // Cuisine filter
  if (cuisine && cuisine !== 'all') {
    query += ` AND (
      LOWER(h.cuisine_type) LIKE ? 
      OR LOWER(h.specialties) LIKE ?
      OR LOWER(h.description) LIKE ?
    )`;
    const like = `%${cuisine.toLowerCase()}%`;
    params.push(like, like, like);
  }

  // Rating filter
  if (minRating) {
    query += ` AND COALESCE(h.rating, 0) >= ?`;
    params.push(parseFloat(minRating));
  }

  // Search — matches hotel name, cuisine, tagline, specialty, OR dish name
  let matchedDishes = {};
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    query += ` AND (
      LOWER(h.name) LIKE ?
      OR LOWER(h.cuisine_type) LIKE ?
      OR LOWER(h.tagline) LIKE ?
      OR LOWER(h.specialties) LIKE ?
      OR LOWER(h.description) LIKE ?
      OR EXISTS (
        SELECT 1 FROM food_items fi
        WHERE fi.hotel_id = h.id
          AND fi.is_available = TRUE
          AND (LOWER(fi.name) LIKE ? OR LOWER(fi.description) LIKE ? OR LOWER(fi.category) LIKE ?)
      )
    )`;
    params.push(like, like, like, like, like, like, like, like);
  }

  // Sort
  switch (sort) {
    case 'rating':
      query += ` ORDER BY effective_rating DESC, order_count DESC`;
      break;
    case 'fastest':
      query += ` ORDER BY h.delivery_time_min ASC`;
      break;
    case 'cheapest':
      query += ` ORDER BY min_dish_price ASC`;
      break;
    case 'nearest':
      // Handled client-side
      query += ` ORDER BY h.rating DESC`;
      break;
    default:
      query += ` ORDER BY effective_rating DESC, order_count DESC`;
  }

  db.query(query, params, (err, hotels) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (hotels.length === 0) {
      return res.json({ hotels: [] });
    }

    // If searching by text, also fetch matching dishes per hotel
    if (searchTerm) {
      const hotelIds = hotels.map(h => h.id);
      const placeholders = hotelIds.map(() => '?').join(',');
      const like = `%${searchTerm}%`;

      const dishesQuery = `
        SELECT id, hotel_id, name, price, category, image_url, 
               is_on_offer, discount_percent
        FROM food_items
        WHERE hotel_id IN (${placeholders})
          AND is_available = TRUE
          AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?)
        ORDER BY price ASC
      `;

      db.query(dishesQuery, [...hotelIds, like, like, like], (err, dishes) => {
        if (err) {
          console.error(err);
          return res.json({ hotels });
        }

        // Group dishes by hotel
        dishes.forEach(d => {
          if (!matchedDishes[d.hotel_id]) matchedDishes[d.hotel_id] = [];
          matchedDishes[d.hotel_id].push(d);
        });

        const enriched = hotels.map(h => ({
          ...h,
          matched_dishes: matchedDishes[h.id] || []
        }));

        res.json({ hotels: enriched });
      });
    } else {
      // No search — still return top dishes per hotel for previews
      const hotelIds = hotels.map(h => h.id);
      const placeholders = hotelIds.map(() => '?').join(',');

      const dishesQuery = `
        SELECT id, hotel_id, name, price, category, image_url,
               is_on_offer, discount_percent
        FROM food_items
        WHERE hotel_id IN (${placeholders}) AND is_available = TRUE
        ORDER BY price ASC
      `;

      db.query(dishesQuery, hotelIds, (err, dishes) => {
        if (err) return res.json({ hotels });
        dishes.forEach(d => {
          if (!matchedDishes[d.hotel_id]) matchedDishes[d.hotel_id] = [];
          matchedDishes[d.hotel_id].push(d);
        });
        const enriched = hotels.map(h => ({
          ...h,
          matched_dishes: matchedDishes[h.id] || []
        }));
        res.json({ hotels: enriched });
      });
    }
  });
});

// ========== NEW: Order Tracking ==========