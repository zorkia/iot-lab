> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[12 - LAB 12 - แยก SQLite Write และ Statistics Flow]]
> ถัดไป: [[14 - LAB 14 - MQTT Manual Control]]

# LAB 13 --- Rule & Alert Processing

> [!info] แก้ไขล่าสุด
> 2026-10-01 11:59:31 +07


## 13.1 แนวคิดของ LAB

LAB นี้เป็นจุดเปลี่ยนจากระบบ IoT ที่ทำเพียง **Monitoring** ไปสู่ระบบที่สามารถ
**ประมวลผลและตัดสินใจจากข้อมูล**

จากเดิม:

```text
Sensor → MQTT → Node-RED → Dashboard
                         │
                         └──→ SQLite
```

ระบบตอบได้เพียง:

```text
"เกิดอะไรขึ้น?"
```

LAB 13 เพิ่ม Rule Processing:

```text
Sensor
   ↓
 MQTT
   ↓
Node-RED
   ↓
 Rule
   ↓
Status
 ├── NORMAL
 ├── WARNING
 └── ALERT
```

ทำให้ระบบสามารถตอบได้เพิ่มว่า:

```text
"ข้อมูลที่ได้รับมีความหมายอย่างไร?"
"สถานะของระบบตอนนี้เป็นอย่างไร?"
```

## 13.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- รับข้อมูล Sensor จาก MQTT
- แปลง JSON เป็นข้อมูลสำหรับประมวลผล
- สร้าง Rule จาก Threshold
- ใช้เงื่อนไขในการจำแนกสถานะ
- จำแนก `NORMAL`, `WARNING`, `ALERT`
- แสดงสถานะบน Node-RED Dashboard
- แยกความแตกต่างระหว่าง Monitoring และ Decision
- เข้าใจพื้นฐาน Rule Processing ในระบบ IoT

## 13.3 Architecture

```text
Sensor Simulator / ESP32
          │
          │ MQTT
          ▼
┌─────────────────────┐
│ Mosquitto Broker    │
│ Raspberry Pi        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Node-RED            │
│                     │
│ MQTT In             │
│    ↓                │
│ JSON                │
│    ↓                │
│ Rule Processing     │
│    ↓                │
│ Status              │
└──────────┬──────────┘
           │
      ┌────┼─────┐
      ▼    ▼     ▼
   NORMAL WARNING ALERT
           │
           ▼
       Dashboard
```

LAB นี้ยังไม่มีการสั่งงาน Actuator

Control Path จะเริ่มใน LAB 14

## 13.4 ข้อมูลที่ใช้ทดลอง

MQTT Topic:

```text
pkru/iot/001/data
```

ตัวอย่าง Payload:

```json
{
  "temp": 32.5,
  "humi": 70,
  "light": 1500
}
```

LAB นี้ใช้ `temp` เป็นตัวแปรหลักในการทดลอง Rule Processing

กำหนด Rule:

| Temperature | Status |
|---|---|
| `< 30 °C` | NORMAL |
| `30-35 °C` | WARNING |
| `> 35 °C` | ALERT |

สิ่งสำคัญที่ต้องเข้าใจคือ:

> Threshold เป็นกฎที่ระบบกำหนดขึ้น ไม่ใช่คุณสมบัติของ Sensor

Sensor มีหน้าที่วัดข้อมูล ส่วน Gateway / Processing Layer มีหน้าที่ตีความข้อมูล

## 13.5 ทดสอบ MQTT ก่อนสร้าง Rule

เปิด Terminal บน Raspberry Pi:

```bash
mosquitto_sub -h localhost -t "pkru/iot/001/data" -v
```

เปิด Terminal อีกหน้าต่าง

### ทดสอบ NORMAL

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28,"humi":70,"light":1500}'
```

ผล:

```text
pkru/iot/001/data {"temp":28,"humi":70,"light":1500}
```

### ทดสอบ WARNING

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":32,"humi":70,"light":1500}'
```

### ทดสอบ ALERT

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":38,"humi":70,"light":1500}'
```

ขั้นตอนนี้ใช้ตรวจสอบ Data Path ก่อนนำ Rule Processing เข้ามาเกี่ยวข้อง

## 13.6 สร้าง Node-RED Flow

สร้าง Flow:

```text
[MQTT In]
     │
     ▼
   [JSON]
     │
     ▼
[Temperature Rule]
     │
     ▼
   [Debug]
```

ตั้งค่า MQTT In:

| ค่า | รายละเอียด |
|---|---|
| Broker | `localhost:1883` |
| Topic | `pkru/iot/001/data` |

## 13.7 Temperature Rule

เพิ่ม `function` node แล้วตั้งชื่อ:

```text
Temperature Rule
```

ใช้โค้ด:

```javascript
let temp = Number(msg.payload.temp);

if (temp < 30) {
    msg.status = "NORMAL";
} else if (temp <= 35) {
    msg.status = "WARNING";
} else {
    msg.status = "ALERT";
}

return msg;
```

ตัวอย่างข้อมูล:

```json
{
  "temp": 32,
  "humi": 70,
  "light": 1500
}
```

หลังผ่าน Rule:

```text
msg.payload.temp = 32
msg.status = "WARNING"
```

ดังนั้นระบบเปลี่ยนจาก Raw Data:

```text
temp = 32
```

เป็นข้อมูลที่ผ่านการตีความแล้ว:

```text
temp = 32
status = WARNING
```

แนวคิดคือ:

```text
Raw Data
    ↓
Processing
    ↓
Information
    ↓
System State
```

## 13.8 ทดสอบ Rule

### NORMAL

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":25,"humi":70,"light":1500}'
```

ผลที่คาดหวัง:

```text
NORMAL
```

### WARNING

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":33,"humi":70,"light":1500}'
```

ผลที่คาดหวัง:

```text
WARNING
```

### ALERT

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":40,"humi":70,"light":1500}'
```

ผลที่คาดหวัง:

```text
ALERT
```

## 13.9 แยก Data Flow ตามสถานะ

เพิ่ม `switch` node:

```text
                     ┌── NORMAL ──→ Debug
                     │
MQTT → JSON → Rule ──┼── WARNING ─→ Debug
                     │
                     └── ALERT ───→ Debug
```

ตั้ง Property:

```text
msg.status
```

สร้าง 3 Rules:

```text
== NORMAL
== WARNING
== ALERT
```

Switch node จะมี 3 Outputs

ทำให้นักศึกษาเห็นว่า Rule ไม่ได้มีหน้าที่เพียงสร้างข้อความสถานะ แต่สามารถใช้กำหนด
เส้นทางการทำงานของระบบได้

## 13.10 แสดงผลบน Dashboard

สร้าง Dashboard สำหรับแสดง:

```text
Temperature
32.0 °C

System Status
WARNING
```

Architecture:

```text
                 ┌── Temperature ──→ Dashboard
                 │
MQTT → JSON → Rule
                 │
                 └── Status ───────→ Dashboard
```

ก่อนส่ง `status` ไป Dashboard สามารถใช้ Change node กำหนด:

```text
msg.payload = msg.status
```

จากเดิม Dashboard แสดงเพียง:

```text
Temperature
32 °C
```

หลัง LAB 13 สามารถแสดง:

```text
Temperature
32 °C

Status
WARNING
```

จึงเริ่มเปลี่ยนจาก Data Dashboard ไปสู่ Operational Dashboard

## 13.11 Status และ Alert

ควรแยกแนวคิดระหว่าง **Status** กับ **Alert**

ตัวอย่าง:

```text
temp = 28
Status = NORMAL
Alert  = No

temp = 32
Status = WARNING
Alert  = No

temp = 38
Status = ALERT
Alert  = Yes
```

Architecture:

```text
Sensor Data
     ↓
    Rule
     ↓
   Status
     ↓
Alert Condition
     ↓
Alert Event
```

ดังนั้นไม่ควรถือว่าทุก Status คือ Alert

Alert เป็นเหตุการณ์ที่เกิดขึ้นเมื่อเงื่อนไขที่กำหนดไว้เป็นจริง

## 13.12 Sensor Simulator

เพื่อไม่ต้องใช้ `mosquitto_pub` ส่งค่าทีละค่า สามารถจำลอง Sensor บน Raspberry Pi:

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

ระบบจะสร้างค่า Temperature แบบสุ่มประมาณ:

```text
25-40 °C
```

ทุก 2 วินาที

Node-RED จะประมวลผลและเปลี่ยนสถานะอัตโนมัติระหว่าง:

```text
NORMAL
WARNING
ALERT
```

ทำให้สามารถทดลอง Rule Processing แบบ Real-time ได้

## 13.13 Boundary Testing

การทดสอบ Rule ไม่ควรทดสอบเฉพาะค่าที่อยู่กลางช่วง

ต้องทดสอบค่าบริเวณ Boundary ด้วย

สำหรับ Rule:

```text
temp < 30       → NORMAL
temp <= 35      → WARNING
temp > 35       → ALERT
```

ควรทดสอบอย่างน้อย:

| temp | Expected |
|---:|---|
| 29 | NORMAL |
| 30 | WARNING |
| 35 | WARNING |
| 36 | ALERT |

Boundary Test ช่วยตรวจสอบความผิดพลาดจากการใช้:

```text
<
<=
>
>=
```

ผิดตำแหน่ง

## 13.14 ปัญหา Threshold Flapping

Simple Threshold มีข้อจำกัด

สมมติ Sensor อ่านค่า:

```text
34.9
35.1
34.8
35.2
34.9
35.1
```

เมื่อใช้ Rule:

```text
<= 35 → WARNING
> 35  → ALERT
```

ระบบจะเปลี่ยนสถานะ:

```text
WARNING
ALERT
WARNING
ALERT
WARNING
ALERT
```

สถานะจึงเปลี่ยนกลับไปกลับมาบริเวณ Threshold เรียกว่า:

```text
State Flapping
Threshold Oscillation
```

ปัญหานี้สามารถแก้ด้วยแนวคิด เช่น `Hysteresis` แต่ยังไม่จำเป็นต้องนำมาเป็นแกนหลักของ
LAB 13 สามารถใช้เป็น Advanced Exercise ได้

## 13.15 แบบฝึกหัด

### Exercise 1 --- Temperature Rule

ปรับ Rule เป็น:

```text
temp < 28
    → NORMAL

28 <= temp <= 35
    → WARNING

temp > 35
    → ALERT
```

ทดสอบ Boundary ของ Rule

### Exercise 2 --- Humidity Rule

เพิ่ม Rule สำหรับ Humidity:

```text
humi <= 80
    → NORMAL

humi > 80
    → ALERT
```

### Exercise 3 --- Multiple Conditions

สร้าง System Status จาก Temperature และ Humidity

ตัวอย่าง:

```text
Temperature = NORMAL
Humidity    = NORMAL
         ↓
   System NORMAL
```

แต่ถ้า:

```text
Temperature = ALERT
```

หรือ:

```text
Humidity = ALERT
```

ให้:

```text
System ALERT
```

แนวคิดคือ:

```text
Multiple Sensor Data
        ↓
   Multiple Rules
        ↓
   System Status
```

## 13.16 งานส่ง LAB 13

นักศึกษาส่ง:

1. Screenshot Node-RED Flow
2. Screenshot Dashboard ขณะเป็น `NORMAL`
3. Screenshot Dashboard ขณะเป็น `WARNING`
4. Screenshot Dashboard ขณะเป็น `ALERT`
5. อธิบาย Rule ที่ใช้
6. แสดงผลการทดสอบอย่างน้อย 5 ค่า
7. ต้องมี Boundary Test

ตัวอย่างผลการทดสอบ:

| temp | Expected | Actual |
|---:|---|---|
| 25 | NORMAL | NORMAL |
| 29 | NORMAL | NORMAL |
| 30 | WARNING | WARNING |
| 35 | WARNING | WARNING |
| 36 | ALERT | ALERT |

## 13.17 สิ่งที่นักศึกษาควรเข้าใจ

ก่อน LAB 13:

```text
Sensor
   ↓
  Data
   ↓
Dashboard
```

ตัวอย่าง:

```text
temp = 38
```

ระบบเพียงแสดงข้อมูล

หลัง LAB 13:

```text
Sensor
   ↓
  Data
   ↓
  Rule
   ↓
Decision State
   ↓
Dashboard
```

ตัวอย่าง:

```text
temp = 38
status = ALERT
```

ระบบจึงเริ่มมี Processing / Decision Layer

## 13.18 ผลลัพธ์ของ LAB 13

Architecture หลังจบ LAB:

```text
             MQTT
               │
               ▼
          Sensor Data
               │
               ▼
         ┌───────────┐
         │ Node-RED  │
         │   Rule    │
         └─────┬─────┘
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
   NORMAL   WARNING    ALERT
      │        │        │
      └────────┼────────┘
               ▼
           Dashboard
```

แนวคิดสำคัญคือ:

```text
Monitor
   ↓
Process
   ↓
Evaluate
   ↓
Determine State
```

IoT Gateway จึงไม่ได้ทำหน้าที่เพียงรับและแสดงข้อมูล แต่สามารถประมวลผลข้อมูลเพื่อสร้าง
สถานะและเหตุการณ์สำหรับใช้ในการตัดสินใจได้

## 13.19 เชื่อมไป LAB 14

LAB 13 สร้างเส้นทาง:

```text
Sensor → MQTT → Rule → Decision
```

แต่ยังไม่มีการควบคุมอุปกรณ์

LAB 14 จะเพิ่ม Control Path:

```text
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

ทำให้ระบบมีสองเส้นทางหลัก:

```text
DATA PATH

ESP32 → MQTT → Raspberry Pi → Dashboard


CONTROL PATH

Dashboard → Raspberry Pi → MQTT → ESP32
```

LAB 14 ยังเป็น Manual Control โดยมนุษย์เป็นผู้ตัดสินใจ

จากนั้น LAB 15 จะรวม:

```text
LAB 13
Sensor → Rule → Decision

LAB 14
Command → Actuator
```

กลายเป็น:

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

หรือ:

```text
Automatic Control
```
