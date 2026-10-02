---
type: roadmap
platform: raspberry-pi
service:
  - mosquitto
  - node-red
  - sqlite
  - bluez
protocol:
  - mqtt
  - bluetooth-le
level: basic
status: maintained
tags:
  - iot-lab
  - install
  - roadmap
---

# Installation Roadmap

> [!info] แก้ไขล่าสุด
> 2026-10-01 03:14:19 +07


ลำดับนี้ใช้สำหรับเตรียม Raspberry Pi หนึ่งเครื่องให้พร้อมสอน IoT Lab ตั้งแต่ระบบพื้นฐาน
ไปจนถึง MQTT, Node-RED, Dashboard, SQLite และ BLE/BTHome

```text
Raspberry Pi OS / SSH
        ↓
Network / Wi-Fi / IP
        ↓
ตรวจทรัพยากรและ systemd
        ↓
Mosquitto MQTT Broker
        ↓
MQTT topic และ command-line test
        ↓
Node-RED
        ↓
FlowFuse Dashboard
        ↓
SQLite + node-red-node-sqlite
        ↓
Python venv + BTHome libraries
        ↓
Bluetooth / BLE scan / BTHome decode
```

## 1. Raspberry Pi พื้นฐาน

ติดตั้ง Raspberry Pi OS, เปิด SSH, ตั้ง hostname/user ให้ตรงกับเครื่องที่ใช้สอน
แล้วเข้า Pi ผ่าน terminal ก่อนเริ่ม Lab อื่น

```bash
hostname
hostname -I
free -h
df -h
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

ดูรายละเอียดที่ [[IoT Lab Knowledge Base/01 - Raspberry Pi Setup|Raspberry Pi Setup]]
และ [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi|Raspberry Pi Network and Wi-Fi]]

## 2. Mosquitto MQTT Broker

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable --now mosquitto
systemctl status mosquitto --no-pager
```

จากนั้นสร้าง user/password และตั้งค่า listener ตาม
[[IoT Lab Knowledge Base/04 - Mosquitto MQTT Broker|Mosquitto MQTT Broker]]

## 3. Node-RED

คำสั่งติดตั้งที่พบในเอกสาร Cloudflare/Node-RED:

```bash
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
sudo systemctl enable --now nodered.service
node-red admin init
```

ตรวจ port และเข้า editor:

```bash
ss -lntp | grep 1880
curl -I http://localhost:1880
```

ดูรายละเอียดที่ [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]

## 4. FlowFuse Dashboard

ติดตั้งผ่าน Node-RED Palette Manager:

```text
@flowfuse/node-red-dashboard
```

Dashboard หลังติดตั้ง:

```text
http://PI_IP:1880/dashboard
```

ดูรายละเอียดที่ [[IoT Lab Knowledge Base/08 - FlowFuse Dashboard|FlowFuse Dashboard]]

## 4. SQLite

```bash
sudo apt update
sudo apt install sqlite3 -y
sqlite3 --version
```

ใน Node-RED ให้ติดตั้ง package:

```text
node-red-node-sqlite
```

จากนั้นสร้างฐานข้อมูลและ table ตาม
[[IoT Lab Knowledge Base/09 - SQLite Sensor Data|SQLite Sensor Data]]

## 5. Python venv และ BTHome

```bash
sudo apt update
sudo apt install python3-venv python3-pip -y
python3 -m venv ~/iot-venv
source ~/iot-venv/bin/activate
pip install bthome-ble bleak
pip show bthome-ble bleak
```

ดูรายละเอียดที่ [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

## 6. Bluetooth / BLE

```bash
systemctl status bluetooth --no-pager
rfkill list bluetooth
bluetoothctl show
```

ถ้า Bluetooth ถูก block:

```bash
sudo rfkill unblock bluetooth
bluetoothctl power on
```

ดูรายละเอียดที่ [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]
และ [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]

## 7. ตรวจจบหลังติดตั้ง

```bash
systemctl status mosquitto --no-pager
systemctl status nodered.service --no-pager
systemctl status bluetooth --no-pager
ss -lntp
sqlite3 /home/PI_USER/iot.db ".tables"
```

ถ้าขั้นใดไม่ผ่าน ให้ไปที่
[[IoT Lab Knowledge Base/14 - Troubleshooting|Troubleshooting]]

กลับไป [[index]]
