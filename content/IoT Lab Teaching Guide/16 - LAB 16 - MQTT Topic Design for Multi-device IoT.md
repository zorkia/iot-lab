> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[15 - LAB 15 - Automatic Control]]
> ถัดไป: [[17 - LAB 17 - Multi-device Dashboard]]

# LAB 16 --- MQTT Topic Design for Multi-device IoT

> [!info] แก้ไขล่าสุด
> 2026-10-01 12:18:15 +07


## 16.1 แนวคิดของ LAB

LAB 01-15 ใช้ MQTT Topic แบบง่าย เช่น:

```text
pkru/iot/001/data
pkru/iot/001/cmd
```

เมื่อระบบมีอุปกรณ์เพียงตัวเดียว Topic ลักษณะนี้ยังใช้งานได้

แต่ระบบ IoT จริงมักมีหลาย Device เช่น:

```text
ESP32-001
ESP32-002
ESP32-003
...
ESP32-100
```

ถ้าไม่มีการออกแบบ Topic ที่ดี ระบบจะเริ่มมีปัญหา:

- แยก Device ยาก
- Subscribe ข้อมูลหลาย Device ยาก
- แยก Data / Status / Command ไม่ชัดเจน
- Node-RED Flow ซับซ้อน
- เพิ่ม Device ใหม่ได้ยาก
- กำหนด MQTT Permission ในอนาคตได้ยาก

ดังนั้น LAB นี้จะเปลี่ยนจาก:

```text
Single-device MQTT
```

ไปสู่:

```text
Structured Multi-device MQTT
```

แนวคิดหลักคือ:

```text
MQTT Topic = Address ของข้อมูลในระบบ IoT
```

## 16.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- อธิบาย MQTT Topic Hierarchy
- ออกแบบ Topic สำหรับหลาย Device
- แยก Data, Status และ Command Topic
- ใช้ Device ID ใน Topic
- ใช้ Single-level Wildcard `+`
- ใช้ Multi-level Wildcard `#`
- Subscribe ข้อมูลจากหลาย Device
- ใช้ Node-RED รับข้อมูลจากหลาย Device
- แยก Device ID จาก `msg.topic`
- เข้าใจพื้นฐานของ Scalable MQTT Architecture

## 16.3 ปัญหาของ Single-device Design

สมมติระบบเดิมมี:

```text
pkru/iot/001/data
pkru/iot/001/cmd
```

เมื่อเพิ่ม Device ใหม่อาจสร้าง:

```text
pkru/iot/002/data
pkru/iot/002/cmd

pkru/iot/003/data
pkru/iot/003/cmd
```

โครงสร้างนี้ยังใช้งานได้ แต่ต้องกำหนดมาตรฐานให้ชัดเจนตั้งแต่ต้น

Topic ที่ดีควรตอบได้ว่า:

```text
ข้อมูลมาจากระบบใด?
มาจาก Device ใด?
เป็นข้อมูลประเภทใด?
```

## 16.4 Topic Hierarchy

กำหนดโครงสร้างหลัก:

```text
pkru/iot/{device_id}/{channel}
```

ตัวอย่าง:

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

โครงสร้างจึงเป็น:

```text
pkru
 │
 └── iot
      │
      ├── 001
      │    ├── data
      │    ├── status
      │    └── cmd
      │
      ├── 002
      │    ├── data
      │    ├── status
      │    └── cmd
      │
      └── 003
           ├── data
           ├── status
           └── cmd
```

## 16.5 ความหมายของแต่ละ Topic

### Data Topic

```text
pkru/iot/001/data
```

ใช้สำหรับ Sensor Data / Telemetry

ตัวอย่าง:

```json
{
  "temp": 32.5,
  "humi": 70,
  "light": 1500
}
```

ทิศทางหลัก:

```text
Device → Gateway
```

### Status Topic

```text
pkru/iot/001/status
```

ใช้สำหรับสถานะของ Device

ตัวอย่าง:

```text
ONLINE
OFFLINE
```

ทิศทางหลัก:

```text
Device → Gateway
```

Status Topic จะถูกนำไปใช้ต่อใน LAB 18 --- Device Status & Offline Detection

### Command Topic

```text
pkru/iot/001/cmd
```

ใช้สำหรับส่งคำสั่งไปยัง Device

ตัวอย่าง:

```text
ON
OFF
```

ทิศทางหลัก:

```text
Gateway → Device
```

## 16.6 Data Path และ Control Path

Topic Structure ทำให้เห็นทิศทางของข้อมูลชัดเจน

### Data Path

```text
ESP32-001
    │
    │ pkru/iot/001/data
    ▼
  MQTT
    │
    ▼
Raspberry Pi


ESP32-002
    │
    │ pkru/iot/002/data
    ▼
  MQTT
    │
    ▼
Raspberry Pi
```

### Control Path

```text
Raspberry Pi
    │
    │ pkru/iot/001/cmd
    ▼
  MQTT
    │
    ▼
ESP32-001


Raspberry Pi
    │
    │ pkru/iot/002/cmd
    ▼
  MQTT
    │
    ▼
ESP32-002
```

## 16.7 จำลอง Device 001

เปิด Terminal:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":30,"humi":70,"light":1000}'
```

## 16.8 จำลอง Device 002

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/002/data" \
  -m '{"temp":32,"humi":75,"light":1500}'
```

## 16.9 จำลอง Device 003

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/003/data" \
  -m '{"temp":35,"humi":80,"light":2000}'
```

ตอนนี้ MQTT Broker มีข้อมูลจากหลาย Device:

```text
Device 001
   ↓
pkru/iot/001/data

Device 002
   ↓
pkru/iot/002/data

Device 003
   ↓
pkru/iot/003/data
```

## 16.10 Subscribe แบบระบุ Device

ต้องการดูเฉพาะ Device 001:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/001/data" \
  -v
```

จะได้รับเฉพาะ:

```text
pkru/iot/001/data
```

ข้อมูลจาก Device 002 และ 003 จะไม่ถูกส่งมายัง Subscriber นี้

## 16.11 MQTT Single-level Wildcard `+`

เครื่องหมาย:

```text
+
```

แทน Topic Level ได้หนึ่งระดับ

ตัวอย่าง:

```text
pkru/iot/+/data
```

หมายถึง:

```text
pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
pkru/iot/004/data
...
```

ใช้คำสั่ง:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/data" \
  -v
```

จากนั้นส่ง:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":30,"humi":70,"light":1000}'

mosquitto_pub -h localhost \
  -t "pkru/iot/002/data" \
  -m '{"temp":32,"humi":75,"light":1500}'

mosquitto_pub -h localhost \
  -t "pkru/iot/003/data" \
  -m '{"temp":35,"humi":80,"light":2000}'
```

ผล:

```text
pkru/iot/001/data {"temp":30,"humi":70,"light":1000}
pkru/iot/002/data {"temp":32,"humi":75,"light":1500}
pkru/iot/003/data {"temp":35,"humi":80,"light":2000}
```

นี่เป็นแนวคิดสำคัญมากสำหรับ Multi-device MQTT

Subscriber ไม่จำเป็นต้องสร้าง Subscription แยกทุก Device

## 16.12 ความหมายของ `+`

Topic:

```text
pkru/iot/+/data
```

แบ่งเป็น:

```text
pkru
 │
iot
 │
 +
 │
data
```

`+` แทนได้หนึ่ง Topic Level

ดังนั้นตรงกับ:

```text
pkru/iot/001/data
pkru/iot/abc/data
```

แต่ไม่ตรงกับ:

```text
pkru/iot/001/status
pkru/iot/site1/001/data
```

เพราะจำนวน Topic Level ไม่ตรงกัน

## 16.13 MQTT Multi-level Wildcard `#`

เครื่องหมาย:

```text
#
```

ใช้แทน Topic ตั้งแต่ระดับตำแหน่งนั้นลงไปทั้งหมด

ตัวอย่าง:

```text
pkru/iot/#
```

ใช้คำสั่ง:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/#" \
  -v
```

จะสามารถรับ:

```text
pkru/iot/001/data
pkru/iot/001/status
pkru/iot/001/cmd

pkru/iot/002/data
pkru/iot/002/status
pkru/iot/002/cmd
```

รวมถึง Topic ที่มีระดับย่อยเพิ่มเติมภายใต้:

```text
pkru/iot/
```

## 16.14 ทดลอง `#`

เปิด:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/#" \
  -v
```

จากนั้นส่ง:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":30}'
```

ส่ง Status:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/status" \
  -m "ONLINE"
```

ส่ง Command:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/cmd" \
  -m "ON"
```

Subscriber จะเห็นทั้งหมด:

```text
pkru/iot/001/data {"temp":30}
pkru/iot/001/status ONLINE
pkru/iot/001/cmd ON
```

## 16.15 เปรียบเทียบ `+` และ `#`

### `+`

แทนหนึ่ง Topic Level:

```text
pkru/iot/+/data
```

เหมาะสำหรับ:

```text
รับ data ของทุก Device
```

### `#`

แทนทุก Topic Level ตั้งแต่ตำแหน่งนั้นลงไป:

```text
pkru/iot/#
```

เหมาะสำหรับ:

```text
Debug
Monitoring
ตรวจสอบ MQTT Traffic ของระบบ
```

ไม่ควรใช้ `#` โดยไม่จำเป็นใน Application จริง หาก Application ต้องการข้อมูลเพียงบางประเภท

หลักการคือ:

> Subscribe เฉพาะข้อมูลที่ Application ต้องใช้

## 16.16 Node-RED Multi-device MQTT Input

ใน Node-RED สร้าง:

```text
[MQTT In]
    │
    ▼
  [JSON]
    │
    ▼
  [Debug]
```

ตั้ง MQTT In Topic:

```text
pkru/iot/+/data
```

Broker:

```text
localhost:1883
```

เมื่อ Device หลายตัวส่งข้อมูล:

```text
ESP32-001 ─┐
ESP32-002 ─┼──→ MQTT ──→ Node-RED
ESP32-003 ─┘
```

Node-RED ใช้ MQTT In เพียง Node เดียวรับข้อมูลได้ทุก Device

## 16.17 `msg.topic`

เมื่อ Node-RED รับ MQTT Message

ตัวอย่าง:

```text
Topic:
pkru/iot/002/data

Payload:
{"temp":32,"humi":75,"light":1500}
```

Node-RED จะมี:

```text
msg.topic
```

เท่ากับ:

```text
pkru/iot/002/data
```

ดังนั้น Topic ไม่ได้ใช้แค่ Routing แต่ยังสามารถใช้ระบุ Source ของข้อมูลได้ด้วย

## 16.18 แยก Device ID จาก Topic

เพิ่ม Function Node ชื่อ:

```text
Extract Device ID
```

ใช้:

```javascript
let parts = msg.topic.split("/");

msg.device_id = parts[2];

return msg;
```

ตัวอย่าง `msg.topic` คือ:

```text
pkru/iot/002/data
```

เมื่อ:

```javascript
split("/")
```

จะได้:

```text
parts[0] = pkru
parts[1] = iot
parts[2] = 002
parts[3] = data
```

ดังนั้น:

```text
msg.device_id = "002"
```

## 16.19 ตรวจสอบ Device ID

Flow:

```text
[MQTT In]
     │
     ▼
   [JSON]
     │
     ▼
[Extract Device ID]
     │
     ▼
   [Debug]
```

เมื่อรับ:

```text
pkru/iot/003/data
```

Node-RED จะได้:

```text
msg.device_id = "003"
```

และ:

```text
msg.payload.temp
msg.payload.humi
msg.payload.light
```

ทำให้ Processing Layer รู้ทั้ง:

```text
ข้อมูลคืออะไร
ข้อมูลมาจาก Device ใด
```

## 16.20 แยก Device ด้วย Switch Node

สามารถใช้:

```text
msg.device_id
```

ใน Switch Node

Flow:

```text
                      ┌── 001 ──→ Device 001
                      │
MQTT → Extract ID ────┼── 002 ──→ Device 002
                      │
                      └── 003 ──→ Device 003
```

ตั้ง Switch Property:

```text
msg.device_id
```

Rules:

```text
== 001
== 002
== 003
```

วิธีนี้เหมาะสำหรับการทดลองให้เห็น Routing

แต่เมื่อมี Device จำนวนมาก ไม่ควรสร้าง Output แยกทีละ Device เพราะจะทำให้ Flow ไม่สามารถ
Scale ได้ดี

## 16.21 หลักการ Scalable Processing

ระบบขนาดเล็กอาจทำ:

```text
Device 001 → Flow 001
Device 002 → Flow 002
Device 003 → Flow 003
```

แต่ถ้ามี 100 Device:

```text
Device 001 → Flow 001
Device 002 → Flow 002
...
Device 100 → Flow 100
```

จะดูแลยากมาก

แนวทางที่ดีกว่าคือ:

```text
All Devices
     ↓
pkru/iot/+/data
     ↓
Common Processing
     ↓
Extract Device ID
     ↓
Process by device_id
```

หรือ:

```text
ESP32-001 ─┐
ESP32-002 ─┤
ESP32-003 ─┼──→ MQTT
ESP32-004 ─┤       │
   ...     │       ▼
ESP32-100 ─┘   Node-RED
                   │
                   ▼
            Common Processing
```

นี่คือพื้นฐานของ Scalable Multi-device Architecture

## 16.22 จำลองหลาย Device อัตโนมัติ

สามารถใช้ Raspberry Pi จำลอง ESP32 จำนวน 3 ตัว

ใช้ Terminal หรือสร้าง Script:

```bash
while true
do
    temp1=$((25 + RANDOM % 11))
    temp2=$((25 + RANDOM % 11))
    temp3=$((25 + RANDOM % 11))

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/data" \
        -m "{\"temp\":$temp1,\"humi\":70,\"light\":1000}"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/002/data" \
        -m "{\"temp\":$temp2,\"humi\":75,\"light\":1500}"

    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/003/data" \
        -m "{\"temp\":$temp3,\"humi\":80,\"light\":2000}"

    sleep 2
done
```

เปิดอีก Terminal:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/data" \
  -v
```

จะเห็นข้อมูลจาก Device ทั้งสาม

## 16.23 ส่ง Command ไป Device เฉพาะตัว

ต้องการเปิด Actuator ของ Device 001:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/cmd" \
  -m "ON"
```

Device 001 Subscribe:

```text
pkru/iot/001/cmd
```

จึงได้รับคำสั่ง

แต่ Device 002 Subscribe:

```text
pkru/iot/002/cmd
```

จะไม่ได้รับคำสั่งนี้

ทำให้สามารถควบคุม Device แต่ละตัวแยกกันได้

## 16.24 Device-side Subscription

แต่ละ ESP32 ควร Subscribe เฉพาะ Command ของตัวเอง

ESP32-001:

```text
pkru/iot/001/cmd
```

ESP32-002:

```text
pkru/iot/002/cmd
```

ESP32-003:

```text
pkru/iot/003/cmd
```

ไม่ควรให้ทุก ESP32 Subscribe:

```text
pkru/iot/+/cmd
```

โดยไม่มีเหตุผล เพราะแต่ละ Device ไม่จำเป็นต้องรับ Command ของ Device อื่น

หลักการคือ:

```text
Publish only what is necessary
Subscribe only what is necessary
```

## 16.25 Device ID ต้องไม่ซ้ำ

ในระบบ Multi-device:

```text
device_id
```

ต้องระบุ Device ได้อย่างไม่กำกวมภายในระบบที่ออกแบบ

ตัวอย่าง:

```text
001
002
003
```

ห้ามมี ESP32 สองตัวใช้:

```text
pkru/iot/001/data
```

โดยไม่ตั้งใจ เพราะ Gateway จะไม่สามารถแยกได้ว่าข้อมูลมาจาก Device ใด

สำหรับ LAB ใช้เลข:

```text
001
002
003
```

เพื่อให้อ่านง่าย

ระบบจริงอาจใช้:

```text
esp01
room101
greenhouse01
meter01
```

ตามมาตรฐานของระบบ

## 16.26 Topic Naming Rules

ควรกำหนดมาตรฐาน Topic ตั้งแต่ต้น

แนะนำ:

```text
lowercase
```

เช่น:

```text
pkru/iot/001/data
```

หลีกเลี่ยง:

```text
PKRU/IoT/001/Data
```

เพราะ MQTT Topic เป็น Case-sensitive

ดังนั้น:

```text
pkru/iot/001/data
PKRU/IOT/001/DATA
```

เป็นคนละ Topic

ไม่ควรใช้ Space

หลีกเลี่ยง:

```text
pkru/iot/device 001/data
```

ใช้:

```text
pkru/iot/001/data
```

ชื่อควรสั้นแต่สื่อความหมาย

ดี:

```text
pkru/iot/001/status
```

ไม่ควรยาวโดยไม่มีประโยชน์ เช่น:

```text
pkru/internet_of_things/device_number_001/device_status_information
```

## 16.27 Topic กับ Payload มีหน้าที่ต่างกัน

ไม่ควรใส่ข้อมูลทุกอย่างลงใน Topic

ตัวอย่างที่ไม่เหมาะสำหรับ LAB นี้:

```text
pkru/iot/001/temp/32/humi/70/light/1500
```

เพราะค่าของ Sensor เปลี่ยนตลอดเวลาและควรอยู่ใน Payload

แนวทางที่เหมาะสม

Topic:

```text
pkru/iot/001/data
```

Payload:

```json
{
  "temp": 32,
  "humi": 70,
  "light": 1500
}
```

หลักการคือ:

```text
Topic
  ↓
ใช้ระบุเส้นทาง / ประเภท / Source

Payload
  ↓
ใช้เก็บข้อมูล
```

## 16.28 Topic ไม่ใช่ Folder จริง

แม้ Topic:

```text
pkru/iot/001/data
```

จะดูเหมือน Directory:

```text
pkru
  └── iot
       └── 001
            └── data
```

แต่ MQTT Broker ไม่ได้สร้าง Folder จริง

เครื่องหมาย:

```text
/
```

เป็นเพียง Topic Level Separator ใช้สร้าง Logical Hierarchy

## 16.29 ระวัง Leading Slash

ควรใช้:

```text
pkru/iot/001/data
```

ไม่ควรใช้:

```text
/pkru/iot/001/data
```

เพราะ Leading Slash จะสร้าง Topic Level ว่างขึ้นมาอีกหนึ่งระดับ และทำให้ Topic Structure
ไม่สม่ำเสมอ

## 16.30 Wildcard ใช้กับ Subscription

Wildcard:

```text
+
#
```

ใช้สำหรับ Topic Filter ตอน Subscribe

ตัวอย่าง:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/+/data"
```

หรือ:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/#"
```

ไม่ใช้ Wildcard เพื่อ Publish ข้อมูลไปยังหลาย Topic

ตัวอย่างนี้ไม่ใช่วิธี Publish ที่ถูกต้อง:

```bash
mosquitto_pub \
  -t "pkru/iot/+/cmd" \
  -m "ON"
```

ถ้าต้องการส่ง Command ให้ Device หลายตัว ควรออกแบบ Broadcast / Group Topic โดยตั้งใจ
ซึ่งยังไม่จำเป็นใน LAB นี้

## 16.31 Architecture หลัง LAB 16

```text
                  MQTT Broker
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      │                │                │
   ESP32-001        ESP32-002        ESP32-003
      │                │                │
      │ data           │ data           │ data
      ▼                ▼                ▼
pkru/iot/001/data pkru/iot/002/data pkru/iot/003/data
      │                │                │
      └────────────────┼────────────────┘
                       │
                       ▼
               pkru/iot/+/data
                       │
                       ▼
                   Node-RED
                       │
                Extract Device ID
                       │
                       ▼
               Common Processing
```

Control Path:

```text
                   Node-RED
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      ▼                ▼                ▼
001/cmd           002/cmd           003/cmd
      │                │                │
      ▼                ▼                ▼
  ESP32-001        ESP32-002        ESP32-003
```

## 16.32 แบบฝึกหัดที่ 1 --- Multi-device Data

จำลอง Device จำนวน 3 ตัว:

```text
001
002
003
```

ให้แต่ละ Device ส่ง:

```text
temp
humi
light
```

ไปยัง:

```text
pkru/iot/{device_id}/data
```

ใช้:

```text
pkru/iot/+/data
```

รับข้อมูลทุก Device

ตรวจสอบด้วย:

```text
mosquitto_sub
```

## 16.33 แบบฝึกหัดที่ 2 --- Extract Device ID

สร้าง Node-RED Flow:

```text
MQTT In
   ↓
  JSON
   ↓
Extract Device ID
   ↓
  Debug
```

ให้ Debug แสดง:

```text
device_id
temp
humi
light
```

ตัวอย่าง:

```text
device_id = 002
temp      = 32
humi      = 75
light     = 1500
```

## 16.34 แบบฝึกหัดที่ 3 --- Device-specific Command

ส่ง:

```text
ON
```

ไปยัง:

```text
pkru/iot/002/cmd
```

ตรวจสอบว่า:

```text
ESP32-002
```

ได้รับ Command

แต่:

```text
ESP32-001
ESP32-003
```

ไม่ได้รับ Command

## 16.35 แบบฝึกหัดที่ 4 --- Wildcard

อธิบายความแตกต่างระหว่าง:

```text
pkru/iot/001/data
pkru/iot/+/data
pkru/iot/#
```

และระบุว่าแต่ละแบบเหมาะกับงานประเภทใด

## 16.36 งานส่ง LAB 16

นักศึกษาส่ง:

1. MQTT Topic Structure ของระบบ
2. Screenshot `mosquitto_sub` ที่ใช้ `pkru/iot/+/data` และได้รับข้อมูลจาก Device อย่างน้อย 3 ตัว
3. Screenshot Node-RED Flow: `MQTT In → JSON → Extract Device ID → Debug`
4. แสดงผลว่า Node-RED สามารถแยก `001`, `002`, `003` ได้ถูกต้อง
5. ทดสอบส่ง Command ไปยัง Device เฉพาะตัว
6. อธิบายความแตกต่างของ `+` และ `#`
7. อธิบายความแตกต่างระหว่าง `data`, `status`, `cmd`
8. วาด Architecture ของระบบ Multi-device MQTT

## 16.37 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 16:

```text
ESP32
   ↓
  MQTT
   ↓
Node-RED
```

เป็นการคิดแบบ:

```text
Single Device
```

หลัง LAB 16:

```text
ESP32-001 ─┐
ESP32-002 ─┤
ESP32-003 ─┼──→ MQTT ──→ Gateway
ESP32-004 ─┤
   ...     │
ESP32-N ───┘
```

เป็นการคิดแบบ:

```text
Multi-device System
```

หัวใจสำคัญคือ:

```text
Topic Hierarchy
      +
   Device ID
      +
Topic Wildcard
      ↓
Scalable MQTT Architecture
```

## 16.38 ความสัมพันธ์ของ LAB 13-16

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
                   ↓
            Multi-device System
```

เส้นทางการเรียนจึงเปลี่ยนจาก:

```text
Processing
   ↓
Control
   ↓
Automatic Control
   ↓
Multi-device Architecture
```

## 16.39 ผลลัพธ์ของ LAB 16

เมื่อจบ LAB นักศึกษาควรมอง MQTT ไม่ใช่เพียงคำสั่ง:

```text
mosquitto_pub
mosquitto_sub
```

แต่ต้องเข้าใจว่า MQTT Topic เป็นส่วนหนึ่งของการออกแบบ Architecture

ระบบที่ออกแบบดีสามารถเพิ่ม Device จาก:

```text
3 Devices
```

เป็น:

```text
10 Devices
```

หรือมากกว่านั้นโดยไม่ต้องสร้าง Processing Flow ใหม่สำหรับทุก Device

แนวคิดสำคัญคือ:

```text
Device
   ↓
Structured Topic
   ↓
MQTT Broker
   ↓
Wildcard Subscription
   ↓
Common Processing
   ↓
Device Identification
```

นี่คือพื้นฐานของ **Scalable Multi-device IoT Architecture**

## 16.40 เชื่อมไป LAB 17 --- Multi-device Dashboard

LAB 16 ทำให้ Gateway สามารถรับข้อมูลจากหลาย Device ผ่าน:

```text
pkru/iot/+/data
```

และสามารถระบุ Device จาก:

```text
msg.topic
```

เช่น:

```text
pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
```

ขั้นต่อไปคือการนำข้อมูลเหล่านี้มาแสดงบน Dashboard โดยไม่สร้าง Dashboard แยกแบบไร้โครงสร้าง
สำหรับทุก Device

LAB 17 จะนำ Architecture นี้ไปสร้าง:

```text
ESP32-001 ─┐
ESP32-002 ─┼──→ MQTT
ESP32-003 ─┘
                 ↓
              Node-RED
                 ↓
          Device Identification
                 ↓
          Multi-device Dashboard
                 │
         ┌───────┼───────┐
         ▼       ▼       ▼
        TEMP    HUMI    LIGHT
```

โดยเริ่มเข้าสู่แนวคิด:

```text
Device Selection
Multi-device Monitoring
Device Comparison
Shared Dashboard
```

ซึ่งจะทำให้ระบบจาก LAB 16 ที่รองรับ Multi-device ในระดับ Communication สามารถรองรับ
Multi-device ในระดับ Monitoring ได้จริง
