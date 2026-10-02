> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[09 - LAB 09 - จัดการเวลา UTC และเวลาไทย]]
> ถัดไป: [[11 - LAB 11 - คำนวณ Rolling Statistics 5 นาทีล่าสุด]]

# LAB 10 --- สืบค้น Sensor Data ด้วย SQL

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 10.1 แนวคิดของ LAB

LAB นี้ฝึกใช้ SQL เพื่อสืบค้นข้อมูล sensor ที่บันทึกไว้ใน SQLite จาก LAB 08 และ LAB 09 โดยเปลี่ยน database จากที่เป็นแค่ที่เก็บข้อมูล ให้กลายเป็นแหล่งวิเคราะห์ข้อมูลเบื้องต้น

```text
SQLite table
    |
    | SQL SELECT
    v
Count / Latest / Average / Min / Max
```

SQL เป็นทักษะสำคัญของระบบ IoT เพราะข้อมูล sensor มีคุณค่าเมื่อสามารถค้นหา สรุป และเปรียบเทียบย้อนหลังได้

## 10.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- query จำนวน record
- query ข้อมูลล่าสุด
- filter ข้อมูลตามช่วงเวลา
- คำนวณ average, minimum และ maximum
- group ข้อมูลตาม device
- อ่านผล query เพื่อประเมินสถานะข้อมูล
- เตรียม query สำหรับ rolling statistics ใน LAB 11

## 10.3 Architecture

```text
sensor_data table
      |
      v
SELECT query
      |
      +-- latest data
      +-- count
      +-- avg / min / max
      +-- time range
      +-- group by device_id
```

## 10.4 ตรวจโครงสร้าง Table

```bash
sqlite3 /home/PI_USER/iot.db ".schema sensor_data"
```

ดูตัวอย่างข้อมูล:

```bash
sqlite3 /home/PI_USER/iot.db "SELECT * FROM sensor_data ORDER BY id DESC LIMIT 5;"
```

## 10.5 จำนวน Record ทั้งหมด

```sql
SELECT COUNT(*) AS records
FROM sensor_data;
```

ใช้ตรวจว่าระบบมีข้อมูลสะสมหรือไม่

## 10.6 ข้อมูลล่าสุด

```sql
SELECT
  id,
  device_id,
  temp,
  humi,
  light,
  created_at
FROM sensor_data
ORDER BY id DESC
LIMIT 10;
```

ถ้า id ล่าสุดไม่เพิ่มหลังส่ง MQTT แปลว่า data logging อาจมีปัญหา

## 10.7 ค่าเฉลี่ย Temperature

```sql
SELECT
  ROUND(AVG(temp), 2) AS avg_temp
FROM sensor_data;
```

ค่าเฉลี่ยช่วยตอบคำถาม:

```text
โดยรวม sensor มีแนวโน้มร้อนหรือเย็น
```

## 10.8 ค่า MIN และ MAX

```sql
SELECT
  MIN(temp) AS min_temp,
  MAX(temp) AS max_temp,
  MIN(humi) AS min_humi,
  MAX(humi) AS max_humi,
  MIN(light) AS min_light,
  MAX(light) AS max_light
FROM sensor_data;
```

ใช้ตรวจค่าผิดปกติ เช่น light สูงเกิน range หรือ temp ต่ำกว่าที่ควรเป็น

## 10.9 Statistics ทุก Sensor

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
FROM sensor_data;
```

## 10.10 Query เฉพาะ 10 นาทีล่าสุด

```sql
SELECT
  COUNT(*) AS records,
  ROUND(AVG(temp), 2) AS avg_temp,
  ROUND(AVG(humi), 2) AS avg_humi,
  ROUND(AVG(light), 2) AS avg_light
FROM sensor_data
WHERE created_at >= datetime('now', '-10 minutes');
```

## 10.11 Query แยกตาม Device

ถ้ามีหลาย device:

```sql
SELECT
  device_id,
  COUNT(*) AS records,
  ROUND(AVG(temp), 2) AS avg_temp,
  ROUND(AVG(humi), 2) AS avg_humi,
  ROUND(AVG(light), 2) AS avg_light
FROM sensor_data
GROUP BY device_id
ORDER BY device_id;
```

## 10.12 Query เพื่อหา Record ผิดปกติ

ค่า temperature สูงเกิน 35:

```sql
SELECT
  id,
  device_id,
  temp,
  humi,
  light,
  created_at
FROM sensor_data
WHERE temp > 35
ORDER BY created_at DESC;
```

ค่า humidity เกินช่วงปกติ:

```sql
SELECT
  id,
  device_id,
  humi,
  created_at
FROM sensor_data
WHERE humi < 0 OR humi > 100
ORDER BY created_at DESC;
```

## 10.13 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| query ได้ 0 record | database ไม่มีข้อมูล หรือ query ช่วงเวลาแคบเกินไป |
| ค่า AVG เป็น null | column ไม่มีข้อมูลตัวเลข |
| latest ไม่เปลี่ยน | Node-RED ไม่เขียน DB |
| เวลาไม่ตรง | ยังไม่ได้แปลง UTC เป็นเวลาไทย |
| group by แปลก | device_id ว่างหรือไม่คงที่ |

## 10.14 Checklist ก่อนจบ LAB

- query จำนวน record ได้
- query record ล่าสุดได้
- query AVG/MIN/MAX ได้
- query เฉพาะช่วงเวลาได้
- query แยกตาม device ได้
- ใช้ SQL ตรวจข้อมูลผิดปกติได้

## 10.15 งานส่ง LAB

ให้ส่ง:

```text
1. SQL สำหรับนับ record
2. SQL สำหรับดูข้อมูลล่าสุด
3. SQL สำหรับ AVG/MIN/MAX
4. SQL สำหรับข้อมูล 10 นาทีล่าสุด
5. อธิบายว่าค่าใดใน database ดูผิดปกติหรือไม่
```

## 10.16 เชื่อมไป LAB ถัดไป

LAB 11 จะนำ query จาก LAB นี้ไปทำ Rolling Statistics 5 นาทีล่าสุด และแสดงผลใน Node-RED Dashboard

