> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[23 - LAB 23 - Offline Store-and-Forward with SQLite]]
> ถัดไป: [[25 - LAB 25 - Remote Access with Cloudflare Tunnel]]

# LAB 24 --- MQTT Security: Authentication + ACL

> [!info] แก้ไขล่าสุด
> 2026-10-02 07:27:22 +07

## 24.1 แนวคิดของ LAB

จนถึง LAB 23 ระบบ IoT ของเรามีองค์ประกอบสำคัญแล้ว

```text
ESP32 / Sensor
      ↓
     MQTT
      ↓
  Mosquitto
      ↓
Raspberry Pi Gateway
      │
      ├── Node-RED
      ├── Python
      ├── SQLite
      ├── Dashboard
      └── Store-and-Forward
```
แต่ถ้า MQTT Broker เปิดให้ Client ทุกตัวเชื่อมต่อได้โดยไม่มีการควบคุม

Client ที่เข้าถึง Network อาจสามารถ

```text
Subscribe Sensor Data
```
หรือ

```text
Publish Command
```
ได้โดยไม่ได้รับอนุญาต

ตัวอย่าง

```bash
mosquitto_pub \
    -h PI_IP \
    -t "pkru/iot/001/cmd" \
    -m "ON"
```
ถ้า Broker ยอมรับ Anonymous Client

ผู้ที่อยู่ใน Network อาจส่ง Command ไปยัง Actuator ได้

LAB 24 จึงเพิ่ม MQTT Security สองระดับ

```text
Authentication
      +
Authorization
```
โดยใช้

```text
Username / Password
      +
     ACL
```

---

## 24.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบาย Authentication และ Authorization
- ปิด Anonymous MQTT Access
- สร้าง MQTT Username/Password
- ใช้ `mosquitto_passwd`
- กำหนด Mosquitto Password File
- สร้าง ACL
- จำกัด Read/Write ตาม Topic
- สร้าง Account แยกตามบทบาท
- ทดสอบ Allowed / Denied Access
- ใช้ MQTT Credentials ใน ESP32 / Python / Node-RED
- ตรวจสอบ Mosquitto Log
- เข้าใจ Principle of Least Privilege
- เข้าใจข้อจำกัดของ Username/Password เมื่อไม่มี TLS

---

## 24.3 Security Model

LAB นี้แบ่ง Security เป็นสองคำถาม

### Authentication

ถามว่า

```text
"คุณคือใคร?"
```
ตัวอย่าง

```text
username = sensor001
password = ********
```
Broker ตรวจสอบ

```text
Username
Password
```
ถ้าถูกต้อง

```text
CONNECT
```
ถ้าไม่ถูกต้อง

```text
DENY
```

---

### Authorization

ถามว่า

```text
"คุณมีสิทธิ์ทำอะไร?"
```
ตัวอย่าง

```text
sensor001
```
อนุญาตให้

```text
WRITE
pkru/iot/001/data

WRITE
pkru/iot/001/status

READ
pkru/iot/001/cmd
```
แต่ไม่อนุญาตให้

```text
WRITE
pkru/iot/002/data
```
นี่คือหน้าที่ของ

```text
ACL
Access Control List
```

---

## 24.4 Architecture

```text
ESP32-001
   │
   │ username/password
   ▼
┌──────────────────────┐
│ Mosquitto            │
│                      │
│ Authentication       │
│ Password File        │
│                      │
│ Authorization        │
│ ACL                  │
└──────────┬───────────┘
           │
   ┌───────┼─────────┐
   ▼       ▼         ▼
Python   Node-RED   ESP32
Gateway  Dashboard  Actuator
```
ทุก Client ต้อง

```text
Authenticate
```
ก่อน

จากนั้น Broker ตรวจสอบ

```text
ACL
```
ทุกครั้งที่ Client พยายาม Read หรือ Write Topic

---

## 24.5 Security Pipeline

```text
MQTT Client
     │
     ▼
  CONNECT
     │
     ▼
Username / Password
     │
     ▼
Authentication
   /      \
FAIL      PASS
 │          │
 ▼          ▼
```
   DENY        ACL
```text
            │
            ▼
      Authorization
         /      \
      DENY      ALLOW
       │          │
       X          ▼
              MQTT Topic
```

---

## 24.6 ตรวจสอบ Mosquitto

ใช้

```bash
mosquitto -h
```
ตรวจสอบ Service

```bash
systemctl status mosquitto
```
ควรเห็น

```text
active (running)
```
ตรวจสอบ Port

```bash
sudo ss -lntp | grep 1883
```
ควรเห็น Mosquitto Listen ที่ Port

```text
1883
```

---

## 24.7 สำรอง Configuration ก่อนแก้ไข

ก่อนทำ Security Configuration

สร้าง Backup

```bash
sudo cp -a \
/etc/mosquitto \
/etc/mosquitto.backup-lab24
```
หากต้องการตรวจสอบ

```bash
sudo ls -la \
/etc/mosquitto.backup-lab24
```
แนวคิดสำคัญ

```text
Change Configuration
        ↓
   Test Service
        ↓
    Roll Back
    if required
```

---

## 24.8 ตรวจสอบ Configuration ปัจจุบัน

ใช้

```bash
sudo grep -R \
"listener\|allow_anonymous\|password_file\|acl_file" \
/etc/mosquitto
```
ตรวจสอบว่าเครื่องมี Configuration เดิมหรือไม่

โดยเฉพาะ

```text
listener
allow_anonymous
password_file
acl_file
```
เพื่อหลีกเลี่ยง Configuration ซ้ำหรือขัดแย้งกัน

---

## 24.9 สร้าง Password File

สร้าง Account แรก

ตัวอย่าง

```text
sensor001
```
ใช้

```bash
sudo mosquitto_passwd -c \
/etc/mosquitto/passwd \
sensor001
```
ระบบจะถาม

```text
Password:
Reenter password:
```
ข้อสำคัญ

```text
-c
```
หมายถึงสร้าง Password File ใหม่

ดังนั้นใช้เฉพาะครั้งแรก

---

## 24.10 เพิ่ม User คนต่อไป

เพิ่ม

```text
sensor002
```
ใช้

```bash
sudo mosquitto_passwd \
/etc/mosquitto/passwd \
sensor002
```
เพิ่ม

```bash
sensor003

sudo mosquitto_passwd \
/etc/mosquitto/passwd \
sensor003
```
เพิ่ม Gateway

```bash
sudo mosquitto_passwd \
/etc/mosquitto/passwd \
gateway
```
เพิ่ม Dashboard

```bash
sudo mosquitto_passwd \
/etc/mosquitto/passwd \
dashboard
```
ตอนนี้มีตัวอย่าง Account

```text
sensor001
sensor002
sensor003
gateway
dashboard
```

---

## 24.11 ระวัง `-c`

ห้ามใช้

```bash
mosquitto_passwd -c ...
```
ทุกครั้งที่เพิ่ม User

เพราะ

```text
-c
```
สร้าง File ใหม่

และอาจเขียนทับ Password File เดิม

รูปแบบที่ถูกต้อง

User แรก

```bash
mosquitto_passwd -c FILE USER
```
User ต่อไป

```bash
mosquitto_passwd FILE USER
```

---

## 24.12 ตรวจสอบ Password File

ใช้

```bash
sudo cat /etc/mosquitto/passwd
```
จะเห็นประมาณ

```text
sensor001:$7$...
sensor002:$7$...
sensor003:$7$...
gateway:$7$...
dashboard:$7$...
```
Password ไม่ได้ถูกเก็บเป็น Plain Text

ไม่ควรเห็น Password จริงใน File

---

## 24.13 กำหนด Permission ของ Password File

ใช้

```bash
sudo chown root:mosquitto \
/etc/mosquitto/passwd

sudo chmod 640 \
/etc/mosquitto/passwd
```
ตรวจสอบ

```bash
ls -l /etc/mosquitto/passwd
```
Mosquitto ต้องสามารถอ่าน File ได้

แต่ไม่ควรเปิดให้ User ทั่วไปอ่านโดยไม่จำเป็น

---

## 24.14 สร้าง Security Configuration

สร้าง

```bash
sudo nano \
/etc/mosquitto/conf.d/security.conf
```
ใส่

```conf
listener 1883

allow_anonymous false

password_file /etc/mosquitto/passwd

acl_file /etc/mosquitto/acl
```
ความหมาย

```conf
listener 1883
```
เปิด MQTT Listener Port 1883

---

```conf
allow_anonymous false
```
ไม่อนุญาต Client ที่ไม่มี Authentication

---

```text
password_file
```
กำหนด Username/Password Database

---

```text
acl_file
```
กำหนด Authorization Rules

---

## 24.15 ระวัง Listener ซ้ำ

ถ้ามี Configuration เดิม เช่น

```conf
listener 1883
```
อยู่ใน File อื่นแล้ว

ไม่ควรเพิ่ม

```conf
listener 1883
```
ซ้ำ

ตรวจสอบด้วย

```bash
sudo grep -R \
"listener 1883" \
/etc/mosquitto
```
ถ้าพบ Listener เดิม

ให้ปรับ Configuration เดิมหรือหลีกเลี่ยงการประกาศ Listener ซ้ำ

เป้าหมายคือให้มี Configuration ที่ชัดเจนเพียงชุดเดียวสำหรับ Listener ที่ใช้ใน LAB

---

## 24.16 ออกแบบ ACL

เราจะกำหนดสิทธิ์ตามบทบาท

### sensor001

Publish Sensor Data

```text
WRITE
pkru/iot/001/data
```
Publish Status

```text
WRITE
pkru/iot/001/status
```
Receive Command

```text
READ
pkru/iot/001/cmd
```

---

### sensor002

```text
WRITE
pkru/iot/002/data

WRITE
pkru/iot/002/status

READ
pkru/iot/002/cmd
```

---

### sensor003

```text
WRITE
pkru/iot/003/data

WRITE
pkru/iot/003/status

READ
pkru/iot/003/cmd
```

---

### gateway

ต้องประมวลผลหลาย Device

จึงอาจ

```text
READ
pkru/iot/+/data

READ
pkru/iot/+/status

WRITE
pkru/iot/+/cmd
```

---

### dashboard

สำหรับ LAB กำหนดให้ Dashboard

```text
READ
pkru/iot/+/data

READ
pkru/iot/+/status
```
ถ้า Dashboard ต้อง Manual Control จึงค่อยเพิ่มสิทธิ์

```text
WRITE
pkru/iot/+/cmd
```
ไม่ควรให้สิทธิ์ Write ถ้าไม่จำเป็น

---

## 24.17 สร้าง ACL File

สร้าง

```bash
sudo nano /etc/mosquitto/acl
```
ใส่

```conf
user sensor001
topic write pkru/iot/001/data
topic write pkru/iot/001/status
topic read pkru/iot/001/cmd

user sensor002
topic write pkru/iot/002/data
topic write pkru/iot/002/status
topic read pkru/iot/002/cmd

user sensor003
topic write pkru/iot/003/data
topic write pkru/iot/003/status
topic read pkru/iot/003/cmd

user gateway
topic read pkru/iot/+/data
topic read pkru/iot/+/status
topic write pkru/iot/+/cmd

user dashboard
topic read pkru/iot/+/data
topic read pkru/iot/+/status
```

---

## 24.18 กำหนด Permission ACL File

ใช้

```bash
sudo chown root:mosquitto \
/etc/mosquitto/acl

sudo chmod 640 \
/etc/mosquitto/acl
```
ตรวจสอบ

```bash
ls -l /etc/mosquitto/acl
```

---

## 24.19 Principle of Least Privilege

หลักสำคัญคือ

```text
Client ควรได้รับสิทธิ์
เท่าที่จำเป็นต่อหน้าที่เท่านั้น
```
ไม่ควรกำหนดทุก User เป็น

```text
readwrite #
```
ตัวอย่างที่ไม่ควรใช้

```conf
user sensor001
topic readwrite #
```
เพราะ sensor001 จะสามารถ

```text
Read ทุก Topic
Write ทุก Topic
```
รวมถึง

```text
pkru/iot/002/cmd
pkru/iot/003/cmd
```
ซึ่งไม่จำเป็น

---

## 24.20 ตรวจสอบ Configuration ก่อน Restart

ใช้

```bash
sudo mosquitto \
-c /etc/mosquitto/mosquitto.conf \
-v
```
ถ้า Broker ตัวเดิมกำลังใช้ Port 1883 อยู่ การทดสอบแบบนี้อาจแจ้งว่า Port ถูกใช้งานแล้ว

ดังนั้นอย่างน้อยควรตรวจสอบ Log หลัง Restart อย่างระมัดระวัง

และเก็บ SSH Session เดิมไว้ขณะเปลี่ยน Configuration

---

## 24.21 Restart Mosquitto

ใช้

```bash
sudo systemctl restart mosquitto
```
ตรวจสอบทันที

```bash
systemctl status mosquitto
```
ต้องเป็น

```text
active (running)
```
ถ้าไม่ทำงาน

ใช้

```bash
journalctl \
-u mosquitto \
-n 50 \
--no-pager
```
อย่าแก้แบบสุ่ม

ให้อ่าน Error ก่อน

---

## 24.22 ทดสอบ Anonymous Access

หลัง

```conf
allow_anonymous false
```
ลอง

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-v
```
ควรถูกปฏิเสธ

เพราะไม่ได้ส่ง

```text
Username
Password
```
นี่เป็น Test แรกที่ต้องผ่าน

---

## 24.23 MQTT CLI Authentication

เพิ่ม

```text
-u
```
สำหรับ Username

และ

```text
-P
```
สำหรับ Password

ตัวอย่าง

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u gateway \
-P 'PASSWORD' \
-v
```
หมายเหตุ

การใส่ Password ด้วย `-P` สะดวกสำหรับ LAB แต่ Password อาจปรากฏใน Shell History หรือ Process Information ในบางสถานการณ์

สำหรับระบบจริงควรจัดการ Credential อย่างเหมาะสมกว่านี้

---

## 24.24 Test 1 — sensor001 Publish Topic ของตัวเอง

เปิด Subscriber ด้วย Gateway

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u gateway \
-P 'GATEWAY_PASSWORD' \
-v
```
จากอีก Terminal

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1500}' \
-u sensor001 \
-P 'SENSOR001_PASSWORD'
```
Gateway ควรได้รับ

```text
pkru/iot/001/data {"temp":30,"humi":70,"light":1500}
```
แสดงว่า

```text
Authentication = PASS
Authorization  = PASS
```

---

## 24.25 Test 2 — sensor001 Publish Topic ของ Device 002

ลอง

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/002/data" \
-m '{"temp":99,"humi":99,"light":9999}' \
-u sensor001 \
-P 'SENSOR001_PASSWORD'
```
ACL ไม่อนุญาต

```text
sensor001
    ↓
WRITE
pkru/iot/002/data
```
ดังนั้น Message ต้องไม่ถูกส่งผ่าน Broker ไปยัง Subscriber ที่ไม่มีสิทธิ์ตาม Rule นี้

ตรวจสอบ Broker Log ประกอบการทดสอบ

---

## 24.26 Test 3 — sensor001 Subscribe Command ของตัวเอง

ใช้

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/001/cmd" \
-u sensor001 \
-P 'SENSOR001_PASSWORD' \
-v
```
จาก Gateway Account

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/cmd" \
-m "ON" \
-u gateway \
-P 'GATEWAY_PASSWORD'
```
sensor001 ควรได้รับ

```text
pkru/iot/001/cmd ON
```

---

## 24.27 Test 4 — sensor001 Subscribe Command ของ Device 002

ลอง

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/002/cmd" \
-u sensor001 \
-P 'SENSOR001_PASSWORD' \
-v
```
sensor001 ไม่ควรได้รับ Message ของ Device 002

เพราะ ACL อนุญาตเฉพาะ

```text
pkru/iot/001/cmd
```

---

## 24.28 Test 5 — Gateway อ่านข้อมูลหลาย Device

ใช้

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u gateway \
-P 'GATEWAY_PASSWORD' \
-v
```
ส่งจาก sensor001

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1000}' \
-u sensor001 \
-P 'SENSOR001_PASSWORD'
```
ส่งจาก sensor002

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/002/data" \
-m '{"temp":31,"humi":72,"light":1200}' \
-u sensor002 \
-P 'SENSOR002_PASSWORD'
```
Gateway ควรเห็นทั้ง

```text
001
002
```
เพราะ ACL ให้

```conf
topic read pkru/iot/+/data
```

---

## 24.29 Test 6 — Dashboard Read

ใช้

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u dashboard \
-P 'DASHBOARD_PASSWORD' \
-v
```
Dashboard ควรอ่าน Sensor Data ได้

แต่ตาม ACL ปัจจุบัน Dashboard ไม่มีสิทธิ์

```text
WRITE cmd
```
นี่เป็นตัวอย่างของ

```text
Read-only Client
```

---

## 24.30 Test 7 — Dashboard พยายาม Control

ลอง

```bash
mosquitto_pub \
-h localhost \
-t "pkru/iot/001/cmd" \
-m "ON" \
-u dashboard \
-P 'DASHBOARD_PASSWORD'
```
ตาม ACL ที่กำหนดไว้

```text
dashboard
```
ไม่มี

```conf
topic write pkru/iot/+/cmd
```
ดังนั้น Command ต้องไม่ถูกส่งผ่าน Broker

นี่แสดงให้เห็นว่า

```text
Authentication ผ่าน
```
ไม่ได้หมายความว่า

```text
มีสิทธิ์ทุกอย่าง
```

---

## 24.31 Authentication ≠ Authorization

ตัวอย่าง

```text
Username = dashboard
Password = correct
```
ดังนั้น

```text
Authentication = PASS
```
แต่พยายาม

```text
WRITE
pkru/iot/001/cmd
```
ACL ไม่อนุญาต

ดังนั้น

```text
Authorization = DENY
```
Pipeline

```text
Correct Password
      ↓
Authenticated
      ↓
   ACL Check
      ↓
Permission Denied
```

---

## 24.32 ACL กับ MQTT Wildcard

ACL สามารถใช้ Topic Pattern เช่น

```text
pkru/iot/+/data
```
ทำให้ Gateway อ่าน Data ของหลาย Device ได้

แต่ควรให้สิทธิ์กว้างเฉพาะ Account ที่มีหน้าที่จริง

ตัวอย่าง

```text
gateway
```
อาจต้องอ่านทุก Device

แต่

```text
sensor001
```
ไม่ควรใช้

```text
pkru/iot/+/data
```
เพราะจะกว้างเกินหน้าที่

---

## 24.33 Dynamic ACL ด้วย `%u`

Mosquitto ACL สามารถใช้ Pattern ที่อ้างอิง Username ได้

เช่น

```conf
pattern write pkru/iot/%u/data
```
ถ้า Username คือ

```text
001
```
จะเขียนได้ที่

```text
pkru/iot/001/data
```
ถ้า Username คือ

```text
002
```
จะเขียนได้ที่

```text
pkru/iot/002/data
```
ช่วยลดการเขียน ACL ซ้ำจำนวนมาก

---

## 24.34 ออกแบบ Username ให้สัมพันธ์กับ Device ID

ถ้าต้องการใช้ `%u`

สามารถตั้ง Account เป็น

```text
001
002
003
```
แล้ว ACL

```conf
pattern write pkru/iot/%u/data
pattern write pkru/iot/%u/status
pattern read pkru/iot/%u/cmd
```
ผล

User

```text
001
```
สามารถ

```text
WRITE pkru/iot/001/data
WRITE pkru/iot/001/status
READ  pkru/iot/001/cmd
```
โดยอัตโนมัติ

---

## 24.35 Static ACL vs Pattern ACL

### Static ACL

```conf
user sensor001
topic write pkru/iot/001/data
```
ข้อดี

- อ่านง่าย
- เหมาะกับ LAB
- เห็น Mapping ชัดเจน

ข้อเสีย

- Device เยอะแล้ว File ยาว

---

### Pattern ACL

```conf
pattern write pkru/iot/%u/data
```
ข้อดี

- Scale ได้ง่าย
- ลด Configuration ซ้ำ

ข้อเสีย

- ต้องออกแบบ Username/Topic ให้สัมพันธ์กัน

สำหรับ LAB 24 แนะนำให้เริ่มจาก

```text
Static ACL
```
ก่อน

แล้วใช้ Pattern ACL เป็นแบบฝึกหัดขั้นสูง

---

## 24.36 Python MQTT Authentication

Python Gateway จาก LAB 20–23 ต้องเพิ่ม Credentials

ก่อน

```text
connect()
```
เพิ่ม

```python
client.username_pw_set(
    "gateway",
    "GATEWAY_PASSWORD"
)
```
จากนั้น

```python
client.connect(
    "localhost",
    1883,
    60
)
```
ตัวอย่าง

```python
client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="python-gateway"
)

client.username_pw_set(
    "gateway",
    "GATEWAY_PASSWORD"
)

client.connect(
    "localhost",
    1883,
    60
)
```

---

## 24.37 Store-and-Forward ต้องเพิ่ม Authentication เช่นกัน

LAB 23 มี

```text
local_client
```
และ

```text
remote_client
```
ถ้า Broker ทั้งสองเปิด Authentication

ต้องกำหนด Credentials แยก

เช่น

```python
local_client.username_pw_set(
    "gateway",
    "LOCAL_PASSWORD"
)
```
และ

```python
remote_client.username_pw_set(
    "gateway",
    "REMOTE_PASSWORD"
)
```
ไม่จำเป็นต้องใช้ Password เดียวกัน

และในระบบจริงไม่ควรสมมติว่า Credential ของ Local Broker กับ Remote Broker เหมือนกัน

---

## 24.38 Node-RED MQTT Authentication

ใน MQTT Broker Configuration ของ Node-RED

กำหนด

```text
Username
Password
```
เช่น Account

```text
dashboard
```
สำหรับ Flow ที่อ่านข้อมูล

ถ้า Flow ต้องควบคุม Device

อาจใช้ Account ที่ได้รับ

```text
WRITE cmd
```
ตาม ACL

แต่ไม่ควรใช้ Account ที่มีสิทธิ์กว้างเกินความจำเป็นเพียงเพราะตั้งค่าง่าย

---

## 24.39 แยก Account ตามบทบาท

แนวทางที่ดี

```text
sensor001
    → Device 001

sensor002
    → Device 002

sensor003
    → Device 003

gateway
    → Python Gateway

dashboard
    → Monitoring
```
ถ้ามี Control Application แยก

อาจสร้าง

```text
controller
```
เพื่อให้สิทธิ์

```text
READ data
WRITE cmd
```
แยกจาก Dashboard แบบ Read-only

---

## 24.40 Role-based Design

ตัวอย่าง

| Account | Read Data | Write Data | Read Cmd | Write Cmd |
|---|---:|---:|---:|---:|
| sensor001 | No | Own | Own | No |
| sensor002 | No | Own | Own | No |
| gateway | All | No | No | All |
| dashboard | All | No | No | No |
| controller | All | No | No | All |

นี่เป็นเพียงตัวอย่าง Architecture

Permission จริงต้องกำหนดตามหน้าที่ของระบบ

---

## 24.41 Device ไม่ควร Publish Command

Device 001 มีหน้าที่

```text
Publish Data
Publish Status
Subscribe Command
```
ดังนั้นไม่ควรมีสิทธิ์

```text
WRITE
pkru/iot/001/cmd
```
เพราะ Device ไม่ใช่ Control Authority

การแยกสิทธิ์แบบนี้ช่วยลดความเสียหายหาก Device Account ถูกนำไปใช้ผิดวัตถุประสงค์

---

## 24.42 Gateway ไม่จำเป็นต้องมี `#`

วิธีง่ายแต่กว้างเกินไปคือ

```conf
user gateway
topic readwrite #
```
แต่ถ้า Gateway ต้องการเพียง

```text
READ data
READ status
WRITE cmd
```
ควรกำหนดเฉพาะ

```conf
topic read pkru/iot/+/data
topic read pkru/iot/+/status
topic write pkru/iot/+/cmd
```
นี่คือ

```text
Least Privilege
```

---

## 24.43 ทดสอบ Wrong Password

ลอง

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u gateway \
-P 'WRONG_PASSWORD' \
-v
```
Broker ต้องไม่อนุญาตให้เชื่อมต่อสำเร็จ

นี่คือ

```text
Authentication Failure
```

---

## 24.44 ทดสอบ Unknown User

ลอง

```bash
mosquitto_sub \
-h localhost \
-t "pkru/iot/+/data" \
-u unknown \
-P '1234' \
-v
```
Broker ต้องปฏิเสธ

เพราะไม่มี Account

```text
unknown
```
ใน Password File

---

## 24.45 ดู Mosquitto Log

ใช้

```bash
journalctl \
-u mosquitto \
-f
```
จากนั้นทดลอง

```text
Wrong Password
Unknown User
Unauthorized Topic
```
สังเกต Broker Log

การ Debug MQTT Security ควรตรวจทั้ง

```text
Client Error
      +
Broker Log
```
ไม่ควรดูเพียงฝั่ง Client

---

## 24.46 ตรวจสอบ Client ที่ใช้งานอยู่หลังเปิด Security

เมื่อเปิด

```conf
allow_anonymous false
```
Client เดิมทั้งหมดที่ไม่มี Credentials อาจหยุดทำงาน

เช่น

```text
ESP32
Python Gateway
Node-RED
Simulator
Store-and-Forward Service
```
ดังนั้นหลังเปิด Authentication ต้องตรวจสอบทุก Component

---

## 24.47 Migration Checklist

หลังเปิด Security

ตรวจสอบ

```text
[ ] ESP32 credentials

[ ] Python Gateway credentials

[ ] Node-RED credentials

[ ] Store-and-Forward credentials

[ ] Command-line test credentials

[ ] Device ACL

[ ] Gateway ACL

[ ] Dashboard ACL
```
ถ้าลืม Client ใด Client หนึ่ง

ระบบส่วนนั้นอาจหยุดทำงาน

---

## 24.48 Security Testing ต้องทดสอบทั้ง PASS และ FAIL

อย่าทดสอบเพียง

```text
sensor001 → own topic → PASS
```
ต้องทดสอบด้วย

```text
sensor001 → device002 topic → FAIL
```
Security ที่ดีต้องพิสูจน์ได้ทั้ง

```text
Allowed Action Works
```
และ

```text
Forbidden Action Fails
```

---

## 24.49 Security Test Matrix

| Test | Expected |
|---|---|
| Anonymous connect | DENY |
| Wrong password | DENY |
| sensor001 → 001/data | ALLOW |
| sensor001 → 002/data | DENY |
| sensor001 ← 001/cmd | ALLOW |
| sensor001 ← 002/cmd | DENY |
| gateway ← +/data | ALLOW |
| gateway → +/cmd | ALLOW |
| dashboard ← +/data | ALLOW |
| dashboard → 001/cmd | DENY |

นักศึกษาต้องทดสอบตาม Matrix นี้

---

## 24.50 Password Authentication ยังไม่เข้ารหัส Traffic

จุดสำคัญมาก

การเปิด

```text
Username / Password
```
ไม่ได้หมายความว่า Network Traffic ถูกเข้ารหัส

ถ้าใช้

```text
MQTT TCP
Port 1883
```
โดยไม่มี TLS

ข้อมูล MQTT และ Credentials ระหว่างการเชื่อมต่อไม่ได้รับการป้องกันแบบ Transport Encryption เหมือน TLS

ดังนั้น

```text
Authentication
    ≠
Encryption
```

---

## 24.51 Security Layers

ระบบสามารถแบ่งเป็น

```text
Layer 1
Authentication

Username / Password

      ↓

Layer 2
Authorization

ACL

      ↓

Layer 3
Transport Security

TLS
```
LAB 24 เน้น

```text
Layer 1
Layer 2
```
ส่วน TLS สามารถเพิ่มเป็น Advanced LAB หรือส่วนขยายภายหลัง

---

## 24.52 Port 1883 และ 8883

โดยทั่วไป

```text
1883
```
ใช้ MQTT over TCP โดยไม่มี TLS

ส่วน

```text
8883
```
มักใช้ MQTT over TLS

แต่ Port Number อย่างเดียวไม่ได้สร้าง Security

ต้องมี

```text
Certificate
TLS Configuration
Client Verification
```
อย่างถูกต้องด้วย

---

## 24.53 Local-only MQTT ยังควรมี Authentication หรือไม่

ถ้า Broker อยู่ใน LAN ที่ควบคุมได้

ความเสี่ยงต่ำกว่า Public Broker

แต่ยังมีเหตุผลให้ใช้ Authentication เช่น

- มีนักศึกษาหลายคนใน Network
- มี Device จำนวนมาก
- มี Actuator
- มี Command Topic
- ต้องการแยก Permission
- ป้องกัน Publish ผิด Topic โดยไม่ตั้งใจ

ดังนั้น

```text
Internal Network
```
ไม่ได้แปลว่า

```text
Trust Everyone
```

---

## 24.54 Authentication ช่วยเรื่อง Human Error ด้วย

ACL ไม่ได้ช่วยเฉพาะการโจมตี

แต่ช่วยป้องกัน

```text
Configuration Error
```
ตัวอย่าง

นักศึกษา Device 001 เขียน Topic ผิดเป็น

```text
pkru/iot/002/data
```
ถ้ามี ACL

Broker จะไม่ยอมให้ sensor001 เขียน Topic ของ sensor002

จึงช่วยเพิ่ม

```text
System Integrity
```
ด้วย

---

## 24.55 MQTT Security Architecture

```text
┌──────────────┐
│ ESP32-001    │
│ sensor001    │
└──────┬───────┘
       │
       │ WRITE 001/data
       │ WRITE 001/status
       │ READ  001/cmd
       ▼
┌─────────────────────────┐
│ Mosquitto               │
│                         │
│ Authentication          │
│  └── passwd             │
│                         │
│ Authorization           │
│  └── ACL                │
└───────────┬─────────────┘
            │
   ┌────────┼────────┐
   ▼        ▼        ▼
Gateway  Dashboard Controller
```

---

## 24.56 Password ไม่ควร Hard-code ใน Source Code

ตัวอย่างที่ง่ายแต่ไม่เหมาะกับ Production

```python
mqtt_password = "MyPassword123"
```
เพราะ Password อยู่ใน Source Code

และอาจถูก

```text
Commit
Share
Screenshot
Backup
```
ไปโดยไม่ตั้งใจ

LAB สามารถเริ่มจาก Hard-code เพื่อเรียน API ได้

แต่ควรอธิบายว่าระบบจริงควรแยก

```text
Configuration
Secrets
Source Code
```
ออกจากกัน

---

## 24.57 Environment File สำหรับ Python Service

สามารถสร้าง

```bash
sudo nano \
/etc/iot-gateway.env
```
ตัวอย่าง

```env
MQTT_USERNAME=gateway
MQTT_PASSWORD=your_password
```
กำหนด Permission

```bash
sudo chown root:root \
/etc/iot-gateway.env

sudo chmod 600 \
/etc/iot-gateway.env
```
แล้ว Service สามารถใช้

```ini
EnvironmentFile=/etc/iot-gateway.env
```

---

## 24.58 systemd Service พร้อม Environment File

ตัวอย่าง

```ini
[Unit]
Description=Python IoT Gateway
After=network-online.target mosquitto.service
Wants=network-online.target
Requires=mosquitto.service

[Service]
Type=simple
User=PI_USER
WorkingDirectory=/home/PI_USER/iot-gateway
EnvironmentFile=/etc/iot-gateway.env
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python -u /home/PI_USER/iot-gateway/gateway.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
จากนั้น Python อ่านด้วย

```python
import os

mqtt_username = os.environ[
    "MQTT_USERNAME"
]

mqtt_password = os.environ[
    "MQTT_PASSWORD"
]
```

---

## 24.59 Python Credentials จาก Environment

ตัวอย่าง

```python
import os

import paho.mqtt.client as mqtt


mqtt_username = os.environ[
    "MQTT_USERNAME"
]

mqtt_password = os.environ[
    "MQTT_PASSWORD"
]


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="python-gateway"
)

client.username_pw_set(
    mqtt_username,
    mqtt_password
)

client.connect(
    "localhost",
    1883,
    60
)
```
Source Code จึงไม่มี Password โดยตรง

---

## 24.60 หลังแก้ systemd Service

ถ้าเพิ่ม

```ini
EnvironmentFile=
```
ต้องใช้

```bash
sudo systemctl daemon-reload
```
แล้ว

```bash
sudo systemctl restart \
iot-gateway
```
ตรวจสอบ

```bash
systemctl status \
iot-gateway
```
และ

```bash
journalctl \
-u iot-gateway \
-n 50
```

---

## 24.61 ห้ามแสดง Password ใน Log

ไม่ควรเขียน

```python
print(mqtt_password)
```
หรือ

```text
print(
    username,
    password
)
```
Log อาจถูกเก็บไว้นาน

และอาจถูกผู้ใช้อื่นอ่านได้ตาม Permission ของระบบ

หลักการคือ

```text
Log Events
Not Secrets
```

---

## 24.62 เปลี่ยน Password

ใช้

```bash
sudo mosquitto_passwd \
/etc/mosquitto/passwd \
sensor001
```
กำหนด Password ใหม่

จากนั้น Client ที่ใช้ Password เก่าจะเชื่อมต่อไม่ได้

ต้อง Update Credential ใน Device ที่เกี่ยวข้อง

นี่คือ

```text
Credential Rotation
```

---

## 24.63 ลบ User

ใช้

```bash
sudo mosquitto_passwd \
-D \
/etc/mosquitto/passwd \
sensor003
```
จากนั้นตรวจสอบ ACL ด้วย

ถ้า User ถูกลบจาก Password File

แม้ ACL ยังมี

```conf
user sensor003
```
Client ก็ไม่สามารถ Authenticate ด้วย Account นั้นได้

แต่ควรลบ ACL ที่ไม่ใช้เพื่อให้ Configuration สะอาดและตรวจสอบง่าย

---

## 24.64 เพิ่ม Device ใหม่

สมมติเพิ่ม

```text
Device 004
```
สร้าง Account

```bash
sudo mosquitto_passwd \
/etc/mosquitto/passwd \
sensor004
```
เพิ่ม ACL

```conf
user sensor004
topic write pkru/iot/004/data
topic write pkru/iot/004/status
topic read pkru/iot/004/cmd
```
จากนั้น Reload/Restart Mosquitto ตาม Configuration Management ที่ใช้

และทดสอบ

```text
ALLOW
DENY
```
ทั้งสองกรณี

---

## 24.65 Device Provisioning

ขั้นตอนเพิ่ม Device จึงเป็น

```text
Create Device ID
      ↓
Create MQTT Account
      ↓
Create Password
      ↓
Create ACL
      ↓
Configure Device
      ↓
Test Authentication
      ↓
Test Authorization
```
นี่คือพื้นฐานของ

```text
Device Provisioning
```

---

## 24.66 แยก Identity ของแต่ละ Device

ไม่ควรใช้ Account เดียวกัน เช่น

```text
iotuser
```
กับ ESP32 ทุกตัวถ้าระบบต้องการแยกสิทธิ์และตรวจสอบ Device

เพราะถ้า Password รั่ว

```text
Device ทุกตัว
```
ได้รับผลกระทบ

และ Broker ไม่สามารถแยกง่าย ๆ ว่า Client ใดเป็น Device ใด

แนวทางที่ดีกว่า

```text
sensor001
sensor002
sensor003
```
หรือใช้ Identity Scheme ที่สัมพันธ์กับ Device ID

---

## 24.67 Shared Account ใช้ได้เมื่อใด

สำหรับ LAB เบื้องต้นหรือระบบเล็กมาก

อาจใช้

```text
iotuser
```
ร่วมกันเพื่อให้ Configuration ง่าย

แต่เมื่อเริ่มเรียน

```text
ACL
Device Identity
Audit
Least Privilege
```
ควรเปลี่ยนเป็น

```text
Per-device Account
```
เพื่อให้นักศึกษาเข้าใจ Architecture ที่เหมาะกับระบบที่ขยายได้

---

## 24.68 Security กับ LWT

LAB 18 ใช้

```text
pkru/iot/001/status
```
Device ต้องมีสิทธิ์

```text
WRITE
```
Topic นี้

เพราะ

```text
ONLINE
```
และ

```text
LWT OFFLINE
```
ถูก Publish ภายใต้ Identity ของ Device

ดังนั้น ACL ต้องอนุญาต

```conf
topic write pkru/iot/001/status
```
ไม่เช่นนั้น Status Architecture อาจทำงานไม่ครบ

---

## 24.69 Security กับ Command

Command Topic มีความสำคัญสูงกว่า Sensor Data ในหลายระบบ

เพราะ

```text
Sensor Data
```
ส่วนใหญ่เป็น Monitoring

แต่

```text
Command
```
อาจเปลี่ยน Physical State

เช่น

```text
Motor ON
Pump ON
Relay ON
Valve OPEN
```
ดังนั้น

```text
WRITE cmd
```
ควรให้เฉพาะ Client ที่มีหน้าที่ Control

---

## 24.70 Security กับ Store-and-Forward

LAB 23 มี Remote Broker

ดังนั้น Security Architecture อาจเป็น

```text
Local Broker
   │
   │ Local Credentials
   ▼
Gateway
   │
   │ Remote Credentials
   ▼
Remote Broker
```
ควรแยก

```text
Local Account
```
และ

```text
Remote Account
```
ตามระบบ

ไม่ควรใช้ Credential ชุดเดียวทุก Layer โดยไม่จำเป็น

---

## 24.71 Security ไม่ควรทำให้ Offline Operation หยุด

แม้ Remote Authentication มีปัญหา

เช่น

```text
Wrong Password
Remote Account Disabled
```
Local Gateway ยังควร

```text
Receive Local Data
Validate
Store SQLite
Local Dashboard
Local Control
```
ทำงานต่อ

และ Remote Forwarding จึงค่อย

```text
Fail
  ↓
Keep PENDING
```
นี่เป็นการรวมแนวคิด LAB 23 กับ LAB 24

---

## 24.72 ตัวอย่าง Failure

สมมติ Remote MQTT Password ถูกเปลี่ยน

Gateway ใช้ Password เก่า

ผล

```text
Remote Authentication
       ↓
      FAIL
```
แต่

```text
Local MQTT
   ↓
SQLite
   ↓
PENDING
```
ยังทำงาน

เมื่อแก้ Credential

```text
Remote Authentication
       ↓
      PASS
       ↓
   Retry Queue
       ↓
      SENT
```
ระบบจึงไม่ควรทิ้ง Data เพียงเพราะ Authentication ของ Remote Service มีปัญหาชั่วคราว

---

## 24.73 แบบฝึกหัดที่ 1 — Disable Anonymous

ตั้ง

```conf
allow_anonymous false
```
ทดสอบ Client ที่ไม่มี Username/Password

ผลต้องเป็น

```text
DENY
```

---

## 24.74 แบบฝึกหัดที่ 2 — Authentication

สร้าง

```text
sensor001
gateway
dashboard
```
ทดสอบ

```text
Correct Password → CONNECT

Wrong Password → DENY

Unknown User → DENY
```

---

## 24.75 แบบฝึกหัดที่ 3 — Device ACL

กำหนด

```text
sensor001
```
ให้

```text
WRITE
pkru/iot/001/data
```
และ

```text
READ
pkru/iot/001/cmd
```
ทดสอบ

```text
001/data → ALLOW

002/data → DENY
```

---

## 24.76 แบบฝึกหัดที่ 4 — Gateway ACL

กำหนด

```text
gateway
```
ให้

```text
READ
pkru/iot/+/data

READ
pkru/iot/+/status

WRITE
pkru/iot/+/cmd
```
ทดสอบข้อมูลจากอย่างน้อย

```text
001
002
003
```

---

## 24.77 แบบฝึกหัดที่ 5 — Read-only Dashboard

กำหนด

```text
dashboard
```
ให้

```text
READ
pkru/iot/+/data

READ
pkru/iot/+/status
```
แต่ไม่มี

```text
WRITE cmd
```
ทดสอบ

```text
Dashboard Read → ALLOW

Dashboard Control → DENY
```

---

## 24.78 แบบฝึกหัดที่ 6 — Python Authentication

แก้

```text
gateway.py
```
ให้ใช้ Username/Password

ทดสอบว่า

```text
Python Gateway
```
ยัง Subscribe Sensor Data และ Publish Command ได้

---

## 24.79 แบบฝึกหัดที่ 7 — Environment File

ย้าย

```text
MQTT Username
MQTT Password
```
ออกจาก Python Source

ไปยัง

```text
/etc/iot-gateway.env
```
จากนั้น Run ผ่าน

```text
systemd
```
ตรวจสอบว่า Service ทำงานได้

---

## 24.80 แบบฝึกหัดที่ 8 — Security Test Matrix

ทดสอบ

```text
Anonymous          → DENY

Wrong Password     → DENY

Unknown User       → DENY

sensor001/001/data → ALLOW

sensor001/002/data → DENY

sensor001/001/cmd  → READ ALLOW

sensor001/002/cmd  → READ DENY

gateway/+/data     → READ ALLOW

gateway/+/cmd      → WRITE ALLOW

dashboard/+/data   → READ ALLOW

dashboard/001/cmd  → WRITE DENY
```
บันทึกผลเป็นตาราง

---

## 24.81 แบบฝึกหัดขั้นสูง — Pattern ACL

เปลี่ยน Device Account เป็น

```text
001
002
003
```
สร้าง ACL

```conf
pattern write pkru/iot/%u/data
pattern write pkru/iot/%u/status
pattern read pkru/iot/%u/cmd
```
ทดสอบ

User 001

```text
pkru/iot/001/data
    → ALLOW

pkru/iot/002/data
    → DENY
```
อธิบายข้อดีของ Pattern ACL เมื่อมี Device จำนวนมาก

---

## 24.82 งานส่ง LAB 24

นักศึกษาส่ง

1. Architecture Diagram

```text
   MQTT Client
        ↓
   Authentication
        ↓
       ACL
        ↓
   MQTT Topic
```
2. Configuration

```text
   security.conf
```
3. ACL File

```text
   /etc/mosquitto/acl
```
4. หลักฐาน

```conf
   allow_anonymous false
```
5. Screenshot Anonymous Client ถูกปฏิเสธ

6. Screenshot Wrong Password ถูกปฏิเสธ

7. Screenshot sensor001 Publish

```text
   pkru/iot/001/data
```
   สำเร็จ

8. หลักฐาน sensor001 ไม่สามารถ Publish

```text
   pkru/iot/002/data
```
9. Screenshot sensor001 รับ

```text
   pkru/iot/001/cmd
```
10. หลักฐาน sensor001 ไม่สามารถอ่าน

```text
   pkru/iot/002/cmd
```
11. Screenshot Gateway รับข้อมูลหลาย Device

12. Screenshot Dashboard อ่าน Data ได้

13. หลักฐาน Dashboard ไม่สามารถ Publish Command

14. Screenshot Mosquitto Log

15. Source Code Python ที่ใช้ Authentication

16. ถ้าใช้ systemd ให้แสดง

```text
   EnvironmentFile
```
   โดยไม่เปิดเผย Password ในรายงาน

17. อธิบาย

```text
   Authentication
```
18. อธิบาย

```text
   Authorization
```
19. อธิบาย

```text
   ACL
```
20. อธิบาย

```text
   Least Privilege
```
21. อธิบายว่าเหตุใด

```text
   Username/Password
```
   ไม่เท่ากับ

```text
   Encryption
```
22. อธิบายว่าเหตุใด Device แต่ละตัวควรมี Identity แยกกันในระบบที่ต้องการควบคุมสิทธิ์อย่างจริงจัง

---

## 24.83 Checklist ก่อนถือว่าผ่าน LAB

```text
[ ] Anonymous Client ถูกปฏิเสธ

[ ] Correct Username/Password เชื่อมต่อได้

[ ] Wrong Password ถูกปฏิเสธ

[ ] Unknown User ถูกปฏิเสธ

[ ] sensor001 เขียน 001/data ได้

[ ] sensor001 เขียน 002/data ไม่ได้

[ ] sensor001 อ่าน 001/cmd ได้

[ ] sensor001 อ่าน 002/cmd ไม่ได้

[ ] gateway อ่านข้อมูลหลาย Device ได้

[ ] gateway ส่ง Command ได้

[ ] dashboard อ่าน Data ได้

[ ] dashboard เขียน Command ไม่ได้

[ ] Python Gateway ใช้ Authentication ได้

[ ] Node-RED ใช้ Authentication ได้

[ ] Mosquitto Restart แล้วทำงานปกติ

[ ] ตรวจสอบ Broker Log ได้

[ ] ไม่มี Password ถูกเขียนลง Log
```
ถ้าผ่านทั้งหมด

ระบบมี

```text
MQTT Authentication
        +
Topic-level Authorization
```
ในระดับพื้นฐานแล้ว

---

## 24.84 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 24

```text
Client
   ↓
MQTT Broker
   ↓
Topics
```
Client ที่เข้าถึง Broker อาจมีสิทธิ์มากเกินไป

หลัง LAB 24

```text
Client
   ↓
Identity
   ↓
Authentication
   ↓
ACL
   ↓
Authorized Topics
```
ดังนั้น Broker สามารถตอบได้ว่า

```text
Who are you?
```
และ

```text
What are you allowed to do?
```

---

## 24.85 Security Model หลัง LAB 24

ตัวอย่าง Device 001

```text
sensor001
    │
    ├── WRITE
    │   pkru/iot/001/data
    │
    ├── WRITE
    │   pkru/iot/001/status
    │
    └── READ
        pkru/iot/001/cmd
```
Device 002

```text
sensor002
    │
    ├── WRITE
    │   pkru/iot/002/data
    │
    ├── WRITE
    │   pkru/iot/002/status
    │
    └── READ
        pkru/iot/002/cmd
```
Gateway

```text
gateway
    │
    ├── READ
    │   pkru/iot/+/data
    │
    ├── READ
    │   pkru/iot/+/status
    │
    └── WRITE
        pkru/iot/+/cmd
```
Dashboard

```text
dashboard
    │
    ├── READ
    │   pkru/iot/+/data
    │
    └── READ
        pkru/iot/+/status
```

---

## 24.86 ความสัมพันธ์ของ LAB 20–24

LAB 20

```text
Python MQTT Application

      ↓
```
LAB 21

```text
systemd Service

      ↓
```
LAB 22

```text
Multi-protocol Gateway

      ↓
```
LAB 23

```text
Store-and-Forward

      ↓
```
LAB 24

```text
Authentication
Authorization
ACL
```
เส้นทางการพัฒนาคือ

```text
Program
   ↓
Autonomous
   ↓
Multi-protocol
   ↓
Offline-capable
   ↓
Access-controlled
```

---

## 24.87 Architecture หลัง LAB 24

```text
                     IoT DEVICES

         ESP32-001     ESP32-002
         sensor001     sensor002
             │             │
             │ MQTT Auth   │ MQTT Auth
             └──────┬──────┘
                    ▼
          ┌─────────────────────┐
          │ Mosquitto           │
          │                     │
          │ Authentication      │
          │ Username / Password │
          │                     │
          │ Authorization       │
          │ ACL                 │
          └──────────┬──────────┘
                     │
         ┌───────────┼────────────┐
         ▼           ▼            ▼
      Python      Node-RED     Controller
      Gateway     Dashboard
         │
         ▼
    Validation
         │
         ▼
     Processing
         │
   ┌─────┴─────┐
   ▼           ▼
SQLite       Control
   │
   ▼
Store-and-
 Forward
   │
   ▼
Remote MQTT
```
ทุก MQTT Client มี

```text
Identity
   +
Credentials
   +
Permissions
```

---

## 24.88 จุดสำคัญที่สุดของ LAB

Security ของ MQTT ไม่ควรคิดเพียงว่า

```text
"ใส่ Password แล้วปลอดภัย"
```
แต่ต้องแยกอย่างชัดเจนว่า

```text
Authentication
      ↓
Who are you?
```
และ

```text
Authorization
      ↓
What can you do?
```
พร้อมใช้หลัก

```text
Least Privilege
```
ตัวอย่าง

```text
Sensor
   → Publish เฉพาะ Data ของตัวเอง
   → Publish Status ของตัวเอง
   → Subscribe Command ของตัวเอง

Gateway
   → Read Sensor Data
   → Read Status
   → Publish Command

Dashboard
   → Read Monitoring Data
```
ระบบจึงลดทั้ง

```text
Unauthorized Access
```
และ

```text
Accidental Misconfiguration
```

---

## 24.89 ข้อจำกัดที่ต้องจำ

หลังจบ LAB 24 เรามี

```text
Username / Password
        +
       ACL
```
แต่ถ้ายังใช้

```text
MQTT TCP :1883
```
โดยไม่มี TLS

เรายังไม่ได้แก้ปัญหา

```text
Transport Encryption
```
ดังนั้น Security Stack ที่สมบูรณ์กว่าจะเป็น

```text
Device Identity
      ↓
Authentication
      ↓
Authorization / ACL
      ↓
TLS Encryption
      ↓
Secure Credential Storage
      ↓
Logging / Monitoring
```
LAB 24 สร้างฐานสำคัญสองส่วนแรกคือ

```text
Authentication
Authorization
```

---

## เชื่อมไป LAB 25 --- Remote Access with Cloudflare Tunnel

หลัง LAB 24 ระบบภายใน LAN มี

```text
MQTT Authentication
MQTT ACL
Python Gateway
Node-RED
Dashboard
SQLite
Store-and-Forward
```
แต่ผู้ดูแลระบบอาจต้องการเข้าถึง Raspberry Pi จากภายนอกมหาวิทยาลัยหรือภายนอก LAN

เช่น

```text
Remote Node-RED
```
หรือ

```text
Remote SSH
```
ปัญหาคือ Network อาจอยู่หลัง

```text
NAT
CGNAT
University Network
```
และเราไม่ต้องการเปิด

```text
Port Forwarding
```
โดยตรง

LAB 25 จะใช้

```text
Cloudflare Tunnel
```
Architecture

```text
Administrator
      │
      │ Internet
      ▼
  Cloudflare
      │
      │ Tunnel
      ▼
Raspberry Pi
      │
      ├── Node-RED
      └── SSH
```
แนวคิดคือ Raspberry Pi สร้าง

```text
Outbound Tunnel
```
ออกไป

จึงไม่จำเป็นต้องมี

```text
Public IPv4
```
หรือเปิด Incoming Port บน Router

LAB 25 จะเพิ่มความสามารถ

```text
Remote Monitoring
Remote Administration
```
ให้กับ IoT Gateway โดยยังแยกเรื่อง Remote Access ออกจาก MQTT Topic Permission อย่างชัดเจน
