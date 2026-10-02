> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[22 - LAB 22 - IoT Gateway - BLE UDP MQTT Protocol Translation]]
> ถัดไป: [[24 - LAB 24 - MQTT Security - Authentication and ACL]]

# LAB 23 --- Offline / Store-and-Forward with SQLite

> [!info] แก้ไขล่าสุด
> 2026-10-01 23:52:22 +07


## 23.1 แนวคิดของ LAB

จนถึง LAB 22 Raspberry Pi สามารถทำหน้าที่เป็น IoT Gateway รับข้อมูลจากหลาย Protocol

```text
BLE ──┐
      │
UDP ──┼──→ Raspberry Pi Gateway
      │
MQTT ─┘
                │
                ▼
             MQTT
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
   Node-RED   SQLite   Dashboard
```
ระบบสามารถทำงานภายใน LAN ได้แม้ไม่มี Internet

แต่ถ้าระบบต้องส่งข้อมูลต่อไปยัง

```text
Remote MQTT Broker
Cloud Server
Cloud Database
```
จะเกิดปัญหาเมื่อ Internet ขาด

Architecture แบบตรง

```text
Sensor
   ↓
Gateway
   ↓
Internet
   X
   ↓
 Cloud
```
ถ้า Gateway พยายามส่งข้อมูลเพียงครั้งเดียวแล้วทิ้ง

ข้อมูลช่วงที่ Internet ขาดอาจสูญหาย

LAB 23 จะแก้ปัญหานี้ด้วยแนวคิด

```text
Store-and-Forward
```
หลักการคือ

```text
Receive Data
     ↓
Store Locally
     ↓
Try Forward
     │
     ├── Success → Mark Sent
     │
     └── Failure → Keep Pending
                          ↓
                    Retry Later
```
SQLite จะทำหน้าที่เป็น

```text
Persistent Local Buffer
```
ข้อมูลจึงยังอยู่แม้

```text
Internet ขาด
Python Restart
Raspberry Pi Reboot
```


## 23.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบายแนวคิด Store-and-Forward
- อธิบายความแตกต่างระหว่าง Memory Buffer และ Persistent Buffer
- ใช้ SQLite เป็น Local Buffer
- เก็บ Sensor Data ก่อน Forward
- กำหนดสถานะ PENDING / SENT
- ตรวจสอบข้อมูลที่ยังไม่ได้ส่ง
- Retry ข้อมูลหลัง Network กลับมา
- ป้องกันข้อมูลสูญหายจาก Internet Failure
- ทดสอบ Offline Operation
- ทดสอบ Recovery หลัง Network กลับมา
- ทดสอบ Recovery หลัง Process Restart
- เข้าใจข้อจำกัดของ Store-and-Forward
- เข้าใจแนวคิด Duplicate Delivery และ Message Identity


## 23.3 Architecture

```text
IoT Nodes
    │
    │ BLE / UDP / MQTT
    ▼
Raspberry Pi Gateway
    │
    ▼
Data Validation
    │
    ▼
  SQLite
Local Buffer
    │
    ▼
  PENDING
    │
    ▼
Forward Worker
    │
    ├── Success ──→ SENT
    │
    └── Failure ──→ PENDING
                       │
                       ▼
                  Retry Later
```
เมื่อ Internet กลับมา

```text
PENDING
   ↓
Retry
   ↓
Remote Server
   ↓
Success
   ↓
 SENT
```


## 23.4 ทำไมต้อง Store ก่อน Forward

แนวทางที่เสี่ยงคือ

```text
Sensor
   ↓
Publish Cloud
   │
   ├── Success → OK
   │
   └── Failure → Lost
```
แนวทาง Store-and-Forward

```text
Sensor
   ↓
Store SQLite
   ↓
PENDING
   ↓
Forward
   │
   ├── Success → SENT
   │
   └── Failure → Keep PENDING
```
หลักสำคัญคือ

```text
Store First
   ↓
Forward Later
```
ไม่ใช่

```text
Forward First
   ↓
Store only if failed
```
เพราะ Store First ทำให้มี Local Record ก่อนพยายามส่งออก


## 23.5 Persistent Buffer

ถ้าใช้ Python List

```text
pending_data = []
```
ข้อมูลอยู่ใน RAM

ถ้า

```text
Python Crash
Raspberry Pi Reboot
Power Loss
```
ข้อมูลใน RAM จะหาย

แต่ SQLite เก็บลง Storage

```text
RAM
 X
 │
 ▼
Reboot
 │
 ▼
Data Lost
```
เทียบกับ

```text
SQLite
  │
  ▼
Storage
  │
  ▼
Reboot
  │
  ▼
Data Still Exists
```
ดังนั้น SQLite เหมาะสำหรับ

```text
Persistent Local Buffer
```


## 23.6 ตรวจสอบ SQLite

ใช้

```bash
sqlite3 --version
```
ถ้ายังไม่มี

```bash
sudo apt update

sudo apt install sqlite3 -y
```


## 23.7 สร้าง Project Database

ใช้ Project เดิม

```bash
cd ~/iot-gateway
```
สร้าง Database

```bash
sqlite3 store_forward.db
```
จะเข้าสู่

```text
sqlite>
```


## 23.8 สร้าง Table

สร้าง

```sql
CREATE TABLE queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    temp REAL,
    humi REAL,
    light REAL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at INTEGER
);
```
ตรวจสอบ

```text
.schema queue
```
ออก

```text
.quit
```


## 23.9 โครงสร้าง Table

Field

```text
id
```
คือ Local Message ID


```text
device_id
```
เช่น

```text
001
002
003
```


```text
timestamp
```
เวลาที่ Gateway รับข้อมูล

ใช้ Unix Time


```text
temp
humi
light
```
Sensor Data


```text
status
```
สถานะ

```text
PENDING
SENT
```


```text
retry_count
```
จำนวนครั้งที่พยายาม Forward แล้วไม่สำเร็จ


```text
sent_at
```
เวลาที่ Gateway ยืนยันว่า Forward สำเร็จ


## 23.10 Queue State

เมื่อรับข้อมูล

```text
INSERT
  ↓
PENDING
```
เมื่อส่งสำเร็จ

```text
PENDING
  ↓
 SENT
```
เมื่อส่งไม่สำเร็จ

```text
PENDING
  ↓
retry_count + 1
  ↓
PENDING
```
ดังนั้น State หลักคือ

```text
PENDING
SENT
```


## 23.11 ทดสอบ INSERT

เปิด

```bash
sqlite3 store_forward.db
```
เพิ่มข้อมูล

```sql
INSERT INTO queue (
    device_id,
    timestamp,
    temp,
    humi,
    light
)
VALUES (
    '001',
    strftime('%s','now'),
    30,
    70,
    1500
);
```
ดูข้อมูล

```sql
SELECT * FROM queue;
```
ควรได้ประมาณ

```text
1|001|...|30.0|70.0|1500.0|PENDING|0|
```


## 23.12 ดูเฉพาะ PENDING

ใช้

```text
SELECT
    id,
    device_id,
    timestamp,
    temp,
    humi,
    light,
    retry_count
FROM queue
WHERE status = 'PENDING'
ORDER BY id;
```
นี่คือข้อมูลที่ยังรอ Forward


## 23.13 Mark SENT

สมมติ Record ID 1 ส่งสำเร็จ

ใช้

```sql
UPDATE queue
SET
    status = 'SENT',
    sent_at = strftime('%s','now')
WHERE id = 1;
```
ตรวจสอบ

```sql
SELECT id, device_id, status, sent_at
FROM queue;
```


## 23.14 Architecture ของ Queue

```text
MQTT Message
     ↓
Python Gateway
     ↓
SQLite INSERT
     ↓
  PENDING
     ↓
Forward Worker
     │
     ├── ACK/Success
     │       ↓
     │      SENT
     │
     └── Failure
             ↓
         PENDING
```


## 23.15 Python SQLite

Python มี Module

```text
sqlite3
```
อยู่ใน Standard Library

จึงไม่ต้อง

```text
pip install sqlite3
```
ทดสอบ

```bash
python -c "import sqlite3; print('SQLite OK')"
```
ควรได้

```text
SQLite OK
```


## 23.16 สร้าง Store-and-Forward Application

สร้าง

```bash
nano store_forward.py
```
โครงสร้าง Application

```text
MQTT Input
    │
    ▼
on_message()
    │
    ▼
Validate
    │
    ▼
SQLite INSERT
    │
    ▼
PENDING
    │
    ▼
Forward Worker
```


## 23.17 Database Initialization

ใช้

```python
import sqlite3


database_path = "store_forward.db"


def init_database():
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                temp REAL,
                humi REAL,
                light REAL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                retry_count INTEGER NOT NULL DEFAULT 0,
                sent_at INTEGER
            )
            """
        )

        conn.commit()
```


## 23.18 Store Sensor Data

สร้าง Function

```python
import time


def store_data(
    device_id,
    temp,
    humi,
    light
):
    timestamp = int(
        time.time()
    )

    with sqlite3.connect(
        database_path
    ) as conn:

        cursor = conn.execute(
            """
            INSERT INTO queue (
                device_id,
                timestamp,
                temp,
                humi,
                light,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'PENDING')
            """,
            (
                device_id,
                timestamp,
                temp,
                humi,
                light
            )
        )

        conn.commit()

        return cursor.lastrowid
```


## 23.19 ทำไมใช้ `?`

ไม่ควรสร้าง SQL แบบ

```text
"INSERT ... " + value
```
แต่ใช้

```text
?
```
และส่ง Parameters แยก

ข้อดี

- ลดปัญหา SQL Injection
- ลดปัญหา Quote
- Code อ่านง่าย
- SQLite จัดการ Data Type ให้เหมาะสม

เรียกว่า

```text
Parameterized Query
```


## 23.20 MQTT Input

ใช้ Topic เดิม

```text
pkru/iot/+/data
```
Flow

```text
IoT Device
    ↓
  MQTT
    ↓
Python
    ↓
SQLite
```


## 23.21 MQTT Callback

ตัวอย่าง

```python
import json

import paho.mqtt.client as mqtt


local_broker = "localhost"
local_port = 1883

input_topic = "pkru/iot/+/data"


def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    print(
        f"Local MQTT connected: "
        f"{reason_code}"
    )

    client.subscribe(
        input_topic
    )


def on_message(
    client,
    userdata,
    msg
):
    try:
        parts = msg.topic.split("/")

        if (
            len(parts) != 4 or
            parts[0] != "pkru" or
            parts[1] != "iot" or
            parts[3] != "data"
        ):
            return

        device_id = parts[2]

        payload = msg.payload.decode(
            "utf-8"
        )

        data = json.loads(
            payload
        )

        temp = float(
            data["temp"]
        )

        humi = float(
            data["humi"]
        )

        light = float(
            data["light"]
        )

        record_id = store_data(
            device_id,
            temp,
            humi,
            light
        )

        print(
            f"STORED "
            f"id={record_id} "
            f"device={device_id}"
        )

    except (
        json.JSONDecodeError,
        KeyError,
        TypeError,
        ValueError,
        UnicodeDecodeError
    ) as error:

        print(
            f"INVALID DATA: "
            f"{error}"
        )
```


## 23.22 ทดสอบ Store ก่อนทำ Forward

Run

```bash
cd ~/iot-gateway

source venv/bin/activate

python store_forward.py
```
ถ้า Program ยังไม่สมบูรณ์ ให้ทดสอบ Function ส่วนรับข้อมูลก่อน

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1500}'
```
ตรวจสอบ Database

```bash
sqlite3 store_forward.db \
"SELECT id,device_id,temp,humi,light,status FROM queue;"
```
ควรได้

```text
1|001|30.0|70.0|1500.0|PENDING
```
จุดสำคัญคือ

```text
Data ต้องเข้า SQLite ก่อน
```


## 23.23 Remote Destination

เพื่อเรียน Store-and-Forward ต้องมี

```text
Local Side
```
และ

```text
Remote Side
```
Architecture

```text
Local MQTT
    ↓
Gateway
    ↓
SQLite
    ↓
Remote MQTT
```
ในระบบจริง Remote MQTT อาจอยู่

```text
Cloud
Data Center
Another Raspberry Pi
Remote Server
```
แต่ LAB ไม่จำเป็นต้องพึ่ง Internet จริง

สามารถจำลอง Remote Broker ใน LAN ได้


## 23.24 Topic สำหรับ Forward

ไม่ควร Publish กลับเข้า Topic Input เดิมบน Broker เดียวกัน

เช่น

```text
pkru/iot/001/data
```
เพราะ Application ที่ Subscribe

```text
pkru/iot/+/data
```
อาจรับ Message ของตัวเองกลับมาแล้ว Store ซ้ำ

เกิด

```text
Publish
  ↓
Subscribe
  ↓
Store
  ↓
Publish
  ↓
Subscribe
  ↓
  ...
```
ดังนั้นต้องแยก

```text
Local Input
```
กับ

```text
Forward Destination
```
อย่างชัดเจน


## 23.25 Remote Topic

ตัวอย่างกำหนด

```text
pkru/cloud/{device_id}/data
```
เช่น

```text
pkru/cloud/001/data
```
Payload

```json
{
  "message_id": 1,
  "device_id": "001",
  "timestamp": 1780000000,
  "temp": 30.0,
  "humi": 70.0,
  "light": 1500.0
}
```
`message_id`

ใช้ช่วยระบุ Record ที่ถูก Forward


## 23.26 Delivery Success ต้องนิยามให้ชัด

จุดสำคัญมาก

คำว่า

```text
publish()
```
สำเร็จ

ไม่ได้แปลเสมอไปว่า

```text
Cloud Application บันทึกข้อมูลสำเร็จแล้ว
```
ต้องกำหนดว่า

```text
Success
```
หมายถึงอะไร

ระดับง่ายใน LAB นี้กำหนดว่า

```text
MQTT Publish ได้รับการยืนยันในระดับ MQTT Client/Broker ตาม QoS ที่ใช้
```
แล้วจึง Mark

```text
SENT
```
แต่ในระบบที่ต้องการความน่าเชื่อถือสูงกว่า อาจต้องใช้

```text
Application ACK
```
จาก Remote Application

เช่น

```text
pkru/cloud/ack/{message_id}
```
จึงค่อย Mark SENT


## 23.27 QoS สำหรับ Forward

สำหรับ Store-and-Forward ไม่ควรใช้

```text
QoS 0
```
ถ้าต้องการทราบว่า Broker รับ Publish หรือไม่

LAB นี้ใช้

```text
QoS 1
```
แนวคิด

```text
Publisher
    │
    │ PUBLISH
    ▼
  Broker
    │
    │ PUBACK
    ▼
 Publisher
```
QoS 1 ให้

```text
At Least Once Delivery
```
ดังนั้น Message อาจถูกส่งซ้ำได้

ระบบปลายทางจึงควรสามารถตรวจ Duplicate ได้


## 23.28 Duplicate Delivery

สมมติ

1. Gateway ส่ง Record 100
2. Remote Broker รับแล้ว
3. Connection ขาดก่อน Gateway บันทึก SENT
4. Gateway Restart
5. Record 100 ยังเป็น PENDING
6. Gateway ส่ง Record 100 อีกครั้ง

Remote อาจได้รับ

```text
Record 100
```
สองครั้ง

ดังนั้น Store-and-Forward ต้องเข้าใจว่า

```text
No Data Loss
```
อาจแลกกับ

```text
Possible Duplicate
```
โดยเฉพาะเมื่อใช้แนวคิด

```text
At Least Once
```


## 23.29 Message ID

เพื่อช่วยตรวจ Duplicate

ทุก Record มี

```text
id
```
เช่น

```text
100
```
Forward Payload

```json
{
  "message_id": 100,
  "device_id": "001",
  "timestamp": 1780000000,
  "temp": 30.0,
  "humi": 70.0,
  "light": 1500.0
}
```
Remote Application สามารถตรวจ

```text
message_id
```
ก่อน INSERT

แต่ถ้ามีหลาย Gateway

`id = 100` อาจเกิดในหลายเครื่อง

ระบบจริงควรใช้ Identity เช่น

```text
gateway_id + message_id
```
ตัวอย่าง

```text
pi01-100
```
หรือ UUID

สำหรับ LAB นี้ใช้

```text
local id
```
เพื่ออธิบายแนวคิดก่อน


## 23.30 อ่าน Pending Records

Function

```python
def get_pending_records(
    limit=10
):
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.row_factory = (
            sqlite3.Row
        )

        rows = conn.execute(
            """
            SELECT
                id,
                device_id,
                timestamp,
                temp,
                humi,
                light,
                retry_count
            FROM queue
            WHERE status = 'PENDING'
            ORDER BY id
            LIMIT ?
            """,
            (limit,)
        ).fetchall()

        return rows
```


## 23.31 Mark Record as SENT

Function

```python
def mark_sent(
    record_id
):
    sent_at = int(
        time.time()
    )

    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            UPDATE queue
            SET
                status = 'SENT',
                sent_at = ?
            WHERE id = ?
            """,
            (
                sent_at,
                record_id
            )
        )

        conn.commit()
```


## 23.32 เพิ่ม Retry Count

เมื่อ Forward ไม่สำเร็จ

ใช้

```python
def mark_retry(
    record_id
):
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            UPDATE queue
            SET
                retry_count =
                retry_count + 1
            WHERE id = ?
            """,
            (
                record_id,
            )
        )

        conn.commit()
```


## 23.33 Forward Payload

สร้าง

```python
def build_forward_payload(
    row
):
    return {
        "message_id": row["id"],
        "device_id": row["device_id"],
        "timestamp": row["timestamp"],
        "temp": row["temp"],
        "humi": row["humi"],
        "light": row["light"]
    }
```


## 23.34 Forward Worker Concept

Worker ทำงานเป็นรอบ

เช่นทุก

```text
5 seconds
```
ขั้นตอน

```text
Read PENDING
     ↓
Publish Record 1
     │
     ├── Success → SENT
     └── Failure → retry_count + 1
     ↓
Publish Record 2
     ↓
    ...
```


## 23.35 อย่าใช้ Internet Ping เป็นตัวตัดสินเพียงอย่างเดียว

ไม่ควรออกแบบว่า

```text
ping 8.8.8.8
    ↓
Success
    ↓
Cloud Available
```
เพราะ

```text
Internet อาจใช้ได้
แต่ Remote Broker ใช้ไม่ได้
```
หรือ

```text
ICMP อาจถูก Block
แต่ MQTT ใช้ได้
```
ดังนั้น Availability ที่สำคัญคือ

```text
Destination Service Availability
```
เช่น

```text
Remote MQTT Connection
```
ไม่ใช่เพียง

```text
Internet = YES/NO
```


## 23.36 จำลอง Remote Broker สำหรับ LAB

เพื่อให้ LAB ทำได้โดยไม่ต้องพึ่ง Cloud จริง

สามารถใช้ Mosquitto อีกเครื่องใน LAN

ตัวอย่าง

```text
Raspberry Pi Gateway
PI_IP

Remote Broker
BROKER_IP
```
Gateway รับ Local MQTT จาก

```text
localhost:1883
```
แล้ว Forward ไป

```text
BROKER_IP:1883
```
ถ้ามี Raspberry Pi หลายเครื่องในห้อง LAB วิธีนี้เหมาะมาก


## 23.37 ถ้ามี Raspberry Pi เครื่องเดียว

สามารถจำลอง Remote Destination ด้วย Mosquitto Listener อีก Port ได้

เช่น

```text
Local Broker
localhost:1883
```
และ

```text
Test Remote Broker
localhost:1884
```
แต่ต้องตั้ง Mosquitto Listener แยกอย่างถูกต้อง

อีกทางที่ง่ายกว่าสำหรับการสอนคือใช้ Raspberry Pi สองเครื่อง

```text
Pi A = Gateway
Pi B = Remote Broker
```
เพื่อให้สามารถจำลอง Network Failure ได้ชัดเจน


## 23.38 Remote MQTT Client

ตัวอย่าง Configuration

```python
remote_broker = "BROKER_IP"
remote_port = 1883
```
สร้าง Client แยกจาก Local Client

```python
remote_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="store-forward-remote"
)
```
ดังนั้น Application มี

```text
local_client
```
สำหรับ Subscribe Sensor Data

และ

```text
remote_client
```
สำหรับ Forward Data


## 23.39 ทำไมต้องแยก MQTT Client

Architecture

```text
Local MQTT Client
    │
    └── Subscribe
        pkru/iot/+/data

Remote MQTT Client
    │
    └── Publish
        pkru/cloud/{device_id}/data
```
ทำให้

```text
Local Data Collection
```
แยกจาก

```text
Remote Forwarding
```
ชัดเจน

เมื่อ Remote Broker หาย

Local MQTT ยังสามารถทำงาน

และ Gateway ยังสามารถ

```text
Store Data
```
ลง SQLite ต่อไป

นี่คือหัวใจของ Offline Operation


## 23.40 Remote Connection State

สร้างตัวแปร

```python
remote_connected = False
```
Callback

```python
def on_remote_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    global remote_connected

    if reason_code == 0:
        remote_connected = True
        print(
            "REMOTE CONNECTED"
        )
    else:
        remote_connected = False


def on_remote_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties
):
    global remote_connected

    remote_connected = False

    print(
        "REMOTE DISCONNECTED"
    )
```
หมายเหตุ:

Application ไม่ควรถือว่า Boolean นี้เป็นหลักฐานการส่งข้อมูลสำเร็จของแต่ละ Record

มันเป็นเพียง Connection State

การ Mark SENT ยังควรอิง Publish Confirmation ที่เหมาะสม


## 23.41 MQTT Publish Confirmation

Paho MQTT สามารถคืน

```text
MQTTMessageInfo
```
จาก

```text
publish()
```
ตัวอย่าง

```python
info = remote_client.publish(
    topic,
    payload,
    qos=1
)
```
จากนั้นรอ Publish Completion

```python
info.wait_for_publish(
    timeout=5
)
```
และตรวจ

```python
info.is_published()
```
สำหรับ LAB ใช้แนวทางนี้เพื่อสาธิต

```text
Publish Confirmation
```
ก่อน Mark SENT


## 23.42 Forward Record

ตัวอย่าง Function

```python
def forward_record(
    row
):
    if not remote_connected:
        return False

    topic = (
        f"pkru/cloud/"
        f"{row['device_id']}/data"
    )

    payload = json.dumps(
        build_forward_payload(row)
    )

    try:
        info = remote_client.publish(
            topic,
            payload,
            qos=1
        )

        info.wait_for_publish(
            timeout=5
        )

        return info.is_published()

    except Exception as error:
        print(
            f"FORWARD ERROR: "
            f"{error}"
        )

        return False
```


## 23.43 Forward Pending Records

```python
def forward_pending():
    rows = get_pending_records(
        limit=10
    )

    for row in rows:

        if not remote_connected:
            break

        success = forward_record(
            row
        )

        if success:
            mark_sent(
                row["id"]
            )

            print(
                f"SENT "
                f"id={row['id']}"
            )

        else:
            mark_retry(
                row["id"]
            )

            print(
                f"RETRY "
                f"id={row['id']}"
            )

            break
```
สังเกตว่าเมื่อ Remote Failure

ให้หยุด Loop รอบนั้น

ไม่ควรยิง Record ที่เหลือซ้ำอย่างรวดเร็วโดยไม่จำเป็น


## 23.44 Worker Thread

สามารถสร้าง Thread สำหรับ Forward

```python
import threading


def forward_worker():
    while True:
        try:
            forward_pending()

        except Exception as error:
            print(
                f"WORKER ERROR: "
                f"{error}"
            )

        time.sleep(5)
```
เริ่ม

```python
worker = threading.Thread(
    target=forward_worker,
    daemon=True
)

worker.start()
```
ดังนั้น Application มีสองงาน

```text
MQTT Receive
     +
Forward Worker
```
ทำงานพร้อมกัน


## 23.45 Processing Architecture

```text
Thread / Flow 1

Local MQTT
    ↓
on_message()
    ↓
Validate
    ↓
SQLite INSERT


Thread / Flow 2

SQLite PENDING
    ↓
Forward Worker
    ↓
Remote MQTT
    ↓
SENT / RETRY
```
นี่คือการแยก

```text
Data Ingestion
```
ออกจาก

```text
Data Forwarding
```


## 23.46 ทำไมการแยก Ingestion กับ Forwarding สำคัญ

ถ้าเขียน

```text
Receive
   ↓
Wait for Remote
   ↓
Forward
   ↓
Receive Next
```
เมื่อ Remote ช้า

Data Ingestion อาจถูก Block

แต่ Store-and-Forward ที่ดีควรเป็น

```text
Receive
   ↓
Store
   ↓
Return Quickly
```
ส่วน Forward ทำแยก

```text
Database
   ↓
Worker
   ↓
Remote
```
ดังนั้น Remote Failure ไม่ควรหยุด Local Data Collection


## 23.47 Full Application Architecture

```text
Local MQTT Broker
       │
       ▼
MQTT Callback
       │
       ▼
   Validation
       │
       ▼
  SQLite INSERT
       │
       ▼
    PENDING
       │
       │
       └──────────────┐
                      │
                      ▼
               Forward Worker
                      │
                      ▼
                Remote MQTT
                      │
            ┌─────────┴─────────┐
            │                   │
         Success             Failure
            │                   │
            ▼                   ▼
          SENT              PENDING
                                │
                                ▼
                            Retry Later
```


## 23.48 Full Python Example

สร้าง

```bash
nano store_forward.py
```
ใช้

```python
import json
import sqlite3
import threading
import time

import paho.mqtt.client as mqtt


database_path = (
    "/home/PI_USER/iot-gateway/"
    "store_forward.db"
)

local_broker = "localhost"
local_port = 1883

remote_broker = "BROKER_IP"
remote_port = 1883

input_topic = "pkru/iot/+/data"

remote_connected = False


def init_database():
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                temp REAL,
                humi REAL,
                light REAL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                retry_count INTEGER NOT NULL DEFAULT 0,
                sent_at INTEGER
            )
            """
        )

        conn.commit()


def validate_data(data):
    required_fields = [
        "temp",
        "humi",
        "light"
    ]

    for field in required_fields:
        if field not in data:
            return False

        if data[field] is None:
            return False

    try:
        temp = float(data["temp"])
        humi = float(data["humi"])
        light = float(data["light"])

    except (TypeError, ValueError):
        return False

    if (
        temp == -99 or
        humi == -99 or
        light == -99
    ):
        return False

    if temp < -20 or temp > 80:
        return False

    if humi < 0 or humi > 100:
        return False

    if light < 0 or light > 100000:
        return False

    return True


def store_data(
    device_id,
    temp,
    humi,
    light
):
    timestamp = int(
        time.time()
    )

    with sqlite3.connect(
        database_path
    ) as conn:

        cursor = conn.execute(
            """
            INSERT INTO queue (
                device_id,
                timestamp,
                temp,
                humi,
                light,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'PENDING')
            """,
            (
                device_id,
                timestamp,
                temp,
                humi,
                light
            )
        )

        conn.commit()

        return cursor.lastrowid


def get_pending_records(
    limit=10
):
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.row_factory = (
            sqlite3.Row
        )

        rows = conn.execute(
            """
            SELECT
                id,
                device_id,
                timestamp,
                temp,
                humi,
                light,
                retry_count
            FROM queue
            WHERE status = 'PENDING'
            ORDER BY id
            LIMIT ?
            """,
            (limit,)
        ).fetchall()

        return rows


def mark_sent(
    record_id
):
    sent_at = int(
        time.time()
    )

    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            UPDATE queue
            SET
                status = 'SENT',
                sent_at = ?
            WHERE id = ?
            """,
            (
                sent_at,
                record_id
            )
        )

        conn.commit()


def mark_retry(
    record_id
):
    with sqlite3.connect(
        database_path
    ) as conn:

        conn.execute(
            """
            UPDATE queue
            SET
                retry_count =
                retry_count + 1
            WHERE id = ?
            """,
            (
                record_id,
            )
        )

        conn.commit()


def build_forward_payload(
    row
):
    return {
        "message_id": row["id"],
        "device_id": row["device_id"],
        "timestamp": row["timestamp"],
        "temp": row["temp"],
        "humi": row["humi"],
        "light": row["light"]
    }


def on_local_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    print(
        f"LOCAL MQTT: "
        f"{reason_code}"
    )

    client.subscribe(
        input_topic
    )


def on_local_message(
    client,
    userdata,
    msg
):
    try:
        parts = msg.topic.split("/")

        if (
            len(parts) != 4 or
            parts[0] != "pkru" or
            parts[1] != "iot" or
            parts[3] != "data"
        ):
            return

        device_id = parts[2]

        payload = msg.payload.decode(
            "utf-8"
        )

        data = json.loads(
            payload
        )

        if not isinstance(
            data,
            dict
        ):
            return

        if not validate_data(
            data
        ):
            print(
                f"INVALID DATA "
                f"device={device_id}"
            )
            return

        temp = float(
            data["temp"]
        )

        humi = float(
            data["humi"]
        )

        light = float(
            data["light"]
        )

        record_id = store_data(
            device_id,
            temp,
            humi,
            light
        )

        print(
            f"STORED "
            f"id={record_id} "
            f"device={device_id}"
        )

    except (
        json.JSONDecodeError,
        KeyError,
        TypeError,
        ValueError,
        UnicodeDecodeError
    ) as error:

        print(
            f"INPUT ERROR: "
            f"{error}"
        )


def on_remote_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):
    global remote_connected

    if reason_code == 0:
        remote_connected = True

        print(
            "REMOTE CONNECTED"
        )

    else:
        remote_connected = False


def on_remote_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties
):
    global remote_connected

    remote_connected = False

    print(
        "REMOTE DISCONNECTED"
    )


def forward_record(
    row
):
    if not remote_connected:
        return False

    topic = (
        f"pkru/cloud/"
        f"{row['device_id']}/data"
    )

    payload = json.dumps(
        build_forward_payload(
            row
        )
    )

    try:
        info = remote_client.publish(
            topic,
            payload,
            qos=1
        )

        info.wait_for_publish(
            timeout=5
        )

        return info.is_published()

    except Exception as error:
        print(
            f"FORWARD ERROR: "
            f"{error}"
        )

        return False


def forward_pending():
    rows = get_pending_records(
        limit=10
    )

    for row in rows:

        if not remote_connected:
            break

        success = forward_record(
            row
        )

        if success:
            mark_sent(
                row["id"]
            )

            print(
                f"SENT "
                f"id={row['id']}"
            )

        else:
            mark_retry(
                row["id"]
            )

            print(
                f"RETRY "
                f"id={row['id']}"
            )

            break


def forward_worker():
    while True:

        try:
            forward_pending()

        except Exception as error:
            print(
                f"WORKER ERROR: "
                f"{error}"
            )

        time.sleep(5)


init_database()


local_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="store-forward-local"
)

local_client.on_connect = (
    on_local_connect
)

local_client.on_message = (
    on_local_message
)

local_client.connect(
    local_broker,
    local_port,
    60
)

local_client.loop_start()


remote_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="store-forward-remote"
)

remote_client.on_connect = (
    on_remote_connect
)

remote_client.on_disconnect = (
    on_remote_disconnect
)

remote_client.reconnect_delay_set(
    min_delay=1,
    max_delay=30
)

try:
    remote_client.connect_async(
        remote_broker,
        remote_port,
        60
    )

    remote_client.loop_start()

except Exception as error:
    print(
        f"REMOTE START ERROR: "
        f"{error}"
    )


worker = threading.Thread(
    target=forward_worker,
    daemon=True
)

worker.start()


print(
    "Store-and-Forward "
    "Gateway started"
)


try:
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print(
        "Stopping Gateway"
    )

    local_client.loop_stop()
    remote_client.loop_stop()

    local_client.disconnect()
    remote_client.disconnect()
```
หมายเหตุ:

ต้องเปลี่ยน

```text
/home/PI_USER/...
```
และ

```text
BROKER_IP
```
ให้ตรงกับระบบที่ใช้จริง


## 23.49 ขั้นตอนทดสอบปกติ

บน Remote Broker เปิด

```bash
mosquitto_sub -h localhost \
-t "pkru/cloud/+/data" \
-v
```
บน Gateway Run

```bash
python store_forward.py
```
ส่ง Sensor Data เข้า Local Broker

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1500}'
```
Gateway ควรแสดง

```text
STORED id=...
SENT id=...
```
Remote Broker ควรได้รับ

```text
pkru/cloud/001/data ...
```


## 23.50 ตรวจสอบ Database หลังส่งสำเร็จ

ใช้

```bash
sqlite3 store_forward.db \
"SELECT id,device_id,status,retry_count,sent_at FROM queue;"
```
ควรเห็น

```text
SENT
```
ตัวอย่าง

```text
1|001|SENT|0|...
```


## 23.51 จำลอง Remote Failure

วิธีที่ชัดที่สุดคือหยุด Remote Broker

บน Remote Pi

```bash
sudo systemctl stop mosquitto
```
หรือทำให้ Gateway ติดต่อ Remote Broker ไม่ได้

จากนั้นส่งข้อมูลเข้า Local Broker

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":31,"humi":71,"light":1600}'
```
Gateway ต้องยัง

```text
STORED
```
ข้อมูลได้


## 23.52 ตรวจสอบ PENDING ขณะ Offline

ใช้

```bash
sqlite3 store_forward.db \
"SELECT id,device_id,temp,status,retry_count FROM queue WHERE status='PENDING';"
```
ต้องเห็น Record ใหม่เป็น

```text
PENDING
```
นี่คือหัวใจของ LAB

```text
Remote Down
```
แต่

```text
Local Data Collection
```
ยังทำงาน


## 23.53 ส่งข้อมูลหลาย Record ขณะ Offline

ใช้

```bash
for temp in 30 31 32 33 34
do
    mosquitto_pub \
        -h localhost \
        -t "pkru/iot/001/data" \
        -m "{\"temp\":$temp,\"humi\":70,\"light\":1500}"

    sleep 1
done
```
ตรวจสอบ

```bash
sqlite3 store_forward.db \
"SELECT id,device_id,temp,status FROM queue WHERE status='PENDING';"
```
ควรมีหลาย Record

```text
PENDING
```


## 23.54 Remote Recovery

เปิด Remote Broker กลับ

```bash
sudo systemctl start mosquitto
```
Gateway MQTT Client จะพยายาม Reconnect

เมื่อเชื่อมต่อได้

```text
REMOTE CONNECTED
```
Forward Worker จะเริ่มอ่าน

```text
PENDING
```
และส่งย้อนหลัง

ผล

```text
SENT id=...
SENT id=...
SENT id=...
```


## 23.55 ตรวจสอบหลัง Recovery

ใช้

```bash
sqlite3 store_forward.db \
"SELECT id,device_id,temp,status,retry_count FROM queue ORDER BY id;"
```
Record ที่เคย

```text
PENDING
```
ควรกลายเป็น

```text
SENT
```
หลัง Forward สำเร็จ


## 23.56 ตรวจสอบ Remote Data

Remote Subscriber ควรได้รับข้อมูลย้อนหลัง

เช่น

```text
temp=30
temp=31
temp=32
temp=33
temp=34
```
ตามลำดับ Record

เพราะ Query ใช้

```sql
ORDER BY id
```


## 23.57 Store-and-Forward Timeline

ตัวอย่าง

```text
10:00 Internet OK
   Data A → SENT

10:01 Internet DOWN
   Data B → PENDING

10:02
   Data C → PENDING

10:03
   Data D → PENDING

10:04 Internet RECOVERED

   Data B → SENT
   Data C → SENT
   Data D → SENT
```
ดังนั้นข้อมูลช่วง Network Failure ไม่สูญหาย


## 23.58 ทดสอบ Process Restart

ขณะ Remote Broker Down

ส่งข้อมูลหลาย Record

ตรวจสอบ

```text
PENDING
```
จากนั้นหยุด Python

```bash
Ctrl+C
```
แล้ว Run ใหม่

```bash
python store_forward.py
```
ข้อมูลเดิมต้องยังอยู่

```text
PENDING
```
เพราะเก็บใน SQLite

เมื่อ Remote Broker กลับมา

ข้อมูลเหล่านั้นต้องถูก Forward ต่อ

นี่คือข้อแตกต่างระหว่าง

```text
Persistent Queue
```
กับ

```text
Memory Queue
```


## 23.59 ทดสอบ Raspberry Pi Reboot

ขณะมี

```text
PENDING
```
อยู่ใน Database

Reboot

```bash
sudo reboot
```
หลัง Boot

ถ้า Application ถูกจัดการด้วย systemd

Service ต้อง Start ใหม่

จากนั้นเมื่อ Remote Broker Available

Gateway ต้อง Forward Record ที่ค้างอยู่

นี่คือ

```text
Reboot Recovery
```


## 23.60 systemd Service

สร้าง

```bash
sudo nano \
/etc/systemd/system/store-forward.service
```
ใช้

```ini
[Unit]
Description=IoT Store and Forward Gateway
After=network-online.target mosquitto.service
Wants=network-online.target
Requires=mosquitto.service

[Service]
Type=simple
User=PI_USER
WorkingDirectory=/home/PI_USER/iot-gateway
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python -u /home/PI_USER/iot-gateway/store_forward.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
เปลี่ยน

```text
PI_USER
```
ให้ตรงกับ User จริง


## 23.61 Enable Service

ใช้

```bash
sudo systemctl daemon-reload

sudo systemctl enable --now \
store-forward
```
ตรวจสอบ

```bash
systemctl status \
store-forward
```
ดู Log

```bash
journalctl \
-u store-forward \
-f
```


## 23.62 ตรวจสอบ Queue Statistics

จำนวน Record ทั้งหมด

```sql
SELECT COUNT(*)
FROM queue;
```
จำนวน PENDING

```sql
SELECT COUNT(*)
FROM queue
WHERE status = 'PENDING';
```
จำนวน SENT

```sql
SELECT COUNT(*)
FROM queue
WHERE status = 'SENT';
```
จำนวน Retry

```sql
SELECT SUM(retry_count)
FROM queue;
```


## 23.63 Query แบบสรุป

ใช้

```text
SELECT
    status,
    COUNT(*) AS total
FROM queue
GROUP BY status;
```
ตัวอย่าง

```text
PENDING|15
SENT|1200
```
ช่วยให้ Gateway Monitor ได้ว่า

```text
Backlog
```
กำลังเพิ่มขึ้นหรือไม่


## 23.64 Queue Backlog

ถ้า Remote Down นาน

```text
PENDING
```
จะเพิ่มขึ้นเรื่อย ๆ

ตัวอย่าง

```text
10:00 → 10 PENDING
11:00 → 500 PENDING
12:00 → 1000 PENDING
```
เรียกว่า

```text
Queue Backlog
```
Gateway ควร Monitor

```text
Queue Length
```
เพราะ Storage มีขนาดจำกัด


## 23.65 Disk Capacity

Store-and-Forward ไม่ได้หมายความว่าเก็บข้อมูลได้ไม่จำกัด

ต้องพิจารณา

```text
Sampling Rate
Number of Devices
Record Size
Offline Duration
Disk Capacity
```
ตัวอย่างแนวคิด

```text
100 Devices
   ×
1 Message / 5 s
   ×
24 hours
```
จะมี Record จำนวนมาก

ดังนั้นระบบจริงต้องมี

```text
Retention Policy
```


## 23.66 Retention Policy

หลังข้อมูลเป็น

```text
SENT
```
นานพอ

สามารถลบข้อมูลเก่า

ตัวอย่าง

```sql
DELETE FROM queue
WHERE
    status = 'SENT'
    AND sent_at <
        strftime('%s','now')
        - 604800;
```
604800 วินาที

คือประมาณ

```text
7 days
```
หมายเหตุ

ควรกำหนด Retention ตาม Requirement จริง

ไม่ควรลบข้อมูลโดยไม่มี Policy


## 23.67 VACUUM

SQLite Database อาจไม่คืน Disk Space ให้ File ทันทีหลัง DELETE

สามารถใช้

```sql
VACUUM;
```
เพื่อ Rebuild Database และลด File Size ในบางกรณี

แต่

```sql
VACUUM
```
ไม่ควรถูกเรียกบ่อยโดยไม่จำเป็น

เพราะใช้ I/O และเวลา


## 23.68 Index

เมื่อ Queue ใหญ่ขึ้น Query

```sql
WHERE status='PENDING'
ORDER BY id
```
จะถูกใช้บ่อย

สามารถเพิ่ม Index

```sql
CREATE INDEX IF NOT EXISTS
idx_queue_status_id
ON queue(status, id);
```
ช่วยให้ Query Pending Records มีประสิทธิภาพขึ้นเมื่อข้อมูลจำนวนมาก


## 23.69 Retry Storm

ถ้า Remote Down

ไม่ควร Retry

```text
หลายร้อยครั้งต่อวินาที
```
เพราะทำให้

```text
CPU
Network
Log
Remote Service
```
รับภาระโดยไม่จำเป็น

LAB นี้ใช้

```text
Worker Interval = 5 seconds
```
และ MQTT Reconnect Delay

```text
1 → ... → 30 seconds
```
ระบบจริงอาจใช้

```text
Exponential Backoff
```
เช่น

```text
1 s
2 s
4 s
8 s
16 s
30 s
```
เพื่อลด Retry Storm


## 23.70 Store-and-Forward ไม่เท่ากับ Backup

SQLite Queue มีหน้าที่หลัก

```text
Buffer Data During Failure
```
ไม่ใช่ Backup ทั้งระบบ

ยังต้อง Backup

```text
Database
Configuration
Python Application
Node-RED Flow
Mosquitto Configuration
```
แยกต่างหาก

เรื่องนี้จะอยู่ใน

```text
LAB 26 — Backup & Recovery
```


## 23.71 Store-and-Forward ไม่ได้แก้ทุก Failure

ระบบนี้ช่วยกรณี

```text
Remote Network Failure
Internet Failure
Remote Broker Failure
Temporary Service Failure
```
แต่ถ้า

```text
SD Card เสีย
```
SQLite ก็อาจหาย

ถ้า

```text
Raspberry Pi ถูกทำลาย
```
Local Buffer ก็อาจหาย

ดังนั้น Reliability มีหลาย Layer

```text
Memory
  ↓
Local Persistent Storage
  ↓
Remote Storage
  ↓
Backup
```


## 23.72 QoS 1 ไม่ได้หมายถึง Exactly Once

LAB ใช้

```text
QoS 1
```
ซึ่งหมายถึง

```text
At Least Once
```
ไม่ใช่

```text
Exactly Once
```
ดังนั้นปลายทางควรเตรียมรับ

```text
Duplicate
```
โดยใช้

```text
message_id
```
หรือ Unique Identifier

และออกแบบ Database ให้รองรับ

```text
Idempotent Processing
```


## 23.73 Idempotency

Idempotent หมายถึง

ถ้า Message เดียวกันถูกประมวลผลซ้ำ

ผลสุดท้ายไม่ควรเสียหายหรือเกิด Record ซ้ำโดยไม่ตั้งใจ

ตัวอย่าง Remote Database อาจใช้

```text
gateway_id
message_id
```
เป็น Unique Key

ถ้า Message เดิมเข้าซ้ำ

Database ไม่ INSERT ซ้ำ

แนวคิดนี้สำคัญมากสำหรับระบบ Store-and-Forward


## 23.74 Data Ordering

LAB นี้ Forward ด้วย

```sql
ORDER BY id
```
จึงพยายามส่งข้อมูลตามลำดับที่ Gateway Store

แต่ใน Distributed System ไม่ควรสมมติว่าทุกกรณีจะรักษาลำดับได้สมบูรณ์

ดังนั้นแต่ละ Record ควรมี

```text
timestamp
```
ของตัวเอง

Application ปลายทางควรใช้ Timestamp ในการจัด Time-series Data


## 23.75 Local Timestamp

ใน LAB นี้ใช้

```text
Gateway Receive Time
```
จาก

```text
time.time()
```
ข้อดี

- Gateway ควบคุมเวลาเดียว
- ไม่ต้องเชื่อเวลา ESP32 ทุกตัว

แต่ระบบจริงอาจต้องแยก

```text
sensor_timestamp
```
และ

```text
gateway_received_at
```
เพื่อทราบทั้ง

```text
เวลาที่ Sensor วัด
```
และ

```text
เวลาที่ Gateway รับ
```


## 23.76 Monitoring Store-and-Forward

Gateway ควรสามารถรายงานอย่างน้อย

```text
Remote Status
Pending Count
Sent Count
Retry Count
```
ตัวอย่าง Dashboard

```text
Remote Broker
OFFLINE

Pending
152

Sent
4,321

Retries
18
```
เมื่อ Network กลับมา

```text
Remote Broker
ONLINE

Pending
0

Sent
4,473
```


## 23.77 Architecture ที่ดีขึ้น

```text
Sensors
   │
   ▼
Gateway
   │
   ▼
Validation
   │
   ▼
Persistent Queue
   │
   ├───────────────┐
   │               │
   ▼               ▼
Local Use      Remote Forward
   │               │
   ▼               ▼
Dashboard        Cloud
Control          Server
SQLite
```
ดังนั้น

```text
Remote Failure
```
ไม่ควรหยุด

```text
Local Dashboard
Local Control
Local Data Collection
```
นี่คือหลักสำคัญของ

```text
Offline-capable IoT
```


## 23.78 Offline-first Principle

ระบบ IoT สำหรับงานจริงควรคิดว่า

```text
Internet
```
เป็น Resource ที่อาจหายได้

ไม่ควรออกแบบว่า

```text
Internet Down
     =
Entire System Down
```
Architecture ที่เหมาะสมกว่า

```text
Local Operation
      +
Remote Synchronization
```
เมื่อ Internet หาย

```text
Local Operation
    → Continue
```
เมื่อ Internet กลับ

```text
Remote Synchronization
    → Resume
```


## 23.79 แบบฝึกหัดที่ 1 — SQLite Queue

สร้าง Table

```text
queue
```
เพิ่ม Sensor Data 3 Record

ตรวจสอบว่าเริ่มต้นเป็น

```text
PENDING
```


## 23.80 แบบฝึกหัดที่ 2 — MQTT → SQLite

Subscribe

```text
pkru/iot/+/data
```
เมื่อได้รับข้อมูล

ต้อง Store ลง SQLite ก่อน

ตรวจสอบด้วย

```text
SELECT
```


## 23.81 แบบฝึกหัดที่ 3 — Normal Forward

เปิด Remote Broker

ส่ง Sensor Data

ผลต้องเป็น

```text
Store
  ↓
PENDING
  ↓
Forward
  ↓
SENT
```


## 23.82 แบบฝึกหัดที่ 4 — Remote Failure

หยุด Remote Broker

ส่ง Sensor Data อย่างน้อย

```text
10 Records
```
Local Gateway ต้องยังรับข้อมูลได้

Database ต้องมี

```text
10 PENDING
```
โดยประมาณตามจำนวนข้อมูลที่ส่งในการทดสอบ


## 23.83 แบบฝึกหัดที่ 5 — Recovery

เปิด Remote Broker กลับ

Gateway ต้อง

```text
Reconnect
   ↓
Read PENDING
   ↓
Forward
   ↓
Mark SENT
```
จน

```text
Pending Count = 0
```


## 23.84 แบบฝึกหัดที่ 6 — Process Restart

ขณะมี PENDING

หยุด

```text
store_forward.py
```
แล้วเปิดใหม่

PENDING Record ต้องยังอยู่

และสามารถ Forward ต่อได้


## 23.85 แบบฝึกหัดที่ 7 — Reboot Recovery

ขณะมี PENDING

Reboot Raspberry Pi

```bash
sudo reboot
```
หลัง Boot

```text
store-forward.service
```
ต้อง Start เอง

เมื่อ Remote กลับมา

PENDING ต้องถูก Forward ต่อ


## 23.86 แบบฝึกหัดที่ 8 — Duplicate Analysis

ให้นักศึกษาอธิบายสถานการณ์

```text
Remote receives message
       ↓
Gateway fails before mark SENT
       ↓
Gateway restarts
       ↓
Sends message again
```
ตอบว่า

```text
ทำไม Duplicate จึงเกิดได้?
```
และ

```text
message_id
```
ช่วยอย่างไร?


## 23.87 งานส่ง LAB 23

นักศึกษาส่ง

1. Architecture Diagram

```text
   Sensor
     ↓
   Gateway
     ↓
   SQLite
     ↓
   Remote MQTT
```
2. Source Code

```text
   store_forward.py
```
3. Database Schema

```text
   .schema queue
```
4. Screenshot Normal Operation

```text
   STORED
   SENT
```
5. Screenshot Remote Failure

```text
   Remote OFFLINE
```
6. Screenshot Database ขณะ Offline

```text
   PENDING
```
7. มี Pending Data อย่างน้อยหลาย Record

8. Screenshot หลัง Remote Recovery

```text
   PENDING → SENT
```
9. Screenshot Remote Subscriber ได้รับข้อมูลย้อนหลัง

10. Screenshot Process Restart แล้ว PENDING ยังอยู่

11. Screenshot Reboot Recovery

12. Screenshot

```bash
   systemctl status store-forward
```
13. Query แสดง

```text
   PENDING Count
   SENT Count
   Retry Count
```
14. อธิบายความหมายของ

```text
   Store-and-Forward
   Persistent Buffer
   PENDING
   SENT
   Retry
   Backlog
```
15. อธิบายความแตกต่างระหว่าง

```text
   Memory Buffer
```
   และ

```text
   SQLite Persistent Buffer
```
16. อธิบายว่าเหตุใด

```text
   QoS 1
```
   อาจทำให้เกิด Duplicate

17. อธิบายประโยชน์ของ

```text
   message_id
```
18. อธิบายว่าเหตุใด

```text
   Internet Down
```
   ไม่ควรทำให้ Local IoT System หยุดทำงาน


## 23.88 Checklist ก่อนถือว่าผ่าน LAB

```text
[ ] MQTT Data เข้า Gateway ได้

[ ] Data ถูก Store ลง SQLite ก่อน Forward

[ ] Record ใหม่เป็น PENDING

[ ] Remote Online แล้ว Forward ได้

[ ] Forward สำเร็จแล้วเป็น SENT

[ ] Remote Down แล้วยัง Store Data ได้

[ ] มีหลาย PENDING Record ระหว่าง Offline

[ ] Remote กลับมาแล้วส่งย้อนหลังได้

[ ] Process Restart แล้ว Queue ไม่หาย

[ ] Raspberry Pi Reboot แล้ว Queue ไม่หาย

[ ] systemd Start Application กลับมาได้

[ ] Invalid Data ไม่ทำให้ Application Crash

[ ] สามารถตรวจ Pending Count ได้
```
ถ้าผ่านทั้งหมด

Gateway มีความสามารถ

```text
Offline Store-and-Forward
```
ในระดับพื้นฐานแล้ว


## 23.89 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 23

```text
Sensor
   ↓
Gateway
   ↓
Remote
   X
```
อาจเกิด

```text
Data Loss
```
หลัง LAB 23

```text
Sensor
   ↓
Gateway
   ↓
SQLite
   ↓
PENDING
   │
   ├── Remote Online
   │       ↓
   │      SENT
   │
   └── Remote Offline
           ↓
       Keep Data
           ↓
         Retry
           ↓
       Send Later
```
ดังนั้น

```text
Network Failure
```
ไม่เท่ากับ

```text
Data Loss
```
โดยอัตโนมัติอีกต่อไป


## 23.90 ความสัมพันธ์ของ LAB 20–23

LAB 20

```text
Python MQTT Application

      ↓
```
LAB 21

```text
systemd
Auto Start / Restart

      ↓
```
LAB 22

```text
BLE / UDP / MQTT
Protocol Gateway

      ↓
```
LAB 23

```text
Persistent Queue
Store-and-Forward
```
เส้นทางคือ

```text
Program Gateway
      ↓
Run Autonomously
      ↓
Connect Multiple Protocols
      ↓
Survive Network Failure
```


## 23.91 Architecture หลัง LAB 23

```text
                  IoT NODES

      BLE ────────┐
                  │
      UDP ────────┼────────────┐
                  │            │
      MQTT ───────┘            │
                               ▼
                     ┌─────────────────┐
                     │ Raspberry Pi    │
                     │ Edge Gateway    │
                     │                 │
                     │ Decode          │
                     │ Validate        │
                     │ Normalize       │
                     │ Local Process   │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
         Local Services              SQLite Queue
                │                           │
       ┌────────┼────────┐                  │
       ▼        ▼        ▼                  │
    Node-RED  Control  Dashboard          PENDING
                                            │
                                            ▼
                                     Forward Worker
                                            │
                                            ▼
                                        Internet
                                            │
                                  ┌─────────┴─────────┐
                                  │                   │
                                 OK                 DOWN
                                  │                   │
                                  ▼                   ▼
                               Remote             Keep Local
                                  │                   │
                                  ▼                   │
                                SENT                  │
                                                      │
                                          Network Recovery
                                                      │
                                                      ▼
                                                    Retry
                                                      │
                                                      ▼
                                                    SENT
```


## 23.92 จุดสำคัญที่สุดของ LAB

Store-and-Forward ไม่ใช่เพียง

```text
"Internet ขาดแล้วเก็บข้อมูลไว้"
```
แต่เป็นการออกแบบ Data Pipeline ให้มีสถานะชัดเจน

```text
Receive
   ↓
Validate
   ↓
Persist
   ↓
PENDING
   ↓
Forward
   ↓
Confirm
   ↓
SENT
```
พร้อมรองรับ

```text
Failure
Retry
Restart
Reboot
Backlog
Duplicate
```
หลักการสำคัญคือ

```text
Persist Before Forward
```
และ

```text
Local Operation Must Continue
```
แม้ Remote Service ใช้งานไม่ได้

นี่ทำให้ Raspberry Pi Gateway เริ่มมีคุณสมบัติ

```text
Autonomous
Offline-capable
Persistent
Recoverable
```
มากขึ้นอย่างชัดเจน


## เชื่อมไป LAB 24 --- MQTT Security

หลัง LAB 23 ระบบมีความสามารถมากขึ้น

```text
Multi-device
Automatic Control
Device Monitoring
Data Quality
Python Gateway
systemd
Protocol Translation
Store-and-Forward
```
แต่ MQTT Broker ยังต้องตอบคำถามสำคัญว่า

```text
"ใครสามารถเชื่อมต่อ Broker ได้?"
```
และ

```text
"แต่ละ Client สามารถอ่านหรือเขียน Topic ใดได้บ้าง?"
```
ถ้า Broker เปิดกว้าง

Client ที่เข้าถึง Network อาจ

```text
Subscribe Sensor Data
```
หรือ

```text
Publish Command
```
เช่น

```text
pkru/iot/001/cmd ON
```
โดยไม่ได้รับอนุญาต

LAB 24 จะเพิ่ม

```text
MQTT Authentication
       +
MQTT Authorization
```
Architecture

```text
MQTT Client
     │
     │ Username / Password
     ▼
  Mosquitto
     │
     ├── Authentication
     │      Who are you?
     │
     └── ACL Authorization
            What can you access?
                │
                ▼
            MQTT Topics
```
ตัวอย่าง

```text
sensor001
```
สามารถ

```text
WRITE
pkru/iot/001/data
```
แต่ไม่ควร

```text
WRITE
pkru/iot/002/data
```
และ Control Application อาจ

```text
WRITE
pkru/iot/+/cmd
```
ตาม Permission ที่กำหนด

LAB 24 จึงจะเปลี่ยนระบบจาก

```text
Functional MQTT System
```
ไปสู่

```text
Authenticated and Access-controlled MQTT System
```
