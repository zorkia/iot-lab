> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[19 - LAB 19 - Data Quality - VALID INVALID STALE]]
> ถัดไป: [[21 - LAB 21 - systemd Service - Autonomous Python IoT Gateway]]

# LAB 20 --- Python MQTT Application on Raspberry Pi

> [!info] แก้ไขล่าสุด
> 2026-10-01 23:25:37 +07


## 20.1 แนวคิดของ LAB

จนถึง LAB 19 เราใช้

```text
Node-RED
```
เป็น Processing Layer หลักของ Raspberry Pi

Architecture เดิม

```text
ESP32
   ↓
  MQTT
   ↓
Mosquitto
   ↓
Node-RED
   │
   ├── JSON Parsing
   ├── Data Validation
   ├── Rule Processing
   ├── Dashboard
   └── MQTT Publish
```
LAB 20 จะเปลี่ยน Processing Layer บางส่วนจาก Node-RED มาเป็น

```text
Python Application
```
Architecture

```text
ESP32
   ↓
  MQTT
   ↓
Mosquitto
   ↓
Python Application
   │
   ├── Subscribe
   ├── JSON Parsing
   ├── Device Identification
   ├── Data Validation
   ├── Rule Processing
   └── Publish
```
จุดประสงค์ไม่ใช่การเลิกใช้ Node-RED

แต่ให้นักศึกษาเข้าใจว่า

```text
Node-RED
```
เป็นเครื่องมือหนึ่งสำหรับสร้าง IoT Application

ส่วนแกนจริงของระบบคือ

```text
MQTT
  +
Application Logic
```
Application Logic สามารถสร้างด้วยภาษาโปรแกรม เช่น Python ได้


## 20.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- สร้าง Python Virtual Environment
- ติดตั้ง MQTT Library
- เชื่อม Python กับ Mosquitto Broker
- Subscribe MQTT Topic
- รับ MQTT Message
- Decode MQTT Payload
- Parse JSON
- อ่าน Device ID จาก MQTT Topic
- รองรับหลาย Device ด้วย MQTT Wildcard
- ตรวจสอบ Data Quality
- Publish MQTT Message จาก Python
- สร้าง Automatic Rule-based Control
- จัดการ MQTT Connection และ Error เบื้องต้น
- เข้าใจบทบาทของ Python Application ใน IoT Gateway


## 20.3 Architecture

```text
ESP32-001 ─┐
ESP32-002 ─┼──→ MQTT Broker
ESP32-003 ─┘         │
                     ▼
             Python Application
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
        Parse     Validate     Rule
         JSON       Data      Process
          │          │          │
          └──────────┼──────────┘
                     │
                     ▼
                MQTT Publish
                     │
                     ▼
                  ESP32
                     │
                     ▼
                  Actuator
```


## 20.4 MQTT Topics

ใช้ Topic Structure เดิมจาก LAB 16–19

Sensor Data

```text
pkru/iot/{device_id}/data
```
Device Status

```text
pkru/iot/{device_id}/status
```
Command

```text
pkru/iot/{device_id}/cmd
```
ตัวอย่าง

```text
pkru/iot/001/data
pkru/iot/001/status
pkru/iot/001/cmd
```
Python Subscribe

```text
pkru/iot/+/data
```
ทำให้ Application เดียวสามารถรับข้อมูลจากหลาย Device


## 20.5 ตรวจสอบ Python

บน Raspberry Pi

```bash
python3 --version
```
ผลตัวอย่าง

```text
Python 3.x.x
```
ตรวจสอบตำแหน่ง Python

```bash
which python3
```
ผลตัวอย่าง

```text
/usr/bin/python3
```


## 20.6 ทำไมควรใช้ Virtual Environment

ไม่ควรติดตั้ง Python Package สำหรับ LAB ลง System Python โดยตรง

แนะนำให้ใช้

```text
venv
```
ข้อดี

- แยก Package ของ Project
- ลดปัญหา Package Conflict
- ไม่กระทบ System Python
- ลบหรือสร้าง Environment ใหม่ได้ง่าย
- เตรียมพร้อมสำหรับ LAB 21 systemd Service

Architecture

```text
Raspberry Pi
   │
   ├── System Python
   │
   └── IoT Project
          │
          └── venv
               │
               ├── Python
               └── paho-mqtt
```


## 20.7 ตรวจสอบ/ติดตั้ง venv

ติดตั้ง package ที่จำเป็น

```bash
sudo apt update

sudo apt install python3-venv -y
```


## 20.8 สร้าง Project Directory

สร้าง Directory

```bash
mkdir -p ~/iot-gateway
```
เข้า Directory

```bash
cd ~/iot-gateway
```
ตรวจสอบ

```bash
pwd
```
ควรได้ประมาณ

```text
/home/<username>/iot-gateway
```


## 20.9 สร้าง Virtual Environment

```bash
python3 -m venv venv
```
ตรวจสอบ

```bash
ls
```
ควรเห็น

```text
venv
```


## 20.10 Activate Virtual Environment

```bash
source venv/bin/activate
```
Prompt จะเปลี่ยนเป็นประมาณ

```text
(venv) PI_USER@raspberrypi:~/iot-gateway $
```
ตรวจสอบ Python

```bash
which python
```
ควรชี้ไปยัง

```text
/home/<username>/iot-gateway/venv/bin/python
```


## 20.11 Upgrade pip

ภายใน venv

```bash
python -m pip install --upgrade pip
```


## 20.12 ติดตั้ง MQTT Library

ใช้

```text
paho-mqtt
```
ติดตั้ง

```bash
pip install paho-mqtt
```
ตรวจสอบ

```bash
pip show paho-mqtt
```
หรือ

```bash
pip list
```
ควรเห็น

```text
paho-mqtt
```


## 20.13 ทดสอบ MQTT Broker ก่อนเขียน Python

Terminal 1

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/data" \
-v
```
Terminal 2

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1500}'
```
ควรได้รับ

```text
pkru/iot/001/data {"temp":30,"humi":70,"light":1500}
```
ถ้าขั้นตอนนี้ยังไม่ทำงาน

ยังไม่ควรเริ่ม Debug Python

ควรตรวจสอบ MQTT Broker ก่อน


## 20.14 โปรแกรม Python แรก — MQTT Subscribe

สร้างไฟล์

```bash
nano mqtt_sub.py
```
ใส่

```python
import paho.mqtt.client as mqtt


broker = "localhost"
port = 1883
topic = "pkru/iot/+/data"


def on_connect(client, userdata, flags, reason_code, properties):
    print(f"Connected: {reason_code}")
    client.subscribe(topic)


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")

    print(f"Topic: {msg.topic}")
    print(f"Payload: {payload}")
    print()


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="python-gateway"
)

client.on_connect = on_connect
client.on_message = on_message

client.connect(broker, port, 60)

client.loop_forever()
```
โปรแกรมนี้ใช้ Callback API VERSION2 ของ Paho MQTT รุ่นปัจจุบัน


## 20.15 Run Python Application

```bash
python mqtt_sub.py
```
ผล

```text
Connected: Success
```
หรือข้อความ Reason Code ที่แสดงว่าการเชื่อมต่อสำเร็จ

จากนั้นเปิดอีก Terminal

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1500}'
```
Python ควรแสดง

```text
Topic: pkru/iot/001/data
Payload: {"temp":30,"humi":70,"light":1500}
```


## 20.16 Callback

โปรแกรม MQTT ไม่ได้ทำงานแบบ

```text
Read
Read
Read
Read
```
โดยตรง

แต่ใช้ Event-driven Programming

เมื่อ Connect

```text
on_connect()
```
ถูกเรียก

เมื่อ Message เข้ามา

```text
on_message()
```
ถูกเรียก

Architecture

```text
MQTT Event
    │
    ├── Connected
    │      ↓
    │   on_connect()
    │
    └── Message
           ↓
       on_message()
```
แนวคิดนี้คล้ายกับ Node-RED

```text
Message arrives
      ↓
   Node runs
```


## 20.17 Parse JSON

เพิ่ม

```python
import json
```
ปรับ `on_message()`

```python
def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)

        print(f"Topic: {msg.topic}")
        print(f"Temp: {data['temp']}")
        print(f"Humi: {data['humi']}")
        print(f"Light: {data['light']}")
        print()

    except Exception as error:
        print(f"Error: {error}")
```
ตอนนี้ Python สามารถเปลี่ยน

```text
MQTT Payload
```
จาก String

เป็น

```text
Python Dictionary
```


## 20.18 Device Identification

Topic

```text
pkru/iot/002/data
```
สามารถแยกด้วย

```text
parts = msg.topic.split("/")
```
จะได้

```text
parts[0] = pkru
parts[1] = iot
parts[2] = 002
parts[3] = data
```
ดังนั้น

```text
device_id = parts[2]
```


## 20.19 โปรแกรม Multi-device

ปรับ `on_message()`

```python
def on_message(client, userdata, msg):
    try:
        parts = msg.topic.split("/")

        if len(parts) != 4:
            print(f"Invalid topic: {msg.topic}")
            return

        device_id = parts[2]

        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)

        print(f"Device: {device_id}")
        print(f"Temp: {data['temp']}")
        print(f"Humi: {data['humi']}")
        print(f"Light: {data['light']}")
        print()

    except Exception as error:
        print(f"Error: {error}")
```
Python Application เดียวจึงรองรับ

```text
Device 001
Device 002
Device 003
...
Device N
```
ผ่าน

```text
pkru/iot/+/data
```


## 20.20 ทดสอบ Multi-device

ส่ง Device 001

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":30,"humi":70,"light":1000}'
```
Device 002

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/002/data" \
-m '{"temp":32,"humi":75,"light":1500}'
```
Device 003

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/003/data" \
-m '{"temp":35,"humi":80,"light":2000}'
```
Python ควรแสดงข้อมูลของทั้ง 3 Device


## 20.21 Data Validation

นำแนวคิด LAB 19 มาเขียนเป็น Python Function

สร้าง

```text
validate_data()
```
ใช้

```python
def validate_data(data):
    required_fields = ["temp", "humi", "light"]

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

    if temp == -99 or humi == -99 or light == -99:
        return False

    if temp < -20 or temp > 80:
        return False

    if humi < 0 or humi > 100:
        return False

    if light < 0 or light > 100000:
        return False

    return True
```


## 20.22 ใช้ Validation

ใน `on_message()`

```python
if validate_data(data):
    quality = "VALID"
else:
    quality = "INVALID"
```
แล้วแสดง

```python
print(f"Device: {device_id}")
print(f"Quality: {quality}")
```
ตัวอย่าง

```text
Device: 001
Quality: VALID
```
หรือ

```text
Device: 002
Quality: INVALID
```


## 20.23 ทดสอบ INVALID

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/002/data" \
-m '{"temp":-99,"humi":70,"light":1500}'
```
Python ควรแสดง

```text
Device: 002
Quality: INVALID
```


## 20.24 JSON Error Handling

ส่ง Payload ที่ไม่ใช่ JSON

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m 'HELLO'
```
ถ้าไม่มี Error Handling

Application อาจเกิด Exception

จึงควรแยก

```text
JSONDecodeError
```
ตัวอย่าง

```python
try:
    data = json.loads(payload)

except json.JSONDecodeError:
    print(
        f"Invalid JSON from device topic: {msg.topic}"
    )
    return
```
Application ต้องไม่หยุดเพียงเพราะได้รับ Message ผิดหนึ่ง Message

นี่เป็นหลักสำคัญของ Gateway Application


## 20.25 MQTT Publish ด้วย Python

Python ไม่ได้ทำได้เฉพาะ Subscribe

สามารถ Publish ได้ด้วย

```python
client.publish()
```
ตัวอย่าง

```python
client.publish(
    "pkru/iot/001/cmd",
    "ON"
)
```
Architecture

```text
Python
   │
   │ ON
   ▼
 MQTT
   │
   ▼
ESP32-001
   │
   ▼
Actuator
```


## 20.26 ทดสอบ Python Publish

เปิด Terminal

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/cmd" \
-v
```
จาก Python

```python
client.publish(
    "pkru/iot/001/cmd",
    "ON"
)
```
ควรเห็น

```text
pkru/iot/001/cmd ON
```


## 20.27 Automatic Control ด้วย Python

นำ Rule จาก LAB 15 มาใช้

```text
temp > 35
    → ON

temp < 30
    → OFF

30–35
    → Keep Previous State
```
ต้องเก็บ State ของแต่ละ Device

เช่น

```python
fan_states = {}
```


## 20.28 Function — Automatic Control

ใช้

```python
fan_states = {}


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

    command_topic = (
        f"pkru/iot/{device_id}/cmd"
    )

    client.publish(
        command_topic,
        new_state
    )

    print(
        f"Command: {device_id} "
        f"{new_state}"
    )
```
นี่คือ

```text
State-change-based Control
```
เหมือน LAB 15


## 20.29 ปัญหา Initial State

โค้ด

```text
fan_states.get(device_id, "OFF")
```
สมมติว่า Actuator เริ่มต้นเป็น

```text
OFF
```
แต่ Device จริงอาจเป็น

```text
ON
```
ดังนั้น

```text
Python State
```
อาจไม่ตรงกับ

```text
Actual Device State
```
นี่เป็นปัญหาเดียวกับ LAB 15

```text
Commanded State ≠ Actual State
```
ในระบบจริงควรมี

```text
State Feedback
```
จาก Device

แต่ LAB นี้ยังใช้ Internal State เพื่อให้เข้าใจ Application Logic ก่อน


## 20.30 ใช้ Validation ก่อน Control

สำคัญมาก

ไม่ควรทำ

```text
MQTT
  ↓
Control
```
โดยตรง

ควรทำ

```text
MQTT
  ↓
JSON Parse
  ↓
Validation
  ↓
VALID?
  │
  ├── YES → Control
  │
  └── NO  → Reject
```
ดังนั้นใน Python

```python
if not validate_data(data):
    print(
        f"Device {device_id}: INVALID"
    )
    return

temp = float(data["temp"])

automatic_control(
    client,
    device_id,
    temp
)
```
INVALID Data จะไม่ถูกใช้ควบคุม Actuator


## 20.31 Complete Python Application

สร้างไฟล์

```bash
nano gateway.py
```
ใช้

```python
import json

import paho.mqtt.client as mqtt


broker = "localhost"
port = 1883

data_topic = "pkru/iot/+/data"

fan_states = {}


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

    command_topic = (
        f"pkru/iot/{device_id}/cmd"
    )

    client.publish(
        command_topic,
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
    print(
        f"MQTT connected: "
        f"{reason_code}"
    )

    client.subscribe(
        data_topic
    )

    print(
        f"Subscribed: "
        f"{data_topic}"
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
            print(
                f"Invalid topic: "
                f"{msg.topic}"
            )
            return

        device_id = parts[2]

        payload = msg.payload.decode(
            "utf-8"
        )

        try:
            data = json.loads(
                payload
            )

        except json.JSONDecodeError:
            print(
                f"INVALID JSON "
                f"device={device_id}"
            )
            return

        if not isinstance(data, dict):
            print(
                f"INVALID PAYLOAD "
                f"device={device_id}"
            )
            return

        if not validate_data(data):
            print(
                f"INVALID DATA "
                f"device={device_id} "
                f"payload={data}"
            )
            return

        temp = float(data["temp"])
        humi = float(data["humi"])
        light = float(data["light"])

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
            f"ERROR: {error}"
        )


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="python-gateway"
)

client.on_connect = on_connect
client.on_message = on_message

client.connect(
    broker,
    port,
    60
)

print(
    "Python IoT Gateway started"
)

client.loop_forever()
```


## 20.32 Run Gateway

ตรวจสอบว่าอยู่ใน venv

```bash
source ~/iot-gateway/venv/bin/activate
```
เข้า Project

```bash
cd ~/iot-gateway
```
Run

```bash
python gateway.py
```
ผลเริ่มต้นควรประมาณ

```text
Python IoT Gateway started
MQTT connected: Success
Subscribed: pkru/iot/+/data
```


## 20.33 เปิด Command Monitor

Terminal อีกหน้าต่าง

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/cmd" \
-v
```
ใช้ดูว่า Python ส่ง Command อะไรออกมา


## 20.34 Test Case 1 — VALID / OFF

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":28,"humi":70,"light":1500}'
```
Python แสดง

```text
VALID device=001 ...
```
เนื่องจาก Internal State เริ่มต้นเป็น OFF

อาจไม่มี MQTT Command ถูกส่งออกมา

เพราะ

```text
old_state = OFF
new_state = OFF
```
ไม่มี State Change

นี่เป็นพฤติกรรมที่ตั้งใจไว้ของตัวอย่างนี้


## 20.35 Test Case 2 — Fan ON

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1500}'
```
Python

```text
VALID device=001 ...
```
จากนั้น

```text
COMMAND device=001 fan=ON
```
Command Monitor

```text
pkru/iot/001/cmd ON
```


## 20.36 Test Case 3 — Hysteresis

หลังจาก Fan ON

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":33,"humi":70,"light":1500}'
```
ไม่มี Command ใหม่

Fan State ยังคง

```text
ON
```
เพราะ

```text
30–35 °C
    → Keep Previous State
```


## 20.37 Test Case 4 — Fan OFF

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":28,"humi":70,"light":1500}'
```
Python ส่ง

```text
COMMAND device=001 fan=OFF
```
MQTT

```text
pkru/iot/001/cmd OFF
```


## 20.38 Test Case 5 — INVALID

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":-99,"humi":70,"light":1500}'
```
Python แสดง

```text
INVALID DATA device=001 ...
```
และต้อง

```text
ไม่ส่ง ON
ไม่ส่ง OFF
```
ไปยัง Actuator


## 20.39 Test Case 6 — Invalid JSON

ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m 'HELLO'
```
Python แสดง

```text
INVALID JSON device=001
```
Application ต้องยังทำงานต่อ

จากนั้นส่ง Valid Message ใหม่

Application ต้องรับได้ตามปกติ


## 20.40 Test Case 7 — Multi-device

Device 001

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1000}'
```
Device 002

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/002/data" \
-m '{"temp":28,"humi":75,"light":1500}'
```
Device 003

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/003/data" \
-m '{"temp":39,"humi":80,"light":2000}'
```
Python ต้องสามารถแยก

```text
001
002
003
```
จาก MQTT Topic

และเก็บ

```text
fan_states
```
แยกแต่ละ Device


## 20.41 Python Dictionary สำหรับ Multi-device State

ตัวอย่างหลังระบบทำงาน

```python
fan_states = {
    "001": "ON",
    "002": "OFF",
    "003": "ON"
}
```
จึงสามารถมี Control State แยกแต่ละ Device ได้

นี่เป็นแนวคิดเดียวกับ

```text
flow context
```
ใน Node-RED

แต่เขียนด้วย Python Data Structure


## 20.42 Node-RED กับ Python ทำงานร่วมกันได้

LAB นี้ไม่จำเป็นต้องปิด Node-RED

สามารถออกแบบ

```text
ESP32
   ↓
  MQTT
   ↓
Mosquitto
   │
   ├────────→ Python
   │             │
   │          Processing
   │          Validation
   │          Control
   │
   └────────→ Node-RED
                 │
              Dashboard
```
Python ทำ

```text
Application Logic
```
Node-RED ทำ

```text
Dashboard
```
ทั้งสองใช้ MQTT เป็นตัวกลาง

นี่เป็น Architecture ที่เหมาะสมและยืดหยุ่น


## 20.43 MQTT เป็น Decoupling Layer

ข้อดีของ Architecture นี้คือ

Python ไม่ต้องรู้ว่า Dashboard ใช้อะไร

Node-RED ไม่ต้องรู้ว่า Python เขียนอย่างไร

ESP32 ไม่ต้องรู้ว่า Processing ใช้ Node-RED หรือ Python

ทุก Component รู้เพียง

```text
MQTT Topic
Payload Format
```
Architecture

```text
Device
   ↓
  MQTT
   ├──→ Python
   ├──→ Node-RED
   ├──→ Database
   └──→ Other Applications
```
เรียกว่า

```text
Loose Coupling
```
หรือ

```text
Decoupled Architecture
```


## 20.44 หลีกเลี่ยง Command Conflict

ถ้า LAB 15 Node-RED Automatic Control ยังทำงานอยู่

และ LAB 20 Python Automatic Control ก็ทำงานพร้อมกัน

อาจเกิด

```text
Node-RED → ON
```
และ

```text
Python → OFF
```
ไปยัง Topic เดียวกัน

```text
pkru/iot/001/cmd
```
ดังนั้นในการทดลอง LAB 20

ควรปิดหรือ Disable Automatic Control Flow เดิมใน Node-RED

หรือกำหนดให้มี

```text
Single Control Authority
```
เพียงตัวเดียว

เช่น

```text
Python = Control Logic
Node-RED = Dashboard
```
เพื่อหลีกเลี่ยง Command Conflict


## 20.45 MQTT Authentication

ถ้า Mosquitto ของระบบเปิด Authentication แล้ว

Python ต้องใช้ Username/Password

เพิ่มก่อน `connect()`

```python
client.username_pw_set(
    "iotuser",
    "your_password"
)
```
จากนั้น

```python
client.connect(
    broker,
    port,
    60
)
```
ไม่ควร Hard-code Password ใน Source Code สำหรับระบบจริง

แต่ใน LAB เบื้องต้นสามารถใช้เพื่ออธิบายหลักการก่อน

เรื่อง Security จะขยายต่อใน LAB 24


## 20.46 หยุด Application

ขณะ

```bash
python gateway.py
```
ทำงาน

กด

```text
Ctrl+C
```
Application จะหยุด

ปัญหาคือ

ถ้า Raspberry Pi Reboot

Python Application จะไม่เริ่มเอง

ต้อง SSH เข้า Pi แล้ว Run

```bash
python gateway.py
```
ใหม่

นี่เป็นข้อจำกัดสำคัญของ LAB 20


## 20.47 ทำไมยังไม่ใช่ Autonomous Gateway

ตอนนี้ Architecture คือ

```text
Raspberry Pi Boot
      ↓
Mosquitto starts
      ↓
Python Application
      X
```
เพราะ Python ไม่ได้ Start อัตโนมัติ

ต้องมีมนุษย์

```text
SSH
  ↓
source venv
  ↓
python gateway.py
```
ดังนั้นระบบยังไม่เป็น

```text
Autonomous IoT Gateway
```
อย่างสมบูรณ์


## 20.48 แบบฝึกหัดที่ 1 — MQTT Subscribe

สร้าง Python Program ที่ Subscribe

```text
pkru/iot/+/data
```
และแสดง

```text
Topic
Payload
```


## 20.49 แบบฝึกหัดที่ 2 — JSON Parsing

แสดง

```text
Device ID
Temp
Humi
Light
```
ตัวอย่าง

```text
Device: 002
Temp: 32
Humi: 75
Light: 1500
```


## 20.50 แบบฝึกหัดที่ 3 — Data Validation

ทดสอบ

```text
VALID
```
ด้วย

```json
{"temp":30,"humi":70,"light":1500}
```
ทดสอบ

```text
INVALID
```
ด้วย

```json
{"temp":-99,"humi":70,"light":1500}
```
ทดสอบ Invalid JSON

```text
HELLO
```
Application ต้องไม่หยุด


## 20.51 แบบฝึกหัดที่ 4 — Multi-device

ส่งข้อมูลจาก

```text
001
002
003
```
Python Application เดียวต้องรับข้อมูลทุก Device

ผ่าน

```text
pkru/iot/+/data
```


## 20.52 แบบฝึกหัดที่ 5 — Python Publish

ให้ Python ส่ง

```text
ON
```
ไปยัง

```text
pkru/iot/001/cmd
```
ตรวจสอบด้วย

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/cmd" \
-v
```


## 20.53 แบบฝึกหัดที่ 6 — Automatic Control

ใช้ Rule

```text
temp > 35
    → ON

temp < 30
    → OFF

30–35
    → Keep Previous State
```
ทดสอบ

```text
28
32
36
38
33
29
```
และบันทึก Command ที่เกิดขึ้น


## 20.54 แบบฝึกหัดที่ 7 — Error Recovery

ขณะที่ Python ทำงาน

ส่ง

```text
HELLO
```
จากนั้นส่ง

```json
{"temp":38,"humi":70,"light":1500}
```
Application ต้อง

1. แจ้ง Invalid JSON
2. ไม่ Crash
3. รับ Message ถัดไปได้
4. ประมวลผล Valid Message ได้ตามปกติ

นี่เป็นพื้นฐานของ

```text
Fault-tolerant Application
```


## 20.55 งานส่ง LAB 20

นักศึกษาส่ง

1. Screenshot Virtual Environment

```bash
   which python
```
2. Screenshot

```bash
   pip show paho-mqtt
```
3. Source Code

```text
   gateway.py
```
4. Screenshot Python รับ MQTT จาก Device 001

5. Screenshot Python รับข้อมูลอย่างน้อย 3 Device

```text
   001
   002
   003
```
6. Screenshot

```text
   VALID DATA
```
7. Screenshot

```text
   INVALID DATA
```
8. Screenshot

```text
   INVALID JSON
```
   และแสดงว่า Application ยังทำงานต่อ

9. Screenshot `mosquitto_sub` แสดง Python Publish

```text
   ON
   OFF
```
10. อธิบายความแตกต่างระหว่าง

```text
   Node-RED
```
   และ

```text
   Python MQTT Application
```
11. อธิบายว่าเหตุใดควรใช้

```text
   venv
```
12. อธิบายว่าเหตุใด INVALID Data ไม่ควรถูกนำไปควบคุม Actuator


## 20.56 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 20

```text
ESP32
   ↓
  MQTT
   ↓
Node-RED
   ↓
Processing
```
หลัง LAB 20

```text
ESP32
   ↓
  MQTT
   ↓
Python Application
   ↓
Processing
```
จึงเข้าใจว่า

```text
Node-RED ≠ IoT Gateway ทั้งหมด
```
และ

```text
Python ≠ MQTT Broker
```
แต่แต่ละ Component มีหน้าที่ต่างกัน

```text
Mosquitto
   → Message Broker

Python
   → Application Logic

Node-RED
   → Flow Processing / Dashboard

SQLite
   → Data Storage

ESP32
   → IoT Node

Raspberry Pi
   → IoT Gateway / Edge Computer
```


## 20.57 Architecture หลัง LAB 20

```text
                IoT NODES

ESP32-001 ─┐
ESP32-002 ─┼──────────────┐
ESP32-003 ─┘              │
                          ▼
                   ┌─────────────┐
                   │ Mosquitto   │
                   │ MQTT Broker │
                   └──────┬──────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
         ┌─────────────┐     ┌─────────────┐
         │ Python      │     │ Node-RED    │
         │ Application │     │ Dashboard   │
         │             │     │             │
         │ Parse       │     │ Monitoring  │
         │ Validate    │     │ Charts      │
         │ Rule        │     │ UI          │
         │ Control     │     │             │
         └──────┬──────┘     └─────────────┘
                │
                │ MQTT Command
                ▼
         ┌─────────────┐
         │ ESP32       │
         │ Actuator    │
         └─────────────┘
```


## 20.58 ความสัมพันธ์ของ LAB 18–20

LAB 18

```text
Device
  ↓
Availability
  ↓
ONLINE / OFFLINE
```
LAB 19

```text
Sensor Data
    ↓
Data Validation
    ↓
VALID / INVALID / STALE
```
LAB 20

```text
MQTT Data
    ↓
Python Application
    ↓
Validation
    ↓
Application Logic
    ↓
MQTT Command
```
เส้นทางการเรียนจึงพัฒนาเป็น

```text
Monitor Device
      ↓
Verify Data
      ↓
Program Gateway Logic
```


## 20.59 จุดสำคัญที่สุดของ LAB

นักศึกษาควรเข้าใจ Processing Pipeline

```text
MQTT Message
     ↓
Topic Validation
     ↓
  Decode
     ↓
JSON Parsing
     ↓
Data Validation
     ↓
  VALID?
   /   \
 YES    NO
  │      │
  ▼      ▼
 Rule   Reject
  │
  ▼
Decision
  │
  ▼
MQTT Command
```
ไม่ควรเขียนระบบแบบ

```text
MQTT
  ↓
Sensor Value
  ↓
Actuator
```
โดยไม่มี Validation และ Error Handling


## เชื่อมไป LAB 21 --- systemd Service

ปัจจุบันต้อง Run

```bash
source ~/iot-gateway/venv/bin/activate
```
แล้ว

```bash
python gateway.py
```
ถ้า

```text
Raspberry Pi Reboot
```
Application หยุด

ถ้า

```text
Python Process Crash
```
Application หยุด

ถ้าผู้ดูแลไม่ได้ SSH เข้าเครื่อง

Gateway Application จะไม่กลับมาทำงานเอง

LAB 21 จะแก้ปัญหานี้ด้วย

```text
systemd
```
Architecture จะเปลี่ยนจาก

```text
Raspberry Pi
    ↓
  Boot
    ↓
  Human
    ↓
   SSH
    ↓
python gateway.py
```
เป็น

```text
Raspberry Pi
    ↓
  Boot
    ↓
 systemd
    ↓
Python Gateway
    ↓
MQTT Processing
```
และสามารถกำหนด

```text
Restart=always
```
หรือ Policy ที่เหมาะสม

เพื่อให้ Application กลับมาทำงานหลัง Process Failure

เป้าหมายคือเปลี่ยนจาก

```text
Python Script
```
ไปเป็น

```text
Managed Linux Service
```
และเปลี่ยน Raspberry Pi จาก

```text
Gateway ที่ต้องมีคนเปิดโปรแกรม
```
ไปสู่

```text
Autonomous IoT Gateway
```
