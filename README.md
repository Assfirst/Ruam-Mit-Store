# Ruam-Mit-Store (ร้านค้ารวมมิตรเพื่อนซี้) 🛒

โปรเจกต์นี้เป็นเว็บแอปพลิเคชัน E-commerce ขั้นพื้นฐานที่พัฒนาขึ้นเพื่อการเรียนรู้ สร้างโดยใช้ Node.js, Express.js และ SQLite เป็นหลัก แสดงให้เห็นถึงกระบวนการพัฒนาเว็บแบบ Full-Stack ตั้งแต่ระบบสมาชิก การแสดงสินค้า ตะกร้าสินค้า ไปจนถึงส่วนจัดการพื้นฐานสำหรับแอดมิน

## ฟีเจอร์หลัก

*   **ระบบสมาชิก:**
    *   การสมัครสมาชิก (Registration)
    *   การเข้าสู่ระบบ (Login)
    *   การจัดเก็บรหัสผ่านอย่างปลอดภัยด้วย **bcrypt hashing**
    *   การจัดการ Session ผู้ใช้งานด้วย **express-session**
    *   การแบ่งบทบาทผู้ใช้ (User / Admin)
*   **หน้าร้าน (Storefront):**
    *   แสดงรายการสินค้า (ดึงข้อมูลจาก Database)
    *   ระบบตะกร้าสินค้า (Shopping Cart):
        *   เพิ่มสินค้าลงตะกร้า
        *   แสดงรายการและสรุปยอดในตะกร้า
        *   ปรับปรุงจำนวนสินค้า (+/-)
        *   ลบสินค้าออกจากตะกร้า
    *   หน้ายืนยันการสั่งซื้อ (Checkout) แบบง่าย (แสดงสรุปและยืนยันเพื่อเคลียร์ตะกร้า)
    *   หน้าแสดงผลการสั่งซื้อสำเร็จ
*   **ส่วนจัดการแอดมิน (Admin Panel):**
    *   Middleware สำหรับตรวจสอบสิทธิ์ Admin (`requireAdmin`)
    *   หน้า Admin Dashboard เบื้องต้น (เข้าถึงได้เฉพาะผู้ใช้ที่มี Role 'admin')
    *   (กำลังพัฒนา) ระบบจัดการสินค้า (เพิ่ม/ลบ/แก้ไข/ดูรายการ)
*   **ส่วนติดต่อผู้ใช้ (UI/UX):**
    *   ใช้ **Tailwind CSS (ผ่าน CDN)** ในการจัดรูปแบบหน้าเว็บ
    *   ใช้ **SweetAlert2 (ผ่าน CDN)** สำหรับแสดง Popup แจ้งเตือนและยืนยันต่างๆ
    *   แสดงจำนวนสินค้ารวมในตะกร้าบน Navigation Bar
    *   มี Favicon ประจำเว็บไซต์

## เทคโนโลยีที่ใช้งาน

*   **Backend:** Node.js, Express.js
*   **Database:** SQLite3 (ผ่าน Library `sqlite3`)
*   **Password Hashing:** bcrypt
*   **Session Management:** express-session
*   **Frontend:** HTML, Tailwind CSS (CDN), Vanilla JavaScript (Fetch API, DOM Manipulation)
*   **UI Components:** SweetAlert2 (CDN)

## การติดตั้งและเริ่มใช้งาน

1.  **สิ่งที่ต้องมี:**
    *   **Node.js** และ **npm** (ติดตั้งจาก [nodejs.org](https://nodejs.org/)
  
## การเข้าใช้งานส่วน Admin

*   **Username:** `test`
*   **Password:** `1234` (ตามที่ตั้งค่าและ hash ไว้ใน `database/setup.js`)
*   หลังจาก Login ด้วยบัญชีนี้แล้ว สามารถเข้าถึง Admin Dashboard ได้ที่ URL: `/admin`

## Database

*   ใช้ SQLite โดยไฟล์ Database คือ `database/mydatabase.db`
*   สคริปต์ `database/setup.js` ใช้สำหรับสร้างโครงสร้างตารางและข้อมูลเริ่มต้น

## แผนการพัฒนาในอนาคต (ตัวอย่าง)

*   **Admin:** ระบบแก้ไขสินค้า, จัดการผู้ใช้, จัดการคำสั่งซื้อ, Upload รูปภาพสินค้า
*   **User:** ระบบลืมรหัสผ่าน, หน้าโปรไฟล์, ประวัติการสั่งซื้อ
*   **ทั่วไป:** ปรับปรุง UI/UX, เพิ่ม Validation, จัดการ Error handling, เขียน Automated Tests, Deploy ขึ้น Production Server

## ข้อควรทราบ

*   เมื่อมีการแก้ไขไฟล์ `.js` ในฝั่ง Server จำเป็นต้อง **Restart Server** (`Ctrl+C` และ `node server.js`)
*   ตรวจสอบไฟล์ `.gitignore` เพื่อให้แน่ใจว่าไม่มีไฟล์ที่ไม่ต้องการ (เช่น `node_modules`, `.env`, `.db`) ถูก Commit ขึ้นไป
*   **ความปลอดภัย:** ค่า `secret` ที่ใช้ใน `express-session` ในโค้ดนี้เป็นเพียงตัวอย่าง **ห้ามใช้ค่านี้ในระบบจริง** ควรใช้ค่าที่สุ่มและยาว และจัดเก็บอย่างปลอดภัย (เช่น ผ่าน Environment Variables)

