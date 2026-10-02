> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[18 - LAB 18 - Device Status and Offline Detection]]
> ถัดไป: [[20 - LAB 20 - Python MQTT Application on Raspberry Pi]]

# LAB 19 --- Data Quality: VALID / INVALID / STALE

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:42:32 +07


## 19.1 แนวคิดของ LAB

LAB 18 ทำให้ Gateway สามารถตรวจสอบสถานะของ Device ได้ว่า

```text
ONLINE
OFFLINE
```
แต่

```text
Device ONLINE
```
ไม่ได้หมายความว่า

```text
Sensor Data ถูกต้อง
```
ตัวอย่าง

```text
Device 001
Status = ONLINE
temp = -99
```
Device ยังเชื่อมต่อ MQTT และทำงานอยู่ แต่ Sensor อาจอ่านค่าผิดพลาด

อีกกรณี

```text
Device 001
Status = ONLINE
temp = 32
```
แต่ Temperature ไม่ได้ Update มาเป็นเวลานาน

ค่าที่แสดงอยู่จึงอาจเป็นข้อมูลเก่า

ดังนั้นระบบ IoT ต้องแยกตรวจสอบ

```text
Device Availability
```
ออกจาก

```text
Data Quality
```
LAB 19 กำหนด Data Quality State เป็น

```text
VALID
INVALID
STALE
```
เพื่อให้ Gateway สามารถตอบได้ว่า

```text
"ข้อมูลนี้ยังเชื่อถือได้หรือไม่?"
```


## 19.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบายความแตกต่างระหว่าง Device Status และ Data Quality
- ตรวจสอบโครงสร้างและค่าของ Sensor Data
- ตรวจจับค่าที่ผิดพลาด
- กำหนด Valid Range
- ตรวจจับข้อมูลที่ไม่ Update
- ใช้ Timestamp และ Timeout ตรวจสอบ STALE
- จำแนกข้อมูลเป็น VALID / INVALID / STALE
- แสดง Data Quality บน Dashboard
- แยก Last Value ออกจาก Trusted Current Value
- เข้าใจว่าระบบ IoT ไม่ควรใช้ข้อมูลโดยไม่ตรวจสอบคุณภาพก่อน


## 19.3 Architecture

```text
ESP32
   │
   │ Sensor Data
   ▼
  MQTT
   │
   ▼
Node-RED
   │
   ▼
Data Validation
   │
   ├── Format Check
   ├── Missing Value Check
   ├── Range Check
   └── Freshness Check
           │
           ▼
    Data Quality State
      │      │      │
      ▼      ▼      ▼
    VALID INVALID STALE
           │
           ▼
       Dashboard
```


## 19.4 Device Status กับ Data Quality เป็นคนละเรื่อง

หลัง LAB 18 เรามี

```text
Device Status
```
เช่น

```text
ONLINE
OFFLINE
```
LAB 19 เพิ่ม

```text
Data Quality
```
เช่น

```text
VALID
INVALID
STALE
```
ตัวอย่าง

| Device | Device Status | Data Quality |
|---|---|---|
| 001 | ONLINE | VALID |
| 002 | ONLINE | INVALID |
| 003 | ONLINE | STALE |
| 004 | OFFLINE | STALE |

ดังนั้น Device อาจ

```text
ONLINE + VALID
```
หรือ

```text
ONLINE + INVALID
```
หรือ

```text
ONLINE + STALE
```
ได้


## 19.5 ความหมายของ VALID

VALID หมายถึง

- ได้รับข้อมูลตามรูปแบบที่กำหนด
- Sensor Value มีอยู่
- สามารถแปลงเป็นตัวเลขได้
- ค่าอยู่ในช่วงที่ระบบยอมรับ
- ข้อมูลยังใหม่ตาม Freshness Requirement

ตัวอย่าง

```json
{
  "temp": 32,
  "humi": 70,
  "light": 1500
}
```
ถ้าผ่าน Validation

```text
Quality = VALID
```


## 19.6 ความหมายของ INVALID

INVALID หมายถึง

```text
ได้รับข้อมูลใหม่แล้ว
```
แต่ข้อมูลนั้นไม่ผ่าน Validation

ตัวอย่าง

```text
temp = -99
```
หรือ

```text
temp = null
```
หรือ

```text
temp = "ERROR"
```
หรือ Payload ไม่มี

```text
temp
```
ตัวอย่าง

```json
{
  "humi": 70,
  "light": 1500
}
```
ถ้าระบบคาดว่าต้องมี Temperature

ให้กำหนด

```text
Quality = INVALID
```


## 19.7 ความหมายของ STALE

STALE หมายถึง

```text
เคยมีข้อมูล
```
แต่ไม่มีข้อมูลใหม่ภายในเวลาที่กำหนด

ตัวอย่าง

```text
Last Temperature = 32 °C
```
แต่

```text
Last Update = 30 seconds ago
```
ถ้ากำหนด

```text
Stale Timeout = 15 seconds
```
จะได้

```text
Quality = STALE
```
ดังนั้น

```text
32 °C
```
ยังสามารถเก็บไว้เป็น Last Known Value ได้

แต่ไม่ควรถือว่าเป็น Current Trusted Value


## 19.8 INVALID กับ STALE ต่างกันอย่างไร

INVALID

```text
มีข้อมูลใหม่เข้ามา
      ↓
แต่ข้อมูลผิด
```
STALE

```text
ไม่มีข้อมูลใหม่เข้ามา
      ↓
ข้อมูลเดิมเก่าเกินกำหนด
```
ตัวอย่าง

```text
temp = -99
received now
```
คือ

```text
INVALID
```
แต่

```text
temp = 32
received 30 seconds ago
```
คือ

```text
STALE
```
นี่เป็นความแตกต่างสำคัญมาก


## 19.9 Data Quality State Model

สามารถมองเป็น State ง่าย ๆ

```text
                New Data
                   │
                   ▼
              Validation
               /       \
            Pass       Fail
             │           │
             ▼           ▼
           VALID      INVALID
             │
             │ No New Data
             │ > Timeout
             ▼
           STALE
             │
             │ New Valid Data
             ▼
           VALID
```
ถ้ามีข้อมูลใหม่แต่ผิด

```text
STALE
  ↓
INVALID
```
ถ้ามีข้อมูลใหม่และถูกต้อง

```text
STALE
  ↓
VALID
```


## 19.10 MQTT Topic

ใช้ Topic เดิมจาก LAB ก่อนหน้า

```text
pkru/iot/001/data
```
Multi-device

```text
pkru/iot/+/data
```
Payload ปกติ

```json
{
  "temp": 32,
  "humi": 70,
  "light": 1500
}
```


## 19.11 ทดสอบ VALID Data

เปิด Subscriber

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/data" \
-v
```
ส่งข้อมูล

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":32,"humi":70,"light":1500}'
```
ข้อมูลนี้ควรถูกจัดเป็น

```text
VALID
```
หากผ่าน Validation Rules ที่กำหนด


## 19.12 ทดสอบ INVALID Data

ตัวอย่าง Sensor Error Code

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":-99,"humi":70,"light":1500}'
```
ควรได้

```text
INVALID
```


ส่งค่า null

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":null,"humi":70,"light":1500}'
```
ควรได้

```text
INVALID
```


ส่งข้อมูลไม่มี temp

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"humi":70,"light":1500}'
```
ควรได้

```text
INVALID
```


## 19.13 กำหนด Valid Range

สำหรับ LAB สามารถกำหนด Engineering Range เพื่อใช้ตรวจสอบข้อมูล

ตัวอย่าง

```text
Temperature
-20 ถึง 80 °C

Humidity
0 ถึง 100 %

Light
0 ถึง 100000 lx
```
ค่าที่อยู่นอกช่วงนี้

ให้ถือเป็น

```text
INVALID
```
หมายเหตุสำคัญ

Valid Range ต้องกำหนดตาม

- Sensor
- Physical Process
- Application Requirement

ไม่ควรใช้ช่วงตัวอย่างนี้กับทุกระบบโดยไม่พิจารณาบริบท


## 19.14 Validation Rules

สำหรับ LAB นี้กำหนดว่า Payload ต้องมี

```text
temp
humi
light
```
และต้องเป็นตัวเลขที่มีค่าจำกัด

พร้อมอยู่ในช่วง

```text
-20 <= temp <= 80

0 <= humi <= 100

0 <= light <= 100000
```
นอกจากนี้กำหนด Error Value

```text
-99
```
เป็น INVALID


## 19.15 Node-RED Flow

สร้าง Flow

```text
[MQTT In]
     │
     ▼
   [JSON]
     │
     ▼
[Data Validation]
     │
     ▼
   [Debug]
```
MQTT Topic

```text
pkru/iot/+/data
```


## 19.16 Function — Data Validation

สร้าง Function Node

ชื่อ

```text
Data Validation
```
ใช้

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let temp = Number(msg.payload.temp);
let humi = Number(msg.payload.humi);
let light = Number(msg.payload.light);

let valid = true;

if (
    msg.payload.temp === null ||
    msg.payload.temp === undefined ||
    msg.payload.humi === null ||
    msg.payload.humi === undefined ||
    msg.payload.light === null ||
    msg.payload.light === undefined
) {
    valid = false;
}

if (
    !Number.isFinite(temp) ||
    !Number.isFinite(humi) ||
    !Number.isFinite(light)
) {
    valid = false;
}

if (
    temp === -99 ||
    humi === -99 ||
    light === -99
) {
    valid = false;
}

if (
    temp < -20 || temp > 80 ||
    humi < 0 || humi > 100 ||
    light < 0 || light > 100000
) {
    valid = false;
}

msg.device_id = device_id;
msg.quality = valid ? "VALID" : "INVALID";
msg.received_at = Date.now();

return msg;
```


## 19.17 ทำไมต้องใช้ Number.isFinite()

ไม่ควรตรวจเพียง

```text
Number(value)
```
เพราะข้อมูลบางชนิดอาจถูกแปลงในลักษณะที่ไม่ตรงกับสิ่งที่ต้องการ

จึงตรวจเพิ่ม

```javascript
Number.isFinite(temp)
```
เพื่อยืนยันว่าได้ค่าตัวเลขที่มีขอบเขตจำกัดจริง

เช่น

```text
"ERROR"
```
เมื่อแปลงเป็น Number จะได้

```text
NaN
```
และ

```javascript
Number.isFinite(NaN)
```
จะเป็น

```text
false
```
จึงสามารถจัดเป็น

```text
INVALID
```


## 19.18 เก็บ Data Quality ของแต่ละ Device

เพิ่มการเก็บ State

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let temp = Number(msg.payload.temp);
let humi = Number(msg.payload.humi);
let light = Number(msg.payload.light);

let valid = true;

if (
    msg.payload.temp === null ||
    msg.payload.temp === undefined ||
    msg.payload.humi === null ||
    msg.payload.humi === undefined ||
    msg.payload.light === null ||
    msg.payload.light === undefined
) {
    valid = false;
}

if (
    !Number.isFinite(temp) ||
    !Number.isFinite(humi) ||
    !Number.isFinite(light)
) {
    valid = false;
}

if (
    temp === -99 ||
    humi === -99 ||
    light === -99
) {
    valid = false;
}

if (
    temp < -20 || temp > 80 ||
    humi < 0 || humi > 100 ||
    light < 0 || light > 100000
) {
    valid = false;
}

let quality = flow.get("data_quality") || {};

quality[device_id] = {
    status: valid ? "VALID" : "INVALID",
    last_update: Date.now()
};

flow.set("data_quality", quality);

msg.device_id = device_id;
msg.quality = quality[device_id].status;

return msg;
```


## 19.19 สิ่งที่เก็บใน Gateway

ตัวอย่าง

```javascript
flow.data_quality
```
อาจมี

```json
{
  "001": {
    "status": "VALID",
    "last_update": 1780000000000
  },

  "002": {
    "status": "INVALID",
    "last_update": 1780000005000
  },

  "003": {
    "status": "VALID",
    "last_update": 1780000010000
  }
}
```
ค่าของ Timestamp ด้านบนเป็นเพียงตัวอย่าง

ค่าจริงมาจาก

```javascript
Date.now()
```


## 19.20 ตรวจจับ STALE

สมมติ Sensor ส่งข้อมูลทุก

```text
5 seconds
```
กำหนด

```text
Stale Timeout = 15 seconds
```
ถ้า

```text
Current Time - Last Update > 15 seconds
```
ให้เปลี่ยน Quality เป็น

```text
STALE
```


## 19.21 Periodic Stale Check

สร้าง Inject Node

ตั้งให้ทำงานทุก

```text
5 seconds
```
Flow

```text
[Inject every 5 s]
         │
         ▼
   [Check Stale]
         │
         ▼
       [Debug]
```


## 19.22 Function — Check Stale

สร้าง Function Node

ชื่อ

```text
Check Stale
```
ใช้

```javascript
let quality = flow.get("data_quality") || {};

let now = Date.now();
let stale_timeout = 15000;

for (let device_id in quality) {

    let elapsed =
        now - quality[device_id].last_update;

    if (elapsed > stale_timeout) {
        quality[device_id].status = "STALE";
    }
}

flow.set("data_quality", quality);

msg.payload = quality;

return msg;
```


## 19.23 ทดสอบ STALE

ส่งข้อมูล

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":32,"humi":70,"light":1500}'
```
เริ่มต้น

```text
Device 001
Quality = VALID
```
จากนั้นไม่ส่งข้อมูลใหม่

รอเกิน

```text
15 seconds
```
ผล

```text
Device 001
Quality = STALE
```
แม้ Last Value ยังเป็น

```text
temp = 32
```
ก็ตาม


## 19.24 Data Quality Architecture

```text
Sensor Data
    │
    ▼
 Received
    │
    ▼
Validation
  /      \
Pass     Fail
 │         │
 ▼         ▼
```
   VALID    INVALID
```text
 │
 │ No Update
 │ > Timeout
 ▼
```
   STALE


## 19.25 INVALID Data ต้อง Update Last Update หรือไม่?

นี่เป็นจุดสำคัญ

สมมติ Device ส่ง

```text
temp = -99
```
ทุก 5 วินาที

Device ยังส่งข้อมูลอยู่

ดังนั้น

```text
Device Communication
```
ยังทำงาน

แต่

```text
Sensor Data
```
ผิด

ใน LAB นี้

```text
last_update
```
หมายถึง

```text
เวลาที่ได้รับ Sensor Message ล่าสุด
```
ดังนั้น INVALID Message จะ Update

```text
last_update
```
ด้วย

ผลคือ

```text
INVALID
```
จะยังคงเป็น INVALID

ไม่เปลี่ยนเป็น STALE ตราบใดที่ INVALID Message ยังเข้ามาเรื่อย ๆ

นี่ทำให้สามารถแยก

```text
Sensor ส่งข้อมูลผิด
```
ออกจาก

```text
Sensor หยุดส่งข้อมูล
```
ได้


## 19.26 Last Received กับ Last Valid

ระบบจริงควรแยก Timestamp อย่างน้อยสองค่า

```text
last_received
```
และ

```text
last_valid
```
ตัวอย่าง

```text
Device 001

last_received = 10:20:30
last_valid    = 10:19:50
```
หมายความว่า

Device ยังส่ง Message อยู่

แต่ไม่มี Valid Data มาประมาณ 40 วินาที

นี่ให้ข้อมูลมากกว่า Timestamp เดียว


## 19.27 ปรับ Data Quality Registry

รูปแบบที่ดีกว่า

```json
{
  "001": {
    "status": "VALID",
    "last_received": 1780000000000,
    "last_valid": 1780000000000
  }
}
```
เมื่อได้รับ INVALID Data

```text
last_received
```
ต้อง Update

แต่

```text
last_valid
```
ไม่ Update


## 19.28 Function ที่แนะนำสำหรับ LAB

ใช้ Function นี้เป็นเวอร์ชันหลัก

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let now = Date.now();

let raw_temp = msg.payload.temp;
let raw_humi = msg.payload.humi;
let raw_light = msg.payload.light;

let temp = Number(raw_temp);
let humi = Number(raw_humi);
let light = Number(raw_light);

let valid = true;

if (
    raw_temp === null ||
    raw_temp === undefined ||
    raw_humi === null ||
    raw_humi === undefined ||
    raw_light === null ||
    raw_light === undefined
) {
    valid = false;
}

if (
    !Number.isFinite(temp) ||
    !Number.isFinite(humi) ||
    !Number.isFinite(light)
) {
    valid = false;
}

if (
    temp === -99 ||
    humi === -99 ||
    light === -99
) {
    valid = false;
}

if (
    temp < -20 || temp > 80 ||
    humi < 0 || humi > 100 ||
    light < 0 || light > 100000
) {
    valid = false;
}

let quality = flow.get("data_quality") || {};

let old_data = quality[device_id] || {};

quality[device_id] = {
    status: valid ? "VALID" : "INVALID",
    last_received: now,
    last_valid: valid
        ? now
        : (old_data.last_valid || null)
};

flow.set("data_quality", quality);

msg.device_id = device_id;
msg.quality = quality[device_id].status;

return msg;
```


## 19.29 ปรับ Stale Detection

เมื่อใช้

```text
last_received
```
การตรวจ STALE ควรใช้

```text
Current Time - last_received
```
Function

```javascript
let quality = flow.get("data_quality") || {};

let now = Date.now();
let stale_timeout = 15000;

for (let device_id in quality) {

    let elapsed =
        now - quality[device_id].last_received;

    if (elapsed > stale_timeout) {
        quality[device_id].status = "STALE";
    }
}

flow.set("data_quality", quality);

msg.payload = quality;

return msg;
```
ผลคือ

### Device ส่ง Valid Data

```text
VALID
```
### Device ส่ง Invalid Data ต่อเนื่อง

```text
INVALID
```
### Device หยุดส่ง Sensor Data

```text
STALE
```
สาม State จึงมีความหมายแยกจากกันชัดเจน


## 19.30 State Transition

ตัวอย่าง Device 001

เริ่มต้นส่ง

```text
temp = 30
```
ได้

```text
VALID
```
จากนั้นส่ง

```text
temp = -99
```
ได้

```text
INVALID
```
จากนั้นกลับมาส่ง

```text
temp = 31
```
ได้

```text
VALID
```
จากนั้นหยุดส่งเกิน 15 วินาที

ได้

```text
STALE
```
จากนั้นส่ง

```text
temp = 32
```
ได้

```text
VALID
```
State Sequence

```text
VALID
  ↓
INVALID
  ↓
VALID
  ↓
STALE
  ↓
VALID
```


## 19.31 Dashboard

เพิ่ม Data Quality ใน Dashboard

ตัวอย่าง

```text
┌──────────────────────────────┐
│ DEVICE 001                   │
│                              │
│ Device Status : ONLINE       │
│ Data Quality  : VALID        │
│                              │
│ Temp  : 30 °C                │
│ Humi  : 70 %                 │
│ Light : 1500 lx              │
└──────────────────────────────┘
```
Device 002

```text
┌──────────────────────────────┐
│ DEVICE 002                   │
│                              │
│ Device Status : ONLINE       │
│ Data Quality  : INVALID      │
│                              │
│ Temp  : -99                  │
└──────────────────────────────┘
```
Device 003

```text
┌──────────────────────────────┐
│ DEVICE 003                   │
│                              │
│ Device Status : ONLINE       │
│ Data Quality  : STALE        │
│                              │
│ Temp  : 32 °C                │
│ Last Data : 35 s ago         │
└──────────────────────────────┘
```


## 19.32 ไม่ควรใช้ INVALID Data ควบคุม Actuator

สมมติ LAB 15 มี Rule

```text
temp > 35
    → Fan ON
```
ถ้า Sensor ส่ง

```text
temp = -99
```
ระบบไม่ควรส่งข้อมูลนี้เข้า Automatic Control โดยตรง

Architecture ที่เหมาะสมคือ

```text
Sensor
   ↓
  MQTT
   ↓
Validation
   │
   ├── VALID ──→ Rule → Control
   │
   └── INVALID → Reject / Alert
```
เช่นเดียวกับ STALE

```text
STALE
```
ไม่ควรถูกนำไปใช้ตัดสินใจควบคุมโดยไม่มีกลยุทธ์ Failsafe ที่ชัดเจน

นี่เป็นเหตุผลสำคัญว่าทำไม

```text
Data Validation
```
ควรอยู่ก่อน

```text
Decision / Control
```


## 19.33 Safe Processing Pipeline

หลัง LAB 19 Architecture ที่ดีขึ้นคือ

```text
Sensor
   ↓
  MQTT
   ↓
Data Validation
   ↓
Data Quality
   │
   ├── VALID
   │      ↓
   │     Rule
   │      ↓
   │    Control
   │
   ├── INVALID
   │      ↓
   │    Alert
   │
   └── STALE
          ↓
        Alert /
        Failsafe
```
ดังนั้น Processing Pipeline เป็น

```text
Acquire
   ↓
Validate
   ↓
Process
   ↓
Decide
   ↓
Control
```
ไม่ใช่

```text
Acquire
   ↓
Control
```
ทันที


## 19.34 Device Status และ Data Quality

ตัวอย่างสถานการณ์

### Case 1

```text
Device Status = ONLINE
Data Quality  = VALID
```
ความหมาย

```text
Device ทำงาน
Sensor Data ใช้งานได้
```


### Case 2

```text
Device Status = ONLINE
Data Quality  = INVALID
```
ความหมาย

```text
Device ยังเชื่อมต่ออยู่
แต่ Sensor Data ผิด
```
สาเหตุอาจเป็น

- Sensor Error
- Sensor Disconnect
- Invalid Value
- Parsing Error


### Case 3

```text
Device Status = ONLINE
Data Quality  = STALE
```
ความหมาย

```text
Device Communication อาจยังทำงาน
แต่ Sensor Data ไม่ Update ตามที่คาดไว้
```
ตัวอย่าง

ESP32 ยังส่ง Heartbeat

```text
ONLINE
```
แต่ Sensor Task หยุดทำงาน


### Case 4

```text
Device Status = OFFLINE
Data Quality  = STALE
```
ความหมาย

```text
Device หายจากระบบ
และ Sensor Data ที่เหลืออยู่เป็นข้อมูลเก่า
```


## 19.35 ทำไม LAB 18 และ LAB 19 ต้องแยกกัน

LAB 18 ตรวจ

```text
Device Availability
```
ถามว่า

```text
"Device ยังอยู่หรือไม่?"
```
LAB 19 ตรวจ

```text
Data Quality
```
ถามว่า

```text
"ข้อมูลยังใช้ได้หรือไม่?"
```
สองคำถามนี้ไม่เหมือนกัน

ระบบที่ดีต้องตอบได้ทั้งสองคำถาม


## 19.36 Multi-device Data Quality

ระบบต้องเก็บ Quality แยกตาม Device

ตัวอย่าง

```text
Device 001
ONLINE
VALID

Device 002
ONLINE
INVALID

Device 003
ONLINE
STALE
```
Architecture

```text
Device 001 ─┐
Device 002 ─┼──→ MQTT
Device 003 ─┘
                 │
                 ▼
             Node-RED
                 │
                 ▼
            Validation
                 │
                 ▼
           Quality Registry
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
     001        002        003
    VALID     INVALID      STALE
```


## 19.37 Sensor Simulator — VALID

```bash
while true
do
    temp=$((25 + RANDOM % 11))
    humi=$((60 + RANDOM % 21))
    light=$((500 + RANDOM % 1501))

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/data" \
        -m "{\"temp\":$temp,\"humi\":$humi,\"light\":$light}"

    sleep 5
done
```
ผล

```text
VALID
```


## 19.38 Sensor Simulator — INVALID

จำลอง Sensor Error

```bash
while true
do
    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/002/data" \
        -m '{"temp":-99,"humi":70,"light":1500}'

    sleep 5
done
```
ผล

```text
Device 002
Data Quality = INVALID
```
แต่ถ้า Heartbeat ยังทำงาน

```text
Device Status = ONLINE
```
ดังนั้น

```text
ONLINE + INVALID
```


## 19.39 Sensor Simulator — STALE

ส่งข้อมูล Device 003 หนึ่งครั้ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/003/data" \
-m '{"temp":32,"humi":70,"light":1500}'
```
เริ่มต้น

```text
VALID
```
จากนั้นไม่ส่ง Data อีก

หลังเกิน

```text
15 seconds
```
ได้

```text
STALE
```
ถ้า Device 003 ยังส่ง Heartbeat

```text
pkru/iot/003/status ONLINE
```
จะได้

```text
Device Status = ONLINE
Data Quality  = STALE
```
นี่เป็นกรณีสำคัญ เพราะแสดงว่า Device ยังอยู่ แต่ Sensor Data Pipeline มีปัญหา


## 19.40 การทดสอบพร้อมกัน 3 Device

กำหนด

```text
Device 001 → VALID
Device 002 → INVALID
Device 003 → STALE
```
ผลที่ต้องได้

| Device | Device Status | Data Quality |
|---|---|---|
| 001 | ONLINE | VALID |
| 002 | ONLINE | INVALID |
| 003 | ONLINE | STALE |

ทำให้นักศึกษาเห็นความแตกต่างของ Quality State ได้ชัดเจน


## 19.41 แบบฝึกหัดที่ 1 — Valid Range

กำหนด

```text
Temperature
-20 ถึง 80 °C
```
ทดสอบ

```text
25
80
81
-20
-21
-99
```
ให้นักศึกษาระบุ

```text
VALID
```
หรือ

```text
INVALID
```
ผลที่คาดหวัง

| temp | Quality |
|---:|---|
| 25 | VALID |
| 80 | VALID |
| 81 | INVALID |
| -20 | VALID |
| -21 | INVALID |
| -99 | INVALID |


## 19.42 แบบฝึกหัดที่ 2 — Missing Data

ทดสอบ

```json
{"temp":30,"humi":70,"light":1500}

{"temp":30,"humi":70}

{"temp":null,"humi":70,"light":1500}

{"temp":"ERROR","humi":70,"light":1500}
```
ระบุว่าแต่ละ Payload เป็น

```text
VALID
```
หรือ

```text
INVALID
```


## 19.43 แบบฝึกหัดที่ 3 — Stale Detection

กำหนด

```text
Data Interval = 5 s

Stale Timeout = 15 s
```
ส่ง Valid Data

ตรวจสอบ

```text
VALID
```
จากนั้นหยุดส่ง

รอมากกว่า 15 วินาที

ตรวจสอบ

```text
STALE
```
จากนั้นส่ง Valid Data ใหม่

ตรวจสอบว่ากลับเป็น

```text
VALID
```


## 19.44 แบบฝึกหัดที่ 4 — Invalid Recovery

ส่ง

```text
temp = -99
```
ตรวจสอบ

```text
INVALID
```
จากนั้นส่ง

```text
temp = 32
```
ตรวจสอบว่ากลับเป็น

```text
VALID
```
State

```text
INVALID
   ↓
VALID
```


## 19.45 แบบฝึกหัดที่ 5 — Device Status vs Data Quality

สร้างสถานการณ์

```text
Device 001
ONLINE + VALID

Device 002
ONLINE + INVALID

Device 003
ONLINE + STALE
```
อธิบายความหมายของแต่ละกรณี


## 19.46 แบบฝึกหัดขั้นสูง — Per-sensor Quality

LAB หลักกำหนด Quality ระดับ Device

เช่น

```text
Device 001
Quality = INVALID
```
แต่ระบบจริงอาจเกิด

```text
temp  = INVALID
humi  = VALID
light = VALID
```
จึงสามารถพัฒนาต่อเป็น

```text
temp_quality
humi_quality
light_quality
```
ตัวอย่าง

```json
{
  "temp": {
    "value": -99,
    "quality": "INVALID"
  },

  "humi": {
    "value": 70,
    "quality": "VALID"
  },

  "light": {
    "value": 1500,
    "quality": "VALID"
  }
}
```
แนวคิดนี้เหมาะกับระบบที่ต้องการ Sensor Verification รายตัว

แต่ LAB หลักยังใช้ Device-level Quality เพื่อไม่ให้ซับซ้อนเกินไป


## 19.47 งานส่ง LAB 19

นักศึกษาส่ง

1. Screenshot Node-RED Flow

```text
   MQTT
     ↓
   JSON
     ↓
   Data Validation
     ↓
   Data Quality
```
2. Screenshot Dashboard แสดง

```text
   Device Status
   Data Quality
   Temp
   Humi
   Light
```
3. แสดงสถานะ

```text
   VALID
```
4. แสดงสถานะ

```text
   INVALID
```
5. แสดงสถานะ

```text
   STALE
```
6. ทดสอบอย่างน้อย 3 Device

```text
   001 → VALID
   002 → INVALID
   003 → STALE
```
7. แสดง Boundary Test ของ Temperature

8. อธิบายความแตกต่างระหว่าง

```text
   VALID
   INVALID
   STALE
```
9. อธิบายความแตกต่างระหว่าง

```text
   Device Status
```
   และ

```text
   Data Quality
```
10. อธิบายว่าเหตุใด INVALID หรือ STALE Data จึงไม่ควรถูกส่งเข้า Automatic Control โดยตรง


## 19.48 สิ่งที่นักศึกษาต้องเข้าใจ

LAB 18 ถามว่า

```text
Device ยังทำงานอยู่หรือไม่?
```
ได้

```text
ONLINE
OFFLINE
```
LAB 19 ถามว่า

```text
Sensor Data ยังเชื่อถือได้หรือไม่?
```
ได้

```text
VALID
INVALID
STALE
```
จึงมีสองมิติ

```text
Device Availability
        +
   Data Quality
```
ตัวอย่าง

```text
ONLINE + VALID
```
หมายถึง

```text
Device ทำงาน
Data ใช้งานได้
```
ส่วน

```text
ONLINE + INVALID
```
หมายถึง

```text
Device ทำงาน
Data ใช้งานไม่ได้
```
และ

```text
ONLINE + STALE
```
หมายถึง

```text
Device ยังอยู่
แต่ Sensor Data ไม่ Update
```


## 19.49 Architecture หลัง LAB 19

```text
┌───────────────┐
│ ESP32 / Sensor│
└───────┬───────┘
        │
        ├──────── Data
        │
        └──────── Status
                 │
                 ▼
          ┌───────────────┐
          │ MQTT Broker   │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ Node-RED      │
          │               │
          │ Availability  │
          │ Validation    │
          │ Freshness     │
          └───────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
   Device Status       Data Quality
         │                 │
    ONLINE/OFFLINE    VALID
                      INVALID
                      STALE
         │                 │
         └────────┬────────┘
                  ▼
              Dashboard
                  │
                  ▼
            Trusted Data
                  │
                  ▼
           Rule / Control
```
Processing Pipeline จึงเป็น

```text
Acquire
   ↓
Communicate
   ↓
Verify Device
   ↓
Validate Data
   ↓
Check Freshness
   ↓
Process
   ↓
Decide
   ↓
Control
```


## 19.50 ความสัมพันธ์ของ LAB 16–19

LAB 16 — MQTT Topic Design

```text
Multiple Devices
      ↓
Structured MQTT
```
LAB 17 — Multi-device Dashboard

```text
Multiple Devices
      ↓
Multi-device Monitoring
```
LAB 18 — Device Status

```text
Device
  ↓
ONLINE / OFFLINE
```
LAB 19 — Data Quality

```text
Sensor Data
    ↓
VALID / INVALID / STALE
```
ระบบจึงพัฒนาจาก

```text
Multi-device Communication
          ↓
Multi-device Monitoring
          ↓
Device Availability
          ↓
   Data Verification
```


## เชื่อมไป LAB 20 --- Python MQTT Application

จนถึง LAB 19 เราใช้

```text
Node-RED
```
เป็น Processing Layer หลัก

Architecture

```text
ESP32
   ↓
  MQTT
   ↓
Node-RED
   ↓
Validation
   ↓
  Rule
   ↓
Dashboard / Control
```
แต่ Raspberry Pi สามารถทำงานเป็น IoT Gateway โดยไม่ต้องพึ่ง Node-RED

LAB 20 จะสร้าง MQTT Application ด้วย Python

```text
ESP32
   ↓
  MQTT
   ↓
Python Application
   │
   ├── Subscribe
   ├── JSON Parsing
   ├── Validation
   ├── Rule Processing
   ├── Publish
   └── Error Handling
```
ทำให้นักศึกษาเข้าใจว่า

```text
Node-RED
```
เป็นเครื่องมือหนึ่งสำหรับสร้าง IoT Application

แต่หลักการจริงคือ

```text
MQTT
  +
Application Logic
```
และ Application Logic สามารถพัฒนาด้วยภาษาโปรแกรมได้

LAB 20 จึงเป็นจุดเปลี่ยนจาก

```text
Visual Programming
```
ไปสู่

```text
Programmatic IoT Gateway Application
```
เพื่อเตรียมต่อไปยัง LAB 21

```text
Python Application
      ↓
  systemd Service
      ↓
Auto Start / Restart
      ↓
Autonomous IoT Gateway
```
