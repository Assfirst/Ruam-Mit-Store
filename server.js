// 1. เรียกใช้ Modules ที่จำเป็น
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./database/db.js'); // DB Connection
const bcrypt = require('bcrypt'); // <<<--- เพิ่ม bcrypt

// --------------------------------------------------
// ตั้งค่า Express App
// --------------------------------------------------
const app = express();
const PORT = 3000;
const saltRounds = 10; // ค่าความซับซ้อน bcrypt (ควรเก็บใน config)

// --------------------------------------------------
// Middleware
// --------------------------------------------------
app.use(session({
    secret: 'เปลี่ยนกูด้วยนะเพื่อน-secret-key-ยาวๆ-และสุ่ม!', // !!! สำคัญมาก !!!
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day session
        httpOnly: true, // ป้องกัน XSS เบื้องต้น
        // secure: process.env.NODE_ENV === 'production', // ใช้ secure cookie เฉพาะตอน production (HTTPS)
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Custom Middleware ---
function requireLogin(req, res, next) {
    if (!req.session.user) {
        console.log(`Login required for: ${req.originalUrl}`);
        if (req.originalUrl.startsWith('/api/') && !req.originalUrl.includes('/login')) {
             return res.status(401).json({ error: 'กรุณา Login ก่อน' });
        }
        // สำหรับหน้าเว็บปกติ หรือ API login ที่อาจจะพลาดมา
        res.redirect('/?error=SessionExpired'); // ส่ง error code บอกว่า session หมด
    } else {
        next();
    }
}

function requireAdmin(req, res, next) {
    if (!req.session.user) { // ควรจะถูกดักโดย requireLogin ก่อนแล้ว
        console.warn('requireAdmin called without active session user.');
        return res.status(401).redirect('/');
    }
    // --- เช็ค role จาก session ---
    if (req.session.user.role === 'admin') {
        next(); // เป็น Admin ไปต่อได้
    } else {
        console.log(`Access denied (requireAdmin) for user: ${req.session.user.username} (Role: ${req.session.user.role}) to ${req.originalUrl}`);
        if (req.originalUrl.startsWith('/api/admin/')) {
             return res.status(403).json({ error: 'Forbidden: ต้องเป็น Admin เท่านั้น' });
        }
        // อาจจะใช้ flash message แจ้งเตือน
        // req.session.flash = { type: 'error', message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนจัดการระบบ' };
        res.status(403).redirect('/dashboard'); // กลับ Dashboard ปกติ
    }
}


// --------------------------------------------------
// Routes
// --------------------------------------------------

// --- Public Routes ---
app.get('/', (req, res) => { // หน้าแรก / Login
    if (req.session.user) res.redirect('/dashboard');
    else res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- Routes สมัครสมาชิก ---
app.get('/register', (req, res) => { // หน้าฟอร์มสมัคร
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => { // รับข้อมูลสมัคร *** ใช้ DB + bcrypt ***
    const { username, email, password, confirmPassword } = req.body;

    // Validation (ควรทำให้ดีกว่านี้ เช่น ใช้ library อย่าง express-validator)
    if (!username || !email || !password || !confirmPassword) return res.status(400).send('ข้อมูลไม่ครบ <a href="/register">กลับ</a>');
    if (password !== confirmPassword) return res.status(400).send('รหัสไม่ตรงกัน <a href="/register">กลับ</a>');
    if (password.length < 6) return res.status(400).send('รหัสสั้นไป (ต้อง 6+ ตัว) <a href="/register">กลับ</a>');

    try {
        // เช็ค Username/Email ซ้ำ
        const checkUserSql = 'SELECT id FROM users WHERE username = ? OR email = ?';
        db.get(checkUserSql, [username, email], async (checkErr, existingUser) => {
            if (checkErr) { console.error("DB Check Error:", checkErr.message); return res.status(500).send('DB Error (Check) <a href="/register">กลับ</a>'); }
            if (existingUser) return res.status(400).send('Username หรือ Email ซ้ำ <a href="/register">กลับ</a>');

            // Hash รหัสผ่าน
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // INSERT User ใหม่ (role default เป็น 'user')
            const insertSql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
            db.run(insertSql, [username, email, hashedPassword], function(insertErr) {
                if (insertErr) {
                    console.error("DB Insert Error:", insertErr.message);
                    if (insertErr.message.includes('UNIQUE')) return res.status(400).send('Username หรือ Email ซ้ำ (Constraint) <a href="/register">กลับ</a>');
                    return res.status(500).send('DB Error (Insert) <a href="/register">กลับ</a>');
                }
                console.log(`User ${username} registered with ID: ${this.lastID}`);
                res.redirect('/?message=RegistrationSuccessful'); // กลับหน้า Login พร้อมข้อความสำเร็จ
            });
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).send('Server Error <a href="/register">กลับ</a>');
    }
});

// --- Route Login ---
app.post('/login', async (req, res) => { // รับ Login *** ใช้ DB + bcrypt ***
    const { username, password } = req.body;
    if (!username || !password) return res.redirect('/?error=MissingCredentials');

    const sql = 'SELECT id, username, password_hash, role FROM users WHERE username = ?';
    try {
        db.get(sql, [username], async (err, user) => {
            if (err) { console.error("DB Login Error:", err.message); return res.redirect('/?error=ServerError'); }

            if (!user) { // ไม่เจอ User
                console.log(`Login failed: User "${username}" not found.`);
                return res.redirect('/?error=InvalidCredentials');
            }

            // เจอ User -> เทียบรหัส
            try {
                const match = await bcrypt.compare(password, user.password_hash);
                if (match) { // รหัสผ่านถูกต้อง
                    console.log(`Login successful for user "${username}" (Role: ${user.role})`);
                    req.session.user = { userId: user.id, username: user.username, role: user.role };
                    req.session.cart = req.session.cart || {};
                    // ถ้าเป็น Admin อาจจะ redirect ไปหน้า Admin เลยก็ได้
                    if (user.role === 'admin') {
                         res.redirect('/admin');
                    } else {
                         res.redirect('/dashboard');
                    }
                } else { // รหัสผ่านผิด
                    console.log(`Password mismatch for user "${username}".`);
                    return res.redirect('/?error=InvalidCredentials');
                }
            } catch (compareError) { // Error ตอน compare
                console.error("Password Compare Error:", compareError);
                return res.redirect('/?error=ServerError');
            }
        });
    } catch (error) { // Error อื่นๆ
        console.error("Login Error:", error);
        res.redirect('/?error=ServerError');
    }
});

// --- Route Logout ---
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.clearCookie('connect.sid'); // ชื่อ cookie มาตรฐาน
        res.redirect('/');
    });
});

// --- User Routes (ต้อง Login) ---
app.get('/dashboard', requireLogin, (req, res) => { // Dashboard ปกติ
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/products', requireLogin, (req, res) => { // หน้าสินค้า
    res.sendFile(path.join(__dirname, 'public', 'products.html'));
});
app.get('/cart', requireLogin, (req, res) => { // หน้าตะกร้า
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});
app.get('/checkout', requireLogin, (req, res) => { // หน้า Checkout
    if (!req.session.cart || Object.keys(req.session.cart).length === 0) return res.redirect('/cart');
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});
app.get('/order-success', requireLogin, (req, res) => { // หน้าสั่งซื้อสำเร็จ
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// --- API Routes (ส่วนใหญ่ต้อง Login) ---
app.get('/api/user/me', requireLogin, (req, res) => { // API ดึงข้อมูล User
    // ส่งเฉพาะข้อมูลที่จำเป็น ไม่ควรส่ง password hash หรือข้อมูล sensitive อื่นๆ
    res.json({ userId: req.session.user.userId, username: req.session.user.username, role: req.session.user.role });
});
app.get('/api/products', requireLogin, (req, res) => { /* ... (เหมือนเดิม ใช้ DB) ... */
    const sql = 'SELECT id, name, price, image FROM products ORDER BY name';
    db.all(sql, [], (err, rows) => {
        if (err) res.status(500).json({ error: 'DB error fetching products' });
        else res.json(rows);
    });
});
app.get('/api/cart', requireLogin, (req, res) => { /* ... (เหมือนเดิม ใช้ DB) ... */
    const sessionCart = req.session.cart || {};
    const productIds = Object.keys(sessionCart).filter(id => sessionCart[id] > 0);
    if (productIds.length === 0) return res.json({ items: [], totalPrice: 0 });
    const placeholders = productIds.map(() => '?').join(',');
    const sql = `SELECT id, name, price, image FROM products WHERE id IN (${placeholders})`;
    db.all(sql, productIds, (err, productsFromDb) => {
        if (err) return res.status(500).json({ error: 'DB error fetching cart products' });
        const detailedCart = { items: [], totalPrice: 0 };
        const foundProductIds = new Set();
        productsFromDb.forEach(p => {
            const idStr = p.id.toString(); foundProductIds.add(idStr);
            const qty = sessionCart[idStr];
            if (qty > 0) {
                const itemTotal = p.price * qty;
                detailedCart.items.push({ ...p, quantity: qty, itemTotalPrice: itemTotal });
                detailedCart.totalPrice += itemTotal;
            }
        });
        Object.keys(sessionCart).forEach(sid => { if (!foundProductIds.has(sid)) delete req.session.cart[sid]; });
        res.json(detailedCart);
    });
});
app.post('/api/cart/add', requireLogin, (req, res) => { /* ... (เหมือนเดิม ใช้ DB เช็ค) ... */
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'No product ID' });
    const sql = 'SELECT id, name FROM products WHERE id = ?';
    db.get(sql, [productId], (err, product) => {
        if (err) return res.status(500).json({ error: 'DB error finding product' });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        req.session.cart = req.session.cart || {};
        req.session.cart[productId] = (req.session.cart[productId] || 0) + 1;
        res.json({ success: true, message: `Added ${product.name}`, productName: product.name, cart: req.session.cart });
    });
});
app.post('/api/cart/remove', requireLogin, (req, res) => { /* ... (เหมือนเดิม) ... */
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'No product ID' });
    if (req.session.cart && req.session.cart[productId]) delete req.session.cart[productId];
    res.json({ success: true, message: 'Item removed', cart: req.session.cart || {} });
});
app.post('/api/cart/update', requireLogin, (req, res) => { /* ... (เหมือนเดิม) ... */
    const { productId, quantity } = req.body;
    const qtyNum = parseInt(quantity);
    if (!productId || isNaN(qtyNum)) return res.status(400).json({ error: 'Invalid data' });
    if (!req.session.cart) return res.status(400).json({ error: 'Cart not found' });
    if (qtyNum <= 0) {
        if (req.session.cart[productId]) delete req.session.cart[productId];
        res.json({ success: true, message: 'Item removed (qty<=0)', cart: req.session.cart });
    } else {
        req.session.cart[productId] = qtyNum;
        res.json({ success: true, message: 'Quantity updated', cart: req.session.cart });
    }
});
app.post('/checkout/complete', requireLogin, (req, res) => { /* ... (เหมือนเดิม) ... */
    if (!req.session.cart || Object.keys(req.session.cart).length === 0) return res.status(400).json({ error: 'Cart is empty' });
    console.log('Simulating order completion for user:', req.session.user.username, 'Cart:', req.session.cart);
    // *** ควรบันทึก Order ลง DB จริงๆ ตรงนี้ ***
    req.session.cart = {}; // เคลียร์ตะกร้า
    res.json({ success: true, message: 'Order completed!' });
});

// --- Admin Routes (ต้อง Login และเป็น Admin) ---
app.get('/admin', requireLogin, requireAdmin, (req, res) => { // Admin Dashboard
    res.sendFile(path.join(__dirname, 'public/admin/dashboard.html'));
});

// --- (Placeholder for future Admin routes) ---


// --------------------------------------------------
// Start Server
// --------------------------------------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
process.on('SIGINT', () => { db.close(() => { console.log('DB closed'); process.exit(0); }); });