// database/setup.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // <<<--- เรียกใช้ bcrypt

const dbPath = path.resolve(__dirname, 'mydatabase.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('Error connecting:', err.message); return; }
    console.log('Connected to SQLite DB:', dbPath);
});

const saltRounds = 10; // ความซับซ้อนในการ Hash (มาตรฐานคือ 10-12)

db.serialize(() => {
    console.log('Starting database setup...');

    // --- ตาราง Users ---
    db.run('DROP TABLE IF EXISTS users', (err) => {
        if(err) console.error("Error dropping users table", err.message);
        else console.log("Users table dropped (if existed).");
    });
    db.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user', -- 'user' หรือ 'admin'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) { console.error("Error creating users table:", err.message); return; }
        console.log("Table 'users' created.");

        // --- ใส่ข้อมูล Admin เริ่มต้น ('test' / '1234') ---
        const adminUsername = 'test';
        const adminPassword = '1234'; // รหัสผ่านจริง
        const adminEmail = 'admin@example.com'; // อีเมลตัวอย่าง

        // Hash รหัสผ่านของ Admin ก่อนเก็บ
        bcrypt.hash(adminPassword, saltRounds, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error("Error hashing admin password:", hashErr.message);
                closeDb(); // ปิด DB ถ้า hash ไม่ได้
                return;
            }
            console.log(`Hashed password for ${adminUsername}: ${hashedPassword.substring(0,10)}...`); // แสดง hash แค่บางส่วน

            const insertAdminSql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;
            db.run(insertAdminSql, [adminUsername, adminEmail, hashedPassword, 'admin'], function(insertErr) { // ใช้ function() เพื่อเข้าถึง this.lastID
                if (insertErr) {
                    console.error("Error inserting admin user:", insertErr.message);
                } else {
                    console.log(`Admin user '${adminUsername}' inserted successfully with ID: ${this.lastID}`);
                }
                // --- จบส่วน Users ---

                // --- ตาราง Products (เหมือนเดิม) ---
                setupProductsTable(); // เรียกฟังก์ชันสร้างตาราง products ต่อ
            });
        });
    });
});

function setupProductsTable() {
    db.run('DROP TABLE IF EXISTS products', (err) => {
        if(err) console.error("Error dropping products table", err.message);
        else console.log("Products table dropped (if existed).");
    });
    db.run(`
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT
        )
    `, (err) => {
        if (err) { console.error("Error creating products table:", err.message); closeDb(); return; }
        console.log("Table 'products' created.");

        const productsToInsert = [
            { name: 'เสื้อยืดลายหมา', price: 350.00, image: 'https://down-th.img.susercontent.com/file/th-11134207-7r98q-lzznzyzsxup549.webp' },
            { name: 'แก้วน้ำลายหมา', price: 200.50, image: 'https://nunglen.com/wp-content/uploads/2023/10/2-%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%A7%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%A1%E0%B8%B2-01.png' }, // ลองใส่ทศนิยม
            { name: 'หมวกแก๊ปเท่ๆ', price: 400.00, image: 'https://down-th.img.susercontent.com/file/sg-11134201-7repu-m2jl10li6zx2c3@resize_w450_nl.webp' },
            { name: 'สติ๊กเกอร์สุดแนว', price: 50.00, image: 'https://down-th.img.susercontent.com/file/cn-11134207-7qukw-lf6qzurn52qx60.webp' }
        ];
        const stmt = db.prepare('INSERT INTO products (name, price, image) VALUES (?, ?, ?)');
        console.log('Inserting initial product data...');
        let productsInserted = 0;
        productsToInsert.forEach((product) => {
            stmt.run(product.name, product.price, product.image, (runErr) => {
                if (runErr) console.error(`Error inserting product "${product.name}":`, runErr.message);
                else productsInserted++;

                // เช็คว่าใส่ครบหรือยัง ถึงจะ finalize และปิด DB
                if (productsInserted === productsToInsert.length) {
                    stmt.finalize((finalErr) => {
                         if (finalErr) console.error('Error finalizing statement:', finalErr.message);
                         else console.log('Finished inserting product data.');
                         closeDb(); // ปิด DB หลังจากทุกอย่างเสร็จ
                    });
                }
            });
        });
    });
}

function closeDb() {
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('Database connection closed.');
        console.log('\nSetup complete! You can now run server.js');
    });
}