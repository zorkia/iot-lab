> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[14 - LAB 14 - MQTT Manual Control]]
> ถัดไป: [[16 - LAB 16 - MQTT Topic Design for Multi-device IoT]]

# LAB 15 --- Automatic Control

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:13:50 +07


## 15.1 แนวคิดของ LAB

LAB 15 ต่อจาก:

- [[13 - LAB 13 - Rule & Alert Processing|LAB 13 --- Rule & Alert Processing]]
- [[14 - LAB 14 - MQTT Manual Control|LAB 14 --- MQTT Manual Control]]

LAB 13 ทำให้ระบบสามารถตัดสินใจจากข้อมูล:

```text
Sensor → MQTT → Rule → Decision
```

LAB 14 ทำให้ผู้ใช้สามารถสั่ง Actuator ผ่าน MQTT:

```text
Human → Dashboard → MQTT → ESP32 → Actuator
```

LAB 15 นำสองส่วนมารวมกัน:

```text
Sensor
   ↓
  MQTT
   ↓
Node-RED
   ↓
  Rule
   ↓
Decision
   ↓
MQTT Command
   ↓
  ESP32
   ↓
Actuator
```

ทำให้ระบบสามารถควบคุม Actuator อัตโนมัติตามข้อมูล Sensor เรียกว่า
**Automatic Rule-based IoT Control**

## 15.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- เชื่อม Sensor Data กับ Control Logic
- สร้าง Automatic Control Rule ใน Node-RED
- Publish MQTT Command จากผลของ Rule
- ให้ ESP32 รับ Command และควบคุม Actuator
- อธิบายความแตกต่างระหว่าง Manual และ Automatic Control
- เข้าใจปัญหา Threshold Flapping
- ใช้ Hysteresis ในการควบคุม
- ส่ง Command เฉพาะเมื่อ State เปลี่ยน
- เข้าใจข้อจำกัดของ Commanded State และ Actual State

## 15.3 Architecture

```text
                DATA PATH

ESP32 / Sensor Simulator
           │
           │ Sensor Data
           ▼
      MQTT Broker
           │
           ▼
        Node-RED
           │
           ▼
          Rule
           │
           ▼
        Decision

                CONTROL PATH

        Decision
           │
           │ MQTT Command
           ▼
      MQTT Broker
           │
           ▼
         ESP32
           │
           ▼
      LED / Fan / Relay
```

รวมเป็น:

```text
Sensor
   ↓
Measure
   ↓
  MQTT
   ↓
Gateway
   ↓
  Rule
   ↓
Decision
   ↓
MQTT Command
   ↓
Actuator
```

## 15.4 MQTT Topics

Sensor Data Topic:

```text
pkru/iot/001/data
```

Command Topic:

```text
pkru/iot/001/cmd
```

ตัวอย่าง Sensor Payload:

```json
{
  "temp": 32,
  "humi": 70,
  "light": 1500
}
```

Command Payload:

```text
ON
OFF
```

## 15.5 Control Requirement

ใน LAB นี้ใช้ LED แทน Fan / Actuator

กำหนด Rule:

| Temperature | Action |
|---:|---|
| `> 35 °C` | ON |
| `30-35 °C` | Keep Previous State |
| `< 30 °C` | OFF |

ตัวอย่าง:

```text
temp = 38
   ↓
temp > 35
   ↓
  ON
```

และ:

```text
temp = 28
   ↓
temp < 30
   ↓
  OFF
```

ช่วง:

```text
30-35 °C
```

ไม่เปลี่ยนสถานะ Actuator

## 15.6 ความแตกต่างระหว่าง Status กับ Control

LAB 13 ใช้ Rule เพื่อสร้างสถานะ:

```text
NORMAL
WARNING
ALERT
```

เช่น:

```text
temp = 38
   ↓
 ALERT
```

LAB 15 ใช้ Rule เพื่อสร้าง Control Command:

```text
ON
OFF
```

เช่น:

```text
temp = 38
   ↓
  ON
```

ดังนั้น:

```text
Status ≠ Command
```

Status ใช้อธิบายสถานะของระบบ

Command ใช้สั่ง Actuator

## 15.7 ปัญหา Threshold Flapping

ถ้าใช้ Rule ง่าย ๆ:

```text
temp > 35
    → ON

temp <= 35
    → OFF
```

เมื่อ Sensor อ่านค่า:

```text
34.9
35.1
34.8
35.2
34.9
35.1
```

Actuator จะเกิด:

```text
OFF
ON
OFF
ON
OFF
ON
```

เรียกว่า **Threshold Flapping** หรือ **State Oscillation**

Actuator จะเปิดและปิดถี่บริเวณ Threshold ซึ่งไม่เหมาะกับอุปกรณ์จริง เช่น Relay,
Motor หรือ Compressor

## 15.8 Hysteresis

แก้ปัญหา Threshold Flapping ด้วยการใช้ Threshold สองค่า:

```text
ON Threshold  = 35 °C
OFF Threshold = 30 °C
```

Logic:

```text
temp > 35
   ↓
  ON

temp < 30
   ↓
  OFF

temp = 30-35
   ↓
KEEP PREVIOUS STATE
```

ตัวอย่าง:

| Temperature | Fan |
|---:|---|
| 28 | OFF |
| 31 | OFF |
| 34 | OFF |
| 36 | ON |
| 38 | ON |
| 34 | ON |
| 32 | ON |
| 30 | ON |
| 29 | OFF |

สังเกตว่าเมื่อ Fan เปิดที่ `36 °C` อุณหภูมิลดลงเป็น:

```text
34
32
30
```

Fan ยังคง `ON` จนกว่า:

```text
temp < 30
```

จึงเปลี่ยนเป็น `OFF`

นี่คือหลักการของ **Hysteresis**

## 15.9 Node-RED Flow

สร้าง Flow:

```text
[MQTT Sensor In]
        │
        ▼
      [JSON]
        │
        ▼
[Automatic Control]
        │
        ▼
    [MQTT Out]
```

MQTT Input Topic:

```text
pkru/iot/001/data
```

MQTT Output Topic:

```text
pkru/iot/001/cmd
```

## 15.10 Function Node --- Automatic Control

สร้าง Function Node แล้วตั้งชื่อ:

```text
Automatic Control
```

ใช้โค้ด:

```javascript
let temp = Number(msg.payload.temp);

let fan_state = context.get("fan_state") || "OFF";

if (temp > 35) {
    fan_state = "ON";
} else if (temp < 30) {
    fan_state = "OFF";
}

context.set("fan_state", fan_state);

msg.payload = fan_state;

return msg;
```

`context.get()` ใช้เรียกสถานะเดิม

`context.set()` ใช้บันทึกสถานะใหม่

ทำให้ช่วง:

```text
30-35 °C
```

ระบบสามารถรักษาสถานะเดิมได้

## 15.11 ทดสอบ Automatic Control

เปิด Terminal:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/001/cmd" \
  -v
```

ทดสอบ `28 °C`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28,"humi":70,"light":1500}'
```

ผล:

```text
OFF
```

ทดสอบ `32 °C`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":32,"humi":70,"light":1500}'
```

ยังคง:

```text
OFF
```

ทดสอบ `38 °C`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":38,"humi":70,"light":1500}'
```

ผล:

```text
ON
```

ลดกลับมา `33 °C`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":33,"humi":70,"light":1500}'
```

ยังคง:

```text
ON
```

ลดเป็น `28 °C`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28,"humi":70,"light":1500}'
```

ผล:

```text
OFF
```

แสดงว่า Hysteresis ทำงานถูกต้อง

## 15.12 ปัญหา Command ซ้ำ

Function แบบแรกจะส่ง Command ทุกครั้งที่ Sensor ส่งข้อมูล

ตัวอย่าง:

```text
temp = 36 → ON
temp = 37 → ON
temp = 38 → ON
temp = 39 → ON
```

MQTT จะได้รับ:

```text
ON
ON
ON
ON
```

ทั้งที่ Actuator เปิดอยู่แล้ว จึงไม่จำเป็นต้องส่ง Command ซ้ำ

ควรส่ง Command เฉพาะเมื่อ State เปลี่ยน

## 15.13 State-change-based Control

ปรับ Function เป็น:

```javascript
let temp = Number(msg.payload.temp);

let fan_state = context.get("fan_state") || "OFF";
let new_state = fan_state;

if (temp > 35) {
    new_state = "ON";
} else if (temp < 30) {
    new_state = "OFF";
}

if (new_state === fan_state) {
    return null;
}

context.set("fan_state", new_state);

msg.payload = new_state;

return msg;
```

ผล:

```text
28 → ไม่ส่ง Command
32 → ไม่ส่ง Command
36 → ON
38 → ไม่ส่ง Command
39 → ไม่ส่ง Command
33 → ไม่ส่ง Command
29 → OFF
28 → ไม่ส่ง Command
```

ระบบส่ง MQTT Command เฉพาะเมื่อเกิด:

```text
OFF → ON
ON → OFF
```

เรียกว่า **State-change-based Control**

ช่วยลด MQTT Traffic และ Command ที่ไม่จำเป็น

## 15.14 ข้อจำกัดของ Initial State

ใน Function มี:

```javascript
context.get("fan_state") || "OFF"
```

เมื่อ Node-RED เริ่มทำงานใหม่ ระบบจึงสมมติว่า:

```text
fan_state = OFF
```

แต่ ESP32 จริงอาจมีสถานะ:

```text
ON
```

ดังนั้น:

```text
Gateway State
```

อาจไม่ตรงกับ:

```text
Actual Device State
```

หรือกล่าวได้ว่า:

```text
Commanded State ≠ Actual State
```

ประเด็นนี้สำคัญสำหรับระบบจริง และจะเชื่อมไปสู่เรื่อง:

- Device Status
- State Feedback
- Offline Detection
- Reconnection
- Recovery

ใน LAB ขั้นต่อไป

## 15.15 Sensor Simulator

สามารถจำลอง Sensor บน Raspberry Pi:

```bash
while true
do
    temp=$((25 + RANDOM % 16))

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/data" \
        -m "{\"temp\":$temp,\"humi\":70,\"light\":1500}"

    sleep 2
done
```

สร้าง Temperature แบบสุ่ม:

```text
25-40 °C
```

ทุก 2 วินาที

Architecture:

```text
Sensor Simulator
       ↓
      MQTT
       ↓
    Node-RED
       ↓
    Hysteresis
       ↓
     Decision
       ↓
      MQTT
       ↓
     ESP32
       ↓
    Actuator
```

## 15.16 Dashboard

Dashboard ควรแสดงอย่างน้อย:

```text
Temperature
38 °C

Control Mode
AUTO

Fan State
ON
```

ทำให้นักศึกษาเห็นความสัมพันธ์:

```text
Sensor Data
     ↓
  Decision
     ↓
Actuator State
```

## 15.17 Manual Control vs Automatic Control

### Manual Control --- LAB 14

```text
Sensor
   ↓
Dashboard
   ↓
 Human
   ↓
 Button
   ↓
  MQTT
   ↓
Actuator
```

มนุษย์เป็นผู้ตัดสินใจ

### Automatic Control --- LAB 15

```text
Sensor
   ↓
  MQTT
   ↓
  Rule
   ↓
Decision
   ↓
  MQTT
   ↓
Actuator
```

Gateway เป็นผู้ตัดสินใจตาม Rule

## 15.18 Manual / Auto Mode

ไม่ควรคิดว่าเมื่อมี Automatic Control แล้ว Manual Control ไม่มีประโยชน์

Manual Control ยังจำเป็นสำหรับ:

- Testing
- Maintenance
- Override
- Troubleshooting

แต่ถ้า Manual และ Automatic Control ส่ง Command พร้อมกัน อาจเกิด:

```text
Manual → OFF

Automatic Rule → ON
```

ทำให้เกิด **Command Conflict**

จึงควรมีแนวคิด:

```text
MANUAL / AUTO MODE
```

Architecture:

```text
              ┌──────────────┐
              │ Control Mode │
              │ MANUAL/AUTO  │
              └──────┬───────┘
                     │
          ┌──────────┴──────────┐
          │                     │
       MANUAL                  AUTO
          │                     │
   Dashboard Button        Sensor Rule
          │                     │
          └──────────┬──────────┘
                     ▼
                   MQTT
                     │
                     ▼
                   ESP32
                     │
                     ▼
                 Actuator
```

### MANUAL

```text
Dashboard
    ↓
  Button
    ↓
   MQTT
    ↓
  ESP32
```

### AUTO

```text
Sensor
   ↓
  Rule
   ↓
  MQTT
   ↓
 ESP32
```

การทำ MANUAL / AUTO Mode สามารถใช้เป็น Advanced Exercise ของ LAB นี้

## 15.19 แบบฝึกหัด

### Exercise 1 --- Automatic Fan

สร้าง Automatic Control:

```text
temp > 35 °C
    → Fan ON

temp < 30 °C
    → Fan OFF

temp = 30-35 °C
    → Keep Previous State
```

### Exercise 2 --- Hysteresis Test

ส่งข้อมูลตามลำดับ:

```text
28
31
34
36
38
34
32
30
29
```

ผลที่ควรได้:

| Temp | Fan |
|---:|---|
| 28 | OFF |
| 31 | OFF |
| 34 | OFF |
| 36 | ON |
| 38 | ON |
| 34 | ON |
| 32 | ON |
| 30 | ON |
| 29 | OFF |

ค่าที่ `30 °C` ต้องยังเป็น `ON` เพราะเงื่อนไขปิดคือ:

```text
temp < 30
```

ไม่ใช่:

```text
temp <= 30
```

จึงเป็น Boundary Test ที่สำคัญ

## 15.20 งานส่ง LAB 15

นักศึกษาส่ง:

1. Screenshot Node-RED Flow
2. Screenshot Dashboard
3. Function Code สำหรับ Automatic Control
4. ผลการทดสอบ Hysteresis
5. Screenshot `mosquitto_sub` แสดง MQTT Command
6. หลักฐานว่า ESP32 / LED เปลี่ยนสถานะตาม Rule
7. อธิบายความแตกต่างระหว่าง Manual และ Automatic Control
8. อธิบายว่าทำไมต้องใช้ Hysteresis

ตารางผลการทดลอง:

| Temp | Expected Fan | Actual Fan |
|---:|---|---|
| 28 | OFF | |
| 31 | OFF | |
| 34 | OFF | |
| 36 | ON | |
| 38 | ON | |
| 34 | ON | |
| 32 | ON | |
| 30 | ON | |
| 29 | OFF | |

## 15.21 สิ่งที่นักศึกษาควรเข้าใจ

LAB 13:

```text
Data
  ↓
 Rule
  ↓
Decision
```

LAB 14:

```text
Human
  ↓
Command
  ↓
Actuator
```

LAB 15:

```text
Data
  ↓
 Rule
  ↓
Decision
  ↓
Command
  ↓
Actuator
```

เส้นทางการเรียนจึงพัฒนาเป็น:

```text
Acquire
   ↓
Communicate
   ↓
Process
   ↓
Analyze
   ↓
Decide
   ↓
Control
```

ระบบจึงเปลี่ยนจาก:

```text
IoT Monitoring System
```

ไปสู่:

```text
IoT Monitoring and Control System
```

## 15.22 ข้อจำกัดของระบบใน LAB นี้

ระบบ LAB 15 เป็น **Automatic Rule-based IoT Control**

ยังไม่ควรเรียกว่า Closed-loop Control อย่างสมบูรณ์ หาก LED เป็นเพียงตัวแทน Fan
และไม่มีผลต่ออุณหภูมิจริง

Closed-loop ทางกายภาพต้องมี:

```text
Sensor
   ↓
Controller
   ↓
Actuator
   ↓
Physical Process
   ↓
Sensor Feedback
   └────────────→ Controller
```

เช่น:

```text
Temperature Sensor
      ↓
   Controller
      ↓
      Fan
      ↓
Room Temperature
      ↓
Temperature Sensor
```

จึงเกิด Feedback Loop จริง

## 15.23 เชื่อมไป LAB 16 --- MQTT Topic Design

ปัจจุบันใช้:

```text
pkru/iot/001/data
pkru/iot/001/cmd
```

ระบบยังเป็น Single-device เป็นหลัก

เมื่อเพิ่ม:

```text
ESP32-001
ESP32-002
ESP32-003
...
ESP32-100
```

ต้องเริ่มออกแบบ:

- Topic Hierarchy
- Device ID
- Data Topic
- Status Topic
- Command Topic
- Wildcard Subscription
- Multi-device Communication

LAB 16 จึงเปลี่ยนแนวคิดจาก:

```text
Single-device MQTT
```

ไปเป็น:

```text
Scalable Multi-device MQTT Architecture
```

และเริ่มใช้ MQTT Wildcard:

```text
+
#
```

อย่างเป็นระบบ
