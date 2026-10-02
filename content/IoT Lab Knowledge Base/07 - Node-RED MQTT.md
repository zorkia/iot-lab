---
type: reference
platform: raspberry-pi
service: node-red
protocol: mqtt
level: basic
status: tested
tags:
  - iot-lab
  - node-red
  - mqtt
---

# Node-RED MQTT

> [!info] แก้ไขล่าสุด
> 2026-10-01 02:17:17 +07


Node-RED รับ MQTT payload แล้วแปลง JSON เป็น JavaScript object ก่อนแยกค่าของ sensor
ไปยัง Dashboard และ Database

## ติดตั้ง Node-RED

คำสั่งติดตั้งที่ใช้ในชุดเอกสารนี้อยู่ใน [[Node-RED Cloudflare Tunnel|Node-RED Cloudflare Tunnel]]
และใช้ installation script สำหรับ Raspberry Pi:

```bash
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
```

หลังติดตั้ง ให้เปิด service และตรวจสถานะ:

```bash
sudo systemctl enable --now nodered.service
systemctl status nodered.service --no-pager
ss -lntp | grep 1880
curl -I http://localhost:1880
```

ตั้งค่าครั้งแรกด้วย:

```bash
node-red admin init
```

ควรเปิด User Security, ตั้ง admin user และกำหนด Credential Secret/Passphrase
ก่อนเปิด editor ให้เครื่องอื่นใช้งาน

## Broker Configuration

เมื่อ Node-RED และ Mosquitto อยู่ Pi เครื่องเดียวกัน:

```text
Server   : localhost
Port     : 1883
Username : iotuser
Password : MQTT_PASSWORD
Topic    : pkru/iot/+/data
```

## Flow พื้นฐาน

```text
[mqtt in] → [json] → [debug]
                    ├→ [Change Temp]
                    ├→ [Change Humi]
                    └→ [Change Light]
```

หลัง JSON node สามารถอ่าน `msg.payload.temp`, `msg.payload.humi` และ
`msg.payload.light` แต่หลัง Change node ควรให้ `msg.payload` เป็นตัวเลขโดยตรง
เพื่อส่งต่อให้ Gauge, Chart หรือ SQL node ได้ง่าย

## จุดตรวจสอบ

- MQTT In แสดงสถานะ connected
- Debug หลัง JSON แสดง object ไม่ใช่ข้อความ JSON
- Change node ส่งตัวเลข ไม่ใช่ object ทั้งก้อน
- Credential ไม่ถูกใส่ไว้ใน flow ที่เผยแพร่สาธารณะ

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT|LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT]]
- [[05 - LAB 05 - แยกข้อมูล Sensor ใน Node-RED|LAB 05 - แยกข้อมูล Sensor]]
- [[IoT Lab Knowledge Base/08 - FlowFuse Dashboard|FlowFuse Dashboard]]
- [[IoT Lab Knowledge Base/09 - SQLite Sensor Data|SQLite Sensor Data]]

กลับไป [[index]]
