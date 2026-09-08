-- =============================================
-- FOOD DELIVERY SYSTEM DATABASE
-- Created for: Multi-vendor Food Delivery App
-- =============================================

-- Drop database if exists (use with caution)
-- DROP DATABASE IF EXISTS food_delivery;

-- Create database
CREATE DATABASE IF NOT EXISTS food_delivery;
USE food_delivery;

-- =============================================
-- TABLE STRUCTURES
-- =============================================

-- 1. USERS TABLE (for all roles: admin, manager, user)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'user') DEFAULT 'user',
    hotel_id INT NULL,
    phone VARCHAR(20),
    address TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_approved (is_approved)
);

-- 2. HOTELS TABLE
CREATE TABLE IF NOT EXISTS hotels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(20),
    cuisine_type VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 0.00,
    image_url VARCHAR(255),
    manager_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_manager_id (manager_id),
    INDEX idx_is_active (is_active)
);

-- 3. FOOD ITEMS TABLE
CREATE TABLE IF NOT EXISTS food_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    preparation_time INT DEFAULT 15, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_is_available (is_available)
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    order_number VARCHAR(20) UNIQUE,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled') DEFAULT 'pending',
    delivery_address TEXT NOT NULL,
    delivery_instructions TEXT,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    admin_commission DECIMAL(10,2) DEFAULT 0.00,
    manager_amount DECIMAL(10,2) DEFAULT 0.00,
    funds_released BOOLEAN DEFAULT FALSE,
    funds_released_at TIMESTAMP NULL,
    is_delivered BOOLEAN DEFAULT FALSE,
    delivery_confirmed_at TIMESTAMP NULL,
    estimated_delivery_time DATETIME,
    actual_delivery_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_order_number (order_number)
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    food_item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id)
);

-- 6. CART TABLE (for guest carts)
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    food_item_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_cart_item (user_id, food_item_id)
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_commission DECIMAL(10,2) DEFAULT 0.00,
    manager_amount DECIMAL(10,2) DEFAULT 0.00,
    released_to_manager BOOLEAN DEFAULT FALSE,
    released_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status)
);

-- 8. DELIVERY TABLE
CREATE TABLE IF NOT EXISTS deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    delivery_person_id INT NULL,
    status ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed') DEFAULT 'pending',
    pickup_time DATETIME,
    delivery_time DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_person_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status)
);

-- 9. RATINGS TABLE
CREATE TABLE IF NOT EXISTS ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order_rating (order_id, user_id),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_rating (rating)
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'payment', 'delivery', 'promotion', 'system') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- 1. Insert Default Admin (password: admin123 - hashed with bcrypt)
INSERT INTO users (name, email, password, role, is_approved) 
VALUES (
    'Admin', 
    'admin@foodapp.com', 
    '$2b$10$YaqXwqwQJUsBslkSgoQX5OAcbAJlWH5HM3EHvHgjRVts8JrDl6XUy', -- admin123
    'admin', 
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_approved = VALUES(is_approved);

-- 2. Insert Hotels
INSERT INTO hotels (name, description, address, phone, cuisine_type, rating, image_url) VALUES
('TIME HOTEL', 
 'Premium dining experience with international cuisine. Our chefs bring you the best flavors from around the world.',
 '123 Main Street, City Center', '+1-555-0101', 'International', 4.5, 'https://via.placeholder.com/300x200?text=TIME+HOTEL'),
 
('MILELE HOTEL', 
 'Authentic local and continental dishes made with fresh, locally sourced ingredients.',
 '456 Oak Avenue, Riverside', '+1-555-0102', 'Continental', 4.3, 'https://via.placeholder.com/300x200?text=MILELE+HOTEL'),
 
('KFU', 
 'Fast food and quick bites for those on the go. Quality meals at affordable prices.',
 '789 Pine Road, Downtown', '+1-555-0103', 'Fast Food', 4.0, 'https://via.placeholder.com/300x200?text=KFU'),
 
('CHICKEN OUT', 
 'Specializing in chicken dishes prepared in various styles - grilled, fried, roasted, and more!',
 '321 Elm Street, Northside', '+1-555-0104', 'Chicken', 4.2, 'https://via.placeholder.com/300x200?text=CHICKEN+OUT'),
 
('SANFORD', 
 'Fine dining with a beautiful view. Perfect for special occasions and romantic dinners.',
 '654 Maple Drive, Hillside', '+1-555-0105', 'Fine Dining', 4.7, 'https://via.placeholder.com/300x200?text=SANFORD');

-- 3. Insert Food Items for Each Hotel

-- TIME HOTEL (hotel_id = 1)
INSERT INTO food_items (hotel_id, name, description, price, category, preparation_time) VALUES
(1, 'Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and fresh basil', 15.99, 'Pizza', 20),
(1, 'Pepperoni Pizza', 'Pizza topped with pepperoni and mozzarella cheese', 17.99, 'Pizza', 20),
(1, 'BBQ Chicken Pizza', 'Pizza with BBQ sauce, chicken, red onions, and cilantro', 18.99, 'Pizza', 22),
(1, 'Classic Burger', 'Beef patty with lettuce, tomato, onion, and special sauce', 12.99, 'Burgers', 15),
(1, 'Cheese Burger', 'Classic burger with cheddar cheese', 13.99, 'Burgers', 15),
(1, 'Grilled Chicken', 'Grilled chicken breast with herbs and spices', 18.99, 'Main Course', 25),
(1, 'Spaghetti Carbonara', 'Pasta with eggs, cheese, pancetta, and black pepper', 14.99, 'Pasta', 20),
(1, 'Fettuccine Alfredo', 'Creamy pasta with parmesan cheese', 16.99, 'Pasta', 20),
(1, 'French Fries', 'Crispy golden french fries', 5.99, 'Sides', 10),
(1, 'Onion Rings', 'Crispy fried onion rings', 6.99, 'Sides', 10),
(1, 'Chicken Wings', 'Spicy chicken wings with dipping sauce', 11.99, 'Appetizers', 15),
(1, 'Caesar Salad', 'Romaine lettuce with Caesar dressing and croutons', 8.99, 'Salads', 10);

-- MILELE HOTEL (hotel_id = 2)
INSERT INTO food_items (hotel_id, name, description, price, category, preparation_time) VALUES
(2, 'Margherita Pizza', 'Classic Italian pizza with fresh ingredients', 14.99, 'Pizza', 20),
(2, 'Chicken Burger', 'Grilled chicken breast with lettuce and mayo', 11.99, 'Burgers', 15),
(2, 'Fettuccine Alfredo', 'Creamy pasta with parmesan and herbs', 15.99, 'Pasta', 20),
(2, 'California Rolls', 'Sushi rolls with crab, avocado, and cucumber', 22.99, 'Sushi', 25),
(2, 'Sweet Potato Fries', 'Crispy sweet potato fries with garlic aioli', 4.99, 'Sides', 10),
(2, 'Grilled Salmon', 'Fresh salmon with lemon butter sauce', 24.99, 'Main Course', 25),
(2, 'Mushroom Risotto', 'Creamy risotto with wild mushrooms', 17.99, 'Main Course', 25),
(2, 'Caprese Salad', 'Fresh mozzarella, tomatoes, and basil', 9.99, 'Salads', 10),
(2, 'Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 7.99, 'Desserts', 5),
(2, 'Panna Cotta', 'Italian cream dessert with berry sauce', 6.99, 'Desserts', 5);

-- KFU (hotel_id = 3)
INSERT INTO food_items (hotel_id, name, description, price, category, preparation_time) VALUES
(3, 'Double Cheeseburger', 'Two beef patties with double cheese', 13.99, 'Burgers', 12),
(3, 'Fried Chicken', 'Crispy fried chicken with secret spices', 16.99, 'Chicken', 18),
(3, 'Mac and Cheese', 'Creamy macaroni with three cheeses', 13.99, 'Pasta', 15),
(3, 'Regular Fries', 'Classic french fries', 5.99, 'Sides', 8),
(3, 'Chicken Nuggets', 'Crispy chicken nuggets with dipping sauce', 9.99, 'Chicken', 12),
(3, 'Milkshake', 'Creamy milkshake in various flavors', 6.99, 'Beverages', 5),
(3, 'Coleslaw', 'Fresh cabbage slaw with creamy dressing', 4.99, 'Sides', 5),
(3, 'Onion Rings', 'Crispy fried onion rings', 5.99, 'Sides', 10),
(3, 'Chicken Wrap', 'Grilled chicken with vegetables in a wrap', 10.99, 'Wraps', 12),
(3, 'Soft Drink', 'Assorted carbonated drinks', 2.99, 'Beverages', 2);

-- CHICKEN OUT (hotel_id = 4)
INSERT INTO food_items (hotel_id, name, description, price, category, preparation_time) VALUES
(4, 'Pepperoni Pizza', 'Pizza with pepperoni and cheese', 16.99, 'Pizza', 20),
(4, 'Chicken Burger', 'Grilled chicken with lettuce and tomato', 12.99, 'Burgers', 15),
(4, 'Fried Chicken', 'Crispy fried chicken - signature recipe', 14.99, 'Chicken', 20),
(4, 'Crispy Fries', 'Golden crispy french fries', 4.99, 'Sides', 10),
(4, 'Chicken Tenders', 'Breaded chicken tenders with dipping sauce', 11.99, 'Chicken', 15),
(4, 'Grilled Chicken Sandwich', 'Grilled chicken with fresh vegetables', 12.99, 'Sandwiches', 15),
(4, 'Chicken Caesar Wrap', 'Chicken with Caesar salad in a wrap', 11.99, 'Wraps', 12),
(4, 'Buffalo Wings', 'Spicy buffalo wings with blue cheese', 13.99, 'Appetizers', 18),
(4, 'Mashed Potatoes', 'Creamy mashed potatoes with gravy', 5.99, 'Sides', 10),
(4, 'Coleslaw', 'Fresh coleslaw with creamy dressing', 4.99, 'Sides', 5),
(4, 'Chicken Soup', 'Homemade chicken noodle soup', 7.99, 'Soups', 15);

-- SANFORD (hotel_id = 5)
INSERT INTO food_items (hotel_id, name, description, price, category, preparation_time) VALUES
(5, 'Gourmet Pizza', 'Artisan pizza with premium toppings', 17.99, 'Pizza', 25),
(5, 'Roasted Chicken', 'Herb-roasted chicken with vegetables', 19.99, 'Chicken', 30),
(5, 'Lobster Pasta', 'Fresh lobster with pasta in cream sauce', 16.99, 'Pasta', 25),
(5, 'Premium Sushi Platter', 'Assorted sushi rolls and sashimi', 24.99, 'Sushi', 30),
(5, 'Truffle Fries', 'Crispy fries with truffle oil and parmesan', 6.99, 'Sides', 10),
(5, 'Grilled Steak', 'Premium cut steak with red wine sauce', 29.99, 'Main Course', 30),
(5, 'Lobster Bisque', 'Creamy lobster soup with sherry', 10.99, 'Soups', 15),
(5, 'Chocolate Lava Cake', 'Warm chocolate cake with molten center', 8.99, 'Desserts', 15),
(5, 'Crème Brûlée', 'Classic French custard with caramelized sugar', 7.99, 'Desserts', 15),
(5, 'Escargot', 'Garlic butter snails with herbs', 13.99, 'Appetizers', 20),
(5, 'Foie Gras', 'Pan-seared foie gras with fig jam', 18.99, 'Appetizers', 20),
(5, 'Wine Selection', 'Premium red or white wine', 12.99, 'Beverages', 2);

-- =============================================
-- CREATE STORED PROCEDURES
-- =============================================

-- Procedure: Get hotel statistics
DELIMITER //
CREATE PROCEDURE GetHotelStats(IN hotel_id_param INT)
BEGIN
    SELECT 
        h.name,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as unique_customers,
        SUM(o.total_amount) as total_revenue,
        AVG(r.rating) as average_rating,
        COUNT(r.id) as total_reviews
    FROM hotels h
    LEFT JOIN orders o ON h.id = o.hotel_id AND o.status = 'completed'
    LEFT JOIN ratings r ON h.id = r.hotel_id
    WHERE h.id = hotel_id_param
    GROUP BY h.id;
END //
DELIMITER ;

-- Procedure: Get commission report
DELIMITER //
CREATE PROCEDURE GetCommissionReport()
BEGIN
    SELECT 
        h.name as hotel_name,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        SUM(o.admin_commission) as total_commission,
        SUM(o.manager_amount) as total_to_manager,
        AVG(o.commission_rate) as average_commission_rate
    FROM hotels h
    LEFT JOIN orders o ON h.id = o.hotel_id AND o.status = 'completed'
    GROUP BY h.id
    ORDER BY total_sales DESC;
END //
DELIMITER ;

-- =============================================
-- CREATE VIEWS FOR EASY QUERYING
-- =============================================

-- View: Order details with customer and hotel info
CREATE OR REPLACE VIEW order_details AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.total_amount,
    o.status,
    o.created_at,
    u.name as customer_name,
    u.email as customer_email,
    h.name as hotel_name,
    h.address as hotel_address,
    GROUP_CONCAT(CONCAT(fi.name, ' x', oi.quantity) SEPARATOR ', ') as items
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN hotels h ON o.hotel_id = h.id
JOIN order_items oi ON o.id = oi.order_id
JOIN food_items fi ON oi.food_item_id = fi.id
GROUP BY o.id;

-- View: Hotel performance summary
CREATE OR REPLACE VIEW hotel_performance AS
SELECT 
    h.id as hotel_id,
    h.name,
    COUNT(o.id) as total_orders,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
    SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as revenue,
    AVG(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE NULL END) as avg_order_value,
    AVG(r.rating) as avg_rating
FROM hotels h
LEFT JOIN orders o ON h.id = o.hotel_id
LEFT JOIN ratings r ON h.id = r.hotel_id
GROUP BY h.id;

-- =============================================
-- SAMPLE TRIGGER FOR AUTO-GENERATING ORDER NUMBER
-- =============================================

DELIMITER //
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    SET NEW.order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
END //
DELIMITER ;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for better query performance
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_orders_hotel_status ON orders(hotel_id, status);
CREATE INDEX idx_food_items_hotel_available ON food_items(hotel_id, is_available);
CREATE INDEX idx_ratings_hotel_rating ON ratings(hotel_id, rating);

-- =============================================
-- SAMPLE DATA FOR TESTING (Optional)
-- =============================================

-- Sample user accounts (passwords: password123 - hashed)
INSERT INTO users (name, email, password, role, is_approved) VALUES
('John Doe', 'john@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', TRUE),
('Jane Smith', 'jane@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', TRUE),
('Manager One', 'manager1@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager', FALSE),
('Manager Two', 'manager2@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager', FALSE);

-- =============================================
-- QUERY EXAMPLES FOR REFERENCE
-- =============================================

-- Example 1: Get all hotels with their average rating
/* 
SELECT 
    h.*,
    AVG(r.rating) as avg_rating,
    COUNT(r.id) as total_reviews
FROM hotels h
LEFT JOIN ratings r ON h.id = r.hotel_id
GROUP BY h.id;
*/

-- Example 2: Get total sales by hotel for last month
/*
SELECT 
    h.name,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as total_sales,
    SUM(o.admin_commission) as total_commission
FROM hotels h
JOIN orders o ON h.id = o.hotel_id
WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
AND o.status = 'completed'
GROUP BY h.id
ORDER BY total_sales DESC;
*/

-- Example 3: Get user order history with details
/*
SELECT 
    o.id,
    o.total_amount,
    o.status,
    o.created_at,
    h.name as hotel_name,
    GROUP_CONCAT(CONCAT(fi.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items
FROM orders o
JOIN hotels h ON o.hotel_id = h.id
JOIN order_items oi ON o.id = oi.order_id
JOIN food_items fi ON oi.food_item_id = fi.id
WHERE o.user_id = 1
GROUP BY o.id
ORDER BY o.created_at DESC;
*/

-- Example 4: Get pending managers waiting for approval
/*
SELECT * FROM users 
WHERE role = 'manager' AND is_approved = FALSE;
*/

-- =============================================
-- END OF DATABASE SCRIPT
-- =============================================

SELECT 'Database setup completed successfully!' as message;
SELECT COUNT(*) as total_hotels FROM hotels;
SELECT COUNT(*) as total_food_items FROM food_items;
SELECT COUNT(*) as total_users FROM users;