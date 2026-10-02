> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[13 - LAB 13 - Rule & Alert Processing]]
> ถัดไป: [[15 - LAB 15 - Automatic Control]]

# LAB 14 --- MQTT Manual Control

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:10:19 +07


## 14.1 แนวคิดของ LAB

LAB นี้เริ่มสอน **Control Path** ของระบบ IoT หลังจาก LAB ก่อนหน้าเน้น Data Path
และ Rule Processing

Data Path:

```text
ESP32 → MQTT → Raspberry Pi → Node-RED → Dashboard
```

Control Path:

```text
Dashboard → Node-RED → MQTT → ESP32 → Actuator
```

เป้าหมายคือให้นักศึกษาเข้าใจว่า MQTT ไม่ได้ใช้เฉพาะส่งข้อมูล Sensor จาก Device ไปยัง
Gateway แต่สามารถใช้ส่งคำสั่งจาก Gateway กลับไปควบคุม Device ได้

## 14.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- อธิบายความแตกต่างระหว่าง Data Path และ Control Path
- ออกแบบ MQTT Topic สำหรับ Command
- ใช้ Node-RED Publish MQTT Message
- ให้ ESP32 Subscribe Command Topic
- ควบคุม LED หรือ Actuator จาก Dashboard
- ตรวจสอบคำสั่งด้วย `mosquitto_sub`
- เข้าใจหลักการ Manual Control

## 14.3 Architecture

```text
                ┌───────────────────┐
                │ Dashboard         │
                │                   │
                │   ON      OFF     │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │ Node-RED          │
                └─────────┬─────────┘
                          │
                          │ MQTT Publish
                          ▼
                ┌───────────────────┐
                │ Mosquitto Broker  │
                │ Raspberry Pi      │
                └─────────┬─────────┘
                          │
                          │ MQTT Subscribe
                          ▼
                ┌───────────────────┐
                │ ESP32             │
                │                   │
                │ LED / Relay       │
                └───────────────────┘
```

## 14.4 MQTT Topic

ใช้ Command Topic:

```text
pkru/iot/001/cmd
```

ตัวอย่าง Message:

```text
ON
OFF
```

ใน LAB นี้ใช้ Payload แบบข้อความธรรมดาก่อน เพื่อให้นักศึกษาเห็นกลไก
Publish / Subscribe ชัดเจน ก่อนขยายไปสู่ Topic Structure สำหรับระบบหลายอุปกรณ์ใน
LAB 16

## 14.5 ทดสอบ Command ด้วย Command Line

เปิด Terminal แรก:

```bash
mosquitto_sub -h localhost -t "pkru/iot/001/cmd" -v
```

เปิด Terminal อีกหน้าต่างแล้วส่งคำสั่ง:

```bash
mosquitto_pub -h localhost -t "pkru/iot/001/cmd" -m "ON"
```

ผลที่ควรได้รับ:

```text
pkru/iot/001/cmd ON
```

ทดลองส่ง:

```bash
mosquitto_pub -h localhost -t "pkru/iot/001/cmd" -m "OFF"
```

ผล:

```text
pkru/iot/001/cmd OFF
```

ขั้นตอนนี้ใช้ยืนยันว่า Broker และ Command Topic ทำงานถูกต้องก่อนนำ Node-RED และ
ESP32 เข้ามาเกี่ยวข้อง

## 14.6 Node-RED Manual Control

สร้าง Flow:

```text
[ON Button] ──┐
              ├──→ [MQTT Out]
[OFF Button] ─┘
```

ตั้งค่า MQTT Out:

| ค่า | รายละเอียด |
|---|---|
| MQTT Broker | `localhost:1883` |
| Topic | `pkru/iot/001/cmd` |

ON Button ส่ง:

```text
ON
```

OFF Button ส่ง:

```text
OFF
```

## 14.7 ตรวจสอบ Node-RED

เปิด Terminal:

```bash
mosquitto_sub -h localhost -t "pkru/iot/001/cmd" -v
```

กดปุ่ม `ON` บน Dashboard

ควรได้:

```text
pkru/iot/001/cmd ON
```

กด `OFF`

ควรได้:

```text
pkru/iot/001/cmd OFF
```

แสดงว่า Control Path ส่วนแรกทำงานแล้ว:

```text
Dashboard
    ↓
Node-RED
    ↓
MQTT Broker
```

## 14.8 ESP32 Subscribe Command

ESP32 ทำหน้าที่เป็น IoT Node:

```text
MQTT Broker
     │
     │ Subscribe
     ▼
   ESP32
     │
     ▼
 LED / Relay
```

ESP32 Subscribe Topic:

```text
pkru/iot/001/cmd
```

เมื่อได้รับ:

```text
ON
```

ให้เปิด LED

เมื่อได้รับ:

```text
OFF
```

ให้ปิด LED

## 14.9 Complete Control Path

เมื่อเชื่อมทุกส่วนเข้าด้วยกัน:

```text
User
  │
  ▼
Dashboard
  │
  ▼
Node-RED
  │
  │ MQTT Publish
  ▼
Mosquitto
  │
  │ MQTT Subscribe
  ▼
ESP32
  │
  ▼
Actuator
```

ตัวอย่าง:

```text
กด ON
  ↓
Node-RED
  ↓
MQTT: ON
  ↓
ESP32
  ↓
LED ON
```

## 14.10 Manual Control

สิ่งสำคัญของ LAB นี้คือคำว่า **Manual**

การตัดสินใจยังมาจากมนุษย์:

```text
Human
  ↓
Decision
  ↓
Dashboard
  ↓
Command
  ↓
ESP32
  ↓
Actuator
```

ระบบยังไม่ได้ตัดสินใจเปิดหรือปิด Actuator เอง

ตัวอย่าง:

```text
Temperature = 38 °C
       ↓
     ALERT
```

แม้ระบบจะตรวจพบ `ALERT` จาก LAB 13 แต่จะยังไม่สั่งเปิดพัดลมเอง

ผู้ใช้ต้องเป็นผู้กด:

```text
Fan ON
```

นี่คือความแตกต่างสำคัญระหว่าง Manual Control กับ Automatic Control

## 14.11 ความสัมพันธ์กับ LAB 13

LAB 13:

```text
Sensor
  ↓
MQTT
  ↓
Node-RED
  ↓
Rule
  ↓
NORMAL / WARNING / ALERT
```

แนวคิด:

```text
Data → Decision
```

LAB 14:

```text
Human
  ↓
Dashboard
  ↓
Node-RED
  ↓
MQTT
  ↓
ESP32
  ↓
Actuator
```

แนวคิด:

```text
Human Decision → Control
```

ทั้งสองส่วนยังแยกออกจากกัน

## 14.12 Data Path และ Control Path

ระบบ IoT มี communication สองทิศทางหลัก

### Data Path

```text
Device → Gateway
```

ตัวอย่าง:

```text
ESP32
  ↓
MQTT
  ↓
Raspberry Pi
```

ใช้สำหรับ:

- Sensor Data
- Telemetry
- Device Status

### Control Path

```text
Gateway → Device
```

ตัวอย่าง:

```text
Raspberry Pi
    ↓
  MQTT
    ↓
  ESP32
```

ใช้สำหรับ:

- Command
- Control
- Configuration

ดังนั้น MQTT เป็น communication backbone ที่รองรับการสื่อสารได้ทั้งสองทิศทาง

## 14.13 แบบฝึกหัด

สร้าง Dashboard สำหรับควบคุม LED บน ESP32

ต้องสามารถสั่ง:

```text
ON
OFF
```

ผ่าน MQTT Topic:

```text
pkru/iot/001/cmd
```

จากนั้นใช้ `mosquitto_sub` เพื่อตรวจสอบ Command ที่ส่งออกจาก Node-RED

ทดสอบตามลำดับ:

1. กด ON จาก Dashboard
2. ตรวจสอบ MQTT Message
3. ตรวจสอบว่า LED บน ESP32 เปิด
4. กด OFF จาก Dashboard
5. ตรวจสอบ MQTT Message
6. ตรวจสอบว่า LED บน ESP32 ปิด

## 14.14 งานส่ง

นักศึกษาส่ง:

1. Screenshot Node-RED Flow
2. Screenshot Dashboard
3. Screenshot `mosquitto_sub` ขณะได้รับ `ON`
4. Screenshot `mosquitto_sub` ขณะได้รับ `OFF`
5. ภาพหรือหลักฐานว่า ESP32 LED เปิดและปิดตามคำสั่ง
6. อธิบาย Data Path และ Control Path ของระบบ

## 14.15 ผลลัพธ์ของ LAB

เมื่อจบ LAB 14 ระบบมีทั้ง Data Path และ Control Path

```text
             DATA PATH

ESP32 ──MQTT──→ Raspberry Pi
                     │
                     ▼
                  Node-RED
                     │
                     ▼
                 Dashboard


            CONTROL PATH

Dashboard
    │
    ▼
 Node-RED
    │
    ▼
  MQTT
    │
    ▼
  ESP32
    │
    ▼
 Actuator
```

แต่การตัดสินใจควบคุมยังมาจากผู้ใช้:

```text
Monitor
   ↓
Human Decision
   ↓
Manual Control
```

## 14.16 เชื่อมไป LAB 15

LAB 13 มี:

```text
Sensor → Rule → Decision
```

LAB 14 มี:

```text
Human → Command → Actuator
```

LAB 15 จะนำสองส่วนมารวมกัน:

```text
Sensor
  ↓
MQTT
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

เปลี่ยนจาก:

```text
Manual Control
```

เป็น:

```text
Automatic Control
```

และเริ่มเกิดแนวคิด:

```text
Sensor
   ↓
Measure
   ↓
Decision
   ↓
Control
   ↓
Physical System
```

ซึ่งเป็นพื้นฐานของ Closed-loop IoT Control System
