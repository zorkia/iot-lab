> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[27 - LAB 27 - Fault-Tolerant IoT Gateway]]
> ถัดไป: [[สรุปผลและเส้นทางต่อไป]]

# LAB 28 --- Integrated IoT Mini Project

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:24:55 +07

End-to-End Raspberry Pi IoT System


## 28.1 แนวคิดของ LAB

LAB 28 เป็น LAB สุดท้ายของชุด Raspberry Pi IoT Lab

เป้าหมายไม่ใช่เรียน Technology ใหม่ แต่ให้นักศึกษานำความรู้จาก LAB ก่อนหน้ามาประกอบเป็นระบบ IoT ที่ทำงานครบวงจร

ระบบต้องสามารถ

```text
Sense
  ↓
Communicate
  ↓
Validate
  ↓
Process
  ↓
Store
  ↓
Visualize
  ↓
Decide
  ↓
Control
  ↓
Verify
  ↓
Detect Failure
  ↓
Recover
```

นักศึกษาต้องแสดงให้เห็นว่า

"ระบบทำงานได้"

และ

"เมื่อเกิด Failure ระบบสามารถตรวจพบและจัดการได้"


## 28.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- ออกแบบ End-to-End IoT Architecture
- เชื่อมต่อหลาย IoT Device
- ออกแบบ MQTT Topic
- รับและประมวลผล Sensor Data
- ตรวจสอบ Data Quality
- ตรวจ Device ONLINE/OFFLINE
- บันทึกข้อมูลลง SQLite
- แสดงข้อมูลผ่าน Dashboard
- สร้าง Rule/Alert
- Manual Control
- Automatic Control
- ตรวจสอบ Actual Device State
- ใช้ Raspberry Pi เป็น IoT Gateway
- ทำงานต่อได้เมื่อ Internet ขาด
- ใช้ Store-and-Forward
- ใช้ MQTT Authentication/ACL
- Remote Access
- Auto-start หลัง Reboot
- Backup/Recovery
- Fault Detection/Recovery
- ทดสอบระบบด้วย Fault Injection


## 28.3 Project Requirement

แต่ละกลุ่มต้องสร้าง

Integrated IoT System

โดยมีอย่างน้อย

Raspberry Pi 1 เครื่อง

ESP32 อย่างน้อย 2 ตัว

Sensor Data อย่างน้อย 3 ค่า

Actuator อย่างน้อย 1 ตัว

ถ้าไม่มี Sensor จริง

สามารถใช้

ESP32 Sensor Simulator

ในช่วงพัฒนาได้


## 28.4 Architecture ขั้นต่ำ

```text
             ESP32-001
             Sensor Node
                  │
                  │ MQTT
                  ▼
             ┌─────────┐
             │         │
ESP32-002 ──►│   AP    │
             │         │
             └────┬────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│       RASPBERRY PI IoT GATEWAY       │
│                                      │
│ Mosquitto                            │
│      │                               │
│      ▼                               │
│ Python / Node-RED                    │
│      │                               │
│      ├── Validation                  │
│      ├── Rule Processing             │
│      ├── Device Status               │
│      └── Control                     │
│                                      │
│ SQLite                               │
│                                      │
│ Node-RED Dashboard                   │
│                                      │
│ Store-and-Forward                    │
│                                      │
│ systemd                              │
│                                      │
│ MQTT Security                        │
│                                      │
│ Cloudflare Tunnel                    │
│                                      │
└──────────────────────────────────────┘
          │
          │ MQTT Command
          ▼
       ESP32
          │
          ▼
      Actuator
```


## 28.5 MQTT Topic Design

ใช้โครงสร้างจาก LAB 16

pkru/iot/{device_id}/{channel}

ตัวอย่าง Device 001

pkru/iot/001/data

pkru/iot/001/status

pkru/iot/001/cmd

pkru/iot/001/state

Device 002

pkru/iot/002/data

pkru/iot/002/status

pkru/iot/002/cmd

pkru/iot/002/state

Gateway

pkru/gateway/status


## 28.6 Sensor Data

รูปแบบหลัก

```json
{
  "temp": 32.5,
  "humi": 70,
  "light": 1500
}
```

แต่ละ Device ส่งทุก

5 seconds

ตัวอย่าง

ESP32-001

```json
{
  "temp":31.2,
  "humi":72,
  "light":1800
}
```

ESP32-002

```json
{
  "temp":33.1,
  "humi":68,
  "light":2100
}
```


## 28.7 Data Path

```text
ESP32
   ↓
Sensor
   ↓
MQTT
   ↓
Mosquitto
   ↓
Validation
   ↓
Processing
   ↓
SQLite
   ↓
Dashboard
```

นักศึกษาต้องสามารถอธิบาย Data Path ของระบบได้


## 28.8 Control Path

Manual Control

```text
User
  ↓
Dashboard
  ↓
Node-RED
  ↓
MQTT Command
  ↓
ESP32
  ↓
Actuator
```

Automatic Control

```text
Sensor
  ↓
MQTT
  ↓
Validation
  ↓
Rule
  ↓
Control Decision
  ↓
MQTT Command
  ↓
ESP32
  ↓
Actuator
```


## 28.9 Manual / Automatic Mode

ระบบต้องมีอย่างน้อย

MANUAL

และ

AUTO

MANUAL

```text
User
  ↓
Dashboard
  ↓
ON / OFF
```

AUTO

```text
Sensor
  ↓
Rule
  ↓
ON / OFF
```

ต้องป้องกันไม่ให้

MANUAL

และ

AUTO

แย่งกันควบคุม Actuator


## 28.10 ตัวอย่าง Automatic Control

ใช้ Temperature Control

ตัวอย่าง

```text
temp > 35
    → FAN ON
```

```text
temp < 30
    → FAN OFF
```

```text
30 ≤ temp ≤ 35
    → KEEP PREVIOUS STATE
```

นี่คือ

Hysteresis

ช่วยลด

```text
ON
OFF
ON
OFF
```

บริเวณ Threshold


## 28.11 Commanded State

Gateway ส่ง

pkru/iot/001/cmd

ON

แต่

```text
Command Sent
    ≠
Actuator Changed
```

ดังนั้น ESP32 ต้อง Report

pkru/iot/001/state

เช่น

ON


## 28.12 Control Verification

Control Path ที่สมบูรณ์

```text
Gateway
   │
   │ cmd = ON
   ▼
ESP32
   │
   ▼
Actuator
   │
   │ state = ON
   ▼
Gateway
```

Gateway จึงสามารถเปรียบเทียบ

Commanded State

กับ

Actual State


## 28.13 Data Validation

ก่อนใช้ข้อมูล

ต้องตรวจ

Missing Field

Null

Wrong Type

NaN

Sentinel Value

Out-of-range

ตัวอย่าง

temp = -99

ต้องเป็น

INVALID


## 28.14 Data Quality

ระบบต้องมี

VALID

INVALID

STALE

ตัวอย่าง

Device 001

```text
ONLINE
VALID
```

Device 002

```text
ONLINE
INVALID
```

Device 003

```text
ONLINE
STALE
```


## 28.15 Device Availability

ระบบต้องตรวจ

ONLINE

OFFLINE

ใช้

Heartbeat

MQTT LWT

Timeout

ตัวอย่าง

Heartbeat every 5 sec

Timeout = 15 sec


## 28.16 Availability ≠ Quality

ต้องแยก

Device Availability

ออกจาก

Data Quality

เพราะ

```text
ONLINE
   ≠
VALID
```

ตัวอย่าง

ESP32 ยังเชื่อม MQTT อยู่

แต่ Sensor เสีย

ผลคือ

```text
ONLINE
INVALID
```


## 28.17 SQLite

ระบบต้องบันทึกข้อมูลลง SQLite

อย่างน้อย

device_id

timestamp

temp

humi

light

quality

ตัวอย่าง Table

sensor_data

```text
id
device_id
timestamp
temp
humi
light
quality
```


## 28.18 SQL Query

นักศึกษาต้องสามารถ Query

Latest Data

Historical Data

AVG

MIN

MAX

ตัวอย่าง

```sql
SELECT
    device_id,
    AVG(temp),
    MIN(temp),
    MAX(temp)
FROM sensor_data
WHERE timestamp >= datetime(
    'now',
    '-5 minutes'
)
GROUP BY device_id;
```


## 28.19 Dashboard

Dashboard ต้องแสดงอย่างน้อย

Gateway Status

Device Status

Data Quality

Temperature

Humidity

Light

Actuator State

Control Mode

Historical Chart


## 28.20 Multi-device Dashboard

Dashboard ต้องรองรับอย่างน้อย

Device 001

Device 002

สามารถ

Select Device

หรือ

Compare Devices

ตัวอย่าง Temperature Chart

```text
Temp
 ^
 |       001
 |    /-------
 |   /
 |  /    002
 | /   ------
 +----------------→ Time
```


## 28.21 Rule & Alert

ต้องมีอย่างน้อย

NORMAL

WARNING

ALERT

ตัวอย่าง

temp < 30

NORMAL

```text
30 ≤ temp ≤ 35
```

WARNING

temp > 35

ALERT


## 28.22 Alert ไม่เท่ากับ Control

ALERT

คือการตีความสถานะ

ON/OFF

คือ Control Command

ตัวอย่าง

temp = 38

ALERT

ถ้า AUTO

```text
Fan → ON
```

ถ้า MANUAL

ระบบอาจแสดง ALERT

แต่รอ User สั่ง


## 28.23 Python Gateway

อย่างน้อยหนึ่งส่วนของ Processing ต้องสามารถทำด้วย Python บน Raspberry Pi

ตัวอย่าง

MQTT Subscribe

JSON Parsing

Validation

Device Identification

Rule Processing

Control

Health Monitoring

Node-RED สามารถใช้สำหรับ

Dashboard

Visualization

Manual Control


## 28.24 Control Authority

ไม่ควรให้

Python

และ

Node-RED

สร้าง Automatic Control Command พร้อมกันโดยไม่มีการออกแบบ

ต้องกำหนดว่าใครเป็น

Control Authority

ตัวอย่าง

```text
Python
    → Automatic Control
```

```text
Node-RED
    → Dashboard
    → Manual Control
```


## 28.25 Gateway Protocol

ระดับพื้นฐานใช้

MQTT

กลุ่มที่ต้องการเพิ่มความสามารถสามารถใช้

BLE/BTHome

หรือ

UDP

Architecture

```text
BLE ─┐
UDP ─┼→ Raspberry Pi → MQTT
MQTT ┘
```

แต่ไม่บังคับให้ทุกกลุ่มต้องใช้ทุก Protocol


## 28.26 Store-and-Forward

เมื่อ Remote Destination ไม่พร้อม

ห้ามทิ้งข้อมูลทันที

ใช้

```text
Data
  ↓
SQLite Outbox
  ↓
PENDING
```

เมื่อ Remote กลับมา

```text
PENDING
  ↓
Forward
  ↓
Confirm
  ↓
SENT
```


## 28.27 Local-First Operation

Internet Down

ต้องไม่ทำให้ Local IoT System หยุดทั้งหมด

```text
Internet
   X
```

```text
ESP32
  ↓
Local MQTT
  ↓
Gateway
  ↓
Rule
  ↓
Actuator
```

ยังต้องทำงานได้


## 28.28 MQTT Security

Mosquitto ต้องใช้

Username

Password

ACL

ไม่ใช้

allow_anonymous true

ใน Final Project


## 28.29 ACL

Device ต้องเข้าถึงเฉพาะ Topic ที่จำเป็น

ตัวอย่าง

sensor001

Write

pkru/iot/001/data

pkru/iot/001/status

pkru/iot/001/state

Read

pkru/iot/001/cmd

sensor001 ต้องไม่สามารถ Publish

pkru/iot/002/data


## 28.30 Remote Access

ใช้แนวคิดจาก LAB 25

Cloudflare Tunnel

สามารถ Remote Access

Dashboard

Node-RED

SSH

โดยไม่ต้องเปิด Inbound Port ตรงจาก Router


## 28.31 systemd

Python Gateway ต้องทำงานเป็น Service

ตัวอย่าง

iot-gateway.service

ตรวจ

```bash
systemctl status iot-gateway
```

ต้อง

enabled

ตรวจ

```bash
systemctl is-enabled iot-gateway
```

ผล

enabled


## 28.32 Auto Recovery

ถ้า Python Crash

systemd ต้อง Restart

ใช้

```ini
Restart=on-failure

RestartSec=5
```


## 28.33 MQTT Reconnect

ถ้า Broker หาย

Gateway ต้อง

```text
Detect
  ↓
Reconnect
  ↓
Subscribe Again
  ↓
Continue
```

ไม่ควรต้อง Restart Raspberry Pi


## 28.34 Fault Tolerance

ระบบต้องรับมืออย่างน้อย

Invalid Sensor

Stale Data

Device Offline

Python Crash

MQTT Disconnect

Internet Failure

Remote Destination Failure

Pi Reboot


## 28.35 Failsafe

นักศึกษาต้องกำหนด

Failsafe Policy

ตัวอย่าง

Temperature Sensor STALE

แล้ว Fan ควร

ON

OFF

KEEP LAST STATE

หรือ

SAFE MODE

ต้องอธิบายเหตุผลตาม Physical System


## 28.36 Backup

ต้อง Backup อย่างน้อย

Mosquitto

Node-RED

Python

SQLite

systemd

Configuration

และมี

manifest

หรือรายการสิ่งที่ Backup


## 28.37 Recovery

ไม่จำเป็นต้องทำลายระบบจริง

แต่ต้องสามารถอธิบายและสาธิตบางส่วนของ

```text
Backup
  ↓
Restore
  ↓
Start
  ↓
Verify
```

อย่างน้อย Database หรือ Application Configuration หนึ่งส่วน


## 28.38 Gateway Health

แนะนำ Topic

pkru/gateway/status

ตัวอย่าง

```json
{
  "status":"HEALTHY",
  "mqtt":true,
  "database":true,
  "internet":true
}
```

เมื่อ Internet หาย

```json
{
  "status":"DEGRADED",
  "mqtt":true,
  "database":true,
  "internet":false
}
```


## 28.39 Gateway State

ใช้สถานะอย่างน้อย

HEALTHY

DEGRADED

FAILED

HEALTHY

Critical Components ทำงานปกติ

DEGRADED

บาง Function ใช้งานไม่ได้

แต่ Essential Local Operation ยังทำงาน

FAILED

Essential Operation ไม่สามารถทำงานได้


## 28.40 Fault Injection Test

นักศึกษาต้องจงใจสร้าง Failure เพื่อพิสูจน์ระบบ

อย่างน้อย 6 กรณี

Test 1

Invalid Sensor Data

Test 2

Stop Device

Test 3

Kill Python Process

Test 4

Stop Mosquitto

Test 5

Disconnect Internet

Test 6

Reboot Raspberry Pi


## 28.41 Test 1 --- Invalid Data

ส่ง

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":-99,"humi":70,"light":1500}'
```

Expected

INVALID

ข้อมูลต้องไม่เข้าสู่ Normal Automatic Control


## 28.42 Test 2 --- Device Offline

หยุด ESP32 หรือ Simulator

Expected

```text
ONLINE
  ↓
OFFLINE
```

Device อื่นต้องยังทำงาน


## 28.43 Test 3 --- Python Crash

หา PID

```bash
pid=$(systemctl show \
-p MainPID \
--value \
iot-gateway)
```

Kill

```bash
sudo kill -9 "$pid"
```

Expected

```text
systemd
  ↓
Restart
  ↓
MQTT Reconnect
  ↓
System Resume
```


## 28.44 Test 4 --- MQTT Failure

หยุด Broker

```bash
sudo systemctl stop mosquitto
```

Expected

Gateway detects disconnect

เปิดกลับ

```bash
sudo systemctl start mosquitto
```

Expected

```text
Reconnect
  ↓
Subscribe
  ↓
Resume
```


## 28.45 Test 5 --- Internet Failure

ตัด Internet Upstream โดยไม่ปิด Local Network

Expected

```text
Remote Access
    X
```

```text
Remote Upload
    X
```

แต่

```text
Local MQTT
    ✓
```

```text
Local Dashboard
    ✓
```

```text
SQLite
    ✓
```

```text
Automatic Control
    ✓
```

ข้อมูล Remote

```text
→ PENDING
```


## 28.46 Test 6 --- Reboot

```bash
sudo reboot
```

หลัง Boot

ตรวจ

```bash
systemctl is-active mosquitto
```

```bash
systemctl is-active iot-gateway
```

```bash
systemctl is-active nodered
```

Expected

ระบบกลับมาทำงานโดยไม่ต้อง Run Python ด้วยมือ


## 28.47 Test 7 --- Store-and-Forward

ถ้ามี Remote Destination

ทำให้ Destination หยุด

Expected

PENDING count เพิ่ม

เปิด Destination

Expected

```text
PENDING
  ↓
SENT
```


## 28.48 Test 8 --- Malformed JSON

ส่ง

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m 'HELLO'
```

Expected

Reject

Log Error

Gateway Continues


## 28.49 Test 9 --- ACL

ใช้ Account ของ Device 001

พยายาม Publish ไป

pkru/iot/002/data

Expected

DENIED


## 28.50 Test 10 --- Command Verification

สั่ง

ON

ตรวจ

pkru/iot/001/state

Expected

ON

ถ้า Commanded State กับ Actual State ไม่ตรง

ระบบต้องสามารถแสดงความผิดปกติได้


## 28.51 Fault Test Matrix

นักศึกษาต้องสร้างตาราง

```text
Fault
Detection
Recovery
Expected Result
Actual Result
```

ตัวอย่าง

```text
Invalid Data
Validation
Reject
Gateway continues
PASS
```

```text
Device Offline
Timeout/LWT
Mark OFFLINE
Other devices continue
PASS
```

```text
Python Crash
systemd
Restart
Gateway resumes
PASS
```

```text
MQTT Down
Disconnect callback
Reconnect
Resume
PASS
```

```text
Internet Down
Connectivity check
Store locally
Local operation continues
PASS
```

```text
Pi Reboot
systemd
Auto-start
Services return
PASS
```


## 28.52 Requirement Matrix

Project ต้องผ่านอย่างน้อย

```text
[ ] ESP32 ≥ 2
[ ] Sensor Data ≥ 3 ค่า
[ ] MQTT
[ ] Topic Hierarchy
[ ] Multi-device
[ ] Node-RED
[ ] Dashboard
[ ] Real-time Chart
[ ] SQLite
[ ] SQL Statistics
[ ] Rule/Alert
[ ] Manual Control
[ ] Automatic Control
[ ] MANUAL/AUTO Mode
[ ] Hysteresis
[ ] Actual State Feedback
[ ] ONLINE/OFFLINE
[ ] VALID/INVALID/STALE
[ ] Python Gateway
[ ] systemd
[ ] Store-and-Forward
[ ] MQTT Authentication
[ ] ACL
[ ] Remote Access
[ ] Backup
[ ] Fault Recovery
```


## 28.53 Project Example

ตัวอย่างโครงการ

Smart Environment Control

ESP32-001

```text
Temperature
Humidity
Light
```

ESP32-002

```text
Temperature
Humidity
Light
```

Actuator

Fan

Raspberry Pi

```text
MQTT
Node-RED
Python
SQLite
Dashboard
```

Automatic Rule

```text
temp > 35
    → Fan ON
```

```text
temp < 30
    → Fan OFF
```


## 28.54 ตัวอย่างอีก Project

Smart Greenhouse

Sensors

```text
Temperature
Humidity
Light
Soil Moisture
```

Actuator

```text
Fan
Pump
```

Rules

```text
High Temperature
    → Fan
```

```text
Low Soil Moisture
    → Pump
```

แต่ต้องเพิ่ม

Failsafe

เช่น

```text
Soil Sensor INVALID
    ↓
Do not blindly run pump
```


## 28.55 Project Proposal

ก่อนเริ่ม Project ให้นักศึกษาส่ง

Project Name

Problem

Objective

Sensor

Actuator

Device List

Architecture

MQTT Topics

Database Design

Control Rules

Failsafe Policy

Failure Scenarios


## 28.56 Architecture Diagram

Diagram ต้องแสดง

IoT Nodes

Network

Protocols

Raspberry Pi

MQTT

Processing

Database

Dashboard

Control

Remote Access

ไม่ควรวาดเพียง

```text
ESP32 → Raspberry Pi
```


## 28.57 Data Flow Diagram

ต้องแยก

Data Path

```text
Sensor
  ↓
ESP32
  ↓
MQTT
  ↓
Gateway
  ↓
Validation
  ↓
Database/Dashboard
```

และ

Control Path

```text
User/Rule
  ↓
Control Decision
  ↓
MQTT
  ↓
ESP32
  ↓
Actuator
  ↓
Feedback
```


## 28.58 Database Design

ตัวอย่าง

sensor_data

```text
id
device_id
timestamp
temp
humi
light
quality
```

device_status

```text
device_id
status
last_seen
```

control_log

```text
id
device_id
timestamp
mode
command
actual_state
```

ไม่บังคับว่าต้องใช้ Schema นี้ตรงทั้งหมด

แต่ต้องสามารถอธิบาย Design ได้


## 28.59 Control Log

แนะนำให้บันทึก

เมื่อใด

ใคร/อะไรเป็นผู้สั่ง

Device ใด

Command อะไร

Mode อะไร

ตัวอย่าง

```text
2026-10-02 10:30:00
001
AUTO
ON
```

ช่วยตรวจสอบพฤติกรรมระบบย้อนหลัง


## 28.60 Verification

Project ไม่ควรประเมินจาก

Dashboard สวย

เพียงอย่างเดียว

ต้องตรวจ

Data Correctness

Control Correctness

Failure Handling

Recovery

Security

Persistence


## 28.61 Demonstration Sequence

แนะนำให้นักศึกษาสาธิตตามลำดับ

1.

Boot Raspberry Pi

2.

แสดง Services

3.

เปิด Dashboard

4.

เปิด ESP32 Devices

5.

แสดง Multi-device Data

6.

แสดง SQLite

7.

แสดง Rule/Alert

8.

Manual Control

9.

Automatic Control

10.

State Feedback

11.

Invalid Data

12.

Device Offline

13.

Python Crash

14.

MQTT Failure

15.

Internet Failure

16.

Store-and-Forward

17.

Recovery

18.

Remote Access


## 28.62 Demonstration --- Boot

หลังเปิด Raspberry Pi

ห้าม Run

```bash
python gateway.py
```

ด้วยมือ

ต้องตรวจ

```bash
systemctl status iot-gateway
```

และ

```bash
systemctl status mosquitto
```

เพื่อพิสูจน์ Autonomous Startup


## 28.63 Demonstration --- Multi-device

Dashboard ต้องแสดงอย่างน้อย

001

002

และแสดงข้อมูลแต่ละ Device ได้ถูกต้อง


## 28.64 Demonstration --- Manual Control

เลือก

MANUAL

กด

ON

Expected

```text
MQTT cmd
  ↓
ESP32
  ↓
Actuator ON
  ↓
state = ON
```


## 28.65 Demonstration --- Automatic Control

เลือก

AUTO

ส่ง

temp = 38

Expected

```text
ALERT
  ↓
Rule
  ↓
ON
```

ส่ง

temp = 29

Expected

OFF


## 28.66 Demonstration --- Invalid

ส่ง

temp = -99

Expected

INVALID

Automatic Control ต้องไม่ใช้ -99 เป็นข้อมูลปกติ


## 28.67 Demonstration --- Stale

หยุด Sensor Data

รอ Timeout

Expected

STALE

Dashboard ต้องแสดงสถานะให้เห็น


## 28.68 Demonstration --- Offline

หยุด Device

Expected

OFFLINE

Device อื่นต้องยังทำงาน


## 28.69 Demonstration --- Process Crash

Kill Python

Expected

systemd restart

Gateway กลับมาทำงาน


## 28.70 Demonstration --- Internet Failure

ตัด Internet

Expected

Gateway

DEGRADED

แต่

Local System

ยังทำงาน


## 28.71 Demonstration --- Recovery

ต่อ Internet กลับ

Expected

```text
DEGRADED
   ↓
HEALTHY
```

และถ้ามี Pending Data

```text
PENDING
   ↓
SENT
```


## 28.72 สิ่งที่ต้องส่ง

1. Project Proposal

2. Architecture Diagram

3. Data Path

4. Control Path

5. Device List

6. MQTT Topic Design

7. Database Schema

8. Node-RED Flow

9. Dashboard

10. Python Source Code

11. ESP32 Code/YAML

12. systemd Service

13. MQTT Security Configuration

14. ACL Design

15. Store-and-Forward Design

16. Backup Plan

17. Failsafe Policy

18. Fault Test Matrix

19. Test Results

20. Demonstration


## 28.73 เอกสาร Project

รายงานควรมี

1. Introduction

2. Problem

3. Objectives

4. System Architecture

5. Hardware

6. Software

7. Network Architecture

8. MQTT Topic Design

9. Data Processing

10. Database

11. Dashboard

12. Control

13. Security

14. Fault Tolerance

15. Testing

16. Results

17. Limitations

18. Conclusion


## 28.74 Rubric --- 100 คะแนน

1. Architecture & Design
10 คะแนน

2. MQTT & Multi-device
10 คะแนน

3. Data Processing & Validation
10 คะแนน

4. Database & Dashboard
10 คะแนน

5. Manual/Automatic Control
15 คะแนน

6. Device Status & Data Quality
10 คะแนน

7. Security
10 คะแนน

8. Fault Tolerance & Recovery
15 คะแนน

9. Documentation
5 คะแนน

10. Demonstration
5 คะแนน

รวม

100 คะแนน


## 28.75 Architecture & Design --- 10

พิจารณา

Architecture ชัดเจน

Data Path ถูกต้อง

Control Path ถูกต้อง

Component Responsibility ชัดเจน

Topic Design เหมาะสม


## 28.76 MQTT & Multi-device --- 10

ต้อง

```text
รองรับ ≥ 2 Devices
```

Topic Hierarchy ถูกต้อง

Device Identification ถูกต้อง

Publish/Subscribe ถูกต้อง


## 28.77 Data Processing --- 10

ต้องมี

JSON Parsing

Validation

VALID

INVALID

STALE

ข้อมูลผิดต้องไม่ทำให้ Gateway Crash


## 28.78 Database & Dashboard --- 10

ต้องมี

SQLite

Historical Data

Statistics

Real-time Dashboard

Chart

Multi-device Display


## 28.79 Control --- 15

ต้องมี

Manual

Automatic

Mode Selection

Hysteresis

Command

Actual State Feedback


## 28.80 Device Status & Quality --- 10

ต้องแสดง

ONLINE

OFFLINE

VALID

INVALID

STALE

และแยก Availability กับ Quality ถูกต้อง


## 28.81 Security --- 10

ต้องมี

MQTT Authentication

ACL

No Anonymous Access

Credential Protection

รวมถึง Remote Access ที่ไม่เปิด Service ภายในออกสู่ Internet โดยไม่จำเป็น


## 28.82 Fault Tolerance --- 15

ต้องทดสอบ

Device Failure

Invalid Data

Process Crash

MQTT Failure

Internet Failure

Reboot

และแสดง

Detection

Recovery

Continued Operation


## 28.83 Documentation --- 5

เอกสารต้องสามารถใช้

Rebuild

และ

Understand

ระบบได้

ไม่ใช่เพียง Screenshot


## 28.84 Demonstration --- 5

นักศึกษาต้องสามารถ

อธิบาย Architecture

สาธิต Data Flow

สาธิต Control

สร้าง Failure

อธิบาย Recovery


## 28.85 เงื่อนไขสำคัญ

แม้คะแนนรวมสูง

แต่ Project ไม่ควรถือว่าสมบูรณ์ถ้า

Automatic Control ใช้ Invalid Data

หรือ

ไม่มีวิธีตรวจ Device Offline

หรือ

ไม่มี Security

หรือ

ระบบไม่สามารถกลับมาหลัง Reboot

เพราะเป็น Requirement หลักของ Architecture ที่เรียนมา


## 28.86 สิ่งที่ไม่ควรทำ

ไม่ควรเน้นเพียง

Dashboard สวย

Cloud สวย

Mobile App สวย

แต่ไม่มี

Validation

Device Status

Control Verification

Security

Recovery

Project นี้วัด

System Engineering

มากกว่า UI Design


## 28.87 ระดับพื้นฐาน

Minimum Project

ESP32 × 2

Raspberry Pi × 1

MQTT

Node-RED

SQLite

Dashboard

Manual Control

Automatic Control

ONLINE/OFFLINE

VALID/INVALID/STALE

systemd

Security

Fault Test


## 28.88 ระดับเพิ่มเติม

กลุ่มที่ต้องการพัฒนาเพิ่มสามารถเพิ่ม

BLE/BTHome

UDP Gateway

Multiple Sensor Types

Store-and-Forward Remote Server

Control Feedback

Advanced Health Monitoring

Multiple Actuators

แต่ Feature เพิ่ม

ต้องไม่ทำให้ Core Requirement ขาด


## 28.89 หลักสำคัญ

จำนวน Technology

ไม่ใช่เป้าหมาย

ระบบที่มี

ESP32 2 ตัว

แต่

Data Validation ดี

Control ถูกต้อง

Security ถูกต้อง

Recovery ได้

มีคุณค่ามากกว่า

ระบบที่มี Device จำนวนมาก

แต่ไม่มี Reliability


## 28.90 Final Architecture

```text
                  REMOTE USER
                       │
                       ▼
                Cloudflare Tunnel
                       │
                       ▼
┌───────────────────────────────────────────────┐
│          RASPBERRY PI IoT GATEWAY             │
│                                               │
│  Mosquitto                                    │
│     ├── Authentication                        │
│     └── ACL                                   │
│                                               │
│  Python Gateway                               │
│     ├── Validation                            │
│     ├── Device Status                         │
│     ├── Data Quality                          │
│     ├── Rule Processing                       │
│     ├── Control                               │
│     ├── Reconnect                             │
│     └── Health Monitoring                     │
│                                               │
│  Node-RED                                     │
│     ├── Dashboard                             │
│     ├── Manual Control                        │
│     └── Alert                                 │
│                                               │
│  SQLite                                       │
│     ├── Sensor History                        │
│     └── Store-and-Forward                     │
│                                               │
│  systemd                                      │
│     └── Auto Start / Restart                  │
│                                               │
│  Backup & Recovery                            │
│                                               │
└──────────────────────┬────────────────────────┘
                       │
                      MQTT
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
         ESP32-001           ESP32-002
             │                   │
           Sensor              Sensor
             │                   │
             ▼                   ▼
         Actuator            Actuator
             │                   │
             └──── State ────────┘
```


## 28.91 ภาพรวม LAB ทั้งชุด

```text
LAB 01
Raspberry Pi Basics
```

```text
      ↓
```

```text
LAB 02
Mosquitto MQTT Broker
```

```text
      ↓
```

```text
LAB 03
MQTT Sensor Simulation
```

```text
      ↓
```

```text
LAB 04
Node-RED MQTT
```

```text
      ↓
```

```text
LAB 05
Data Processing
```

```text
      ↓
```

```text
LAB 06
Dashboard
```

```text
      ↓
```

```text
LAB 07
Real-time Chart
```

```text
      ↓
```

```text
LAB 08
SQLite
```

```text
      ↓
```

```text
LAB 09
Timestamp
```

```text
      ↓
```

```text
LAB 10
SQL Query
```

```text
      ↓
```

```text
LAB 11
Statistics
```

```text
      ↓
```

```text
LAB 12
Data Flow Architecture
```

```text
      ↓
```

```text
LAB 13
Rule & Alert
```

```text
      ↓
```

```text
LAB 14
Manual Control
```

```text
      ↓
```

```text
LAB 15
Automatic Control
```

```text
      ↓
```

```text
LAB 16
MQTT Topic Design
```

```text
      ↓
```

```text
LAB 17
Multi-device
```

```text
      ↓
```

```text
LAB 18
ONLINE / OFFLINE
```

```text
      ↓
```

```text
LAB 19
VALID / INVALID / STALE
```

```text
      ↓
```

```text
LAB 20
Python MQTT Application
```

```text
      ↓
```

```text
LAB 21
systemd Service
```

```text
      ↓
```

```text
LAB 22
IoT Gateway
```

```text
      ↓
```

```text
LAB 23
Store-and-Forward
```

```text
      ↓
```

```text
LAB 24
MQTT Security
```

```text
      ↓
```

```text
LAB 25
Remote Access
```

```text
      ↓
```

```text
LAB 26
Backup & Recovery
```

```text
      ↓
```

```text
LAB 27
Fault-Tolerant IoT
```

```text
      ↓
```

```text
LAB 28
Integrated IoT Mini Project
```


## 28.92 Learning Progression

```text
Acquire
   ↓
Communicate
   ↓
Process
   ↓
Visualize
   ↓
Store
   ↓
Analyze
   ↓
Decide
   ↓
Control
   ↓
Scale
   ↓
Validate
   ↓
Detect
   ↓
Gateway
   ↓
Operate Offline
   ↓
Secure
   ↓
Access Remotely
   ↓
Recover
   ↓
Tolerate Failure
   ↓
Integrate
```


## 28.93 ผลลัพธ์สุดท้ายของชุด LAB

หลัง LAB 28 นักศึกษาไม่ได้เพียงเรียน

"วิธีต่อ Sensor กับ Raspberry Pi"

แต่ได้สร้างระบบที่ประกอบด้วย

```text
IoT Node
+
Network
+
MQTT
+
Gateway
+
Processing
+
Database
+
Dashboard
+
Control
+
Security
+
Remote Access
+
Reliability
```

และเข้าใจว่า IoT System ที่สมบูรณ์ไม่ใช่เพียง

```text
Sensor → Internet
```

แต่เป็น

```text
Sense
  ↓
Communicate
  ↓
Validate
  ↓
Store
  ↓
Analyze
  ↓
Decide
  ↓
Control
  ↓
Verify
  ↓
Detect Failure
  ↓
Recover
```


## 28.94 จุดจบของ Core Lab

LAB 28 ควรถือเป็น

FINAL LAB

ของชุด

Raspberry Pi IoT Lab

ดังนั้น Core Series คือ

LAB 01–28

หลังจากนี้ถ้าจะเรียนต่อ

ควรแยกเป็นชุดใหม่ เช่น

ADVANCED IoT LAB

ไม่ควรเพิ่ม LAB 29, 30, 31 ต่อไปเรื่อย ๆ ใน Core Series

Advanced Topics สามารถประกอบด้วย

MQTT TLS / Certificates

Docker

InfluxDB

Grafana

Prometheus

OTA

Advanced BLE Gateway

Gateway Redundancy

Multiple Brokers

High Availability

Advanced Observability

Distributed Edge Computing

แต่ทั้งหมดควรเป็น

Advanced Series

แยกจาก LAB 01–28


## 28.95 บทสรุป

LAB 28 คือการพิสูจน์ว่า

องค์ความรู้ทั้งหมดจาก LAB 01–27

สามารถประกอบเป็น

End-to-End IoT System

ที่สามารถ

```text
Monitor
   ↓
Analyze
   ↓
Decide
   ↓
Control
   ↓
Verify
   ↓
Detect Failure
   ↓
Recover
   ↓
Continue Operation
```

ดังนั้นชุด LAB หลักจบที่

LAB 28 --- Integrated IoT Mini Project

และถือว่า

```text
Raspberry Pi IoT Lab
LAB 01–28
```

ครบชุดแล้ว
