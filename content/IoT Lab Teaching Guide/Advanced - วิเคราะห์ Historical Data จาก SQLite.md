> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]

# Advanced --- วิเคราะห์ Historical Data จาก SQLite

> [!info] แก้ไขล่าสุด
> 2026-10-01 07:28:04 +07


ส่วนนี้เป็นเนื้อหาเสริมหลังจากนักศึกษาทำ SQLite และ Statistics ได้แล้ว
ไม่อยู่ในลำดับ Lab พื้นฐาน

เกี่ยวข้องกับ:

- [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]
- [[10 - LAB 10 - สืบค้น Sensor Data ด้วย SQL]]
- [[11 - LAB 11 - คำนวณ Rolling Statistics 5 นาทีล่าสุด]]

## Query ข้อมูล 5 นาทีล่าสุด

```sql
SELECT
    id,
    datetime(timestamp, '+7 hours') AS time_th,
    temp,
    humi,
    light
FROM sensor_data
WHERE timestamp >= datetime('now', '-5 minutes')
ORDER BY timestamp ASC;
```

ผลเป็น Array ของหลาย record เรียงเก่า → ใหม่

## แปลง Temperature History

เวอร์ชันแรกสร้าง array ของ `{x,y}`:

```javascript
const rows = msg.payload;

msg.payload = rows.map(row => ({
    x: new Date(row.time_th.replace(" ", "T")).getTime(),
    y: row.temp
}));

msg.topic = "Temperature";

return msg;
```

จากนั้นเปลี่ยนเป็นส่งหลาย message เพราะ `ui-chart` ที่ใช้อยู่รับ
`timestamp + msg.payload` ได้ตรงกว่า:

```javascript
const rows = msg.payload;

return [rows.map(row => ({
    topic: "Temperature History DB",
    payload: row.temp,
    timestamp: new Date(row.time_th.replace(" ", "T")).getTime()
}))];
```

Debug จะเห็นหลาย message:

```text
Temperature History DB : msg.payload : number
```

## DB History Chart

ค่าที่ใช้:

```text
Type          : Line
Interpolation : Linear
Action        : Append
Point Style   : Circle
Radius        : 2
X-Axis        : Timescale
Limit         : Last 5 Minutes
Y             : 0–50
Series        : Temperature
X             : timestamp
Y             : msg.payload
```

ผลการทดลอง: กราฟย้อนหลังจาก SQLite แสดงได้สำเร็จ

## แนวคิดที่เคยพิจารณา

```text
SQLite History --------\
                        +→ Temperature Chart
MQTT Live -------------/
```

ต้องทำให้ข้อมูลสองทางมี format เดียวกัน:

```text
msg.payload   = temperature
msg.timestamp = timestamp
```

สำหรับ Live MQTT สามารถเตรียม:

```javascript
msg.timestamp = Date.now();
return msg;
```

แต่การรวม DB History + Live MQTT ทำให้ต้องจัดการ Append/Replace, การ clear
chart, timestamp และข้อมูลซ้ำ จึง **ไม่ใช้เป็นแกนหลักของ Lab พื้นฐาน**

------------------------------------------------------------------------
