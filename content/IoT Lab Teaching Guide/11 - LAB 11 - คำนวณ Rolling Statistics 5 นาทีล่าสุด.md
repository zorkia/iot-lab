> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[10 - LAB 10 - สืบค้น Sensor Data ด้วย SQL]]
> ถัดไป: [[12 - LAB 12 - แยก SQLite Write และ Statistics Flow]]

# LAB 11 --- คำนวณ Rolling Statistics 5 นาทีล่าสุด

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 11.1 แนวคิดของ LAB

LAB นี้คำนวณสถิติจากข้อมูลช่วงเวลาล่าสุด เช่น 5 นาทีล่าสุด แทนการคำนวณจากข้อมูลทั้งหมดใน database

```text
Historical data ทั้งหมด = ภาพรวมระยะยาว
Rolling 5 minutes      = สถานะล่าสุดของระบบ
```

Rolling Statistics เป็นพื้นฐานของระบบ monitoring เพราะช่วยตอบว่า “ตอนนี้ระบบกำลังมีแนวโน้มอย่างไร” ไม่ใช่แค่ค่า sensor ล่าสุดค่าเดียว

## 11.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- เขียน SQL สำหรับข้อมูล 5 นาทีล่าสุด
- คำนวณ count, average, min และ max
- ใช้ Node-RED trigger query เป็นช่วงเวลา
- แสดงผล statistics บน Dashboard
- เข้าใจความต่างระหว่าง latest value และ rolling statistics
- เตรียมแนวคิดสำหรับ Rule & Alert ใน LAB 13

## 11.3 Architecture

```text
SQLite sensor_data
       |
       | SELECT last 5 minutes
       v
Rolling Statistics
       |
       v
Node-RED Dashboard
```

Flow ใน Node-RED:

```text
[Inject every 10s]
       |
       v
[Prepare Rolling SQL]
       |
       v
[SQLite]
       |
       v
[Format Statistics]
       |
       v
[Dashboard Text / Table]
```

## 11.4 SQL สำหรับ 5 นาทีล่าสุด

```sql
SELECT
  COUNT(*) AS records,
  ROUND(AVG(temp), 2) AS avg_temp,
  MIN(temp) AS min_temp,
  MAX(temp) AS max_temp,
  ROUND(AVG(humi), 2) AS avg_humi,
  MIN(humi) AS min_humi,
  MAX(humi) AS max_humi,
  ROUND(AVG(light), 2) AS avg_light,
  MIN(light) AS min_light,
  MAX(light) AS max_light
FROM sensor_data
WHERE created_at >= datetime('now', '-5 minutes');
```

ทดสอบจาก command line:

```bash
sqlite3 /home/PI_USER/iot.db "SELECT COUNT(*) FROM sensor_data WHERE created_at >= datetime('now', '-5 minutes');"
```

## 11.5 สร้าง Inject Node

ตั้งค่า Inject node:

```text
Name: Every 10 seconds
Repeat: interval
Interval: 10 seconds
Payload: timestamp หรือ empty
```

Inject node ทำหน้าที่เรียก query ซ้ำอัตโนมัติ ไม่ต้องรอ MQTT message ใหม่ทุกครั้ง

## 11.6 สร้าง Function เตรียม SQL

เพิ่ม function node ชื่อ:

```text
Prepare Rolling SQL
```

ใช้โค้ด:

```javascript
msg.topic = `
SELECT
  COUNT(*) AS records,
  ROUND(AVG(temp), 2) AS avg_temp,
  MIN(temp) AS min_temp,
  MAX(temp) AS max_temp,
  ROUND(AVG(humi), 2) AS avg_humi,
  MIN(humi) AS min_humi,
  MAX(humi) AS max_humi,
  ROUND(AVG(light), 2) AS avg_light,
  MIN(light) AS min_light,
  MAX(light) AS max_light
FROM sensor_data
WHERE created_at >= datetime('now', '-5 minutes')
`;

return msg;
```

## 11.7 ต่อ SQLite Node

ตั้งค่า SQLite node:

```text
Database: /home/PI_USER/iot.db
SQL Query: msg.topic
```

หลัง query SQLite node จะคืนผลเป็น array:

```json
[
  {
    "records": 30,
    "avg_temp": 29.4,
    "min_temp": 25,
    "max_temp": 35,
    "avg_humi": 66.2,
    "min_humi": 55,
    "max_humi": 78,
    "avg_light": 1200.5,
    "min_light": 500,
    "max_light": 2100
  }
]
```

## 11.8 Format ผลลัพธ์สำหรับ Dashboard

เพิ่ม function node ชื่อ:

```text
Format Rolling Statistics
```

ใช้โค้ด:

```javascript
let row = msg.payload[0] || {};

msg.payload =
`Records: ${row.records || 0}\n` +
`Temp avg/min/max: ${row.avg_temp ?? "-"} / ${row.min_temp ?? "-"} / ${row.max_temp ?? "-"}\n` +
`Humi avg/min/max: ${row.avg_humi ?? "-"} / ${row.min_humi ?? "-"} / ${row.max_humi ?? "-"}\n` +
`Light avg/min/max: ${row.avg_light ?? "-"} / ${row.min_light ?? "-"} / ${row.max_light ?? "-"}`;

return msg;
```

ต่อเข้ากับ Text widget หรือ Template widget

## 11.9 ตรวจกรณีไม่มีข้อมูล

หยุด simulator แล้วรอเกิน 5 นาที จากนั้น query ใหม่

ผลที่ควรเข้าใจ:

```text
records = 0
avg/min/max อาจเป็น null
```

นี่คือสัญญาณว่าไม่มีข้อมูลล่าสุด ไม่ใช่ sensor วัดค่าเป็น 0

## 11.10 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| records เป็น 0 ตลอด | simulator ไม่ส่งข้อมูล หรือเวลาระบบผิด |
| dashboard แสดง undefined | ไม่ได้ตรวจ `msg.payload[0]` |
| query ช้า | database โตมาก หรือไม่มี index เวลา |
| ค่าเฉลี่ยไม่เปลี่ยน | inject interval ไม่ทำงาน |

## 11.11 เพิ่ม Index เพื่อ Query เร็วขึ้น

ถ้าข้อมูลเริ่มมาก ให้เพิ่ม index:

```sql
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at
ON sensor_data(created_at);
```

รันจาก command line:

```bash
sqlite3 /home/PI_USER/iot.db "CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON sensor_data(created_at);"
```

## 11.12 Checklist ก่อนจบ LAB

- query 5 นาทีล่าสุดได้
- Rolling Statistics แสดง count, avg, min, max
- Node-RED เรียก query ตามเวลาได้
- Dashboard แสดงผล statistics ได้
- เข้าใจความหมายของ records = 0

## 11.13 งานส่ง LAB

ให้ส่ง:

```text
1. SQL rolling 5 minutes
2. ภาพ flow Inject -> SQLite -> Dashboard
3. ผล statistics ขณะ simulator ทำงาน
4. ผล statistics หลังหยุด simulator
5. อธิบายความต่างระหว่าง latest value และ rolling statistics
```

## 11.14 เชื่อมไป LAB ถัดไป

LAB 12 จะปรับโครงสร้าง flow ให้แยกงานเขียน database ออกจากงานอ่าน statistics เพื่อไม่ให้ผลจาก INSERT ไปรบกวน Dashboard

