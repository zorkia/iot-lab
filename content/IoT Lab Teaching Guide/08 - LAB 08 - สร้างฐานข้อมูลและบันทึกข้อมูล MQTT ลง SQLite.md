> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[07 - LAB 07 - สร้าง Real-time Chart]]
> ถัดไป: [[09 - LAB 09 - จัดการเวลา UTC และเวลาไทย]]

# LAB 08 --- สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 8.1 แนวคิดของ LAB

LAB นี้เพิ่ม SQLite เพื่อเก็บข้อมูล sensor แบบถาวร จากเดิมข้อมูลแสดงบน Dashboard แล้วหายไปเมื่อ refresh หรือ restart ระบบ

```text
MQTT -> Node-RED -> Dashboard
                |
                v
              SQLite
```

SQLite เหมาะกับ lab เพราะเป็น database แบบไฟล์เดียว ใช้งานง่าย และเพียงพอสำหรับการเรียนรู้ data logging บน Raspberry Pi

## 8.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- สร้างไฟล์ SQLite database
- สร้าง table สำหรับ sensor data
- เขียนข้อมูลจาก Node-RED ลง SQLite
- ตรวจข้อมูลด้วย command line
- เข้าใจความต่างระหว่าง Dashboard กับ Database
- เตรียมข้อมูลสำหรับ SQL query ใน LAB 10 และ Rolling Statistics ใน LAB 11

## 8.3 Architecture

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Prepare SQLite INSERT]
    |
    v
[SQLite Node]
    |
    v
/home/PI_USER/iot.db
```

## 8.4 ตรวจ SQLite

เปิด database:

```bash
sqlite3 /home/PI_USER/iot.db
```

ออกจาก SQLite shell:

```sql
.quit
```

ถ้าคำสั่ง `sqlite3` ยังไม่มี ให้ติดตั้งจาก knowledge base กลางของระบบก่อน แล้วกลับมาทำ LAB นี้

## 8.5 สร้าง Table

เปิด SQLite:

```bash
sqlite3 /home/PI_USER/iot.db
```

สร้าง table:

```sql
CREATE TABLE IF NOT EXISTS sensor_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT DEFAULT '001',
  temp REAL,
  humi REAL,
  light REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

ตรวจ schema:

```sql
.schema sensor_data
```

ตรวจ table:

```sql
.tables
```

## 8.6 ทดสอบ Insert ด้วย SQL ตรง

เพิ่มข้อมูลทดสอบ:

```sql
INSERT INTO sensor_data (device_id, temp, humi, light)
VALUES ('001', 28.5, 70, 1200);
```

ตรวจข้อมูล:

```sql
SELECT * FROM sensor_data ORDER BY id DESC LIMIT 5;
```

ผลที่คาดหวัง:

```text
มี record ใหม่ใน table sensor_data
created_at ถูกเติมอัตโนมัติ
```

## 8.7 เตรียม Node-RED SQLite Node

ตรวจ node ที่ใช้:

```text
node-red-node-sqlite
```

ถ้ายังไม่มี ให้ติดตั้งจาก knowledge base กลางของ Node-RED ก่อน แล้วกลับมาทำขั้นตอนต่อไป

ตั้งค่า SQLite node:

```text
Database: /home/PI_USER/iot.db
SQL Query: msg.topic
```

## 8.8 สร้าง Function เตรียม INSERT

เพิ่ม function node หลัง JSON node ตั้งชื่อ:

```text
Prepare SQLite INSERT
```

ใช้โค้ด:

```javascript
let data = msg.payload;

let deviceId = data.device_id || "001";
let temp = Number(data.temp);
let humi = Number(data.humi);
let light = Number(data.light);

if (!Number.isFinite(temp) || !Number.isFinite(humi) || !Number.isFinite(light)) {
    node.warn("invalid sensor data for SQLite");
    return null;
}

msg.topic = `
INSERT INTO sensor_data (device_id, temp, humi, light)
VALUES ($device_id, $temp, $humi, $light)
`;

msg.params = {
    $device_id: deviceId,
    $temp: temp,
    $humi: humi,
    $light: light
};

return msg;
```

## 8.9 Flow สำหรับบันทึกข้อมูล

ต่อ flow:

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Prepare SQLite INSERT]
    |
    v
[SQLite]
    |
    v
[Debug DB Result]
```

## 8.10 ทดสอบจาก MQTT

ส่ง payload:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"device_id":"001","temp":31,"humi":66,"light":1400}'
```

ตรวจข้อมูลใน SQLite:

```bash
sqlite3 /home/PI_USER/iot.db "SELECT id, device_id, temp, humi, light, created_at FROM sensor_data ORDER BY id DESC LIMIT 5;"
```

## 8.11 ตรวจจำนวนข้อมูล

```bash
sqlite3 /home/PI_USER/iot.db "SELECT COUNT(*) FROM sensor_data;"
```

ตรวจข้อมูลล่าสุด:

```bash
sqlite3 /home/PI_USER/iot.db "SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1;"
```

## 8.12 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| SQLite node error | path database ผิด หรือ node ไม่ได้ติดตั้ง |
| ไม่มีข้อมูลเพิ่ม | MQTT ไม่เข้า flow หรือ function return null |
| ค่าเป็น null | field ใน payload ไม่ตรงชื่อ |
| database เขียนไม่ได้ | permission หรือ disk เต็ม |
| SQL syntax error | string ใน `msg.topic` ผิด |

## 8.13 Checklist ก่อนจบ LAB

- มีไฟล์ `/home/PI_USER/iot.db`
- มี table `sensor_data`
- insert จาก SQL ตรงได้
- insert จาก MQTT ผ่าน Node-RED ได้
- query record ล่าสุดได้
- เข้าใจว่า database คือแหล่งข้อมูลย้อนหลัง

## 8.14 งานส่ง LAB

ให้ส่ง:

```text
1. schema ของ table sensor_data
2. flow ที่เขียนข้อมูลลง SQLite
3. ผล SELECT record ล่าสุด 5 รายการ
4. อธิบายว่า SQLite ต่างจาก Dashboard อย่างไร
```

## 8.15 เชื่อมไป LAB ถัดไป

LAB 09 จะจัดการเรื่องเวลา เพราะข้อมูลที่บันทึกลง SQLite ต้องมี timestamp ที่ตีความได้ถูกต้องทั้ง UTC และเวลาไทย

