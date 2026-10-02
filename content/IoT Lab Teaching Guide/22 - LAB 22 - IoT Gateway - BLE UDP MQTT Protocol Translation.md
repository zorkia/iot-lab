> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[21 - LAB 21 - systemd Service - Autonomous Python IoT Gateway]]
> ถัดไป: [[23 - LAB 23 - Offline Store-and-Forward with SQLite]]

# LAB 22 --- IoT Gateway: BLE / UDP / MQTT Protocol Translation

> [!info] แก้ไขล่าสุด
> 2026-10-01 23:40:58 +07


## 22.1 แนวคิดของ LAB

จนถึง LAB 21 ระบบของเรามี Architecture หลัก

```text
ESP32
   │
   │ MQTT
   ▼
Mosquitto
   │
   ├──→ Python Gateway
   └──→ Node-RED / Dashboard
```
แต่ในระบบ IoT จริง Sensor หรือ IoT Node ไม่ได้ใช้ MQTT ทุกตัว

ตัวอย่าง

```text
Mijia LYWSD03MMC
    ↓
BLE / BTHome
```
หรือ ESP32 บางระบบอาจใช้

```text
UDP
```
แทน MQTT

ดังนั้น Raspberry Pi สามารถทำหน้าที่เป็น

```text
IoT Gateway
```
เพื่อรับข้อมูลจาก Protocol ต่าง ๆ แล้วแปลงให้อยู่ในรูปแบบกลาง

ใน LAB นี้กำหนดให้

```text
MQTT
```
เป็น Protocol กลางภายในระบบ

Architecture

```text
BLE / BTHome ──┐
               │
UDP ───────────┼──→ Raspberry Pi Gateway ──→ MQTT
               │
MQTT ──────────┘
```
จากนั้นระบบเดิมสามารถนำข้อมูลไปใช้ต่อได้

```text
MQTT
  │
  ├──→ Node-RED
  ├──→ SQLite
  ├──→ Dashboard
  └──→ Control Logic
```
แนวคิดสำคัญคือ

```text
Protocol Translation
```
หรือ

```text
Protocol Bridging
```


## 22.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบายบทบาทของ IoT Gateway
- อธิบายความแตกต่างระหว่าง IoT Node และ IoT Gateway
- รับข้อมูล UDP บน Raspberry Pi
- Parse UDP Payload
- แปลง UDP → MQTT
- Scan BLE Device
- ตรวจสอบ BLE Advertisement
- เข้าใจ BTHome Advertisement
- รับข้อมูล Sensor จาก BLE/BTHome
- แปลง BLE/BTHome → MQTT
- Normalize ข้อมูลจาก Protocol ต่างกัน
- ใช้ MQTT เป็น Common Messaging Layer
- เชื่อมข้อมูลเข้าสู่ Node-RED / Dashboard
- เข้าใจแนวคิด Multi-protocol IoT Gateway


## 22.3 Architecture ของ LAB

```text
                     IoT DEVICES

         ┌─────────────────────────┐
         │ Mijia LYWSD03MMC        │
         │ BLE / BTHome            │
         └────────────┬────────────┘
                      │
                      │ BLE Advertisement
                      ▼
             ┌──────────────────┐
             │                  │
             │  Raspberry Pi    │
             │                  │
             │  IoT Gateway     │
             │                  │
             │ BLE Receiver     │
             │ UDP Receiver     │
             │ Data Parser      │
             │ Data Normalizer  │
             │ MQTT Publisher   │
             │                  │
             └────────┬─────────┘
                      │
                      │ MQTT
                      ▼
                ┌───────────┐
                │ Mosquitto │
                └─────┬─────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Node-RED     SQLite     Dashboard
```
อีกเส้นทาง

```text
ESP32
  │
  │ UDP
  ▼
Raspberry Pi
  │
  │ UDP → JSON → MQTT
  ▼
Mosquitto
```


## 22.4 ทำไมต้องมี Gateway

สมมติระบบมี

```text
Sensor A → MQTT
Sensor B → BLE
Sensor C → UDP
```
ถ้า Application ต้องรองรับทุก Protocol โดยตรง

```text
Dashboard
   ├── MQTT
   ├── BLE
   └── UDP
```
ระบบจะซับซ้อนขึ้น

แนวทางที่ดีกว่าคือ

```text
BLE ──┐
      │
UDP ──┼──→ Gateway ──→ MQTT
      │
MQTT ─┘
```
จากนั้น Application Layer ใช้เพียง

```text
MQTT
```
Architecture จึงเป็น

```text
Heterogeneous Devices
        ↓
     Gateway
        ↓
Common Data Interface
        ↓
   Applications
```


## 22.5 IoT Node กับ IoT Gateway

### IoT Node

เช่น

```text
ESP32
Sensor Node
Mijia Sensor
```
หน้าที่หลัก

```text
Sense
Measure
Actuate
Communicate
```


### IoT Gateway

เช่น

```text
Raspberry Pi
```
หน้าที่อาจประกอบด้วย

```text
Receive
Decode
Validate
Normalize
Translate Protocol
Filter
Aggregate
Store
Forward
```
ใน LAB นี้เน้น

```text
Receive
  ↓
Decode
  ↓
Normalize
  ↓
MQTT Publish
```


## 22.6 ส่วนที่ 1 — UDP → MQTT Gateway

เริ่มจาก UDP เพราะเข้าใจ Protocol Translation ได้ง่าย

Architecture

```text
ESP32 / Simulator
       │
       │ UDP
       ▼
Raspberry Pi
       │
       │ Python UDP Receiver
       ▼
    Parse JSON
       │
       ▼
    Validate
       │
       ▼
     MQTT
       │
       ▼
   Mosquitto
```


## 22.7 กำหนด UDP Payload

ให้ ESP32 ส่ง JSON

ตัวอย่าง

```json
{
  "device_id": "001",
  "temp": 30,
  "humi": 70,
  "light": 1500
}
```
UDP Port

```text
5005
```
Raspberry Pi จะ Listen

```text
0.0.0.0:5005
```


## 22.8 ตรวจสอบ IP Raspberry Pi

ใช้

```bash
hostname -I
```
หรือ

```bash
ip addr
```
ตัวอย่าง

```text
PI_IP
```
สมมติ

```text
Raspberry Pi IP = PI_IP
```
ESP32 ต้องส่ง UDP ไปยัง

```text
PI_IP:5005
```
ในระบบจริงให้ใช้ IP ของ Raspberry Pi เครื่องนั้น


## 22.9 ทดสอบ UDP Receiver ด้วย netcat

บน Raspberry Pi

```bash
nc -u -l 5005
```
ถ้า `nc` ยังไม่มี

```bash
sudo apt update

sudo apt install netcat-openbsd -y
```


## 22.10 ส่ง UDP จากเครื่องเดียวกัน

เปิดอีก Terminal

```bash
echo '{"device_id":"001","temp":30,"humi":70,"light":1500}' \
| nc -u -w1 127.0.0.1 5005
```
ฝั่ง Receiver ควรเห็น

```json
{"device_id":"001","temp":30,"humi":70,"light":1500}
```
นี่เป็นการพิสูจน์ว่า

```text
UDP Receiver
```
ทำงานก่อนเริ่มเขียน Python


## 22.11 UDP ไม่มี Broker

MQTT Architecture

```text
Publisher
    ↓
  Broker
    ↓
Subscriber
```
แต่ UDP

```text
Sender
   ↓
Receiver
```
โดยตรง

ดังนั้น UDP ไม่มี MQTT Broker มาช่วย

- Queue
- Topic Routing
- Subscription
- Retained Message
- LWT

Gateway จึงต้อง Listen UDP Port เอง


## 22.12 Python UDP Receiver

ใช้ Project จาก LAB 20–21

```text
~/iot-gateway
```
Activate venv สำหรับการพัฒนา

```bash
cd ~/iot-gateway

source venv/bin/activate
```
สร้างไฟล์

```bash
nano udp_gateway.py
```


## 22.13 UDP Receiver Code

ใช้

```python
import socket


udp_ip = "0.0.0.0"
udp_port = 5005

sock = socket.socket(
    socket.AF_INET,
    socket.SOCK_DGRAM
)

sock.bind(
    (udp_ip, udp_port)
)

print(
    f"UDP listening on "
    f"{udp_ip}:{udp_port}"
)

while True:
    data, address = sock.recvfrom(2048)

    payload = data.decode(
        "utf-8"
    )

    print(
        f"From {address}: "
        f"{payload}"
    )
```
Run

```bash
python udp_gateway.py
```


## 22.14 ทดสอบ Python UDP Receiver

ส่ง

```bash
echo '{"device_id":"001","temp":30,"humi":70,"light":1500}' \
| nc -u -w1 127.0.0.1 5005
```
Python ควรแสดงประมาณ

```text
UDP listening on 0.0.0.0:5005

From ('127.0.0.1', ...):
{"device_id":"001","temp":30,"humi":70,"light":1500}
```


## 22.15 Parse UDP JSON

เพิ่ม

```python
import json
```
แล้วใช้

```python
try:
    sensor_data = json.loads(
        payload
    )

except json.JSONDecodeError:
    print(
        "Invalid UDP JSON"
    )
    continue
```
จากนั้นสามารถอ่าน

```text
sensor_data["device_id"]
sensor_data["temp"]
sensor_data["humi"]
sensor_data["light"]
```


## 22.16 UDP → MQTT

เพิ่ม Paho MQTT

```python
import paho.mqtt.client as mqtt
```
สร้าง MQTT Client

```python
mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="udp-gateway"
)
```
เชื่อมต่อ

```python
mqtt_client.connect(
    "localhost",
    1883,
    60
)
```
เริ่ม Network Loop

```python
mqtt_client.loop_start()
```
จากนั้นเมื่อได้รับ UDP

สร้าง Topic

```text
device_id = sensor_data["device_id"]

mqtt_topic = (
    f"pkru/iot/{device_id}/data"
)
```
Publish

```python
mqtt_client.publish(
    mqtt_topic,
    json.dumps(sensor_data)
)
```


## 22.17 Full UDP → MQTT Gateway

ไฟล์

```text
udp_gateway.py
```
ใช้

```python
import json
import socket

import paho.mqtt.client as mqtt


udp_ip = "0.0.0.0"
udp_port = 5005

mqtt_broker = "localhost"
mqtt_port = 1883


mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="udp-gateway"
)

mqtt_client.connect(
    mqtt_broker,
    mqtt_port,
    60
)

mqtt_client.loop_start()


sock = socket.socket(
    socket.AF_INET,
    socket.SOCK_DGRAM
)

sock.bind(
    (udp_ip, udp_port)
)


print(
    f"UDP Gateway listening "
    f"on {udp_ip}:{udp_port}"
)


while True:

    data, address = sock.recvfrom(
        2048
    )

    try:
        payload = data.decode(
            "utf-8"
        )

        sensor_data = json.loads(
            payload
        )

        if not isinstance(
            sensor_data,
            dict
        ):
            print(
                "Invalid payload"
            )
            continue

        device_id = str(
            sensor_data["device_id"]
        )

        temp = float(
            sensor_data["temp"]
        )

        humi = float(
            sensor_data["humi"]
        )

        light = float(
            sensor_data["light"]
        )

        mqtt_data = {
            "temp": temp,
            "humi": humi,
            "light": light
        }

        mqtt_topic = (
            f"pkru/iot/"
            f"{device_id}/data"
        )

        mqtt_client.publish(
            mqtt_topic,
            json.dumps(mqtt_data)
        )

        print(
            f"UDP {address} "
            f"→ MQTT {mqtt_topic} "
            f"{mqtt_data}"
        )

    except (
        json.JSONDecodeError,
        KeyError,
        TypeError,
        ValueError,
        UnicodeDecodeError
    ) as error:

        print(
            f"Invalid UDP data: "
            f"{error}"
        )
```


## 22.18 สังเกต Data Normalization

UDP Payload

```json
{
  "device_id": "001",
  "temp": 30,
  "humi": 70,
  "light": 1500
}
```
Gateway Publish MQTT

Topic

```text
pkru/iot/001/data
```
Payload

```json
{
  "temp": 30.0,
  "humi": 70.0,
  "light": 1500.0
}
```
สังเกตว่า

```text
device_id
```
ถูกย้ายจาก Payload

ไปเป็นส่วนหนึ่งของ

```text
MQTT Topic
```
เพื่อให้ตรงกับ Topic Design จาก LAB 16

นี่คือ

```text
Data Normalization
```


## 22.19 ทดสอบ UDP → MQTT

Terminal 1

Subscribe MQTT

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/data" \
-v
```
Terminal 2

Run Gateway

```bash
cd ~/iot-gateway

source venv/bin/activate

python udp_gateway.py
```
Terminal 3

ส่ง UDP

```bash
echo '{"device_id":"001","temp":30,"humi":70,"light":1500}' \
| nc -u -w1 127.0.0.1 5005
```
ผลที่ MQTT Subscriber

```text
pkru/iot/001/data {"temp": 30.0, "humi": 70.0, "light": 1500.0}
```
แสดงว่า

```text
UDP
  ↓
Python Gateway
  ↓
 MQTT
```
ทำงานสำเร็จ


## 22.20 UDP Multi-device Simulator

ใช้ Bash จำลอง 3 Device

```bash
while true
do
    temp1=$((25 + RANDOM % 11))
    temp2=$((25 + RANDOM % 11))
    temp3=$((25 + RANDOM % 11))

    echo "{\"device_id\":\"001\",\"temp\":$temp1,\"humi\":70,\"light\":1000}" \
    | nc -u -w1 127.0.0.1 5005

    echo "{\"device_id\":\"002\",\"temp\":$temp2,\"humi\":75,\"light\":1500}" \
    | nc -u -w1 127.0.0.1 5005

    echo "{\"device_id\":\"003\",\"temp\":$temp3,\"humi\":80,\"light\":2000}" \
    | nc -u -w1 127.0.0.1 5005

    sleep 5
done
```
MQTT Subscriber จะเห็น

```text
pkru/iot/001/data ...
pkru/iot/002/data ...
pkru/iot/003/data ...
```


## 22.21 ESP32 → UDP → Raspberry Pi

เมื่อเปลี่ยนจาก Simulator เป็น ESP32

Architecture

```text
ESP32
   │
   │ Wi-Fi
   │ UDP
   ▼
   AP
   │
   ▼
Raspberry Pi
   │
   │ UDP :5005
   ▼
Python Gateway
   │
   ▼
  MQTT
```
ESP32 ไม่จำเป็นต้อง Run MQTT Client

เพียงส่ง UDP Datagram ไปยัง IP ของ Raspberry Pi


## 22.22 ข้อกำหนด Network สำหรับ UDP

ESP32 และ Raspberry Pi ต้องสามารถสื่อสารกันผ่าน IP ได้

เช่น

```text
ESP32
LAN_IP

Raspberry Pi
PI_IP
```
ผ่าน AP เดียวกัน

AP ต้องไม่เปิด

```text
AP Isolation
Client Isolation
```
ที่ห้าม Client ติดต่อกัน

สำหรับระบบ LAB ควรใช้

```text
Static IP
```
หรือ

```text
DHCP Reservation
```
สำหรับ Raspberry Pi

เพื่อให้ ESP32 รู้ Gateway IP แน่นอน


## 22.23 UDP เป็น Connectionless Protocol

UDP ไม่มี Connection Session แบบ TCP

ข้อดี

- Simple
- Low Overhead
- Latency ต่ำ
- เหมาะกับ Sensor Datagram บางประเภท

ข้อจำกัด

- ไม่รับประกัน Delivery
- ไม่มี ACK ในตัว
- Packet อาจหาย
- Packet อาจซ้ำ
- Packet อาจมาผิดลำดับ

ดังนั้น

```text
UDP Receive Success
```
ไม่ได้หมายความว่า

```text
ทุก Packet ถูกส่งถึงแน่นอน
```
ถ้าระบบต้องการ Reliability สูง ต้องเพิ่ม Application-level Mechanism เช่น

```text
sequence number
acknowledgment
retry
timestamp
```
หรือเลือก Protocol ที่เหมาะสมกว่า


## 22.24 ส่วนที่ 2 — BLE / BTHome → MQTT

อุปกรณ์ตัวอย่าง

```text
Xiaomi / Mijia LYWSD03MMC
```
ที่ใช้ Firmware ซึ่ง Broadcast

```text
BTHome
```
ผ่าน BLE Advertisement

Architecture

```text
Mijia
  │
  │ BLE Advertisement
  ▼
Raspberry Pi
  │
  │ Bluetooth
  ▼
BLE Scanner
  │
  ▼
BTHome Decode
  │
  ▼
 MQTT
  │
  ▼
Node-RED
```


## 22.25 BLE Advertisement ต่างจาก MQTT

MQTT

```text
Device
  │
  ▼
Broker
  │
  ▼
Subscriber
```
BLE Advertisement

```text
BLE Device
    │
    │ Broadcast
    ▼
  Radio
    │
    ├──→ Receiver A
    ├──→ Receiver B
    └──→ Receiver C
```
Sensor สามารถ Broadcast ข้อมูลโดยไม่ต้องสร้าง Connection กับ Raspberry Pi ในทุกครั้ง

เหมาะกับ

```text
Temperature Sensor
Humidity Sensor
Battery Sensor
Beacon
```


## 22.26 ตรวจสอบ Bluetooth บน Raspberry Pi

ใช้

```bash
bluetoothctl show
```
ควรเห็น Bluetooth Controller

ตรวจสอบ Interface

```bash
hciconfig
```
ถ้าคำสั่งนี้ไม่มี ไม่เป็นปัญหา เพราะระบบ Linux รุ่นใหม่ใช้ `bluetoothctl` เป็นหลัก

ตรวจสอบ rfkill

```bash
rfkill list
```
ถ้า Bluetooth ถูก Block

เช่น

```text
Soft blocked: yes
```
แก้ด้วย

```bash
sudo rfkill unblock bluetooth
```


## 22.27 ตรวจสอบ Bluetooth Service

ใช้

```bash
systemctl status bluetooth
```
ควรเห็น

```text
active (running)
```
ถ้ายังไม่ทำงาน

```bash
sudo systemctl enable --now bluetooth
```


## 22.28 Scan BLE Device

ใช้

```bash
bluetoothctl
```
จาก Prompt

```bash
scan on
```
จะเห็น BLE Device รอบ ๆ

ตัวอย่าง Mijia

```text
AA:BB:CC:xx:xx:xx
```
อาจพบหลายตัว

บันทึก MAC Address ของ Sensor ที่ต้องการใช้

หยุด Scan

```bash
scan off
```
ออก

```bash
quit
```


## 22.29 BTHome

BTHome เป็นรูปแบบสำหรับส่ง Sensor Measurement ผ่าน

```text
Bluetooth Low Energy Advertisement
```
ข้อมูลอาจประกอบด้วย

```text
Temperature
Humidity
Battery
Voltage
Packet ID
Sensor Measurements อื่น ๆ
```
BTHome Service UUID ที่พบได้คือ

```text
0xFCD2
```
หรือในรูปแบบเต็ม

```text
0000fcd2-0000-1000-8000-00805f9b34fb
```
Gateway ต้อง

```text
Scan Advertisement
      ↓
Identify BTHome
      ↓
Decode Measurements
      ↓
Normalize
      ↓
MQTT Publish
```


## 22.30 หมายเหตุสำคัญเกี่ยวกับ Mijia

Mijia LYWSD03MMC จากโรงงานอาจไม่ได้ Broadcast BTHome ในรูปแบบที่ใช้ใน LAB นี้

LAB นี้สมมติว่า Sensor ถูกตั้งค่า Firmware/Advertising Format ให้ส่ง

```text
BTHome
```
แล้ว

ก่อนทำ LAB ต้องยืนยันด้วยการ Scan ว่า Device ส่ง Advertisement ที่ Gateway สามารถอ่านได้

ไม่ควรสมมติว่า Mijia ทุกตัวจะส่ง BTHome โดยอัตโนมัติ


## 22.31 ตรวจสอบ BLE Advertisement

ขั้นแรกไม่ต้องรีบ Decode

เป้าหมายคือพิสูจน์ว่า Raspberry Pi

```text
เห็น Device
```
ก่อน

ใช้

```bash
bluetoothctl
```
แล้ว

```bash
scan on
```
ถ้าเห็น MAC Address ของ Mijia แสดงว่า

```text
BLE Radio
    ↓
Raspberry Pi
```
ทำงาน


## 22.32 Python BLE Library

สำหรับ Python สามารถใช้

```text
bleak
```
ติดตั้งใน venv

```bash
cd ~/iot-gateway

source venv/bin/activate

pip install bleak
```
ตรวจสอบ

```bash
pip show bleak
```


## 22.33 BLE Scanner ด้วย Python

สร้าง

```bash
nano ble_scan.py
```
ใช้

```python
import asyncio

from bleak import BleakScanner


async def main():

    devices = await BleakScanner.discover(
        timeout=10.0
    )

    for device in devices:
        print(
            device.address,
            device.name,
            device.rssi
        )


asyncio.run(
    main()
)
```
หมายเหตุ:

Bleak บางเวอร์ชันอาจจัดรายละเอียด Advertisement ผ่าน Callback/API ที่ต่างจากการ Scan แบบพื้นฐานนี้

เป้าหมายของขั้นตอนนี้คือ

```text
Device Discovery
```
ก่อนเข้าสู่ BTHome Decoding


## 22.34 Run BLE Scanner

```bash
python ble_scan.py
```
ควรเห็น BLE Device รอบ ๆ

ค้นหา MAC ของ Mijia เช่น

```text
AA:BB:CC:xx:xx:xx
```
ถ้าไม่พบ

ตรวจสอบ

```text
Bluetooth
rfkill
Sensor Battery
Distance
Advertisement Mode
```


## 22.35 BTHome Decoder

BTHome ไม่ใช่เพียงการอ่านชื่อ BLE Device

Gateway ต้อง Decode

```text
Service Data
```
ที่อยู่ใน Advertisement

Pipeline

```text
BLE Advertisement
      ↓
  Service UUID
      ↓
   BTHome Data
      ↓
  Object Decode
      ↓
temp / humi / battery
```
สำหรับการสอน แนะนำแยกเป็นสองระดับ

```text
Level 1
BLE Discovery

Level 2
BTHome Decode
```
เพื่อให้นักศึกษาเห็นว่า

```text
BLE
```
คือ Transport/Radio Technology

ส่วน

```text
BTHome
```
คือ Data Format/Application Protocol ที่อยู่บน BLE Advertisement


## 22.36 ใช้ BTHome Decoder Library

เนื่องจากรายละเอียด BTHome Advertisement มี Object ID, Encoding และอาจมี Encryption

ไม่ควรให้นักศึกษาเริ่มจากการ Decode Byte ทั้งหมดด้วยมือ

แนวทาง LAB คือใช้ Python Library ที่รองรับ BTHome แล้วเน้น

```text
Receive
Decode
Normalize
Publish
```
ก่อน

แนวคิด

```text
Advertisement
     ↓
BTHome Decoder
     ↓
{
  temperature,
  humidity,
  battery
}
```
จากนั้น Gateway ทำงานต่อได้เหมือนข้อมูลจาก UDP


## 22.37 Normalized MQTT Data

สมมติ BTHome Decoder ได้

```text
temperature = 29.6
humidity = 72.5
battery = 87
```
Gateway สามารถ Publish

Topic

```text
pkru/iot/mijia01/data
```
Payload

```json
{
  "temp": 29.6,
  "humi": 72.5,
  "battery": 87
}
```
สังเกตว่า Mijia ไม่มี

```text
light
```
ดังนั้นไม่ควรสร้างค่า Light ปลอม

เช่น

```text
light = 0
```
เพียงเพื่อให้ Payload เหมือน ESP32

Data Normalization ไม่ได้หมายถึงการสร้างข้อมูลที่ Sensor ไม่มี


## 22.38 Schema ของ Sensor ต่างชนิด

ESP32

```json
{
  "temp": 30,
  "humi": 70,
  "light": 1500
}
```
Mijia

```json
{
  "temp": 29.6,
  "humi": 72.5,
  "battery": 87
}
```
ทั้งสองสามารถใช้ Topic Structure เดียวกัน

```text
pkru/iot/{device_id}/data
```
แต่ Payload สามารถมี Field แตกต่างกันตาม Device Capability

ระบบ Validation จึงควรทราบ

```text
Device Type
```
หรือ

```text
Sensor Capability
```
ในระบบที่ซับซ้อนขึ้น


## 22.39 Device Naming

สำหรับ LAB สามารถใช้

```text
mijia01
mijia02
mijia03
```
ตัวอย่าง

```text
pkru/iot/mijia01/data

pkru/iot/mijia02/data

pkru/iot/mijia03/data
```
ทำให้อ่านง่ายกว่าใช้ MAC Address เป็น Topic โดยตรง

Gateway สามารถมี Mapping

```text
AA:BB:CC:xx:xx:01
    ↓
mijia01

AA:BB:CC:xx:xx:02
    ↓
mijia02
```


## 22.40 Device Mapping

ตัวอย่าง Python Dictionary

```python
device_map = {
    "AA:BB:CC:AA:BB:01": "mijia01",
    "AA:BB:CC:AA:BB:02": "mijia02",
    "AA:BB:CC:AA:BB:03": "mijia03"
}
```
เมื่อ BLE Scanner พบ

```text
MAC Address
```
Gateway แปลงเป็น

```text
Logical Device ID
```
ก่อน Publish MQTT

นี่ช่วยแยก

```text
Physical Identifier
```
ออกจาก

```text
Application Identifier
```


## 22.41 BLE → MQTT Logic

Pseudo Flow

```text
BLE Advertisement
      ↓
Get MAC Address
      ↓
Check device_map
      ↓
Decode BTHome
      ↓
Get Measurements
      ↓
Build JSON
      ↓
Build MQTT Topic
      ↓
Publish
```
ตัวอย่าง

```text
MAC
AA:BB:CC:AA:BB:01

      ↓

device_id
mijia01

      ↓

BTHome

temp = 29.6
humi = 72.5
battery = 87

      ↓

MQTT

pkru/iot/mijia01/data

      ↓

{
  "temp":29.6,
  "humi":72.5,
  "battery":87
}
```


## 22.42 MQTT Subscriber สำหรับ BLE Gateway

ใช้

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/data" \
-v
```
เมื่อ Gateway Decode BTHome สำเร็จ

ควรเห็น

```text
pkru/iot/mijia01/data {"temp":29.6,"humi":72.5,"battery":87}
```
จากจุดนี้

Node-RED ไม่จำเป็นต้องรู้ว่า

```text
Data เดิมมาจาก BLE
```
เพราะรับข้อมูลผ่าน MQTT แล้ว

นี่คือประโยชน์สำคัญของ Gateway


## 22.43 Protocol Translation

ก่อน Gateway

```text
Node-RED
   ├── MQTT Input
   ├── UDP Input
   └── BLE Input
```
หลัง Gateway

```text
BLE ──┐
      │
UDP ──┼──→ Gateway ──→ MQTT ──→ Node-RED
      │
MQTT ─┘
```
Application Layer จึงง่ายขึ้น


## 22.44 Gateway ไม่ได้แค่ Forward Data

Gateway ที่ดีไม่ควรทำเพียง

```text
Input
  ↓
Output
```
แต่สามารถทำ

```text
Receive
  ↓
Decode
  ↓
Validate
  ↓
Normalize
  ↓
Add Metadata
  ↓
Publish
```
ตัวอย่าง UDP

Input

```json
{
  "device_id":"001",
  "temp":"30",
  "humi":"70",
  "light":"1500"
}
```
Gateway

```text
Parse
  ↓
Convert Type
  ↓
Validate
```
Output

```text
pkru/iot/001/data

{
  "temp":30.0,
  "humi":70.0,
  "light":1500.0
}
```


## 22.45 เพิ่ม Gateway Metadata

ระบบจริงอาจเพิ่ม

```text
gateway_id
protocol
received_at
```
ตัวอย่าง

```json
{
  "temp":30.0,
  "humi":70.0,
  "light":1500.0,
  "gateway_id":"pi01",
  "protocol":"udp"
}
```
หรือ BLE

```json
{
  "temp":29.6,
  "humi":72.5,
  "battery":87,
  "gateway_id":"pi01",
  "protocol":"bthome"
}
```
ช่วยให้ระบบรู้ว่า

```text
Data มาจาก Gateway ไหน
```
และ

```text
Data เดิมมาจาก Protocol อะไร
```
สำหรับ LAB หลัก Metadata นี้เป็นส่วนเสริม ไม่จำเป็นต้องเพิ่มทุก Message


## 22.46 Gateway กับ Data Quality

LAB 19 มี

```text
VALID
INVALID
STALE
```
Gateway สามารถ Validation ก่อน Publish MQTT

เช่น UDP

```text
Receive
  ↓
Parse
  ↓
Validate
  │
  ├── VALID → MQTT
  │
  └── INVALID → Reject / Log
```
หรือสามารถ Publish Quality Metadata เพื่อให้ Processing Layer ตัดสินใจต่อ

แนวทางใดเหมาะสมขึ้นกับ Architecture


## 22.47 BLE และ Wi-Fi บน Raspberry Pi

Raspberry Pi 3B+/4B มีทั้ง

```text
Wi-Fi
Bluetooth
```
จึงสามารถทำงาน

```text
BLE Receive
   +
Wi-Fi/Ethernet MQTT
```
พร้อมกันได้

Architecture

```text
Mijia
  │
  │ BLE
  ▼
Raspberry Pi
  │
  │ Wi-Fi / Ethernet
  ▼
MQTT / Network
```
ในระบบที่ Raspberry Pi อยู่ในตู้โลหะ อาจพิจารณา USB Bluetooth Adapter หรือ USB Wi-Fi Adapter พร้อมสายอากาศภายนอกตามข้อจำกัดทางกายภาพของระบบ


## 22.48 Multi-protocol Gateway Architecture

หลังรวม UDP และ BLE

```text
┌──────────────┐
│ Mijia #1     │
│ BLE/BTHome   │
└──────┬───────┘
       │
┌──────────────┐
│ Mijia #2     │
│ BLE/BTHome   │
└──────┬───────┘
       │
       ├─────────────────────┐
                             │
┌──────────────┐             │
│ ESP32 #1     │             │
│ UDP          │             │
└──────┬───────┘             │
       │                     │
┌──────────────┐             │
│ ESP32 #2     │             │
│ UDP          │             │
└──────┬───────┘             │
       │                     │
       └─────────────┐       │
                     ▼       ▼
                ┌─────────────────┐
                │ Raspberry Pi    │
                │ IoT Gateway     │
                │                 │
                │ BLE Receiver    │
                │ UDP Receiver    │
                │ Decoder         │
                │ Normalizer      │
                │ MQTT Publisher  │
                └────────┬────────┘
                         │
                         ▼
                    Mosquitto
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Node-RED    SQLite   Dashboard
```


## 22.49 MQTT Device สามารถเข้าตรงได้

ถ้า ESP32 รองรับ MQTT อยู่แล้ว

ไม่จำเป็นต้องผ่าน Protocol Translation

Architecture

```text
MQTT Device ──────────────────┐
                              │
UDP Device ─→ Gateway ────────┼──→ Mosquitto
                              │
BLE Device ─→ Gateway ────────┘
```
ดังนั้น Gateway ไม่จำเป็นต้องแปลง Protocol ทุก Device

ใช้เฉพาะเมื่อจำเป็น


## 22.50 Edge Gateway

เมื่อ Raspberry Pi ทำ

```text
Protocol Translation
Validation
Filtering
Local Processing
Local Storage
Rule Processing
```
Raspberry Pi เริ่มมีบทบาทเป็น

```text
Edge Gateway
```
เพราะ Processing เกิดใกล้ Device

ไม่จำเป็นต้องส่ง Raw Data ทุกอย่างไป Cloud ก่อน


## 22.51 Internet ไม่จำเป็นสำหรับ Local Gateway

Architecture

```text
Sensor
   ↓
Raspberry Pi
   ↓
Mosquitto
   ↓
Node-RED
   ↓
Dashboard
```
ทั้งหมดสามารถทำงานภายใน LAN

แม้

```text
Internet = DOWN
```
ตราบใดที่

```text
Local Network
```
ยังทำงาน

นี่เป็นพื้นฐานสำคัญสำหรับ LAB 23

```text
Offline / Store-and-Forward
```


## 22.52 ทดสอบ UDP Invalid JSON

ส่ง

```bash
echo 'HELLO' \
| nc -u -w1 127.0.0.1 5005
```
Gateway ควรแสดง

```text
Invalid UDP data
```
แต่ Process ต้องไม่ Crash

จากนั้นส่ง Valid JSON

```bash
echo '{"device_id":"001","temp":30,"humi":70,"light":1500}' \
| nc -u -w1 127.0.0.1 5005
```
Gateway ต้องกลับมาประมวลผลได้ตามปกติ


## 22.53 ทดสอบ Missing Field

ส่ง

```bash
echo '{"device_id":"001","temp":30}' \
| nc -u -w1 127.0.0.1 5005
```
Gateway ควร Reject

เพราะไม่มี

```text
humi
light
```
จากนั้น Process ต้องยังทำงานต่อ


## 22.54 ทดสอบ Multi-device UDP

ส่ง

```bash
echo '{"device_id":"001","temp":30,"humi":70,"light":1000}' \
| nc -u -w1 127.0.0.1 5005

echo '{"device_id":"002","temp":31,"humi":72,"light":1200}' \
| nc -u -w1 127.0.0.1 5005

echo '{"device_id":"003","temp":32,"humi":74,"light":1400}' \
| nc -u -w1 127.0.0.1 5005
```
MQTT ต้องได้

```text
pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
```


## 22.55 ตรวจสอบ Node-RED

Node-RED จาก LAB 17 สามารถ Subscribe

```text
pkru/iot/+/data
```
ดังนั้นข้อมูลจาก

```text
MQTT Device
UDP Gateway
BLE Gateway
```
สามารถเข้าสู่ Flow เดียวกันได้

ถ้าใช้ Topic Schema เดียวกัน

นี่คือประโยชน์ของ

```text
Common MQTT Data Model
```


## 22.56 Protocol Origin

สมมติ Node-RED ได้

```text
pkru/iot/001/data
```
อาจไม่รู้ว่าเดิมมาจาก

```text
MQTT
UDP
BLE
```
ถ้าจำเป็นต้องรู้ สามารถเพิ่ม

```text
protocol
```
ใน Payload

เช่น

```json
{
  "temp":30,
  "humi":70,
  "light":1500,
  "protocol":"udp"
}
```
แต่ถ้า Application ไม่จำเป็นต้องรู้

ไม่จำเป็นต้องเพิ่มข้อมูลนี้

หลักการคือ

```text
Add Metadata only when useful
```


## 22.57 systemd สำหรับ UDP Gateway

จาก LAB 21 สามารถทำให้

```text
udp_gateway.py
```
เป็น Service

เช่น

```text
udp-gateway.service
```
ตัวอย่าง

```ini
[Unit]
Description=UDP to MQTT IoT Gateway
After=network-online.target mosquitto.service
Wants=network-online.target
Requires=mosquitto.service

[Service]
Type=simple
User=PI_USER
WorkingDirectory=/home/PI_USER/iot-gateway
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python -u /home/PI_USER/iot-gateway/udp_gateway.py
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


## 22.58 Enable UDP Gateway

หลังสร้าง Service

```bash
sudo systemctl daemon-reload

sudo systemctl enable --now udp-gateway
```
ตรวจสอบ

```bash
systemctl status udp-gateway
```
ดู Log

```bash
journalctl -u udp-gateway -f
```
จากนั้น UDP Gateway จะทำงานอัตโนมัติหลัง Boot


## 22.59 Service Architecture

Raspberry Pi สามารถมี

```text
mosquitto.service

iot-gateway.service

udp-gateway.service
```
และในอนาคต

```text
ble-gateway.service
```
ทั้งหมดถูกดูแลโดย

```text
systemd
```
Architecture

```text
            systemd
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
  Mosquitto   UDP      BLE
              Gateway  Gateway
                 │       │
                 └───┬───┘
                     ▼
                   MQTT
```


## 22.60 แยก Gateway Service หรือรวม Program เดียว

มีสองแนวทาง

### แบบที่ 1 — แยก Service

```text
udp-gateway.service
ble-gateway.service
```
ข้อดี

- Debug ง่าย
- Restart แยกกันได้
- BLE พังไม่กระทบ UDP
- เหมาะกับการเรียน

LAB นี้แนะนำแนวทางนี้


### แบบที่ 2 — Program เดียว

```text
iot-gateway.service
```
ภายในมี

```text
BLE Receiver
UDP Receiver
MQTT
```
ข้อดี

- Centralized Application

ข้อเสีย

- Code ซับซ้อนขึ้น
- Failure อาจกระทบหลาย Protocol
- ต้องจัดการ Concurrency / Async มากขึ้น

สำหรับการสอนเริ่มจาก

```text
Separate Services
```
ก่อน


## 22.61 Fault Isolation

การแยก

```text
BLE Gateway
```
และ

```text
UDP Gateway
```
เป็นคนละ Process ทำให้เกิด

```text
Fault Isolation
```
ถ้า

```text
BLE Gateway Crash
```
UDP Gateway ยังทำงาน

ถ้า

```text
UDP Gateway Crash
```
BLE Gateway ยังทำงาน

systemd สามารถ Restart เฉพาะ Service ที่มีปัญหา

แนวคิดนี้จะสำคัญมากใน

```text
LAB 27 — Fault-Tolerant IoT
```


## 22.62 แบบฝึกหัดที่ 1 — UDP Receiver

สร้าง Python UDP Receiver

Listen

```text
UDP 5005
```
ส่ง

```json
{"device_id":"001","temp":30,"humi":70,"light":1500}
```
ให้ Python แสดงข้อมูลที่รับได้


## 22.63 แบบฝึกหัดที่ 2 — UDP → MQTT

ให้ Gateway แปลง

```text
UDP
```
เป็น

```text
MQTT
```
Input

```json
{
  "device_id":"001",
  "temp":30,
  "humi":70,
  "light":1500
}
```
Output

Topic

```text
pkru/iot/001/data
```
Payload

```json
{
  "temp":30.0,
  "humi":70.0,
  "light":1500.0
}
```
ตรวจสอบด้วย

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/data" \
-v
```


## 22.64 แบบฝึกหัดที่ 3 — Multi-device UDP

จำลอง

```text
001
002
003
```
ส่ง UDP เข้า Gateway

MQTT ต้องแยก Topic

```text
pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
```


## 22.65 แบบฝึกหัดที่ 4 — Invalid UDP

ทดสอบ

```text
HELLO
```
และ

```json
{"device_id":"001","temp":30}
```
Gateway ต้อง

```text
Reject
Log Error
Continue Running
```


## 22.66 แบบฝึกหัดที่ 5 — BLE Scan

ใช้

```bash
bluetoothctl
```
Scan หา BLE Sensor

บันทึก

```text
MAC Address
Device Name
RSSI ถ้ามี
```
ยืนยันว่า Raspberry Pi สามารถรับ Advertisement จาก Sensor ได้


## 22.67 แบบฝึกหัดที่ 6 — BTHome Identification

ตรวจสอบ Sensor ที่ใช้ใน LAB ว่า Broadcast

```text
BTHome
```
ค้นหา

```text
Service UUID 0xFCD2
```
อธิบายความแตกต่างระหว่าง

```text
BLE
```
และ

```text
BTHome
```


## 22.68 แบบฝึกหัดที่ 7 — BLE → MQTT

เมื่อ Decoder สามารถอ่านค่าได้

Publish

```text
pkru/iot/mijia01/data
```
ตัวอย่าง

```json
{
  "temp":29.6,
  "humi":72.5,
  "battery":87
}
```
ตรวจสอบด้วย MQTT Subscriber


## 22.69 แบบฝึกหัดที่ 8 — Node-RED Integration

ใช้ MQTT In

```text
pkru/iot/+/data
```
ให้ Node-RED รับข้อมูลจาก

```text
UDP Device
```
และ

```text
BLE Device
```
ใน Flow เดียว

แสดง

```text
Device ID
Temp
Humi
```
บน Dashboard


## 22.70 แบบฝึกหัดที่ 9 — systemd

ทำ

```text
udp_gateway.py
```
ให้เป็น Service

ทดสอบ

```text
Start
Stop
Restart
Enable
Reboot
```
หลัง Reboot ต้องสามารถรับ

```text
UDP
```
และ Publish

```text
MQTT
```
โดยไม่ต้อง Run Python ด้วยมือ


## 22.71 งานส่ง LAB 22

นักศึกษาส่ง

1. Architecture Diagram

```text
   BLE
    │
   UDP
    │
    └──→ Raspberry Pi Gateway
                ↓
               MQTT
                ↓
             Node-RED
```
2. Source Code

```text
   udp_gateway.py
```
3. Screenshot UDP Receiver

4. Screenshot

```text
   UDP → MQTT
```
5. Screenshot Multi-device

```text
   001
   002
   003
```
6. Screenshot Invalid UDP แล้ว Gateway ยังทำงานต่อ

7. Screenshot BLE Scan

8. ระบุ MAC Address ของ BLE Sensor ที่ใช้

9. หลักฐานว่า Sensor ใช้ BTHome หรือ Advertisement Format ใด

10. Screenshot BLE/BTHome Data ที่ Decode ได้

11. Screenshot MQTT Topic ของ BLE Sensor

12. Screenshot Node-RED รับข้อมูลผ่าน MQTT

13. Screenshot

```bash
   systemctl status udp-gateway
```
14. อธิบายความแตกต่างระหว่าง

```text
   IoT Node
```
   และ

```text
   IoT Gateway
```
15. อธิบายความแตกต่างระหว่าง

```text
   BLE
```
   และ

```text
   BTHome
```
16. อธิบายความหมายของ

```text
   Protocol Translation
```
17. อธิบายว่าเหตุใด MQTT จึงเหมาะเป็น Common Messaging Layer ของ LAB นี้


## 22.72 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 22

```text
MQTT Device
     ↓
MQTT Broker
     ↓
Application
```
หลัง LAB 22

```text
BLE Device ──┐
             │
UDP Device ──┼──→ Gateway
             │
MQTT Device ─┘
                ↓
               MQTT
                ↓
           Applications
```
ดังนั้น Raspberry Pi ไม่ได้เป็นเพียง

```text
MQTT Client
```
แต่ทำหน้าที่เป็น

```text
Multi-protocol IoT Gateway
```


## 22.73 Gateway Processing Pipeline

Pipeline ที่ควรเข้าใจคือ

```text
Receive
   ↓
Identify Device
   ↓
Decode Protocol
   ↓
Parse Data
   ↓
Validate
   ↓
Normalize
   ↓
Publish MQTT
   ↓
Application
```
สำหรับ UDP

```text
UDP Datagram
     ↓
   JSON
     ↓
  Validate
     ↓
  Normalize
     ↓
   MQTT
```
สำหรับ BTHome

```text
BLE Advertisement
      ↓
  BTHome Decode
      ↓
   Measurement
      ↓
    Normalize
      ↓
     MQTT
```


## 22.74 Architecture หลัง LAB 22

```text
                     SENSOR / IoT NODES

    ┌─────────────┐
    │ Mijia       │
    │ BLE/BTHome  │
    └──────┬──────┘
           │
           │ BLE
           │
    ┌──────┴──────┐
    │ ESP32       │
    │ UDP         │
    └──────┬──────┘
           │
           │ Wi-Fi / UDP
           │
    ┌──────┴──────┐
    │ ESP32       │
    │ MQTT        │
    └──────┬──────┘
           │
           │ MQTT
           │
           ▼
    ┌───────────────────────┐
    │ Raspberry Pi          │
    │ Edge / IoT Gateway    │
    │                       │
    │ BLE Receiver          │
    │ UDP Receiver          │
    │ Protocol Decode       │
    │ Data Validation       │
    │ Data Normalization    │
    │ MQTT Publisher        │
    └───────────┬───────────┘
                │
                ▼
         ┌──────────────┐
         │ Mosquitto    │
         └──────┬───────┘
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
   Node-RED   SQLite   Dashboard
      │
      ▼
    Rule
      │
      ▼
   Control
```


## 22.75 ความสัมพันธ์ของ LAB 20–22

LAB 20

```text
Python
  ↓
MQTT Application
```
LAB 21

```text
systemd
  ↓
Managed Python Service
```
LAB 22

```text
BLE / UDP
    ↓
Python Gateway
    ↓
Protocol Translation
    ↓
   MQTT
```
เส้นทางจึงเป็น

```text
Program Gateway
      ↓
Run Gateway Autonomously
      ↓
Connect Heterogeneous Devices
```


## 22.76 จุดสำคัญที่สุดของ LAB

คำว่า

```text
Gateway
```
ไม่ได้หมายถึงเพียงเครื่องที่

```text
"ส่งข้อมูลต่อ"
```
Gateway สามารถทำหน้าที่

```text
Protocol Translation
Device Identification
Data Decoding
Validation
Normalization
Local Processing
```
ทำให้ Device ที่ใช้ Protocol ต่างกัน

```text
BLE
UDP
MQTT
```
สามารถเข้าสู่ระบบเดียวกันผ่าน

```text
Common MQTT Architecture
```
นี่เป็นการเปลี่ยน Raspberry Pi จาก

```text
Computer ที่ Run MQTT/Python
```
ไปสู่

```text
Edge IoT Gateway
```
อย่างชัดเจน


## เชื่อมไป LAB 23 --- Offline / Store-and-Forward

หลัง LAB 22 Gateway สามารถรับข้อมูลจาก

```text
BLE
UDP
MQTT
```
และส่งเข้าสู่ MQTT Processing Pipeline

แต่ยังมีปัญหาสำคัญ

สมมติ Gateway ต้องส่งข้อมูลต่อไปยัง

```text
Remote Server
Cloud MQTT
Cloud Database
```
แล้ว Internet ขาด

ถ้าออกแบบเป็น

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
ข้อมูลอาจสูญหาย

LAB 23 จะเพิ่ม

```text
Local Buffer
```
ด้วย SQLite

Architecture

```text
Sensor
   ↓
Gateway
   ↓
Local SQLite
   │
   ├── Internet OK
   │       ↓
   │     Upload
   │       ↓
   │     Cloud
   │
   └── Internet DOWN
           ↓
        Store Local
           ↓
     Wait for Recovery
           ↓
         Retry
           ↓
        Send Later
```
แนวคิดเรียกว่า

```text
Store-and-Forward
```
ทำให้ Gateway สามารถ

```text
Continue Collecting Data
```
แม้ Internet ขาด

และเมื่อ Network กลับมา

```text
Forward Buffered Data
```
ได้ภายหลัง

นี่จะเพิ่มความสามารถด้าน

```text
Offline Operation
Data Persistence
Network Failure Recovery
```
ให้กับ Raspberry Pi IoT Gateway
