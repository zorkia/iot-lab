---
type: reference
platform: raspberry-pi
service: sqlite
protocol: sql
level: intermediate
status: tested
tags:
  - iot-lab
  - database
  - statistics
---

# SQL Statistics

> [!info] แก้ไขล่าสุด
> 2026-10-01 07:28:04 +07


SQL สามารถสรุปค่า sensor ในช่วงเวลาที่กำหนดได้โดยไม่ต้องโหลดข้อมูลทั้งหมด
มาเขียนสูตรใหม่ใน Node-RED

## Query พื้นฐาน

```sql
SELECT id, timestamp, temp, humi, light
FROM sensor_data
ORDER BY id DESC
LIMIT 10;
```

## Rolling Statistics 5 นาที

```sql
SELECT
    AVG(temp)  AS avg_temp,
    MIN(temp)  AS min_temp,
    MAX(temp)  AS max_temp,
    AVG(humi)  AS avg_humi,
    MIN(humi)  AS min_humi,
    MAX(humi)  AS max_humi,
    AVG(light) AS avg_light,
    MIN(light) AS min_light,
    MAX(light) AS max_light
FROM sensor_data
WHERE timestamp >= datetime('now', '-5 minutes');
```

คำว่า rolling หมายถึงช่วงเวลาขยับตามเวลาปัจจุบัน ไม่ใช่แบ่งเป็นบล็อกตายตัว

## ข้อควรระวังใน Node-RED

อย่าใช้ output path เดียวกันสำหรับ INSERT และ SELECT เพราะ INSERT อาจคืนค่าเปล่า
แล้วเขียนทับค่าทางสถิติ ควรแยก `SQLite WRITE` ออกจาก `SQLite STAT`

## Lab ที่เกี่ยวข้อง

- [[10 - LAB 10 - สืบค้น Sensor Data ด้วย SQL|LAB 10 - สืบค้น Sensor Data ด้วย SQL]]
- [[11 - LAB 11 - คำนวณ Rolling Statistics 5 นาทีล่าสุด|LAB 11 - คำนวณ Rolling Statistics]]
- [[12 - LAB 12 - แยก SQLite Write และ Statistics Flow|LAB 12 - แยก SQLite Write และ Statistics Flow]]
- [[IoT Lab Knowledge Base/09 - SQLite Sensor Data|SQLite Sensor Data]]

กลับไป [[index]]
