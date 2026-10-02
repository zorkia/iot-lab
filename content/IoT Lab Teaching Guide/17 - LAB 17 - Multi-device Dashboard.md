> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[16 - LAB 16 - MQTT Topic Design for Multi-device IoT]]
> ถัดไป: [[18 - LAB 18 - Device Status and Offline Detection]]

# LAB 17 --- Multi-device Dashboard

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:22:22 +07


## 17.1 แนวคิดของ LAB

LAB 16 ทำให้ระบบ MQTT รองรับหลาย Device ด้วย Topic Structure:

```text
pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
```

และสามารถ Subscribe ข้อมูลทุก Device ด้วย:

```text
pkru/iot/+/data
```

LAB 17 นำข้อมูลจากหลาย Device มาแสดงบน Dashboard เดียว

จากเดิม:

```text
ESP32
   ↓
  MQTT
   ↓
Node-RED
   ↓
Dashboard
```

เปลี่ยนเป็น:

```text
ESP32-001 ─┐
ESP32-002 ─┼──→ MQTT ──→ Node-RED ──→ Multi-device Dashboard
ESP32-003 ─┘
```

เป้าหมายสำคัญคือให้นักศึกษาเลิกออกแบบ Dashboard แบบผูกกับ Device เพียงตัวเดียว

และเริ่มเข้าใจ:

```text
Multi-device Monitoring
Device Identification
Device Selection
Device Comparison
Shared Dashboard
```

## 17.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- รับข้อมูลจาก ESP32 หลาย Device ด้วย MQTT Wildcard
- แยก Device ID จาก MQTT Topic
- จัดเก็บค่าล่าสุดของแต่ละ Device ใน Node-RED
- แสดงข้อมูลหลาย Device บน Dashboard
- เลือก Device ที่ต้องการดู
- เปรียบเทียบ Sensor จากหลาย Device
- เข้าใจความแตกต่างระหว่าง Single-device และ Multi-device Dashboard
- ออกแบบ Dashboard ที่ไม่ต้องสร้าง Flow ใหม่ทั้งหมดเมื่อเพิ่ม Device

## 17.3 Architecture

```text
ESP32-001
   │
   │ pkru/iot/001/data
   │
   ├──────────────────┐
                      │
ESP32-002             │
   │                  │
   │ pkru/iot/002/data│
   │                  │
   ├──────────────────┤
                      ▼
                MQTT Broker
                      │
                      │
               pkru/iot/+/data
                      │
                      ▼
                  Node-RED
                      │
                      ▼
               Extract Device ID
                      │
                      ▼
               Common Processing
                      │
                      ▼
            Multi-device Dashboard
                │       │       │
                ▼       ▼       ▼
               Temp    Humi    Light
```

## 17.4 MQTT Topic

ใช้ Topic Structure จาก LAB 16

Device 001:

```text
pkru/iot/001/data
```

Device 002:

```text
pkru/iot/002/data
```

Device 003:

```text
pkru/iot/003/data
```

Node-RED Subscribe:

```text
pkru/iot/+/data
```

Payload:

```json
{
  "temp": 30,
  "humi": 70,
  "light": 1500
}
```

## 17.5 ทดสอบ Multi-device MQTT

เปิด Terminal:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/data" \
  -v
```

ส่งข้อมูล Device 001:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":30,"humi":70,"light":1000}'
```

Device 002:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/002/data" \
  -m '{"temp":32,"humi":75,"light":1500}'
```

Device 003:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/003/data" \
  -m '{"temp":35,"humi":80,"light":2000}'
```

ผลที่ควรได้รับ:

```text
pkru/iot/001/data {"temp":30,"humi":70,"light":1000}
pkru/iot/002/data {"temp":32,"humi":75,"light":1500}
pkru/iot/003/data {"temp":35,"humi":80,"light":2000}
```

เมื่อขั้นตอนนี้ทำงาน แสดงว่า Data Path จากหลาย Device มาถึง Gateway แล้ว

## 17.6 Node-RED Input Flow

สร้าง Flow:

```text
[MQTT In]
     │
     ▼
   [JSON]
     │
     ▼
[Process Device Data]
     │
     ▼
   [Debug]
```

ตั้ง MQTT In:

| ค่า | รายละเอียด |
|---|---|
| Broker | `localhost:1883` |
| Topic | `pkru/iot/+/data` |

## 17.7 แยก Device ID

MQTT Topic ตัวอย่าง:

```text
pkru/iot/002/data
```

Node-RED เก็บ Topic ไว้ใน:

```text
msg.topic
```

เพิ่ม Function Node ชื่อ:

```text
Process Device Data
```

ใช้:

```javascript
let parts = msg.topic.split("/");

msg.device_id = parts[2];

return msg;
```

ตัวอย่าง:

```text
msg.topic = "pkru/iot/002/data"
```

ผล:

```text
msg.device_id = "002"
```

ดังนั้น Flow เดียวสามารถรู้ได้ว่าข้อมูลมาจาก Device ใด

## 17.8 ตรวจสอบ Payload

หลัง JSON Node:

```text
msg.payload.temp
msg.payload.humi
msg.payload.light
```

และหลัง Process Device Data:

```text
msg.device_id
```

ดังนั้น Message มีข้อมูลสำคัญ:

```text
device_id = 002
temp      = 32
humi      = 75
light     = 1500
```

## 17.9 เก็บ Latest Data ของแต่ละ Device

ถ้าต้องการ Dashboard ที่สามารถเลือก Device ได้ ระบบต้องจำค่าล่าสุดของแต่ละ Device

ใช้ Node-RED Flow Context

เพิ่ม Function Node ชื่อ:

```text
Store Latest Device Data
```

ใช้:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let devices = flow.get("devices") || {};

devices[device_id] = {
    temp: Number(msg.payload.temp),
    humi: Number(msg.payload.humi),
    light: Number(msg.payload.light),
    timestamp: Date.now()
};

flow.set("devices", devices);

msg.device_id = device_id;

return msg;
```

ตัวอย่างข้อมูลภายใน `flow.devices`:

```json
{
  "001": {
    "temp": 30,
    "humi": 70,
    "light": 1000,
    "timestamp": 1780000000000
  },
  "002": {
    "temp": 32,
    "humi": 75,
    "light": 1500,
    "timestamp": 1780000001000
  },
  "003": {
    "temp": 35,
    "humi": 80,
    "light": 2000,
    "timestamp": 1780000002000
  }
}
```

ค่าของ `timestamp` ด้านบนเป็นเพียงตัวอย่าง ค่าจริงจะมาจาก:

```javascript
Date.now()
```

## 17.10 ทำไมต้องเก็บ Latest Data

ถ้า Dashboard แสดงเฉพาะ Message ล่าสุด:

```text
Device 001 ส่งข้อมูล → Dashboard แสดง Device 001
Device 002 ส่งข้อมูล → Dashboard แสดง Device 002
Device 003 ส่งข้อมูล → Dashboard แสดง Device 003
```

ค่าบน Dashboard จะเปลี่ยนตาม Device ที่ส่งข้อมูลล่าสุด ทำให้ผู้ใช้ไม่สามารถเลือกดู Device
ได้อย่างชัดเจน

ดังนั้นต้องมี:

```text
Latest State Store
```

เช่น:

```text
flow.devices
```

เพื่อจำค่าล่าสุดของทุก Device

## 17.11 Dashboard แบบที่ 1 --- แสดงทุก Device

รูปแบบง่ายที่สุดคือแสดง Device ทั้งหมด:

```text
┌───────────────────────────────────┐
│ Device 001                        │
│ Temp  : 30 °C                     │
│ Humi  : 70 %                      │
│ Light : 1000 lx                   │
├───────────────────────────────────┤
│ Device 002                        │
│ Temp  : 32 °C                     │
│ Humi  : 75 %                      │
│ Light : 1500 lx                   │
├───────────────────────────────────┤
│ Device 003                        │
│ Temp  : 35 °C                     │
│ Humi  : 80 %                      │
│ Light : 2000 lx                   │
└───────────────────────────────────┘
```

ข้อดี:

- เข้าใจง่าย
- เห็นทุก Device พร้อมกัน
- เหมาะกับ Device จำนวนน้อย

ข้อเสีย:

- Dashboard ใหญ่มากเมื่อมี Device จำนวนมาก

ดังนั้นวิธีนี้เหมาะกับ:

```text
3-5 Devices
```

มากกว่าระบบที่มี Device จำนวนมาก

## 17.12 Dashboard แบบที่ 2 --- Device Selection

วิธีที่ Scale ได้ดีกว่าคือให้ผู้ใช้เลือก Device

ตัวอย่าง:

```text
Device

[ 001 ▼ ]
```

จากนั้น Dashboard แสดง:

```text
Temperature
30 °C

Humidity
70 %

Light
1000 lx
```

เมื่อเลือก:

```text
002
```

Dashboard เปลี่ยนเป็น:

```text
Temperature
32 °C

Humidity
75 %

Light
1500 lx
```

ข้อดีคือใช้ Dashboard ชุดเดียวกับหลาย Device

## 17.13 สร้าง Device Selector

ใช้ Dashboard Dropdown

ตัวเลือก:

```text
001
002
003
```

กำหนด Payload ของ Dropdown ให้เป็น:

```text
001
002
003
```

Flow:

```text
[Device Dropdown]
       │
       ▼
[Select Device Data]
       │
       ├──→ Temperature
       ├──→ Humidity
       └──→ Light
```

## 17.14 Function --- Select Device Data

เพิ่ม Function Node ชื่อ:

```text
Select Device Data
```

ตั้ง Function Node ให้มี 3 Outputs

ใช้โค้ด:

```javascript
let device_id = String(msg.payload);

let devices = flow.get("devices") || {};

let device = devices[device_id];

if (!device) {
    return null;
}

let temp_msg = {
    payload: device.temp
};

let humi_msg = {
    payload: device.humi
};

let light_msg = {
    payload: device.light
};

return [
    temp_msg,
    humi_msg,
    light_msg
];
```

Output 1:

```text
Temperature
```

Output 2:

```text
Humidity
```

Output 3:

```text
Light
```

## 17.15 Dashboard Flow

Flow จะเป็น:

```text
MQTT
  │
  ▼
 JSON
  │
  ▼
Store Latest Device Data
  │
  └───────────────→ flow.devices


Device Dropdown
      │
      ▼
Select Device Data
   │     │     │
   │     │     │
   ▼     ▼     ▼
 Temp   Humi  Light
   │     │     │
   ▼     ▼     ▼
        Dashboard
```

## 17.16 ข้อจำกัดของ Selector แบบนี้

ถ้าผู้ใช้เลือก:

```text
Device 002
```

Dashboard จะแสดงค่าของ Device 002 ณ เวลาที่กดเลือก

แต่เมื่อ Device 002 ส่งข้อมูลใหม่ Dashboard จะยังไม่ Update อัตโนมัติ หาก Flow ยังไม่ได้เชื่อม
ข้อมูลใหม่เข้ากับ Selected Device

ดังนั้นต้องเพิ่ม:

```text
selected_device
```

เพื่อให้ Dashboard Update แบบ Real-time

## 17.17 เก็บ Selected Device

เมื่อผู้ใช้เลือก Device จาก Dropdown

เพิ่ม Function:

```text
Set Selected Device
```

ใช้:

```javascript
let device_id = String(msg.payload);

flow.set("selected_device", device_id);

return msg;
```

ตัวอย่าง:

```text
selected_device = "002"
```

## 17.18 Real-time Selected Device

ปรับ Function ที่รับ MQTT:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let devices = flow.get("devices") || {};

devices[device_id] = {
    temp: Number(msg.payload.temp),
    humi: Number(msg.payload.humi),
    light: Number(msg.payload.light),
    timestamp: Date.now()
};

flow.set("devices", devices);

let selected_device = flow.get("selected_device");

if (device_id !== selected_device) {
    return null;
}

msg.device_id = device_id;

return msg;
```

ตอนนี้ถ้าเลือก:

```text
002
```

ข้อมูลจาก:

```text
001
003
```

ยังถูกเก็บใน:

```text
flow.devices
```

แต่ไม่ส่งไป Update Dashboard

เฉพาะ:

```text
002
```

เท่านั้นที่จะ Update Dashboard แบบ Real-time

## 17.19 แยก Sensor สำหรับ Dashboard

หลังจากกรอง Selected Device แล้ว ใช้ Function Node 3 Outputs ชื่อ:

```text
Dashboard Data
```

ใช้:

```javascript
let temp_msg = {
    payload: Number(msg.payload.temp)
};

let humi_msg = {
    payload: Number(msg.payload.humi)
};

let light_msg = {
    payload: Number(msg.payload.light)
};

return [
    temp_msg,
    humi_msg,
    light_msg
];
```

Flow:

```text
MQTT
  ↓
 JSON
  ↓
Store / Filter Selected Device
  ↓
Dashboard Data
  ├──→ Temp
  ├──→ Humi
  └──→ Light
```

## 17.20 Complete Selected-device Architecture

```text
                ESP32-001
                    │
                ESP32-002
                    │
                ESP32-003
                    │
                    ▼
                 MQTT
                    │
             pkru/iot/+/data
                    │
                    ▼
                 Node-RED
                    │
                    ▼
              Store Latest
                    │
                    ▼
              flow.devices
                    │
                    │
            ┌───────┴────────┐
            │                │
            ▼                ▼
      Device Selector    Incoming Data
            │                │
            ▼                ▼
     selected_device     Compare ID
            │                │
            └───────┬────────┘
                    ▼
             Selected Device
                    │
                    ▼
             Dashboard Data
              │      │      │
              ▼      ▼      ▼
            Temp    Humi   Light
```

## 17.21 เปรียบเทียบ Temperature หลาย Device

อีกความสามารถสำคัญคือ:

```text
Device Comparison
```

เช่นกราฟ Temperature:

```text
Temperature

001 ─────────────
002 ─────────────
003 ─────────────
```

แทนที่จะเลือกดูทีละ Device

ใช้ MQTT Input เดิม:

```text
pkru/iot/+/data
```

แล้วกำหนดชื่อ Series จาก Device ID

## 17.22 Function สำหรับ Temperature Comparison

เพิ่ม Function ชื่อ:

```text
Temperature Comparison
```

ใช้:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

msg.topic = device_id;
msg.payload = Number(msg.payload.temp);

return msg;
```

ตัวอย่าง Device 001

Input:

```text
Topic:
pkru/iot/001/data

Payload:
{
  "temp": 30
}
```

Output:

```text
msg.topic = "001"
msg.payload = 30
```

Device 002:

```text
msg.topic = "002"
msg.payload = 32
```

Device 003:

```text
msg.topic = "003"
msg.payload = 35
```

เมื่อส่งเข้า Chart ที่รองรับการแยก series ตาม `msg.topic` จะสามารถแสดงข้อมูลหลาย
Device เป็นคนละ Series ได้

## 17.23 Temperature Comparison Flow

```text
MQTT
  │
  ▼
 JSON
  │
  ▼
Temperature Comparison
  │
  ▼
Temperature Chart
```

Series:

```text
001
002
003
```

ทำให้เปรียบเทียบ Temperature ของหลาย Device ได้ในกราฟเดียว

## 17.24 Humidity Comparison

ใช้แนวคิดเดียวกัน:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

msg.topic = device_id;
msg.payload = Number(msg.payload.humi);

return msg;
```

Flow:

```text
MQTT
  ↓
 JSON
  ↓
Humidity Comparison
  ↓
Humidity Chart
```

## 17.25 Light Comparison

ใช้:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

msg.topic = device_id;
msg.payload = Number(msg.payload.light);

return msg;
```

Flow:

```text
MQTT
  ↓
 JSON
  ↓
Light Comparison
  ↓
Light Chart
```

## 17.26 Dashboard Structure ที่แนะนำ

Dashboard ไม่ควรซับซ้อนเกินไป

แนะนำให้มี 2 ส่วน

### ส่วนที่ 1 --- Selected Device

```text
┌───────────────────────────────┐
│ DEVICE MONITOR               │
│                               │
│ Device: [ 002 ▼ ]            │
│                               │
│ Temp     Humi      Light      │
│ 32 °C    75 %      1500 lx    │
└───────────────────────────────┘
```

### ส่วนที่ 2 --- Device Comparison

```text
┌───────────────────────────────┐
│ TEMPERATURE COMPARISON        │
│                               │
│ 001 ─────────                 │
│ 002 ─────────                 │
│ 003 ─────────                 │
└───────────────────────────────┘

┌───────────────────────────────┐
│ HUMIDITY COMPARISON           │
│                               │
│ 001 ─────────                 │
│ 002 ─────────                 │
│ 003 ─────────                 │
└───────────────────────────────┘

┌───────────────────────────────┐
│ LIGHT COMPARISON              │
│                               │
│ 001 ─────────                 │
│ 002 ─────────                 │
│ 003 ─────────                 │
└───────────────────────────────┘
```

## 17.27 Multi-device Simulator

ใช้ Raspberry Pi จำลอง ESP32 จำนวน 3 ตัว:

```bash
while true
do
    temp1=$((25 + RANDOM % 11))
    temp2=$((25 + RANDOM % 11))
    temp3=$((25 + RANDOM % 11))

    humi1=$((60 + RANDOM % 21))
    humi2=$((60 + RANDOM % 21))
    humi3=$((60 + RANDOM % 21))

    light1=$((500 + RANDOM % 1501))
    light2=$((500 + RANDOM % 1501))
    light3=$((500 + RANDOM % 1501))

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/data" \
        -m "{\"temp\":$temp1,\"humi\":$humi1,\"light\":$light1}"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/002/data" \
        -m "{\"temp\":$temp2,\"humi\":$humi2,\"light\":$light2}"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/003/data" \
        -m "{\"temp\":$temp3,\"humi\":$humi3,\"light\":$light3}"

    sleep 2
done
```

Simulator จะส่งข้อมูลจาก:

```text
001
002
003
```

ทุกประมาณ 2 วินาทีต่อรอบ

## 17.28 ตรวจสอบ Simulator

เปิดอีก Terminal:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/data" \
  -v
```

ควรเห็น:

```text
pkru/iot/001/data {"temp":...,"humi":...,"light":...}
pkru/iot/002/data {"temp":...,"humi":...,"light":...}
pkru/iot/003/data {"temp":...,"humi":...,"light":...}
```

และข้อมูลเปลี่ยนทุกประมาณ 2 วินาที

## 17.29 ปัญหาใหม่ที่เริ่มเห็นใน LAB นี้

สมมติ Dashboard แสดง:

```text
Device 001
Temp = 30 °C
```

คำถามคือ:

```text
Device 001 ยัง Online อยู่หรือไม่?
```

ถ้า Device 001 หยุดส่งข้อมูล Dashboard อาจยังแสดง:

```text
Temp = 30 °C
```

ทำให้ผู้ใช้เข้าใจผิดว่าค่านี้เป็นค่าปัจจุบัน ทั้งที่อาจเป็นข้อมูลจาก 10 นาทีที่แล้ว

ดังนั้น:

```text
Value Exists
```

ไม่ได้หมายความว่า:

```text
Device Online
```

และ:

```text
Last Value
```

ไม่ได้หมายความว่า:

```text
Current Value
```

นี่เป็นประเด็นสำคัญที่จะนำไปสู่ LAB 18

## 17.30 Timestamp ของแต่ละ Device

ใน LAB นี้จึงควรเก็บ:

```text
timestamp
```

ของข้อมูลล่าสุดด้วย

ตัวอย่าง:

```javascript
devices[device_id] = {
    temp: Number(msg.payload.temp),
    humi: Number(msg.payload.humi),
    light: Number(msg.payload.light),
    timestamp: Date.now()
};
```

ทำให้ Gateway รู้ว่า:

```text
Device 001
Last Update = ...

Device 002
Last Update = ...

Device 003
Last Update = ...
```

แต่ใน LAB 17 ยังไม่ต้องตัดสิน ONLINE / OFFLINE เพราะจะเป็นแกนหลักของ LAB 18

## 17.31 อย่าสับสน Device Status กับ Sensor Data

ตัวอย่าง:

```text
pkru/iot/001/data
```

ใช้สำหรับ:

```text
temp
humi
light
```

ส่วน:

```text
pkru/iot/001/status
```

ควรใช้สำหรับ:

```text
ONLINE
OFFLINE
```

ไม่ควรใช้ Sensor Value เป็นหลักฐานเดียวว่า Device Online เพราะ Device อาจหยุดส่งข้อมูลไปแล้ว
แต่ Dashboard ยังเก็บค่าล่าสุดอยู่

## 17.32 แบบฝึกหัดที่ 1 --- Multi-device Monitoring

จำลอง Device:

```text
001
002
003
```

ให้ส่ง:

```text
temp
humi
light
```

ผ่าน:

```text
pkru/iot/{device_id}/data
```

สร้าง Dashboard ที่สามารถเลือก:

```text
001
002
003
```

และแสดงค่าของ Device ที่เลือก

## 17.33 แบบฝึกหัดที่ 2 --- Real-time Device Selection

เลือก:

```text
Device 002
```

จาก Dashboard

ตรวจสอบว่า:

- ข้อมูล Device 002 Update แบบ Real-time
- Device 001 ยังถูกเก็บใน `flow.devices`
- Device 003 ยังถูกเก็บใน `flow.devices`
- ข้อมูลจาก 001 และ 003 ไม่ไปเปลี่ยนค่าที่กำลังแสดงของ Device 002

## 17.34 แบบฝึกหัดที่ 3 --- Device Comparison

สร้าง Temperature Chart แสดง:

```text
Device 001
Device 002
Device 003
```

ในกราฟเดียวกัน

จากนั้นเพิ่ม:

```text
Humidity Comparison
Light Comparison
```

## 17.35 แบบฝึกหัดที่ 4 --- Device หยุดส่งข้อมูล

ขณะ Simulator ทำงาน ให้หยุด Simulator แล้วสังเกต Dashboard

จะพบว่า Sensor Value ยังคงแสดงค่าล่าสุดแม้ Device จะไม่ส่งข้อมูลแล้ว

ให้นักศึกษาอธิบายว่า:

```text
ทำไม Dashboard จึงยังแสดงค่า?
ทำไม Last Value จึงไม่สามารถยืนยันว่า Device Online?
```

นี่เป็นโจทย์เชื่อมไป LAB 18

## 17.36 งานส่ง LAB 17

นักศึกษาส่ง:

1. Screenshot Node-RED Flow
2. Screenshot MQTT Messages จากอย่างน้อย 3 Device
3. Screenshot Dashboard ที่สามารถเลือก `001`, `002`, `003`
4. แสดงค่าของ Device ที่เลือก: `temp`, `humi`, `light`
5. Screenshot Temperature Comparison Chart ที่มีอย่างน้อย 3 Device
6. Screenshot Humidity หรือ Light Comparison อย่างน้อย 1 กราฟ
7. อธิบายหน้าที่ของ `msg.topic`, `device_id`, `flow.devices`, `selected_device`
8. อธิบายว่าเหตุใด Last Sensor Value จึงไม่สามารถยืนยันว่า Device ยัง Online

## 17.37 สิ่งที่นักศึกษาต้องเข้าใจ

LAB 16 ทำให้ระบบสามารถ:

```text
Receive Multiple Devices
```

LAB 17 ทำให้ระบบสามารถ:

```text
Monitor Multiple Devices
```

เส้นทางคือ:

```text
Multiple Devices
      ↓
Structured MQTT Topics
      ↓
Wildcard Subscription
      ↓
Device Identification
      ↓
Latest State Storage
      ↓
Device Selection
      ↓
Device Comparison
      ↓
Multi-device Dashboard
```

## 17.38 Architecture หลัง LAB 17

```text
┌───────────┐
│ ESP32-001 │
└─────┬─────┘
      │
┌───────────┐
│ ESP32-002 │
└─────┬─────┘
      │
┌───────────┐
│ ESP32-003 │
└─────┬─────┘
      │
      ▼
┌─────────────────────┐
│ MQTT Broker         │
│                     │
│ pkru/iot/+/data     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Node-RED            │
│                     │
│ Device ID           │
│ Latest Data         │
│ Selected Device     │
│ Common Processing   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dashboard           │
│                     │
│ Device Selector     │
│ Temp / Humi / Light │
│ Comparison Charts   │
└─────────────────────┘
```

## 17.39 ความสัมพันธ์ของ LAB 13-17

LAB 13 --- Rule & Alert:

```text
Data
  ↓
 Rule
  ↓
Decision
```

LAB 14 --- Manual Control:

```text
Human
  ↓
Command
  ↓
Actuator
```

LAB 15 --- Automatic Control:

```text
Sensor
  ↓
 Rule
  ↓
Decision
  ↓
Command
  ↓
Actuator
```

LAB 16 --- MQTT Topic Design:

```text
Device 001 ─┐
Device 002 ─┼──→ Structured MQTT
Device 003 ─┘
```

LAB 17 --- Multi-device Dashboard:

```text
Multiple Devices
      ↓
     MQTT
      ↓
Device Identification
      ↓
Multi-device Monitoring
      ↓
Dashboard
```

เส้นทางจึงพัฒนาเป็น:

```text
Decide
  ↓
Control
  ↓
Automate
  ↓
Scale
  ↓
Monitor Multiple Devices
```

## 17.40 เชื่อมไป LAB 18 --- Device Status & Offline Detection

หลัง LAB 17 ระบบสามารถแสดง:

```text
Device 001
Temp = 30 °C

Device 002
Temp = 32 °C

Device 003
Temp = 35 °C
```

แต่ยังตอบคำถามสำคัญไม่ได้ว่า:

```text
Device ไหนยังทำงานอยู่?
```

ถ้า ESP32-002 ปิดเครื่อง Dashboard อาจยังแสดง:

```text
Device 002
Temp = 32 °C
```

เพราะนั่นคือค่าล่าสุดที่เก็บไว้

จึงต้องเพิ่มแนวคิด:

```text
Device Status
Heartbeat
Last Seen
Timeout
MQTT Last Will and Testament (LWT)
```

LAB 18 จะสร้างเส้นทาง:

```text
Device
   │
   ├── Data
   │
   └── Status / Heartbeat
            ↓
          MQTT
            ↓
         Gateway
            ↓
    Last Seen / Timeout
            ↓
      ONLINE / OFFLINE
```

ทำให้ระบบเปลี่ยนจาก:

```text
"มีข้อมูลของ Device"
```

ไปสู่:

```text
"รู้ว่า Device ยังทำงานอยู่หรือไม่"
```

ซึ่งเป็นพื้นฐานสำคัญของระบบ IoT ที่สามารถตรวจสอบความพร้อมใช้งานของอุปกรณ์ได้จริง
