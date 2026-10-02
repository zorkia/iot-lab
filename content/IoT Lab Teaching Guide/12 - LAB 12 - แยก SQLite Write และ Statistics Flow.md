> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[11 - LAB 11 - คำนวณ Rolling Statistics 5 นาทีล่าสุด]]
> ถัดไป: [[13 - LAB 13 - Rule & Alert Processing]]

# LAB 12 --- แยก SQLite Write และ Statistics Flow

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 12.1 แนวคิดของ LAB

LAB นี้จัดระเบียบ Node-RED flow ให้แยกหน้าที่ชัดเจนระหว่างการเขียนข้อมูลลง database และการอ่านข้อมูลมาทำ statistics

ปัญหาที่พบบ่อยคือเอา flow ทุกอย่างต่อเป็นสายเดียว:

```text
MQTT -> JSON -> INSERT -> SQLite -> SELECT -> Dashboard
```

เมื่อ SQLite node ทำ `INSERT` ผลลัพธ์อาจเป็น empty output หรือข้อความที่ไม่ใช่ statistics ทำให้ Dashboard ถูกเขียนทับด้วยข้อมูลผิดชนิด

หลักของ LAB นี้คือ:

```text
Write path แยกจาก Read path
```

## 12.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- แยก flow ตามหน้าที่
- อธิบายความต่างระหว่าง write path และ read path
- ป้องกันผลลัพธ์จาก INSERT ไปรบกวน Dashboard
- ใช้ Inject trigger สำหรับ statistics
- จัด flow ให้พร้อมต่อยอดไป Rule & Alert Processing
- ตรวจ debug แต่ละ path ได้อย่างเป็นระบบ

## 12.3 Architecture เดิมที่มีปัญหา

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Prepare INSERT]
    |
    v
 [SQLite]
    |
    v
[Dashboard]
```

ปัญหา:

```text
INSERT ไม่ได้คืน sensor value
Dashboard จึงอาจได้ empty output หรือข้อมูลที่ไม่ต้องการ
```

## 12.4 Architecture ใหม่

```text
                   +--> [Split Fields] --> [Gauge / Chart]
                   |
[MQTT In] -> [JSON]+--> [Prepare INSERT] -> [SQLite]
                   |
                   +--> [Debug Raw Data]

[Inject every 10s] -> [Prepare SELECT] -> [SQLite] -> [Format Stats] -> [Dashboard]
```

แบ่งเป็น 2 path หลัก:

| Path | หน้าที่ |
|---|---|
| Write Path | รับ MQTT แล้วเขียนลง SQLite |
| Read Path | อ่าน SQLite แล้วทำ statistics |

## 12.5 Write Path

ต่อ flow สำหรับเขียนข้อมูล:

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
[SQLite Write]
    |
    v
[Debug Write Result]
```

Function `Prepare SQLite INSERT` ใช้แนวทางจาก LAB 08:

```javascript
let data = msg.payload;

msg.topic = `
INSERT INTO sensor_data (device_id, temp, humi, light)
VALUES ($device_id, $temp, $humi, $light)
`;

msg.params = {
    $device_id: data.device_id || "001",
    $temp: Number(data.temp),
    $humi: Number(data.humi),
    $light: Number(data.light)
};

return msg;
```

## 12.6 Dashboard Path สำหรับค่าล่าสุด

ต่อ flow สำหรับแสดงค่าล่าสุด:

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Split Sensor Fields]
    |          |          |
    v          v          v
 [Gauge]    [Gauge]    [Gauge]
```

เส้นนี้ไม่ต้องรอ SQLite เพราะ dashboard ล่าสุดควรตอบสนองทันทีเมื่อ MQTT message เข้ามา

## 12.7 Read Path สำหรับ Statistics

ต่อ flow สำหรับอ่าน statistics:

```text
[Inject every 10s]
       |
       v
[Prepare Rolling SQL]
       |
       v
[SQLite Read]
       |
       v
[Format Rolling Statistics]
       |
       v
[Dashboard Text]
```

Function `Prepare Rolling SQL`:

```javascript
msg.topic = `
SELECT
  COUNT(*) AS records,
  ROUND(AVG(temp), 2) AS avg_temp,
  MIN(temp) AS min_temp,
  MAX(temp) AS max_temp,
  ROUND(AVG(humi), 2) AS avg_humi,
  ROUND(AVG(light), 2) AS avg_light
FROM sensor_data
WHERE created_at >= datetime('now', '-5 minutes')
`;

return msg;
```

## 12.8 เหตุผลที่ต้องแยก SQLite Write และ Read

| เหตุผล | รายละเอียด |
|---|---|
| ลดผลข้างเคียง | INSERT ไม่ไปรบกวน Dashboard |
| debug ง่าย | รู้ว่า error อยู่ path ไหน |
| ขยายระบบง่าย | เพิ่ม Rule หรือ Alert ได้โดยไม่พังทั้ง flow |
| อ่านง่าย | นักศึกษามองเห็นหน้าที่ของแต่ละส่วน |

## 12.9 วิธีจัดหน้า Flow ใน Node-RED

จัดกลุ่ม node ด้วย comment หรือ group:

```text
Group 1: MQTT Input
Group 2: Latest Dashboard
Group 3: SQLite Write
Group 4: Rolling Statistics
```

ตั้งชื่อ node ให้บอกหน้าที่:

```text
Prepare SQLite INSERT
SQLite Write
Prepare Rolling SQL
SQLite Read
Format Rolling Statistics
```

## 12.10 ทดสอบทั้งระบบ

เปิด subscriber เพื่อดู MQTT:

```bash
mosquitto_sub -h localhost -t "pkru/iot/001/data" -v
```

ส่ง payload:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"device_id":"001","temp":31,"humi":66,"light":1400}'
```

ตรวจ database:

```bash
sqlite3 /home/PI_USER/iot.db "SELECT * FROM sensor_data ORDER BY id DESC LIMIT 3;"
```

ตรวจ dashboard:

```text
Gauge เปลี่ยนทันที
Statistics เปลี่ยนตามรอบ Inject
```

## 12.11 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| Dashboard ค่าหายหลัง INSERT | เอา output SQLite Write ไปต่อ widget |
| Statistics ไม่อัปเดต | Inject ไม่ทำงาน หรือ SQLite Read query ผิด |
| Database มีข้อมูลแต่ Gauge ไม่เปลี่ยน | Dashboard path ไม่ได้ต่อจาก MQTT/JSON |
| Gauge เปลี่ยนแต่ DB ไม่เพิ่ม | Write path มี error |
| Debug สับสน | node ไม่ได้ตั้งชื่อชัดเจน |

## 12.12 Checklist ก่อนจบ LAB

- แยก Write Path และ Read Path แล้ว
- Dashboard latest value ไม่ต่อจาก SQLite Write
- Rolling Statistics ใช้ Inject trigger
- ตรวจ DB ได้ว่ามีข้อมูลเพิ่ม
- Dashboard แสดงทั้งค่าล่าสุดและ statistics ได้
- Flow พร้อมต่อยอดไป Rule & Alert

## 12.13 งานส่ง LAB

ให้ส่ง:

```text
1. ภาพ flow ที่แยกเป็น Write Path และ Read Path
2. คำอธิบายหน้าที่ของแต่ละ path
3. ผล SELECT ข้อมูลล่าสุดจาก SQLite
4. ภาพ Dashboard ที่มีทั้ง Gauge และ Rolling Statistics
5. อธิบายว่าทำไมไม่ควรต่อ Dashboard หลัง SQLite INSERT โดยตรง
```

## 12.14 เชื่อมไป LAB ถัดไป

LAB 13 จะเพิ่ม Rule & Alert Processing โดยใช้ flow ที่จัดระเบียบแล้วจาก LAB นี้ เพื่อเปลี่ยนระบบจาก monitoring ไปสู่การตัดสินใจจากข้อมูล

