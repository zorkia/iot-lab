> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[26 - LAB 26 - Backup and Recovery for Raspberry Pi IoT Gateway]]
> ถัดไป: [[28 - LAB 28 - Integrated IoT Mini Project]]

# LAB 27 --- Fault-Tolerant IoT Gateway

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:24:55 +07

การออกแบบระบบ IoT ให้ตรวจพบความผิดปกติ ฟื้นตัว และทำงานต่อได้


## 27.1 แนวคิดของ LAB

LAB ก่อนหน้าได้สร้างความสามารถหลายส่วนแล้ว

```text
LAB 18
Device Status
ONLINE / OFFLINE
```

```text
LAB 19
Data Quality
VALID / INVALID / STALE
```

```text
LAB 20
Python MQTT Application
```

```text
LAB 21
systemd Service
Auto Start / Restart
```

```text
LAB 22
IoT Gateway
BLE / UDP / MQTT
```

```text
LAB 23
Store-and-Forward
Offline Buffer
```

```text
LAB 24
MQTT Security
Authentication / ACL
```

```text
LAB 25
Remote Access
Cloudflare Tunnel
```

```text
LAB 26
Backup & Recovery
```

LAB 27 จะนำแนวคิดเหล่านี้มารวมกันเพื่อสร้าง

Fault-Tolerant IoT Gateway

เป้าหมายไม่ใช่ทำให้ระบบ

"ไม่มีวันเสีย"

แต่ทำให้ระบบสามารถ

```text
Detect
   ↓
Isolate
   ↓
Recover
   ↓
Continue Operation
```

เมื่อบาง Component เกิด Failure


## 27.2 Fault Tolerance คืออะไร

ระบบทั่วไป:

```text
Failure
   ↓
System Stops
   ↓
Administrator
   ↓
Manual Repair
```

ระบบ Fault-Tolerant:

```text
Failure
   ↓
Detect
   ↓
Recover / Degrade Gracefully
   ↓
Continue Essential Operation
```

ตัวอย่าง:

```text
Wi-Fi หลุด
    → reconnect
```

```text
MQTT Broker หาย
    → reconnect / retry
```

```text
Internet หาย
    → store locally
```

```text
Remote Server หาย
    → queue data
```

```text
Python Process Crash
    → systemd restart
```

```text
Sensor ไม่ส่งข้อมูล
    → STALE
```

```text
Sensor ส่งข้อมูลผิด
    → INVALID
```

```text
Device หาย
    → OFFLINE
```

```text
ระบบ Reboot
    → services auto-start
```


## 27.3 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบาย Fault, Error และ Failure เบื้องต้น
- ระบุ Failure Point ในระบบ IoT
- ตรวจจับ MQTT Disconnect
- ทำ MQTT Reconnect
- ใช้ Retry และ Backoff
- ตรวจ Device ONLINE/OFFLINE
- ตรวจ VALID/INVALID/STALE
- ป้องกัน Invalid Data จากการเข้าสู่ Control Logic
- ใช้ Store-and-Forward เมื่อปลายทางใช้งานไม่ได้
- ใช้ systemd Restart Policy
- ใช้ Watchdog/Health Check เบื้องต้น
- ออกแบบ Failsafe State
- ทดสอบ Failure Scenario
- ตรวจสอบ Recovery
- แยก Local Operation ออกจาก Internet Dependency
- เข้าใจ Single Point of Failure
- ประเมิน Recovery Time
- สร้าง Fault-Tolerance Test Matrix


## 27.4 Fault, Error และ Failure

Fault

คือสาเหตุของปัญหา

ตัวอย่าง:

สาย Sensor หลุด

Error

คือ State ภายในระบบที่ผิด

ตัวอย่าง:

temp = -99

Failure

คือระบบไม่สามารถให้ Service ตามที่ต้องการ

ตัวอย่าง:

ระบบใช้ temp = -99
ไปสั่ง Actuator ผิด

ตัวอย่าง:

```text
Sensor disconnected
       ↓
     Fault
       ↓
temp = -99
       ↓
     Error
       ↓
Fan incorrectly controlled
       ↓
    Failure
```

ดังนั้น Data Validation จาก LAB 19 ช่วยหยุด Error ก่อนพัฒนาไปเป็น Failure


## 27.5 Failure Model ของระบบ

ระบบ IoT สามารถ Failure ได้หลาย Layer

```text
Sensor Layer
    ├── Sensor disconnected
    ├── Invalid value
    └── No update
```

```text
Device Layer
    ├── ESP32 crash
    ├── Power loss
    └── Wi-Fi disconnect
```

```text
Network Layer
    ├── AP failure
    ├── Packet loss
    ├── Wi-Fi failure
    └── Internet failure
```

```text
Messaging Layer
    ├── MQTT broker unavailable
    ├── Authentication failure
    └── Connection loss
```

```text
Gateway Layer
    ├── Python crash
    ├── Process hang
    ├── Node-RED failure
    └── Storage full
```

```text
Remote Layer
    ├── Internet unavailable
    ├── Cloud service unavailable
    └── Cloudflare Tunnel unavailable
```

```text
Storage Layer
    ├── SQLite failure
    ├── Disk full
    └── SD Card failure
```


## 27.6 Fault-Tolerant Architecture

```text
                     INTERNET
                        │
                        ▼
                 Remote Services
                        ▲
                        │
                 Store-and-Forward
                        │
┌─────────────────────────────────────────────┐
│          RASPBERRY PI IoT GATEWAY           │
│                                             │
│  Mosquitto                                  │
│      │                                      │
│      ▼                                      │
│  Python Gateway                             │
│      │                                      │
│      ├── Validation                         │
│      ├── Device Status                      │
│      ├── Retry                              │
│      ├── Reconnect                          │
│      ├── Rule Processing                    │
│      ├── Failsafe                           │
│      └── Health Monitoring                  │
│                                             │
│  SQLite                                     │
│      └── Offline Queue                      │
│                                             │
│  systemd                                    │
│      ├── Auto Start                         │
│      └── Auto Restart                       │
│                                             │
└───────────────────┬─────────────────────────┘
                    │
                  MQTT
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       ESP32-001 ESP32-002 ESP32-003
          │         │         │
        Sensor    Sensor    Sensor
```


## 27.7 หลักสำคัญของ LAB 27

Fault Tolerance ไม่ใช่ Feature ตัวเดียว

แต่เกิดจากหลาย Mechanism ทำงานร่วมกัน

```text
Detection
    +
Validation
    +
Timeout
    +
Retry
    +
Reconnect
    +
Local Buffer
    +
Failsafe
    +
Process Restart
    +
Recovery Verification
```


## 27.8 Failure Scenario 1 --- Invalid Sensor Data

ส่งข้อมูลปกติ:

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":32,"humi":70,"light":1500}'
```

ผล:

VALID

ส่งข้อมูลผิด:

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":-99,"humi":70,"light":1500}'
```

ผล:

INVALID

สิ่งสำคัญ:

```text
INVALID
   ↓
Reject
   ↓
DO NOT CONTROL ACTUATOR
```

ไม่ควรเป็น

```text
INVALID
   ↓
Rule
   ↓
Actuator
```


## 27.9 Safe Processing Pipeline

```text
Sensor
   ↓
MQTT
   ↓
JSON Parsing
   ↓
Validation
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
   │    Reject
   │      ↓
   │    Alert
   │
   └── STALE
          ↓
       Failsafe
```

หลักการ:

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


## 27.10 Failure Scenario 2 --- Stale Data

สมมติ Sensor ส่งทุก

5 seconds

กำหนด

stale_timeout = 15 seconds

ถ้าไม่มีข้อมูลใหม่เกิน

15 seconds

เปลี่ยนสถานะ

```text
VALID
   ↓
STALE
```

ตัวอย่าง:

08:00:00 data received

08:00:05 data received

08:00:10 data received

หลังจากนั้น Sensor หยุด

```text
08:00:25+
```

Data Quality:

STALE

ค่าล่าสุดอาจยังเป็น

temp = 32

แต่ไม่ควรถือว่าเป็น

Current Trusted Value


## 27.11 Last Value ≠ Current Value

Dashboard อาจยังแสดง

32 °C

แต่ Sensor ไม่ส่งข้อมูลมา 5 นาทีแล้ว

ดังนั้น

```text
Value Exists
    ≠
Data Is Current
```

และ

```text
Last Value
    ≠
Trusted Current Value
```

ระบบต้องเก็บ

```text
value
timestamp
quality
```

ร่วมกัน


## 27.12 Failure Scenario 3 --- Device Offline

จาก LAB 18 ใช้

```text
Heartbeat
+
LWT
+
Timeout
```

ตัวอย่าง Device ส่ง

pkru/iot/001/status

payload:

ONLINE

ทุก 5 วินาที

ถ้าไม่มี Heartbeat เกิน

15 วินาที

ระบบกำหนด

OFFLINE


## 27.13 Availability กับ Data Quality ต้องแยกกัน

Device Status:

```text
ONLINE
OFFLINE
```

Data Quality:

```text
VALID
INVALID
STALE
```

ตัวอย่างสถานะที่เป็นไปได้:

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

Device 004

```text
OFFLINE
STALE
```

ดังนั้น

```text
ONLINE
   ≠
VALID
```


## 27.14 Failure Scenario 4 --- Python Process Crash

ตรวจ Service:

```bash
systemctl status iot-gateway
```

หา PID:

```bash
systemctl show \
-p MainPID \
--value \
iot-gateway
```

สมมติได้:

1234

จำลอง Crash:

```bash
sudo kill -9 1234
```

ตรวจ:

```bash
systemctl status iot-gateway
```

ถ้า LAB 21 ตั้ง

```ini
Restart=on-failure
```

systemd ควร Start Process ใหม่


## 27.15 ตรวจ Log หลัง Process Crash

ใช้:

```bash
journalctl \
-u iot-gateway \
-n 50 \
--no-pager
```

หรือดูแบบ Real-time:

```bash
journalctl \
-u iot-gateway \
-f
```

ควรเห็นลักษณะ:

```text
Process terminated
    ↓
Restart scheduled
    ↓
Service started
```


## 27.16 systemd Restart Policy

ตัวอย่าง:

```ini
[Service]
Type=simple
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python \
-u \
/home/PI_USER/iot-gateway/gateway.py
Restart=on-failure
RestartSec=5
```

ความหมาย:

```text
Process Crash
    ↓
Wait 5 seconds
    ↓
Restart
```


## 27.17 on-failure vs always

```ini
Restart=on-failure
```

เหมาะกับกรณี Process

```text
Crash
Non-zero exit
Signal termination
```

```ini
Restart=always
```

จะพยายาม Restart หลัง Process Exit โดยทั่วไปด้วย

สำหรับ LAB นี้ใช้

```ini
Restart=on-failure
```

เป็น Baseline


## 27.18 Manual Stop ไม่ใช่ Failure

ถ้าใช้:

```bash
sudo systemctl stop iot-gateway
```

systemd จะถือว่า Administrator ตั้งใจ Stop

จึงไม่ควรใช้

```bash
systemctl stop
```

เพื่อจำลอง Process Crash

ให้ใช้:

```bash
sudo kill -9 PID
```

สำหรับ Failure Test


## 27.19 Failure Scenario 5 --- MQTT Broker Down

ตรวจ:

```bash
systemctl status mosquitto
```

หยุด Broker:

```bash
sudo systemctl stop mosquitto
```

ผล:

```text
Python Gateway
       ↓
MQTT Connection Lost
```

Application ต้องไม่ Crash อย่างควบคุมไม่ได้

ควร

```text
Detect Disconnect
      ↓
Wait
      ↓
Reconnect
```


## 27.20 MQTT Disconnect Callback

แนวคิด Python:

```python
def on_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties
):
    print(
        f"MQTT disconnected: {reason_code}"
    )
```

กำหนด:

```python
client.on_disconnect = on_disconnect
```

ใช้เพื่อ

Detect

ว่า MQTT Connection หาย


## 27.21 MQTT Reconnect Delay

Paho MQTT สามารถกำหนด Reconnect Delay ได้

ตัวอย่าง:

```python
client.reconnect_delay_set(
    min_delay=1,
    max_delay=30
)
```

แนวคิด:

```text
Failure #1
    ↓
wait 1 sec
```

```text
Failure #2
    ↓
wait longer
```

...

สูงสุดประมาณ

30 sec

ช่วยลดการ Reconnect ถี่เกินไป


## 27.22 ทำไมไม่ Retry ทุก 0.1 วินาที

ถ้ามี Device 1,000 ตัว

และ Broker หาย

ทุก Device Retry อย่างรวดเร็ว

จะเกิด

Retry Storm

ดังนั้นควรใช้

Backoff

เช่น

```text
1 sec
2 sec
4 sec
8 sec
16 sec
30 sec
```

แทน

```text
0.1
0.1
0.1
0.1
...
```


## 27.23 Exponential Backoff

แนวคิด:

```python
delay = min(
    base_delay * 2^attempt,
    max_delay
)
```

ตัวอย่าง:

```text
Attempt 0 → 1 sec
```

```text
Attempt 1 → 2 sec
```

```text
Attempt 2 → 4 sec
```

```text
Attempt 3 → 8 sec
```

```text
Attempt 4 → 16 sec
```

```text
Attempt 5 → 30 sec
```

```text
Attempt 6 → 30 sec
```

ระบบจริงอาจเพิ่ม

Random Jitter

เพื่อลดการ Retry พร้อมกันจำนวนมาก


## 27.24 Failure Scenario 6 --- Broker Recovery

หลังหยุด Mosquitto:

```bash
sudo systemctl stop mosquitto
```

รอประมาณ 10 วินาที

เปิดกลับ:

```bash
sudo systemctl start mosquitto
```

ตรวจ:

```bash
journalctl \
-u iot-gateway \
-f
```

Gateway ควร

```text
Detect
   ↓
Reconnect
   ↓
Subscribe Again
   ↓
Continue Processing
```


## 27.25 Subscribe หลัง Reconnect

ควร Subscribe ใน

on_connect()

ตัวอย่าง:

```python
def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    print(
        f"MQTT connected: {reason_code}"
    )
```

```python
    client.subscribe(
        "pkru/iot/+/data"
    )
```

```python
    client.subscribe(
        "pkru/iot/+/status"
    )
```

ข้อดีคือทุกครั้งที่ Reconnect

Subscription จะถูกสร้างใหม่


## 27.26 Failure Scenario 7 --- Internet Down

Architecture:

```text
ESP32
   ↓
Local MQTT
   ↓
Raspberry Pi
   ↓
Internet
   X
Remote Service
```

Internet หาย

ไม่ควรทำให้

```text
Local MQTT
Local Control
Local SQLite
```

หยุด


## 27.27 Local-First Architecture

Internet DOWN

     X

```text
┌────────────────────────────┐
│        LOCAL SYSTEM        │
│                            │
│ ESP32                      │
│   ↓                        │
│ MQTT                       │
│   ↓                        │
│ Gateway                    │
│   ├── Validation           │
│   ├── Rule                 │
│   ├── Control              │
│   └── SQLite               │
│                            │
└────────────────────────────┘
```

ระบบยังทำงาน

หลักสำคัญ:

```text
Internet Dependency
       ≠
Local Operation Dependency
```


## 27.28 Store-and-Forward

จาก LAB 23

ถ้า Remote Destination ใช้งานไม่ได้:

```text
Data
   ↓
SQLite Queue
   ↓
PENDING
```

เมื่อ Remote Destination กลับมา:

```text
PENDING
   ↓
Retry
   ↓
SENT
```

ดังนั้น Internet Failure ไม่ทำให้ข้อมูลสูญหายทันที


## 27.29 Failure Scenario 8 --- Remote Service Down

สมมติ

Internet ยังทำงาน

แต่

Remote Server

ไม่ทำงาน

ไม่ควร

Drop Data

ควร:

```text
Send
   ↓
Failed
   ↓
Store Locally
   ↓
PENDING
   ↓
Retry Later
```


## 27.30 Retry ต้องมีขีดจำกัด

การ Retry ตลอดไปแบบถี่ ๆ อาจทำให้

```text
CPU Load
Network Load
Log Growth
```

เพิ่มขึ้น

จึงควรมี

```text
Retry Interval
Backoff
Maximum Delay
Logging
```

และในบาง Application อาจต้องมี

Maximum Retry Count

ขึ้นอยู่กับ Requirement


## 27.31 Failure Scenario 9 --- Raspberry Pi Reboot

ใช้:

```bash
sudo reboot
```

หลัง Boot

ตรวจ:

```bash
systemctl status mosquitto
```

```bash
systemctl status nodered
```

```bash
systemctl status iot-gateway
```

```bash
systemctl status cloudflared
```

ทุก Service ที่จำเป็นควรกลับมาทำงานโดยไม่ต้อง Run ด้วยมือ


## 27.32 Boot Recovery

Architecture:

```text
Power ON
   ↓
Linux Boot
   ↓
systemd
   ↓
Mosquitto
   ↓
Python Gateway
   ↓
Node-RED
   ↓
cloudflared
   ↓
System Operational
```

นี่คือ

Automatic Recovery after Reboot


## 27.33 Recovery Dependency

Service บางตัวขึ้นกับ Service อื่น

เช่น:

```text
Python Gateway
      ↓
Mosquitto
```

แต่

After=mosquitto.service

หมายถึง Startup Ordering

ไม่ได้หมายความว่า MQTT Broker จะพร้อมรับ Connection ทุกสถานการณ์

ดังนั้น Application ยังต้องมี

Reconnect Logic


## 27.34 systemd ไม่แทน Application Recovery

systemd ช่วย:

```text
Process Crash
    ↓
Restart Process
```

แต่ถ้า

Process ยัง Running

แต่ MQTT Connection หาย

systemd อาจไม่เห็นว่าเป็น Failure

ดังนั้นต้องมีทั้ง

```text
systemd Recovery
       +
Application Recovery
```


## 27.35 Process Alive ≠ Service Healthy

ตัวอย่าง:

Python Process

Running

แต่

MQTT disconnected

ดังนั้น:

```text
Process Alive
    ≠
Application Healthy
```

นี่นำไปสู่แนวคิด

Health Check


## 27.36 Health State

สามารถกำหนด Health ของ Gateway จากหลาย Component

ตัวอย่าง:

```text
MQTT_CONNECTED
DATABASE_OK
LAST_SENSOR_DATA
REMOTE_AVAILABLE
```

แล้วสร้างสถานะ:

```text
HEALTHY
DEGRADED
FAILED
```

ตัวอย่าง:

```text
MQTT = OK
SQLite = OK
Internet = DOWN
```

ผล:

DEGRADED

เพราะ Local Operation ยังทำงาน


## 27.37 HEALTHY / DEGRADED / FAILED

HEALTHY

ทุก Critical Component ทำงาน

DEGRADED

บาง Component มีปัญหา

แต่ Essential Service ยังทำงาน

FAILED

Essential Service ไม่สามารถทำงานได้

ตัวอย่าง:

```text
Internet Down
Local MQTT OK
Local Control OK
```

```text
→ DEGRADED
```

```text
Mosquitto Down
Control requires MQTT
```

```text
→ FAILED หรือ DEGRADED
```

ขึ้นกับ Requirement ของระบบ


## 27.38 Failsafe

เมื่อข้อมูลที่ใช้ Control ไม่เชื่อถือได้

ระบบต้องตัดสินใจว่า Actuator ควรทำอะไร

ตัวอย่าง:

Temperature Sensor STALE

ทางเลือก:

1. Keep Last State

2. Turn OFF

3. Turn ON

4. Switch to Safe Mode

ไม่มีคำตอบเดียวสำหรับทุกระบบ

Failsafe ต้องกำหนดจาก

```text
Physical System
Risk
Application Requirement
```


## 27.39 ตัวอย่าง Failsafe Fan

สมมติ Fan ใช้ระบายความร้อนอุปกรณ์

ถ้า Temperature Sensor หาย

การ

Turn Fan OFF

อาจไม่ปลอดภัย

อาจเลือก

```text
Sensor STALE
      ↓
Fan ON
```

แต่ถ้า Actuator เป็น

Water Pump

การเปิด Pump ต่อเนื่องอาจสร้างความเสียหาย

ดังนั้น:

```text
Failsafe State
      ≠
Always OFF
```

ต้องออกแบบตาม Physical Process


## 27.40 Commanded State ≠ Actual State

Python ส่ง:

ON

ไม่ได้พิสูจน์ว่า Fan เปิดจริง

ดังนั้น:

```text
Command
   ↓
Actuator
   ↓
Feedback
   ↓
Verify
```

ระบบที่แข็งแรงกว่าควรมี

```text
Commanded State
      +
Actual State
```

ตัวอย่าง:

pkru/iot/001/cmd

ON

และ Device Report:

pkru/iot/001/state

ON


## 27.41 Command Verification

Architecture:

```text
Gateway
   │
   │ ON
   ▼
ESP32
   │
   │ actual state
   ▼
Gateway
```

ถ้า:

Commanded = ON

Actual = OFF

ระบบสามารถ Detect

Control Failure

ได้


## 27.42 Watchdog Concept

Watchdog ใช้ตรวจว่า Software ยังทำงานตามที่คาดหรือไม่

แนวคิด:

```text
Application
    ↓
Heartbeat
    ↓
Watchdog
```

ถ้าไม่มี Heartbeat ภายใน Timeout:

Recovery Action

เช่น:

Restart Process


## 27.43 systemd Watchdog

systemd รองรับ Watchdog สำหรับ Service ที่ Application รองรับ notification protocol ของ systemd

Concept:

```text
Python Application
      ↓
Watchdog Notification
      ↓
systemd
```

ถ้า Notification หาย:

```text
systemd
   ↓
ถือว่า Service มีปัญหา
   ↓
Restart
```

แต่ต้องเขียน Application ให้รองรับอย่างถูกต้อง

สำหรับ LAB 27 Core

ใช้

```ini
Health Monitoring
+
Restart=on-failure
```

ก่อน

systemd Watchdog จริงให้เป็น Advanced Exercise


## 27.44 Application Heartbeat

วิธีง่ายสำหรับ LAB:

Python Gateway Publish

pkru/gateway/status

เช่นทุก 10 วินาที:

```json
{
  "status":"ONLINE"
}
```

หรือเพิ่ม:

```json
{
  "status":"ONLINE",
  "mqtt":true,
  "database":true
}
```

ทำให้ Node-RED ตรวจ Gateway Health ได้


## 27.45 Gateway Status Topic

แนะนำ:

pkru/gateway/status

ไม่ใช้

pkru/iot/001/status

เพราะ

001

หมายถึง IoT Device

Gateway เป็น Component คนละประเภท


## 27.46 Health Payload

ตัวอย่าง:

```json
{
  "status":"HEALTHY",
  "mqtt":true,
  "database":true,
  "internet":true
}
```

Internet Down:

```json
{
  "status":"DEGRADED",
  "mqtt":true,
  "database":true,
  "internet":false
}
```


## 27.47 อย่าใช้ Internet เป็น Health หลักของ Local Gateway

ถ้า Internet หาย

แต่

```text
MQTT Local
SQLite
Automatic Control
```

ยังทำงาน

Gateway ไม่ควรถูกตีความว่า

FAILED

อาจเป็น

DEGRADED

นี่คือแนวคิด

Graceful Degradation


## 27.48 Graceful Degradation

ระบบไม่จำเป็นต้องมี Function ครบ 100% ตลอดเวลา

แต่ควรรักษา

Essential Functions

ตัวอย่าง:

Internet Failure

Unavailable:

```text
Remote Dashboard
Cloud Upload
Cloudflare SSH
```

Still Available:

```text
Local MQTT
Local Dashboard
Local Database
Automatic Control
```

ผล:

DEGRADED
แต่ยัง Operational


## 27.49 Single Point of Failure

Single Point of Failure หรือ SPOF

คือ Component ตัวเดียวที่เสียแล้วทำให้ระบบส่วนสำคัญหยุด

ตัวอย่าง Architecture:

```text
ESP32
  ↓
AP
  ↓
Raspberry Pi
```

ถ้า AP ตัวเดียวเสีย

Communication ทั้งระบบอาจหยุด

ดังนั้น

AP

เป็น Potential SPOF


## 27.50 Raspberry Pi เป็น SPOF หรือไม่

ถ้า Architecture เป็น

```text
ทุก Device
    ↓
Raspberry Pi
    ↓
Processing
    ↓
Control
```

และมี Raspberry Pi ตัวเดียว

Pi อาจเป็น

Single Point of Failure

LAB 26 ช่วยเรื่อง

Recovery

แต่ไม่ได้ทำให้ Pi มี

High Availability

ต้องแยกคำว่า

Fault Recovery

กับ

Redundancy


## 27.51 Fault Tolerance vs Redundancy

Fault Tolerance Mechanisms:

```text
Retry
Reconnect
Restart
Store-and-Forward
Failsafe
```

Redundancy:

```text
Multiple AP
Backup Gateway
Multiple Broker
Dual Network
Power Backup
```

LAB 27 เน้น

```text
Fault Detection
+
Automatic Recovery
```

ไม่จำเป็นต้องสร้าง Full High Availability Cluster


## 27.52 Failure Scenario 10 --- Disk Full

ตรวจ:

```bash
df -h
```

ถ้า Disk เต็ม

อาจกระทบ

```text
SQLite
Node-RED
Logs
Store-and-Forward
Backup
```

ดังนั้น Storage เป็นส่วนหนึ่งของ Health Monitoring


## 27.53 ตรวจ Disk Usage

ใช้:

```bash
df -P /
```

ตัวอย่าง:

```text
Filesystem
/dev/mmcblk0p2
```

```text
Use%
72%
```

สามารถตั้ง Threshold เช่น

```text
< 80%
    NORMAL
```

```text
80–90%
    WARNING
```

```text
> 90%
    ALERT
```

ค่า Threshold เป็นตัวอย่างสำหรับ LAB

ระบบจริงต้องกำหนดตาม Requirement


## 27.54 Log Growth

Fault-Tolerant System ต้องระวังว่า Retry Error อาจสร้าง Log จำนวนมาก

ตัวอย่าง:

```text
MQTT Failed
Retry
Log
```

ทุก 0.1 วินาที

อาจทำให้ Disk เต็ม

ดังนั้น Backoff ช่วยทั้ง

```text
Network
CPU
Logs
```


## 27.55 Failure Scenario 11 --- Corrupt JSON

ทดสอบ:

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m 'HELLO'
```

Python ต้อง

```text
Catch JSON Error
      ↓
Log
      ↓
Continue Running
```

ไม่ควร:

```text
Malformed Message
       ↓
Unhandled Exception
       ↓
Gateway Crash
```


## 27.56 Exception Isolation

Message หนึ่งผิด

ไม่ควรทำให้ Application ทั้งระบบหยุด

แนวคิด:

```text
Message
   ↓
try
   ↓
Process
```

```text
Error
   ↓
except
   ↓
Log
   ↓
Continue
```

นี่คือ

Fault Isolation

ในระดับ Application


## 27.57 Failure Scenario 12 --- Wrong Topic

ทดสอบ:

```bash
mosquitto_pub \
-h localhost \
-t "pkru/wrong/001/data" \
-m '{"temp":32,"humi":70,"light":1500}'
```

Gateway ต้อง

Ignore / Reject

ไม่ควรตีความ Device ID ผิด

ดังนั้น Topic Validation สำคัญ


## 27.58 Topic Validation

ตัวอย่าง:

```python
parts = msg.topic.split("/")
```

ต้องตรวจ:

```python
len(parts) == 4
```

parts[0] == "pkru"

parts[1] == "iot"

parts[3] == "data"

ก่อนใช้:

```python
device_id = parts[2]
```


## 27.59 Failure Scenario 13 --- Authentication Failure

หลัง LAB 24

ถ้า MQTT Username/Password ผิด

Gateway จะ Connect ไม่สำเร็จ

ต้องแยกจาก:

Network Failure

ตัวอย่าง:

```text
Network reachable
Broker reachable
Credentials invalid
```

การ Retry อย่างเดียว

ไม่สามารถแก้

Wrong Password

ดังนั้น Log ต้องบอกสาเหตุให้ชัด


## 27.60 Recoverable vs Non-Recoverable Failure

Recoverable Automatically:

```text
Wi-Fi temporary loss
MQTT temporary loss
Internet temporary loss
Remote service temporary loss
Process crash
```

ต้องการ Human Intervention:

```text
Wrong password
Expired/revoked credential
Corrupt configuration
Disk hardware failure
Broken sensor
Damaged power supply
```

Fault-Tolerant System ต้องรู้ว่า

อะไรควร Retry

และ

อะไรควร Alert


## 27.61 อย่า Retry ทุก Error

ตัวอย่าง:

Wrong Password

Retry ทุกวินาทีตลอดไป

ไม่ได้แก้ปัญหา

ควร:

```text
Detect
   ↓
Log
   ↓
Alert
   ↓
Slow Retry / Stop ตาม Policy
```

ดังนั้น:

```text
Retry
   ≠
Universal Recovery
```


## 27.62 State Machine

สามารถมอง Gateway เป็น State Machine

```text
STARTING
   ↓
CONNECTING
   ↓
ONLINE
   │
   ├── Internet Failure
   │       ↓
   │    DEGRADED
   │
   ├── MQTT Failure
   │       ↓
   │    RECONNECTING
   │
   └── Critical Failure
           ↓
         FAILED
```

เมื่อ Recovery:

```text
DEGRADED
   ↓
ONLINE
```

```text
RECONNECTING
   ↓
ONLINE
```


## 27.63 Full Gateway State

ตัวอย่าง State:

STARTING

HEALTHY

DEGRADED

RECONNECTING

FAILED

STOPPING

ช่วยให้ Dashboard แสดงสถานะระบบได้ชัดกว่าการแสดงเพียง

ONLINE/OFFLINE


## 27.64 Fault-Tolerant Python Gateway Structure

แนวคิด Program:

```text
Startup
   ↓
Initialize Database
   ↓
Connect MQTT
   ↓
Subscribe
   ↓
Main Operation
   │
   ├── Receive Data
   │
   ├── Validate
   │
   ├── Update Last Seen
   │
   ├── Rule
   │
   ├── Control
   │
   ├── Store
   │
   └── Health Update
   │
   ├── MQTT Disconnect
   │      ↓
   │   Reconnect
   │
   ├── Remote Failure
   │      ↓
   │   Store Locally
   │
   └── Invalid Data
          ↓
        Reject
```


## 27.65 ตัวอย่าง Fault-Tolerant gateway.py

ตัวอย่างนี้เน้นแนวคิด LAB 27

```python
import json
import math
import signal
import time
import paho.mqtt.client as mqtt

broker = "localhost"
port = 1883

data_topic = "pkru/iot/+/data"
status_topic = "pkru/iot/+/status"
gateway_status_topic = "pkru/gateway/status"

running = True
mqtt_connected = False

last_seen = {}
data_quality = {}
fan_states = {}

stale_timeout = 15
offline_timeout = 15


def is_number(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def validate_data(data):
    required_fields = [
        "temp",
        "humi",
        "light"
    ]

    for field in required_fields:
        if field not in data:
            return False

        if not is_number(data[field]):
            return False

    temp = data["temp"]
    humi = data["humi"]
    light = data["light"]

    if (
        temp == -99
        or humi == -99
        or light == -99
    ):
        return False

    if temp < -20 or temp > 80:
        return False

    if humi < 0 or humi > 100:
        return False

    if light < 0 or light > 100000:
        return False

    return True


def automatic_control(
    client,
    device_id,
    temp
):
    old_state = fan_states.get(
        device_id,
        "OFF"
    )

    new_state = old_state

    if temp > 35:
        new_state = "ON"

    elif temp < 30:
        new_state = "OFF"

    if new_state == old_state:
        return

    fan_states[device_id] = new_state

    topic = (
        f"pkru/iot/"
        f"{device_id}/cmd"
    )

    client.publish(
        topic,
        new_state
    )

    print(
        f"COMMAND "
        f"device={device_id} "
        f"fan={new_state}"
    )


def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    global mqtt_connected

    print(
        f"MQTT connected: "
        f"{reason_code}"
    )

    if reason_code == 0:
        mqtt_connected = True

        client.subscribe(
            data_topic
        )

        client.subscribe(
            status_topic
        )


def on_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties
):
    global mqtt_connected

    mqtt_connected = False

    print(
        f"MQTT disconnected: "
        f"{reason_code}"
    )


def on_message(
    client,
    userdata,
    msg
):
    try:
        parts = msg.topic.split("/")

        if len(parts) != 4:
            print(
                f"INVALID TOPIC "
                f"{msg.topic}"
            )
            return

        if (
            parts[0] != "pkru"
            or parts[1] != "iot"
        ):
            return

        device_id = parts[2]
        channel = parts[3]

        now = time.time()

        if channel == "status":
            payload = (
                msg.payload
                .decode("utf-8")
                .strip()
            )

            if payload == "ONLINE":
                last_seen[device_id] = now

            print(
                f"STATUS "
                f"device={device_id} "
                f"value={payload}"
            )

            return

        if channel != "data":
            return

        last_seen[device_id] = now

        payload = msg.payload.decode(
            "utf-8"
        )

        try:
            data = json.loads(payload)

        except json.JSONDecodeError:
            data_quality[device_id] = {
                "status": "INVALID",
                "last_received": now
            }

            print(
                f"INVALID JSON "
                f"device={device_id}"
            )

            return

        if not isinstance(data, dict):
            data_quality[device_id] = {
                "status": "INVALID",
                "last_received": now
            }

            print(
                f"INVALID PAYLOAD "
                f"device={device_id}"
            )

            return

        if not validate_data(data):
            data_quality[device_id] = {
                "status": "INVALID",
                "last_received": now
            }

            print(
                f"INVALID DATA "
                f"device={device_id} "
                f"payload={data}"
            )

            return

        data_quality[device_id] = {
            "status": "VALID",
            "last_received": now
        }

        temp = data["temp"]
        humi = data["humi"]
        light = data["light"]

        print(
            f"VALID "
            f"device={device_id} "
            f"temp={temp} "
            f"humi={humi} "
            f"light={light}"
        )

        automatic_control(
            client,
            device_id,
            temp
        )

    except Exception as error:
        print(
            f"MESSAGE ERROR: "
            f"{error}"
        )


def update_health(client):
    now = time.time()

    devices = {}

    all_device_ids = set(
        last_seen.keys()
    ) | set(
        data_quality.keys()
    )

    for device_id in all_device_ids:
        seen = last_seen.get(
            device_id
        )

        if seen is None:
            availability = "UNKNOWN"

        elif (
            now - seen
            > offline_timeout
        ):
            availability = "OFFLINE"

        else:
            availability = "ONLINE"

        quality_info = (
            data_quality.get(device_id)
        )

        if quality_info is None:
            quality = "UNKNOWN"

        else:
            elapsed = (
                now
                - quality_info[
                    "last_received"
                ]
            )

            if elapsed > stale_timeout:
                quality = "STALE"

            else:
                quality = (
                    quality_info["status"]
                )

        devices[device_id] = {
            "availability":
                availability,
            "quality":
                quality
        }

    gateway_state = (
        "HEALTHY"
        if mqtt_connected
        else "DEGRADED"
    )

    health = {
        "status": gateway_state,
        "mqtt": mqtt_connected,
        "devices": devices
    }

    if mqtt_connected:
        client.publish(
            gateway_status_topic,
            json.dumps(health),
            retain=True
        )

    print(
        "HEALTH "
        + json.dumps(health)
    )


def handle_signal(
    signum,
    frame
):
    global running

    print(
        "Shutdown requested"
    )

    running = False


signal.signal(
    signal.SIGTERM,
    handle_signal
)

signal.signal(
    signal.SIGINT,
    handle_signal
)


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="python-gateway"
)

client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message

client.reconnect_delay_set(
    min_delay=1,
    max_delay=30
)


while running:

    try:
        print(
            "Connecting MQTT..."
        )

        client.connect(
            broker,
            port,
            60
        )

        client.loop_start()

        while running:

            update_health(client)

            time.sleep(5)

        break

    except Exception as error:

        mqtt_connected = False

        print(
            f"MQTT ERROR: {error}"
        )

        try:
            client.loop_stop()

        except Exception:
            pass

        if running:
            print(
                "Retry in 5 seconds"
            )

            time.sleep(5)


try:
    client.loop_stop()
except Exception:
    pass

try:
    client.disconnect()
except Exception:
    pass

print(
    "Python IoT Gateway stopped"
)
```

## 27.66 หมายเหตุเกี่ยวกับตัวอย่าง gateway.py

Code นี้ใช้เพื่อสอนแนวคิด

```text
Fault Detection
Validation
Reconnect
Health Monitoring
Graceful Shutdown
```

ไม่ใช่ Production HA Framework

สำหรับระบบจริงยังต้องพิจารณา

```text
Thread Safety
Persistent State
Database Error Handling
Publish Confirmation
QoS
Actual Actuator Feedback
Credential Management
Logging
Metrics
Watchdog
Network Failure Modes
```


## 27.67 ปัญหา State หลัง Restart

ตัวอย่าง:

```python
fan_states = {}
```

อยู่ใน RAM

เมื่อ Python Restart

State จะหาย

ดังนั้น Gateway อาจคิดว่า

Fan = OFF

ทั้งที่ Fan จริงยัง

ON

นี่เป็นเหตุผลที่ระบบจริงควรใช้

Actual State Feedback

หรือ Persistent State


## 27.68 State Recovery

แนวทาง:

```text
Gateway Restart
      ↓
Do not assume actuator state
      ↓
Request / Wait for device state
      ↓
Synchronize
      ↓
Resume Control
```

ดีกว่า:

```text
Gateway Restart
      ↓
Assume everything OFF
```


## 27.69 MQTT Retained State

สามารถใช้ Retained Message สำหรับ

Reported State

เช่น:

pkru/iot/001/state

ESP32 Publish:

ON

retain = true

Gateway Reconnect

Subscribe

แล้วได้รับ Last Reported State

แต่ต้องจำว่า

```text
Retained State
    ≠
Proof Device Is Currently Online
```

จึงยังต้องใช้

Heartbeat / LWT / Timeout


## 27.70 Failsafe Decision Table

ตัวอย่าง:

Condition             Action

```text
VALID + ONLINE
    → Normal Control
```

```text
INVALID + ONLINE
    → Reject Data
    → Alert
    → Failsafe Policy
```

```text
STALE + ONLINE
    → Do not trust old value
    → Failsafe Policy
```

```text
OFFLINE
    → Stop normal control
    → Failsafe / Alert
```

```text
MQTT Down
    → Local device fallback if available
```

```text
Internet Down
    → Local operation
    → Store-and-Forward
```


## 27.71 Fault Isolation

Failure ของ Device หนึ่ง

ไม่ควรทำให้ Device อื่นหยุด

ตัวอย่าง:

```text
ESP32-002
    ↓
INVALID
```

ระบบควรเป็น:

```text
001 → VALID → Process
```

```text
002 → INVALID → Reject
```

```text
003 → VALID → Process
```

ไม่ใช่:

```text
002 Invalid
    ↓
Gateway Crash
    ↓
001/002/003 Stop
```


## 27.72 Multi-device Isolation

แต่ละ Device ควรมี State แยกกัน

เช่น:

```python
last_seen["001"]
```

```python
last_seen["002"]
```

```python
last_seen["003"]
```

```python
data_quality["001"]
```

```python
data_quality["002"]
```

```python
data_quality["003"]
```

```python
fan_states["001"]
```

```python
fan_states["002"]
```

```python
fan_states["003"]
```

ทำให้ Failure ของ Device หนึ่งไม่ปนกับอีก Device


## 27.73 Failure Scenario 14 --- One Device Offline

```text
Simulator 001
    → running
```

```text
Simulator 002
    → stop
```

```text
Simulator 003
    → running
```

หลัง Timeout:

```text
001
ONLINE
```

```text
002
OFFLINE
```

```text
003
ONLINE
```

Gateway ต้องยัง Process

```text
001
003
```

ต่อไป


## 27.74 Failure Scenario 15 --- One Device Invalid

001:

```json
{"temp":31,"humi":70,"light":1500}
```

002:

```json
{"temp":-99,"humi":70,"light":1500}
```

003:

```json
{"temp":34,"humi":72,"light":1400}
```

ผล:

001 VALID

002 INVALID

003 VALID

001 และ 003 ต้องยังทำงานตามปกติ


## 27.75 Failure Scenario 16 --- Gateway Process Failure

Kill Python

```text
    ↓
```

systemd detects process failure

```text
    ↓
```

Restart

```text
    ↓
```

MQTT reconnect

```text
    ↓
```

Subscribe

```text
    ↓
```

Resume

ทดสอบด้วย:

```bash
pid=$(systemctl show \
-p MainPID \
--value \
iot-gateway)
```

```bash
echo "$pid"
```

```bash
sudo kill -9 "$pid"
```

ตรวจ:

```bash
systemctl status iot-gateway
```


## 27.76 Failure Scenario 17 --- Complete Reboot

ใช้:

```bash
sudo reboot
```

หลัง Boot:

```text
Mosquitto
    ↓
Gateway
    ↓
Node-RED
    ↓
Cloudflare
```

ควรกลับมา

ทดสอบ:

```bash
systemctl is-active mosquitto
```

```bash
systemctl is-active iot-gateway
```

```bash
systemctl is-active nodered
```

```bash
systemctl is-active cloudflared
```


## 27.77 Fault Injection

การจงใจสร้าง Failure เพื่อทดสอบเรียกว่า

Fault Injection

ตัวอย่างใน LAB:

Kill Process

Stop Broker

Disconnect Internet

Stop Device Simulator

Send Invalid Data

Send Malformed JSON

Send Wrong Topic

เป้าหมายไม่ใช่ทำลายระบบ

แต่พิสูจน์ว่า Recovery Mechanism ทำงาน


## 27.78 Fault Injection Test Matrix

```text
Fault:
Invalid sensor
```

```text
Detection:
Validation
```

```text
Recovery:
Reject data
```

```text
Expected:
Gateway continues
```

```text
Fault:
No sensor update
```

```text
Detection:
Timeout
```

```text
Recovery:
STALE + failsafe
```

```text
Expected:
Other devices continue
```

```text
Fault:
Device offline
```

```text
Detection:
Heartbeat/LWT/timeout
```

```text
Recovery:
OFFLINE + alert
```

```text
Expected:
Other devices continue
```

```text
Fault:
Python crash
```

```text
Detection:
systemd
```

```text
Recovery:
Restart
```

```text
Expected:
Gateway resumes
```

```text
Fault:
MQTT down
```

```text
Detection:
Disconnect
```

```text
Recovery:
Reconnect/backoff
```

```text
Expected:
Resume when broker returns
```

```text
Fault:
Internet down
```

```text
Detection:
Remote failure
```

```text
Recovery:
Store locally
```

```text
Expected:
Local operation continues
```

```text
Fault:
Remote service down
```

```text
Detection:
Send failure
```

```text
Recovery:
Queue/retry
```

```text
Expected:
Data sent later
```

```text
Fault:
Pi reboot
```

```text
Detection:
systemd boot
```

```text
Recovery:
Auto-start
```

```text
Expected:
Services return
```


## 27.79 Recovery Time

แต่ละ Failure ควรวัด

Detection Time

และ

Recovery Time

ตัวอย่าง:

MQTT Broker stopped

```text
Detection:
2 seconds
```

Broker restored

```text
Reconnect:
5 seconds
```

หรือ

Python crash

```text
systemd RestartSec:
5 seconds
```

Recovery:
ประมาณ 5–10 seconds

ค่าจริงต้องวัดจากระบบ


## 27.80 Detection Time + Recovery Time

```text
Failure
   ↓
Detection
   ↓
Recovery
   ↓
Operational
```

ดังนั้น Downtime โดยประมาณ:

```text
Detection Time
      +
Recovery Time
```

ถ้า

Detection = 15 sec

Recovery = 5 sec

ระบบอาจใช้ประมาณ

20 sec

ก่อนกลับสู่สถานะที่ต้องการ


## 27.81 Timeout Trade-off

Timeout สั้นเกินไป:

```text
Network Delay
    ↓
False Offline
```

Timeout ยาวเกินไป:

```text
Real Failure
    ↓
Slow Detection
```

ดังนั้น Timeout ต้องสัมพันธ์กับ

Expected Update Interval

ตัวอย่าง:

Heartbeat every 5 sec

Timeout = 15 sec

หมายถึงยอมพลาดประมาณ 3 รอบก่อนตัดสิน OFFLINE


## 27.82 Retry Trade-off

Retry เร็วเกิน:

```text
Network Load
CPU Load
Log Load
```

Retry ช้าเกิน:

Recovery Slow

จึงใช้

Backoff

เพื่อสร้างสมดุล


## 27.83 Observability

Fault-Tolerant System ต้องสามารถบอกได้ว่าเกิดอะไรขึ้น

อย่างน้อยควรมี

```text
Logs
Status
Timestamp
Error Reason
Recovery Event
```

ตัวอย่าง:

MQTT disconnected

Retry in 5 seconds

MQTT connected

Device 002 OFFLINE

Device 002 ONLINE

Remote service unavailable

Stored locally

Forward completed


## 27.84 Logging ที่ดี

Log ควรตอบได้ว่า

WHEN

WHAT

WHERE

RESULT

ตัวอย่าง:

```text
2026-10-02 10:15:01
device=002
event=OFFLINE
```

ดีกว่า:

ERROR!


## 27.85 Recovery Verification

หลัง Recovery ต้อง Verify

ตัวอย่าง MQTT Recovery:

```text
Reconnect
   ↓
Subscribe
   ↓
Receive Data
   ↓
Validate
   ↓
Control
```

ไม่ควรถือว่า Recovery สำเร็จเพียงเพราะ

Connection Established


## 27.86 End-to-End Recovery

Recovery Test:

```text
Sensor
   ↓
MQTT
   ↓
Gateway
   ↓
Validation
   ↓
Rule
   ↓
Command
   ↓
ESP32
   ↓
State Feedback
```

ถ้าทั้ง Path ทำงาน

จึงถือว่า

Control Path Recovered


## 27.87 Dashboard สำหรับ Fault Tolerance

Dashboard ควรแสดงอย่างน้อย:

Gateway Status

MQTT Status

Internet Status

Device Status

Data Quality

Last Seen

Pending Queue

Disk Usage

ตัวอย่าง:

```text
Gateway
HEALTHY
```

```text
MQTT
CONNECTED
```

```text
Internet
ONLINE
```

```text
Device 001
ONLINE / VALID
```

```text
Device 002
OFFLINE / STALE
```

```text
Pending Queue
0
```

```text
Disk
42%
```


## 27.88 Alert ที่ควรมี

ตัวอย่าง:

Device OFFLINE

Data INVALID

Data STALE

MQTT disconnected

Database error

Disk > 90%

Store-and-Forward queue growing

Backup too old

แต่ไม่ควร Alert ทุก Event แบบไม่มี Priority


## 27.89 Warning vs Alert

WARNING

```text
ระบบยังทำงานได้
แต่ต้องติดตาม
```

ALERT

มี Failure ที่ต้องดำเนินการ

ตัวอย่าง:

```text
Internet Down
Local Control OK
```

```text
→ WARNING / DEGRADED
```

SQLite Write Failure

```text
→ ALERT
```

ระดับจริงต้องกำหนดตาม Requirement


## 27.90 Cascading Failure

Failure หนึ่งอาจทำให้เกิด Failure ต่อเนื่อง

ตัวอย่าง:

```text
Internet Down
    ↓
Queue grows
    ↓
Disk fills
    ↓
SQLite cannot write
    ↓
Local storage fails
```

ดังนั้น Store-and-Forward เองต้องมี

```text
Queue Monitoring
Disk Monitoring
Retention Policy
```


## 27.91 Fault Tolerance ไม่ใช่แค่ Retry

ระบบ Fault-Tolerant ที่ดีต้องประกอบด้วย:

```text
Detect
Isolate
Validate
Retry
Reconnect
Store
Fallback
Failsafe
Restart
Verify
Alert
```

ไม่ใช่เพียง:

```text
while true:
    retry()
```


## 27.92 Fault Tolerance กับ Backup

LAB 27:

Automatic / Short-term Recovery

LAB 26:

Disaster / Major Failure Recovery

ตัวอย่าง:

```text
Python Crash
    → LAB 27
    → systemd restart
```

```text
SD Card Dead
    → LAB 26
    → Restore Backup
```

ทั้งสองอย่างต้องมีร่วมกัน


## 27.93 Fault Tolerance กับ Security

Security Failure บางอย่างไม่ควร Auto-Recover ด้วยการลด Security

ตัวอย่าง:

MQTT Authentication Failed

ห้ามแก้โดย:

allow_anonymous true

เพื่อให้ระบบกลับมาทำงาน

ควร:

```text
Detect
   ↓
Alert
   ↓
Fix Credential
```

Fault Tolerance ต้องไม่ทำลาย Security Policy


## 27.94 Fault Tolerance กับ Local-First

หลักสำคัญของ Architecture นี้:

Cloud เป็น Optional Dependency
สำหรับ Local Operation

ดังนั้น:

```text
Internet
   X
```

```text
Local Sensor
   ↓
MQTT
   ↓
Gateway
   ↓
Rule
   ↓
Actuator
```

ยังทำงาน

นี่เป็นคุณสมบัติสำคัญของ Edge IoT


## 27.95 Checklist การทดสอบ LAB 27

[ ] VALID data ทำงาน

[ ] INVALID data ถูก Reject

[ ] STALE data ถูกตรวจพบ

[ ] Device OFFLINE ถูกตรวจพบ

[ ] Device อื่นยังทำงานเมื่อหนึ่ง Device เสีย

[ ] Malformed JSON ไม่ทำให้ Gateway Crash

[ ] Wrong Topic ไม่ทำให้ Gateway Crash

```text
[ ] Python Crash → systemd Restart
```

```text
[ ] MQTT Down → Detect Disconnect
```

```text
[ ] MQTT Up → Reconnect
```

```text
[ ] Reconnect → Subscribe Again
```

```text
[ ] Internet Down → Local Operation Continues
```

```text
[ ] Remote Failure → Store Locally
```

```text
[ ] Remote Recovery → Forward Pending Data
```

```text
[ ] Pi Reboot → Services Auto-start
```

[ ] Gateway Health ถูกแสดง

[ ] Disk Usage ถูกตรวจสอบ

[ ] Failsafe Policy ถูกกำหนด

[ ] Recovery ถูก Verify End-to-End


## 27.96 งานส่ง LAB 27

นักศึกษาส่ง:

1. Fault-Tolerant Architecture Diagram

2. Failure Model ของระบบ

3. รายการ Fault อย่างน้อย 8 กรณี

4. Safe Processing Pipeline

5. Python Gateway Code

6. หลักฐาน VALID

7. หลักฐาน INVALID

8. หลักฐาน STALE

9. หลักฐาน Device OFFLINE

10. หลักฐานว่า Device อื่นยังทำงาน

11. Malformed JSON Test

12. Python Crash Test

13. systemd Automatic Restart

14. MQTT Broker Failure Test

15. MQTT Reconnect Test

16. Internet Failure Test

17. Local Operation During Internet Failure

18. Store-and-Forward Test

19. Remote Recovery Test

20. Reboot Recovery Test

21. Gateway Health Status

22. Failsafe Policy

23. Fault Injection Test Matrix

24. Detection Time อย่างน้อย 3 Failure

25. Recovery Time อย่างน้อย 3 Failure

26. อธิบายความแตกต่าง:

```text
Fault
Error
Failure
```

27. อธิบายความแตกต่าง:

```text
ONLINE
VALID
```

28. อธิบายความแตกต่าง:

```text
Process Alive
Service Healthy
```

29. อธิบายความแตกต่าง:

```text
Fault Tolerance
Backup & Recovery
```

30. ระบุ Single Point of Failure ในระบบของตน


## 27.97 เกณฑ์ผ่าน LAB

นักศึกษาต้องพิสูจน์ได้ว่า

Failure หนึ่ง Component

ไม่ทำให้ระบบทั้งหมดล้มโดยไม่จำเป็น

อย่างน้อยต้องแสดง:

```text
Sensor Failure
    ↓
Detected
```

```text
Invalid Data
    ↓
Rejected
```

```text
Device Failure
    ↓
Detected
```

```text
Process Failure
    ↓
Restarted
```

```text
MQTT Failure
    ↓
Reconnected
```

```text
Internet Failure
    ↓
Local Operation Continued
```

```text
Remote Failure
    ↓
Data Stored
```

```text
Remote Recovery
    ↓
Pending Data Forwarded
```

```text
Reboot
    ↓
Services Restored
```


## 27.98 Architecture หลัง LAB 27

```text
                         INTERNET
                            │
                            ▼
                    Remote Services
                            ▲
                            │
                    Store-and-Forward
                            │
                            ▼
┌──────────────────────────────────────────────────┐
│             RASPBERRY PI IoT GATEWAY             │
│                                                  │
│  Mosquitto                                       │
│      ├── Authentication                          │
│      └── ACL                                     │
│                                                  │
│  Python Gateway                                  │
│      ├── MQTT Reconnect                          │
│      ├── Validation                              │
│      ├── ONLINE/OFFLINE                          │
│      ├── VALID/INVALID/STALE                     │
│      ├── Rule Processing                         │
│      ├── Automatic Control                       │
│      ├── Failsafe                                │
│      └── Health Monitoring                       │
│                                                  │
│  SQLite                                          │
│      ├── Sensor Data                             │
│      └── Offline Queue                           │
│                                                  │
│  systemd                                         │
│      ├── Auto Start                              │
│      └── Auto Restart                            │
│                                                  │
│  Node-RED                                        │
│      ├── Dashboard                               │
│      └── Alert                                   │
│                                                  │
│  cloudflared                                     │
│      └── Remote Access                           │
│                                                  │
│  Backup                                          │
│      └── Recovery                                │
│                                                  │
└─────────────────────┬────────────────────────────┘
                      │
                     MQTT
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
       ESP32-001  ESP32-002  ESP32-003
           │          │          │
        Sensor      Sensor      Sensor
           │
           └── Local Control / Feedback
```


## 27.99 ความสัมพันธ์ LAB 18–27

```text
LAB 18
Device Availability
ONLINE / OFFLINE
```

```text
        ↓
```

```text
LAB 19
Data Quality
VALID / INVALID / STALE
```

```text
        ↓
```

```text
LAB 20
Python Application
```

```text
        ↓
```

```text
LAB 21
systemd
Auto Start / Restart
```

```text
        ↓
```

```text
LAB 22
IoT Gateway
BLE / UDP / MQTT
```

```text
        ↓
```

```text
LAB 23
Offline Operation
Store-and-Forward
```

```text
        ↓
```

```text
LAB 24
MQTT Security
Authentication / ACL
```

```text
        ↓
```

```text
LAB 25
Remote Access
Cloudflare Tunnel
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
Detect / Recover / Continue
```


## 27.100 สิ่งสำคัญที่สุดของ LAB 27

Fault-Tolerant IoT ไม่ได้หมายถึง

"ระบบไม่มีวันเสีย"

แต่หมายถึง

"ระบบถูกออกแบบโดยยอมรับว่า Failure จะเกิดขึ้น"

ดังนั้นต้องสามารถ:

```text
Detect Failure
      ↓
Understand Failure
      ↓
Isolate Failure
      ↓
Recover Automatically
      ↓
Verify Recovery
      ↓
Continue Essential Operation
```

หลักการสำคัญ:

```text
Value Exists
    ≠
Current Value
```

```text
ONLINE
    ≠
VALID
```

```text
Process Running
    ≠
Service Healthy
```

```text
MQTT Connected
    ≠
Sensor Healthy
```

```text
Internet Down
    ≠
Local System Must Stop
```

```text
Command Sent
    ≠
Actuator Actually Changed
```

```text
Backup Exists
    ≠
System Can Be Recovered
```

ระบบหลัง LAB 27 จึงเปลี่ยนจาก

```text
Monitor
   ↓
Store
   ↓
Control
```

เป็น

```text
Monitor
   ↓
Validate
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


## 27.101 ขั้นต่อไป --- LAB 28

LAB 28 เป็น LAB สุดท้ายของชุดนี้:

LAB 28 --- Integrated IoT Mini Project

นักศึกษาจะนำองค์ความรู้ทั้งหมดมารวมเป็นระบบเดียว

```text
IoT Nodes
    ↓
MQTT / BLE / UDP
    ↓
Raspberry Pi Gateway
    ↓
Processing
    ↓
Data Quality
    ↓
Database
    ↓
Dashboard
    ↓
Rule / Alert
    ↓
Manual / Automatic Control
    ↓
Device Status
    ↓
Store-and-Forward
    ↓
Security
    ↓
Remote Access
    ↓
Backup
    ↓
Fault Recovery
```

เป้าหมาย LAB 28 ไม่ใช่เพิ่ม Technology ใหม่จำนวนมาก

แต่เป็นการพิสูจน์ว่าองค์ประกอบจาก LAB ก่อนหน้าสามารถทำงานร่วมกันเป็น

End-to-End IoT System

ที่มีคุณสมบัติ

```text
Observable
Controllable
Multi-device
Sensor-verified
Offline-capable
Access-controlled
Remotely manageable
Recoverable
Fault-tolerant
```
