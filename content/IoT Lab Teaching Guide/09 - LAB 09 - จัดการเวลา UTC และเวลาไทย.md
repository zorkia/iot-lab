> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]
> ถัดไป: [[10 - LAB 10 - สืบค้น Sensor Data ด้วย SQL]]

# LAB 09 --- จัดการเวลา UTC และเวลาไทย

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 9.1 แนวคิดของ LAB

LAB นี้อธิบายการจัดการเวลาในระบบ IoT โดยเฉพาะเมื่อบันทึกข้อมูลลง SQLite ระบบควรเก็บเวลาแบบคงที่และตีความได้ ไม่ใช่ผูกกับ timezone ของหน้าจอเพียงอย่างเดียว

หลักที่ใช้ในชุด lab นี้:

```text
เก็บในฐานข้อมูลเป็น UTC
แสดงผลให้ผู้ใช้เป็นเวลาไทยเมื่อต้องนำเสนอ
```

แนวคิดนี้ช่วยลดปัญหาเมื่อนำข้อมูลไปวิเคราะห์ย้อนหลัง หรือเมื่ออุปกรณ์อยู่คนละ timezone

## 9.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ตรวจเวลาระบบของ Raspberry Pi
- เข้าใจ UTC และเวลาไทย
- ใช้ SQLite query แปลงเวลาได้
- แยกเวลาสำหรับจัดเก็บออกจากเวลาสำหรับแสดงผล
- เตรียมข้อมูลเวลาให้พร้อมสำหรับ query แบบย้อนหลัง

## 9.3 Architecture เรื่องเวลา

```text
Sensor data arrives
        |
        v
Node-RED / SQLite INSERT
        |
        v
created_at stored as UTC
        |
        v
SQL SELECT converts to Thai time for display
```

## 9.4 ตรวจเวลาระบบ

ตรวจด้วย `timedatectl`:

```bash
timedatectl
```

ตรวจด้วย `date`:

```bash
date
```

ตรวจเวลา UTC:

```bash
date -u
```

สิ่งที่ต้องดู:

| รายการ | ความหมาย |
|---|---|
| Local time | เวลาท้องถิ่นของเครื่อง |
| Universal time | เวลา UTC |
| Time zone | timezone ที่ตั้งไว้ |
| NTP service | การ sync เวลา |

## 9.5 ตรวจเวลาใน SQLite

เปิด SQLite:

```bash
sqlite3 /home/PI_USER/iot.db
```

ทดลอง query เวลา:

```sql
SELECT
  datetime('now') AS utc_time,
  datetime('now', '+7 hours') AS thai_time;
```

ตัวอย่างผล:

```text
utc_time             thai_time
-------------------  -------------------
2026-10-02 02:00:00  2026-10-02 09:00:00
```

## 9.6 ปรับ Query ให้แสดงเวลาไทย

ข้อมูลใน table ใช้ `created_at` เป็น UTC:

```sql
SELECT
  id,
  device_id,
  temp,
  humi,
  light,
  created_at AS utc_time,
  datetime(created_at, '+7 hours') AS thai_time
FROM sensor_data
ORDER BY id DESC
LIMIT 10;
```

## 9.7 แสดงเฉพาะข้อมูลในช่วงเวลาล่าสุด

ข้อมูล 5 นาทีล่าสุดจากเวลา UTC:

```sql
SELECT
  id,
  temp,
  humi,
  light,
  created_at
FROM sensor_data
WHERE created_at >= datetime('now', '-5 minutes')
ORDER BY created_at DESC;
```

แสดงเวลาไทยพร้อมกัน:

```sql
SELECT
  id,
  temp,
  humi,
  light,
  datetime(created_at, '+7 hours') AS thai_time
FROM sensor_data
WHERE created_at >= datetime('now', '-5 minutes')
ORDER BY created_at DESC;
```

## 9.8 ทำไมไม่ควรเก็บเวลาไทยลงฐานข้อมูลโดยตรง

เหตุผล:

| เหตุผล | รายละเอียด |
|---|---|
| วิเคราะห์ข้าม timezone ง่ายกว่า | UTC เป็นมาตรฐานกลาง |
| ลดปัญหา daylight saving | บางประเทศมีการเปลี่ยนเวลา |
| query ย้อนหลังแม่นกว่า | ไม่ปนเวลานำเสนอเข้ากับเวลาจริง |
| ย้ายระบบง่ายกว่า | database ไม่ผูกกับ locale เดิม |

แม้ประเทศไทยไม่มี daylight saving แต่การเก็บ UTC ยังเป็นแนวปฏิบัติที่ดีสำหรับระบบ IoT

## 9.9 ปรับ Dashboard ให้แสดงเวลาอ่านง่าย

ถ้าต้องส่งเวลาไทยไป Dashboard ให้เตรียมข้อความใน Function node หรือ query SQL แล้วส่งเฉพาะเวลาที่ต้องการแสดง

ตัวอย่างข้อความ:

```text
ล่าสุด: 2026-10-02 09:00:00
```

หลักคิด:

```text
Database stores UTC
Dashboard displays local time
```

## 9.10 ปัญหาที่พบบ่อย

| อาการ | สาเหตุ |
|---|---|
| เวลาดูช้ากว่าไทย 7 ชั่วโมง | กำลังดู UTC โดยตรง |
| query 5 นาทีล่าสุดไม่เจอข้อมูล | system time ผิด หรือข้อมูลเก่า |
| เวลาใน Dashboard ไม่ตรง SQLite | แปลงเวลาคนละชั้น |
| created_at เป็น null | schema table ไม่มี default เวลา |

## 9.11 Checklist ก่อนจบ LAB

- ตรวจเวลาเครื่องได้
- รู้ความต่างระหว่าง UTC และเวลาไทย
- query เวลา UTC จาก SQLite ได้
- query แปลงเป็นเวลาไทยได้
- query ข้อมูลย้อนหลังตามช่วงเวลาได้
- เข้าใจหลักเก็บ UTC และแสดง local time

## 9.12 งานส่ง LAB

ให้ส่ง:

```text
1. ผล timedatectl
2. SQL ที่แสดง utc_time และ thai_time
3. SQL ที่ดึงข้อมูล 5 นาทีล่าสุด
4. สรุปว่าทำไมควรเก็บเวลาแบบ UTC
```

## 9.13 เชื่อมไป LAB ถัดไป

LAB 10 จะใช้ข้อมูลที่มี timestamp แล้วมาฝึกสืบค้นด้วย SQL เพื่อหาค่า count, average, minimum และ maximum

