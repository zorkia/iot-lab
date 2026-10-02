---
type: reference
platform: raspberry-pi
service: sqlite
protocol: sql
level: basic
status: tested
tags:
  - iot-lab
  - database
  - sqlite
---

# SQLite Sensor Data

> [!info] แก้ไขล่าสุด
> 2026-10-01 07:28:04 +07


SQLite เหมาะกับ IoT Lab ขนาดเล็กเพราะเก็บข้อมูลในไฟล์เดียวและเชื่อมกับ Node-RED
ผ่าน `node-red-node-sqlite` ได้โดยตรง

## ติดตั้ง SQLite

ติดตั้ง command-line tool บน Raspberry Pi:

```bash
sudo apt update
sudo apt install sqlite3 -y
sqlite3 --version
```

สำหรับ Node-RED ให้ติดตั้ง package ผ่าน Palette Manager:

```text
node-red-node-sqlite
```

จากนั้นใน SQLite node ตั้ง database เป็น:

```text
/home/PI_USER/iot.db
```

และตั้ง Mode เป็น:

```text
Read-Write-Create
```

## Database และ Schema

```text
/home/PI_USER/iot.db
```

```sql
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    temp REAL,
    humi REAL,
    light REAL
);
```

เก็บเวลาเป็น UTC เพื่อให้ข้อมูลสม่ำเสมอ แล้วแปลงเป็นเวลาท้องถิ่นเมื่อนำเสนอ

## ตรวจข้อมูลจาก Command Line

```bash
sqlite3 /home/PI_USER/iot.db
```

```sql
.tables
.schema sensor_data
SELECT * FROM sensor_data ORDER BY id DESC LIMIT 10;
```

## หลักการ Flow

```text
MQTT → JSON → Prepare INSERT → SQLite WRITE → iot.db
```

แยก SQLite node ตามหน้าที่ เช่น `SQLite WRITE`, `SQLite STAT` และ
`SQLite HISTORY` แม้ทุก node จะใช้ไฟล์ฐานข้อมูลเดียวกัน เพื่อไม่ให้ output
จากคำสั่ง INSERT ไปเขียนทับผล query บน Dashboard

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite|LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]
- [[09 - LAB 09 - จัดการเวลา UTC และเวลาไทย|LAB 09 - จัดการเวลา UTC และเวลาไทย]]
- [[IoT Lab Knowledge Base/10 - SQL Statistics|SQL Statistics]]

กลับไป [[index]]
