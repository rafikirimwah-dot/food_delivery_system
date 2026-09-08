const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

db.query('SELECT 1', (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key_here';

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
        
        db.query(query, [name, email, hashedPassword, role, isApproved], (err, result) => {
            if (err) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            
            if (role === 'manager') {
                const requestedHotel = hotelName || 'New Hotel';
                const existingHotelQuery = 'SELECT id FROM hotels WHERE name = ? AND manager_id IS NULL LIMIT 1';
                db.query(existingHotelQuery, [requestedHotel], (hotelLookupError, hotels) => {
                    if (hotelLookupError) {
                        return res.status(500).json({ message: 'Failed to assign hotel' });
                    }

                    const finishRegistration = (hotelError) => {
                        if (hotelError) {
                            return res.status(400).json({ message: 'Failed to assign hotel' });
                        }
                        res.status(201).json({ message: 'Manager registered, awaiting admin approval' });
                    };

                    if (hotels.length > 0) {
                        db.query('UPDATE hotels SET manager_id = ? WHERE id = ?', [result.insertId, hotels[0].id], finishRegistration);
                    } else {
                        db.query('INSERT INTO hotels (name, manager_id) VALUES (?, ?)', [requestedHotel, result.insertId], finishRegistration);
                    }
                });
            } else {
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
    
    db.query('UPDATE users SET is_approved = TRUE WHERE id = ? AND role = "manager"', [managerId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Manager approved successfully' });
    });
});

// Get all hotels
app.get('/api/admin/hotels', authenticate, authorize('admin'), (req, res) => {
    db.query('SELECT * FROM hotels', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
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
app.post('/api/manager/menu', authenticate, authorize('manager'), (req, res) => {
    const { name, description, price, category } = req.body;
    const userId = req.user.id;
    
    // Get hotel id
    db.query('SELECT id FROM hotels WHERE manager_id = ?', [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: 'Hotel not found' });
        }
        
        const hotelId = results[0].id;
        const query = 'INSERT INTO food_items (hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [hotelId, name, description, price, category], (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.status(201).json({ message: 'Food item added successfully', id: result.insertId });
        });
    });
});

// Update food item
app.put('/api/manager/menu/:id', authenticate, authorize('manager'), (req, res) => {
    const { name, description, price, category, is_available } = req.body;
    const foodId = req.params.id;
    const userId = req.user.id;
    
    const query = `
        UPDATE food_items fi
        JOIN hotels h ON fi.hotel_id = h.id
        SET fi.name = ?, fi.description = ?, fi.price = ?, fi.category = ?, fi.is_available = ?
        WHERE fi.id = ? AND h.manager_id = ?
    `;
    db.query(query, [name, description, price, category, is_available, foodId, userId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'Food item updated successfully' });
    });
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
    db.query('SELECT * FROM hotels WHERE is_active = TRUE', (err, results) => {
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
app.post('/api/orders', authenticate, authorize('user'), (req, res) => {
    const { hotel_id, items, delivery_address, payment_method } = req.body;
    const user_id = req.user.id;
    
    // Calculate total
    let totalAmount = 0;
    const orderItems = items.map(item => {
        const subtotal = item.price * item.quantity;
        totalAmount += subtotal;
        return { ...item, subtotal };
    });
    
    const commissionRate = 10; // 10% commission
    const adminCommission = totalAmount * (commissionRate / 100);
    const managerAmount = totalAmount - adminCommission;
    
    // Create order
    const orderQuery = `
        INSERT INTO orders 
        (user_id, hotel_id, total_amount, delivery_address, payment_method, 
         commission_rate, admin_commission, manager_amount, status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'paid')
    `;
    
    db.query(orderQuery, [user_id, hotel_id, totalAmount, delivery_address, payment_method, 
                          commissionRate, adminCommission, managerAmount], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        
        const orderId = result.insertId;
        
        // Insert order items
        const itemQueries = orderItems.map(item => {
            return new Promise((resolve, reject) => {
                const query = 'INSERT INTO order_items (order_id, food_item_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)';
                db.query(query, [orderId, item.food_item_id, item.quantity, item.price, item.subtotal], (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });
        });
        
        Promise.all(itemQueries)
            .then(() => {
                res.status(201).json({ 
                    message: 'Order placed successfully', 
                    order_id: orderId,
                    total_amount: totalAmount,
                    admin_commission: adminCommission,
                    manager_amount: managerAmount
                });
            })
            .catch(() => {
                res.status(500).json({ message: 'Failed to create order items' });
            });
    });
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
    
    // Check if order belongs to user
    db.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const order = results[0];
        if (order.is_delivered) {
            return res.status(400).json({ message: 'Order already delivered' });
        }
        
        // Update order
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
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