> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[17 - LAB 17 - Multi-device Dashboard]]
> ถัดไป: [[19 - LAB 19 - Data Quality - VALID INVALID STALE]]

# LAB 18 --- Device Status and Offline Detection

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:28:52 +07


## 18.1 แนวคิดของ LAB

LAB 17 ทำให้ระบบสามารถรับและแสดงข้อมูลจากหลาย Device

```text
ESP32-001 ─┐
ESP32-002 ─┼──→ MQTT → Node-RED → Multi-device Dashboard
ESP32-003 ─┘
```

แต่ยังมีปัญหาสำคัญ

สมมติ Dashboard แสดง:

```text
Device 001
Temp = 30 °C
```

ถ้า ESP32-001 ปิดเครื่อง Dashboard อาจยังแสดง:

```text
Temp = 30 °C
```

เพราะเป็นค่าล่าสุดที่ระบบเก็บไว้

ดังนั้น:

```text
มี Sensor Value
```

ไม่ได้หมายความว่า:

```text
Device ยัง Online
```

LAB 18 เพิ่มความสามารถให้ Gateway ตรวจสอบว่าแต่ละ Device `ONLINE` หรือ `OFFLINE`
โดยใช้แนวคิด:

- Device Status
- Heartbeat
- Last Seen
- Timeout
- MQTT Last Will and Testament (LWT)

เป้าหมายคือเปลี่ยนจาก:

```text
Data Monitoring
```

ไปสู่:

```text
Device Availability Monitoring
```

## 18.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- อธิบายความแตกต่างระหว่าง Sensor Data และ Device Status
- ใช้ MQTT Status Topic
- สร้าง Heartbeat
- บันทึก Last Seen ของแต่ละ Device
- ตรวจจับ Device ที่หยุดส่งข้อมูลด้วย Timeout
- แสดง ONLINE / OFFLINE บน Dashboard
- เข้าใจหลักการ MQTT Last Will and Testament (LWT)
- อธิบายข้อดีและข้อจำกัดของ Heartbeat และ LWT
- เข้าใจว่า Last Value ไม่ได้หมายถึง Current Value

## 18.3 Architecture

```text
ESP32-001
   │
   ├── data ──────────────┐
   │                      │
   └── status/heartbeat ──┤
                          │
ESP32-002                 │
   │                      │
   ├── data ──────────────┤
   │                      │
   └── status/heartbeat ──┤
                          ▼
                     MQTT Broker
                          │
                          ▼
                       Node-RED
                          │
                 ┌────────┴────────┐
                 │                 │
                 ▼                 ▼
             Sensor Data       Last Seen
                                   │
                                   ▼
                                Timeout
                                   │
                           ┌───────┴───────┐
                           ▼               ▼
                        ONLINE          OFFLINE
                           │               │
                           └───────┬───────┘
                                   ▼
                               Dashboard
```

## 18.4 MQTT Topic Structure

ต่อจาก LAB 16-17

Device 001:

```text
pkru/iot/001/data
pkru/iot/001/status
pkru/iot/001/cmd
```

Device 002:

```text
pkru/iot/002/data
pkru/iot/002/status
pkru/iot/002/cmd
```

Device 003:

```text
pkru/iot/003/data
pkru/iot/003/status
pkru/iot/003/cmd
```

ความหมาย:

```text
data
  → Sensor Data / Telemetry

status
  → Device Availability

cmd
  → Control Command
```

## 18.5 Sensor Data ไม่เท่ากับ Device Status

ตัวอย่าง:

```text
pkru/iot/001/data
```

Payload:

```json
{
  "temp": 30,
  "humi": 70,
  "light": 1500
}
```

ข้อมูลนี้บอกว่า:

```text
Device เคยส่งค่า 30 °C
```

แต่ไม่ได้ยืนยันว่า:

```text
Device ยัง Online อยู่ในขณะนี้
```

จึงต้องมีข้อมูลเพิ่มเติม เช่น:

```text
Last Seen
Heartbeat
Status
LWT
```

## 18.6 วิธีที่ 1 --- Heartbeat

Heartbeat คือ Message ที่ Device ส่งเป็นระยะเพื่อบอก Gateway ว่า:

```text
"ฉันยังทำงานอยู่"
```

ตัวอย่าง Topic:

```text
pkru/iot/001/status
```

Payload:

```text
ONLINE
```

Device ส่ง `ONLINE` ทุกช่วงเวลาที่กำหนด เช่นทุก 5 วินาที

Architecture:

```text
ESP32
  │
  │ ONLINE
  │ every 5 s
  ▼
 MQTT
  │
  ▼
Gateway
  │
  ▼
Last Seen
```

ถ้า Gateway ไม่ได้รับ Heartbeat ภายในเวลาที่กำหนด ให้ถือว่า:

```text
OFFLINE
```

## 18.7 ทดสอบ Heartbeat ด้วย Command Line

เปิด Subscriber:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/status" \
  -v
```

เปิด Terminal อีกหน้าต่าง จำลอง Device 001:

```bash
while true
do
    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/status" \
        -m "ONLINE"

    sleep 5
done
```

ผล:

```text
pkru/iot/001/status ONLINE
pkru/iot/001/status ONLINE
pkru/iot/001/status ONLINE
...
```

ทุกประมาณ 5 วินาที

## 18.8 จำลองหลาย Device

เปิด Simulator:

```bash
while true
do
    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/status" \
        -m "ONLINE"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/002/status" \
        -m "ONLINE"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/003/status" \
        -m "ONLINE"

    sleep 5
done
```

Subscriber:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/status" \
  -v
```

จะเห็น:

```text
pkru/iot/001/status ONLINE
pkru/iot/002/status ONLINE
pkru/iot/003/status ONLINE
```

## 18.9 Node-RED รับ Heartbeat

สร้าง Flow:

```text
[MQTT In]
     │
     ▼
[Update Last Seen]
     │
     ▼
   [Debug]
```

MQTT Topic:

```text
pkru/iot/+/status
```

Broker:

```text
localhost:1883
```

## 18.10 Function --- Update Last Seen

สร้าง Function Node ชื่อ:

```text
Update Last Seen
```

ใช้:

```javascript
let parts = msg.topic.split("/");
let device_id = parts[2];

let device_status = flow.get("device_status") || {};

device_status[device_id] = {
    status: "ONLINE",
    last_seen: Date.now()
};

flow.set("device_status", device_status);

msg.device_id = device_id;
msg.status = "ONLINE";

return msg;
```

เมื่อได้รับ:

```text
pkru/iot/002/status ONLINE
```

จะบันทึก:

```javascript
device_status["002"] = {
    status: "ONLINE",
    last_seen: Date.now()
};
```

## 18.11 Last Seen

`last_seen` คือเวลาล่าสุดที่ Gateway ได้รับ Heartbeat จาก Device

ตัวอย่าง:

```text
Device 001
Last Seen = 10:20:05

Device 002
Last Seen = 10:20:07

Device 003
Last Seen = 10:20:06
```

Gateway สามารถคำนวณ:

```text
Current Time - Last Seen
```

เพื่อดูว่า Device หายไปนานเท่าใด

## 18.12 กำหนด Timeout

สมมติ Device ส่ง Heartbeat ทุก:

```text
5 seconds
```

กำหนด Offline Timeout:

```text
15 seconds
```

หมายความว่า:

```text
Last Seen <= 15 s
    → ONLINE

Last Seen > 15 s
    → OFFLINE
```

ไม่ควรกำหนด Timeout เท่ากับ Heartbeat Interval พอดี เช่น:

```text
Heartbeat = 5 s
Timeout   = 5 s
```

เพราะ Network Delay หรือ Packet Loss เพียงเล็กน้อยอาจทำให้ Device ถูกมองว่า OFFLINE

สำหรับ LAB ใช้:

```text
Heartbeat = 5 s
Timeout   = 15 s
```

เพื่อให้เห็นพฤติกรรมชัดเจน

## 18.13 สร้าง Periodic Offline Check

ใช้ Inject Node ตั้งให้ทำงานทุก:

```text
5 seconds
```

Flow:

```text
[Inject every 5 s]
         │
         ▼
[Check Device Timeout]
         │
         ▼
       [Debug]
```

## 18.14 Function --- Check Device Timeout

สร้าง Function Node ชื่อ:

```text
Check Device Timeout
```

ใช้:

```javascript
let device_status = flow.get("device_status") || {};

let now = Date.now();
let timeout = 15000;

for (let device_id in device_status) {

    let elapsed = now - device_status[device_id].last_seen;

    if (elapsed > timeout) {
        device_status[device_id].status = "OFFLINE";
    } else {
        device_status[device_id].status = "ONLINE";
    }
}

flow.set("device_status", device_status);

msg.payload = device_status;

return msg;
```

`15000` หมายถึง:

```text
15000 ms
= 15 seconds
```

## 18.15 ทดสอบ Offline Detection

เริ่ม Heartbeat Simulator:

```bash
while true
do
    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/status" \
        -m "ONLINE"

    sleep 5
done
```

Node-RED จะเห็น:

```text
Device 001
ONLINE
```

จากนั้นหยุด Simulator ด้วย:

```text
Ctrl+C
```

รอมากกว่า:

```text
15 seconds
```

Node-RED จะเปลี่ยน:

```text
Device 001
```

จาก:

```text
ONLINE
```

เป็น:

```text
OFFLINE
```

## 18.16 Architecture ของ Timeout Detection

```text
Device
   │
   │ Heartbeat every 5 s
   ▼
 MQTT
   │
   ▼
Node-RED
   │
   ▼
last_seen
   │
   ▼
current_time - last_seen
   │
   ├── <= 15 s → ONLINE
   │
   └── > 15 s  → OFFLINE
```

นี่คือพื้นฐานของ **Timeout-based Offline Detection**

## 18.17 เชื่อมกับ Multi-device Dashboard

จาก LAB 17 มี:

```text
flow.devices
```

สำหรับเก็บ Sensor Data

LAB 18 เพิ่ม:

```text
flow.device_status
```

สำหรับเก็บ Device Availability

ตัวอย่าง `flow.devices`:

```json
{
  "001": {
    "temp": 30,
    "humi": 70,
    "light": 1000
  },
  "002": {
    "temp": 32,
    "humi": 75,
    "light": 1500
  }
}
```

และ `flow.device_status`:

```json
{
  "001": {
    "status": "ONLINE",
    "last_seen": 1780000000000
  },
  "002": {
    "status": "OFFLINE",
    "last_seen": 1780000010000
  }
}
```

ค่าตัวเลข timestamp ด้านบนเป็นเพียงตัวอย่าง

## 18.18 Dashboard ที่ควรได้

ตัวอย่าง:

```text
┌──────────────────────────────────┐
│ DEVICE 001                       │
│                                  │
│ Status      ONLINE               │
│ Temp        30 °C                │
│ Humi        70 %                 │
│ Light       1000 lx              │
│ Last Seen   3 s ago              │
└──────────────────────────────────┘


┌──────────────────────────────────┐
│ DEVICE 002                       │
│                                  │
│ Status      OFFLINE              │
│ Temp        32 °C                │
│ Humi        75 %                 │
│ Light       1500 lx              │
│ Last Seen   47 s ago             │
└──────────────────────────────────┘
```

จุดสำคัญคือ Device 002 ยังมี:

```text
Temp = 32 °C
```

แต่:

```text
Status = OFFLINE
```

ดังนั้นผู้ใช้รู้ว่า `32 °C` เป็น Last Known Value ไม่ใช่ค่าที่ควรถือว่าเป็นข้อมูลสดในขณะนั้น

## 18.19 Heartbeat กับ Sensor Data

อีกแนวทางหนึ่งคือใช้ Sensor Data เป็น Heartbeat

เช่น Device ส่ง:

```text
pkru/iot/001/data
```

ทุก 5 วินาที

Gateway สามารถถือว่า:

```text
ทุกครั้งที่ได้รับ Data
    → Update last_seen
```

ข้อดี:

- ไม่ต้องส่ง Heartbeat Message เพิ่ม
- MQTT Traffic ลดลง

ข้อเสีย:

ถ้า Sensor ถูกออกแบบให้ส่งเฉพาะเมื่อค่ามีการเปลี่ยนแปลง Device อาจยัง Online
แต่ไม่มี Data ใหม่ Gateway อาจเข้าใจผิดว่า Device Offline

ดังนั้นต้องแยกแนวคิด:

```text
Device Alive
```

ออกจาก:

```text
Sensor Value Changed
```

## 18.20 Dedicated Heartbeat

ระบบที่ต้องการตรวจสอบ Availability ชัดเจนสามารถใช้:

```text
pkru/iot/001/status
```

หรือ:

```text
pkru/iot/001/heartbeat
```

ตัวอย่าง:

```text
pkru/iot/001/status
ONLINE
```

ทุก 5 วินาที

ข้อดีคือ:

```text
Device Availability
```

ไม่ขึ้นกับ Sensor Reporting Policy จึงเหมาะกับการสอนแนวคิด Device Monitoring

## 18.21 MQTT Last Will and Testament --- LWT

Heartbeat สามารถตรวจจับ Device Offline ด้วย Timeout

แต่ MQTT มีความสามารถอีกอย่างคือ **Last Will and Testament** หรือ:

```text
LWT
```

แนวคิดคือ ตอน Device เชื่อมต่อกับ Broker จะบอก Broker ล่วงหน้าว่า:

> ถ้าการเชื่อมต่อของฉันขาดแบบผิดปกติ ให้ Broker Publish Message นี้แทนฉัน

ตัวอย่าง Topic:

```text
pkru/iot/001/status
```

Will Message:

```text
OFFLINE
```

เมื่อ Device เชื่อมต่อสำเร็จ Device Publish:

```text
ONLINE
```

เมื่อ Device หลุดผิดปกติ Broker Publish:

```text
OFFLINE
```

## 18.22 LWT Architecture

ตอนเชื่อมต่อ:

```text
ESP32
  │
  │ Connect MQTT
  │
  │ Will Topic:
  │ pkru/iot/001/status
  │
  │ Will Message:
  │ OFFLINE
  ▼
Broker
```

เมื่อเชื่อมต่อสำเร็จ:

```text
ESP32
  │
  │ ONLINE
  ▼
Broker
```

ถ้า ESP32 หายไปแบบผิดปกติ:

```text
ESP32
  X
  │
  │ Connection Lost
  ▼

Broker
  │
  │ Publish LWT
  ▼

pkru/iot/001/status
OFFLINE
```

## 18.23 LWT ต่างจาก Heartbeat อย่างไร

### Heartbeat

Device ส่ง:

```text
ONLINE
ONLINE
ONLINE
ONLINE
```

เป็นระยะ

Gateway ตรวจ:

```text
Last Seen + Timeout
```

ข้อดี:

- Gateway รู้ว่า Device ยังส่งสัญญาณเป็นระยะ
- สามารถคำนวณ Last Seen ได้
- เข้าใจง่าย
- ใช้ตรวจ Application-level Activity ได้

ข้อเสีย:

- มี Message เพิ่ม
- ต้องมี Timeout Logic

### LWT

Device ตั้ง:

```text
Will = OFFLINE
```

ไว้กับ Broker

เมื่อ Connection ขาดผิดปกติ Broker ส่ง:

```text
OFFLINE
```

ข้อดี:

- เป็นความสามารถของ MQTT โดยตรง
- ไม่ต้อง Publish Heartbeat ถี่ ๆ เพียงเพื่อบอกสถานะ
- Broker ช่วยแจ้ง Connection Failure

ข้อจำกัด:

- การตรวจจับขึ้นกับ MQTT Connection และ Keep Alive
- ไม่ได้หมายความว่า Sensor / Application ทุกส่วนของ Device ทำงานถูกต้อง
- Graceful Disconnect อาจต้องให้ Device Publish OFFLINE เองตามการออกแบบ
- Network Failure อาจไม่ได้ถูกประกาศทันที เพราะ Broker ต้องตรวจพบว่า Connection หายก่อน

## 18.24 LWT ไม่ใช่ Heartbeat Replacement ทุกกรณี

ไม่ควรคิดว่า:

```text
LWT ดีกว่า Heartbeat เสมอ
```

ทั้งสองตรวจคนละมุม

LWT ตอบคำถามประมาณว่า:

```text
MQTT Client Connection ยังอยู่หรือไม่?
```

Heartbeat ตอบคำถามประมาณว่า:

```text
Device/Application ยังส่งสัญญาณตามที่คาดไว้หรือไม่?
```

ระบบจริงสามารถใช้ร่วมกัน:

```text
LWT
  +
Heartbeat
  +
Timeout
```

เพื่อเพิ่มความน่าเชื่อถือของ Device Monitoring

## 18.25 Retained Status

Status Topic มักเหมาะกับ MQTT Retained Message

ตัวอย่าง Device Publish:

```text
ONLINE
```

ไปยัง:

```text
pkru/iot/001/status
```

พร้อม:

```text
retain = true
```

Broker จะเก็บ Status ล่าสุดไว้

เมื่อ Dashboard หรือ Node-RED เชื่อมต่อใหม่ Subscriber สามารถได้รับ Status ล่าสุดทันที
โดยไม่ต้องรอ Device Publish รอบใหม่

แนวคิด:

```text
Device
   │
   │ ONLINE + retain
   ▼
 Broker
   │
   │ stores latest status
   ▼
New Subscriber
   │
   ▼
 ONLINE
```

## 18.26 ข้อควรระวังของ Retained Status

Retained Message คือ:

```text
Last Published State
```

ไม่ใช่หลักฐานว่า Device ยัง Online ณ วินาทีนี้

ตัวอย่าง:

```text
Device เคย Publish ONLINE แบบ Retained
จากนั้น Device หายไป
```

ถ้าไม่มี:

```text
LWT
Timeout
OFFLINE Update
```

Broker อาจยังเก็บ:

```text
ONLINE
```

อยู่

ดังนั้น `Retained ONLINE` เพียงอย่างเดียวไม่เพียงพอสำหรับ Offline Detection

แนวทางที่เหมาะสมคือใช้ร่วมกับ `LWT` หรือ `Timeout`

## 18.27 แนวทาง Status ที่เหมาะสม

สำหรับระบบจริงสามารถออกแบบ

ตอน MQTT Connect:

```text
Device → ONLINE
```

Topic:

```text
pkru/iot/001/status
```

ตั้ง Retain:

```text
true
```

ตั้ง LWT:

```text
Topic:
pkru/iot/001/status

Message:
OFFLINE

Retain:
true
```

Architecture:

```text
              MQTT CONNECT
                   │
                   ▼
             ┌──────────┐
             │  Broker  │
             └────┬─────┘
                  │
           Device ONLINE
            retain = true
                  │
                  ▼
              Dashboard

ถ้า Device หาย

             Device
                X
                │
                ▼
             Broker
                │
                │ LWT
                ▼
             OFFLINE
            retain = true
```

ทำให้ Status ล่าสุดของ Broker เปลี่ยนเป็น:

```text
OFFLINE
```

## 18.28 Status State Model

สามารถมอง Device Status เป็น State Machine ง่าย ๆ:

```text
               MQTT Connect
                   │
                   ▼
                ONLINE
                   │
                   │ Heartbeat/Data
                   │
                   └──────→ ONLINE
                   │
                   │ Timeout / LWT
                   ▼
                OFFLINE
                   │
                   │ Reconnect
                   ▼
                ONLINE
```

นี่เป็นพื้นฐานของ:

```text
Device State Management
```

## 18.29 Device Reconnection

เมื่อ Device ที่ `OFFLINE` กลับมาเชื่อมต่อ Device Publish:

```text
ONLINE
```

Gateway ต้องเปลี่ยน:

```text
OFFLINE
   ↓
ONLINE
```

และ Update:

```text
last_seen
```

ดังนั้น Device Status ไม่ใช่สถานะถาวร แต่เป็น Dynamic State:

```text
ONLINE
  ↕
OFFLINE
```

## 18.30 Multi-device Offline Detection

ระบบต้องตรวจแต่ละ Device แยกกัน

ตัวอย่าง:

```text
Device 001
Last Seen = 2 s
Status = ONLINE

Device 002
Last Seen = 25 s
Status = OFFLINE

Device 003
Last Seen = 4 s
Status = ONLINE
```

Architecture:

```text
Device 001 ─┐
Device 002 ─┼──→ MQTT
Device 003 ─┘
                 │
                 ▼
             Node-RED
                 │
                 ▼
          Device Registry
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
     001        002        003
   ONLINE     OFFLINE     ONLINE
```

## 18.31 Device Registry

หลัง LAB นี้ Gateway เริ่มมีข้อมูลลักษณะ:

```text
Device Registry
```

ตัวอย่าง:

```json
{
  "001": {
    "status": "ONLINE",
    "last_seen": 1780000000000
  },
  "002": {
    "status": "OFFLINE",
    "last_seen": 1780000010000
  },
  "003": {
    "status": "ONLINE",
    "last_seen": 1780000020000
  }
}
```

แนวคิดนี้จะมีประโยชน์ต่อ:

- Multi-device Dashboard
- Offline Alert
- Data Quality
- Device Management
- Fault Detection

## 18.32 Data Path หลัง LAB 18

ตอนนี้ Device มีอย่างน้อย 3 เส้นทาง

### Sensor Data

```text
Device
   │
   ▼
/data
   │
   ▼
Gateway
```

### Device Status

```text
Device
   │
   ▼
/status
   │
   ▼
Gateway
```

### Command

```text
Gateway
   │
   ▼
 /cmd
   │
   ▼
Device
```

ดังนั้น Topic Structure:

```text
pkru/iot/{device_id}/data
pkru/iot/{device_id}/status
pkru/iot/{device_id}/cmd
```

เริ่มมีความหมายในระดับ Architecture ชัดเจนขึ้น

## 18.33 แบบฝึกหัดที่ 1 --- Heartbeat

จำลอง Device 001 ส่ง:

```text
ONLINE
```

ทุก 5 วินาทีผ่าน:

```text
pkru/iot/001/status
```

ให้ Node-RED บันทึก:

```text
last_seen
```

และแสดง:

```text
ONLINE
```

## 18.34 แบบฝึกหัดที่ 2 --- Offline Detection

กำหนด:

```text
Heartbeat = 5 seconds
Timeout = 15 seconds
```

หยุด Heartbeat Simulator

ตรวจสอบว่าหลังเกิน 15 วินาที Node-RED เปลี่ยน:

```text
ONLINE
```

เป็น:

```text
OFFLINE
```

## 18.35 แบบฝึกหัดที่ 3 --- Multi-device

จำลอง:

```text
Device 001
Device 002
Device 003
```

ให้ทุก Device ส่ง Heartbeat

จากนั้นหยุดเฉพาะ Device 002

ผลที่ต้องได้:

```text
001 → ONLINE
002 → OFFLINE
003 → ONLINE
```

โดย Device อื่นต้องไม่ได้รับผลกระทบ

## 18.36 แบบฝึกหัดที่ 4 --- Dashboard

เพิ่มใน Dashboard:

```text
Device
Status
Last Seen
Temp
Humi
Light
```

ตัวอย่าง:

```text
Device 001

Status
ONLINE

Last Seen
3 seconds ago

Temp
30 °C
```

## 18.37 แบบฝึกหัดที่ 5 --- Last Value

หยุด Device 002

Dashboard อาจยังมี:

```text
Temp = 32 °C
```

แต่ต้องแสดง:

```text
Status = OFFLINE
```

ให้นักศึกษาอธิบายว่า:

```text
Temp = 32 °C
```

คือ:

```text
Last Known Value
```

ไม่ใช่การยืนยันว่าค่านี้ยังเป็นค่าปัจจุบัน

## 18.38 แบบฝึกหัดขั้นสูง --- LWT

ให้นักศึกษาศึกษาและทดลอง MQTT Client ที่รองรับ LWT

กำหนด Will Topic เป็น:

```text
pkru/iot/001/status
```

Will Message:

```text
OFFLINE
```

เมื่อ Client เชื่อมต่อ Publish:

```text
ONLINE
```

จากนั้นจำลอง Connection Failure

สังเกตว่า Broker Publish:

```text
OFFLINE
```

แทน Device

เปรียบเทียบกับ Heartbeat + Timeout

## 18.39 งานส่ง LAB 18

นักศึกษาส่ง:

1. Screenshot Node-RED Flow: `MQTT Status → Update Last Seen → Timeout Detection → ONLINE / OFFLINE`
2. Screenshot MQTT Heartbeat: `pkru/iot/001/status ONLINE`
3. Screenshot Dashboard ขณะ Device ONLINE
4. Screenshot Dashboard หลัง Device OFFLINE
5. ทดสอบ Device อย่างน้อย 3 ตัว: `001`, `002`, `003`
6. ทำให้ Device 002 Offline โดย Device อื่นยัง Online
7. อธิบายความหมายของ `Heartbeat`, `Last Seen`, `Timeout`, `LWT`, `Retained Message`
8. อธิบายว่าเหตุใด Last Sensor Value จึงไม่สามารถใช้ยืนยันว่า Device Online
9. อธิบายความแตกต่างระหว่าง Heartbeat และ LWT

## 18.40 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 18:

```text
Device
   ↓
  Data
   ↓
Dashboard
```

ระบบรู้เพียง:

```text
"ค่าล่าสุดคืออะไร?"
```

หลัง LAB 18:

```text
Device
   ├── Data
   └── Status
         ↓
        MQTT
         ↓
      Gateway
         ↓
      Last Seen
         ↓
      Timeout
         ↓
  ONLINE / OFFLINE
```

ระบบสามารถตอบเพิ่มว่า:

```text
"Device ยังทำงานอยู่หรือไม่?"
```

## 18.41 ความสัมพันธ์ของ LAB 16-18

LAB 16:

```text
Structured MQTT
      ↓
Multi-device Communication
```

LAB 17:

```text
Multi-device Data
      ↓
Multi-device Dashboard
```

LAB 18:

```text
Multi-device
      ↓
Device Availability
      ↓
ONLINE / OFFLINE
```

เส้นทางคือ:

```text
Communicate
    ↓
  Scale
    ↓
 Monitor
    ↓
Detect Device Failure
```

## 18.42 Architecture หลัง LAB 18

```text
┌────────────┐
│ ESP32-001  │
│            │
│ data       │
│ status     │
│ cmd        │
└─────┬──────┘
      │
┌────────────┐
│ ESP32-002  │
│            │
│ data       │
│ status     │
│ cmd        │
└─────┬──────┘
      │
┌────────────┐
│ ESP32-003  │
│            │
│ data       │
│ status     │
│ cmd        │
└─────┬──────┘
      │
      ▼
┌─────────────────────┐
│ Mosquitto           │
│ Raspberry Pi        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Node-RED            │
│                     │
│ Sensor Processing   │
│ Device Registry     │
│ Last Seen           │
│ Timeout Detection   │
│ ONLINE / OFFLINE    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dashboard           │
│                     │
│ Sensor Values       │
│ Device Status       │
│ Last Seen           │
└─────────────────────┘
```

## 18.43 จุดสำคัญที่สุดของ LAB

ต้องให้นักศึกษาเข้าใจว่า:

```text
Value ≠ Availability
Last Value ≠ Current Value
MQTT Connected ≠ Sensor Valid
```

Device อาจ `ONLINE` แต่ Sensor เสียและส่ง:

```text
-99
null
ค่าที่ผิดปกติ
```

ในทางกลับกัน Device อาจ `OFFLINE` แต่ Dashboard ยังมี Sensor Value เก่าค้างอยู่

ดังนั้นระบบ IoT ที่เชื่อถือได้ต้องตรวจสอบอย่างน้อยสองเรื่องแยกกัน:

```text
Device Availability
Data Quality
```

LAB 18 รับผิดชอบ:

```text
Device Availability
```

ส่วน LAB 19 จะรับผิดชอบ:

```text
Data Quality
```

## 18.44 เชื่อมไป LAB 19 --- Data Quality

หลัง LAB 18 ระบบสามารถรู้ว่า:

```text
Device 001 = ONLINE
```

แต่ยังมีคำถามต่อว่า:

```text
ข้อมูลจาก Device 001 เชื่อถือได้หรือไม่?
```

ตัวอย่าง:

```text
Device 001
Status = ONLINE

temp = -99
```

Device ยัง Online แต่ Sensor Data ผิด

อีกกรณี:

```text
Device 001
Status = ONLINE

temp = 32 °C
```

แต่ข้อมูล Temperature ไม่ Update มานานเกินกำหนด ข้อมูลจึงอาจเป็น:

```text
STALE
```

ดังนั้น LAB 19 จะเพิ่ม Data Quality State:

```text
VALID
INVALID
STALE
```

Architecture จะพัฒนาเป็น:

```text
Device
   │
   ├── Device Availability
   │      ↓
   │   ONLINE / OFFLINE
   │
   └── Sensor Data
          ↓
     Data Validation
          ↓
   VALID / INVALID / STALE
```

ทำให้ Gateway สามารถตอบได้สองคำถามแยกกัน:

```text
Device ยังทำงานอยู่หรือไม่?
ข้อมูลที่ได้รับยังเชื่อถือได้หรือไม่?
```

นี่คือพื้นฐานของระบบ IoT ที่สามารถตรวจสอบทั้งอุปกรณ์และคุณภาพข้อมูลได้อย่างเป็นระบบ
