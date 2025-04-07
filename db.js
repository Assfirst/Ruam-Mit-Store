// database/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'mydatabase.db');

// สร้าง instance ของ database connection
// ไฟล์นี้จะถูก require แค่ครั้งเดียวโดย server.js ทำให้ connection ถูกสร้างแค่ครั้งเดียว
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[db.js] Error connecting to database:', err.message);
        // ถ้าเชื่อมต่อไม่ได้ ควรจะหยุดการทำงานของ server ไปเลย
        process.exit(1); // ออกจาก process Node.js
    } else {
        console.log('[db.js] Successfully connected to the SQLite database:', dbPath);
        // (Optional) เปิดใช้งาน Foreign Key constraints (ถ้ามีตารางที่สัมพันธ์กันในอนาคต)
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                console.error("[db.js] Failed to enable foreign key constraints:", pragmaErr.message);
            } else {
                console.log("[db.js] Foreign key constraints enabled.");
            }
        });
    }
});

// Export ตัว db instance ออกไปให้ไฟล์อื่นใช้
module.exports = db;