# IoT Lab Teaching Guide - Hub

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:24:55 +07


**คู่มือปฏิบัติการ IoT Lab ฉบับเต็มสำหรับ Raspberry Pi `PI_HOSTNAME`**

## ชื่อที่ใช้ในเอกสาร

> [!info] `PI_HOSTNAME` คือชื่อเครื่องที่ตั้งขึ้น
> `PI_HOSTNAME` เป็น **hostname ที่ผู้ดูแลตั้งให้ Raspberry Pi เครื่องหลักของ Lab**
> ไม่ใช่ชื่อมาตรฐานของ Raspberry Pi และเครื่องอื่นสามารถใช้ hostname ต่างกันได้
> ตรวจชื่อเครื่องปัจจุบันด้วยคำสั่ง `hostname`

คำที่คล้ายกันในเอกสารมีความหมายต่างกัน:

| ค่า | ความหมาย |
|---|---|
| `PI_HOSTNAME` | hostname ของ Raspberry Pi เครื่องหลัก |
| Tunnel `PI_HOSTNAME` | ชื่อ Cloudflare Tunnel ที่ตั้งให้เหมือน hostname เพื่อให้จำง่าย แต่สามารถใช้ชื่ออื่นได้ |
| `pi.example.com` | public hostname สำหรับ Web Server |
| `node-red.example.com` | public hostname สำหรับ Node-RED |
| `ssh.example.com` | public hostname สำหรับ SSH |
| `PI_IP` | IP address ภายใน LAN ของเครื่อง `PI_HOSTNAME`; อาจเปลี่ยนเมื่อได้รับค่าใหม่จาก DHCP |

ถ้าใช้ Raspberry Pi เครื่องอื่น ให้แทน `PI_HOSTNAME`, `PI_IP`, Tunnel name และ public hostname
ด้วยค่าของเครื่องนั้น โดยตรวจ hostname และ IP ด้วย:

```bash
hostname
hostname -I
```

## เป้าหมายและเส้นทางการเรียน

เส้นทางหลักของแล็บ:

```text
ตรวจ Raspberry Pi
      ↓
Mosquitto MQTT Broker
      ↓
ทดสอบ Publish / Subscribe
      ↓
จำลอง Sensor จาก Command Line
      ↓
Node-RED รับ JSON
      ↓
แยก temp / humi / light
      ↓
Gauge + Real-time Chart
      ↓
SQLite
      ↓
SQL SELECT / AVG / MIN / MAX
      ↓
Rolling Statistics 5 นาที
      ↓
Mijia BTHome หลายตัว
      ↓
อ่าน temp / humi / batt ผ่าน BLE
```

สถาปัตยกรรมช่วง MQTT:

```text
Mac / ESP32
    |
    | MQTT JSON
    | topic: pkru/iot/test
    v
+-----------------------------------+
| Raspberry Pi "PI_HOSTNAME"              |
|                                   |
| Mosquitto :1883                   |
|       |                           |
|       v                           |
| Node-RED :1880                    |
|    |             |                |
|    v             v                |
| Dashboard      SQLite iot.db      |
+-----------------------------------+
```

สถาปัตยกรรมช่วง BTHome:

```text
Mijia #1 ----\
Mijia #2 -----+--- BTHome BLE Advertisement ---+
Mijia #3 ----/                                  |
                                                v
                                      Raspberry Pi hci0
                                                |
                                                v
                                             Bleak
                                                |
                                                v
                                           bthome-ble
                                                |
                                                v
                                      temp / humi / batt
                                      แยกด้วย MAC Address
```

## ความสัมพันธ์กับเอกสารระบบ `PI_HOSTNAME`

คู่มือนี้เป็น Hub หลักของชุดปฏิบัติการ IoT บน Raspberry Pi `PI_HOSTNAME`

- [[IoT Lab Knowledge Base/04 - Mosquitto MQTT Broker|Mosquitto MQTT Broker]]
- [[Node-RED Cloudflare Tunnel]]
- [[Cloudflare Tunnel Setup]]

โครงสร้างความสัมพันธ์:

```text
IoT Lab Teaching Guide
├── Mosquitto MQTT Broker
├── Node-RED Cloudflare Tunnel
│   └── Mosquitto MQTT Broker
└── Cloudflare Tunnel Setup
    ├── Node-RED Cloudflare Tunnel
    └── SSH Cloudflare Tunnel
```

> `[[SSH Cloudflare Tunnel]]` เชื่อมผ่าน `[[Cloudflare Tunnel Setup]]` จึงไม่ต้องเชื่อมตรงจาก Hub เพื่อลดเส้นที่ซ้ำซ้อนใน Graph View

### Architecture ปัจจุบัน

```text
ESP32 / Sensor / Simulator
        |
        | MQTT :1883
        | Username: iotuser
        v
+--------------------------------------+
| Raspberry Pi "PI_HOSTNAME"                 |
|                                      |
| Mosquitto :1883                      |
|      |                               |
|      v                               |
| Node-RED :1880 ---> SQLite           |
+--------------------------------------+
        |
        | Cloudflare Tunnel
        +--> node-red.example.com
        +--> ssh.example.com
```

## Raspberry Pi → Mosquitto MQTT → Node-RED → FlowFuse Dashboard → SQLite → Mijia LYWSD03MMC/BTHome

**สถานะเอกสาร:** รวบรวมจากลำดับที่ทดลองจริงในแล็บนี้ โดยเก็บทั้งคำสั่ง, Flow, SQL,
จุดตรวจสอบ, ปัญหาที่พบ และแนวทางแก้

- **เครื่องหลัก:** Raspberry Pi `PI_HOSTNAME`, user `PI_USER`
- **IP ของ Raspberry Pi:** ตรวจด้วย `hostname -I` และใช้ค่า `PI_IP` ในคำสั่งของแล็บ
- **Node-RED:** 5.0.7
- **Node.js:** 22.23.2
- **Python:** 3.13.5
- **Python venv:** `/home/PI_USER/iot-venv`
- **SQLite DB:** `/home/PI_USER/iot.db`
- **MQTT Broker:** Mosquitto 2.0.21
- **MQTT account สำหรับ Lab:** username `iotuser` / password ที่ผู้สอนกำหนด

> `PI_IP` หมายถึง IP ปัจจุบันของ Raspberry Pi `PI_HOSTNAME` ใน LAN ตรวจได้ด้วย
> `hostname -I` เพื่อไม่ผูกคู่มือกับ DHCP address ค่าใดค่าหนึ่ง

------------------------------------------------------------------------

## สารบัญโน้ตย่อย

### ภาพรวมและบทสรุป

- [[สรุปผลและเส้นทางต่อไป]]

### Labs

- [[01 - LAB 01 - ตรวจสอบระบบ Raspberry Pi]]
- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]
- [[03 - LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line]]
- [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT]]
- [[05 - LAB 05 - แยกข้อมูล Sensor ใน Node-RED]]
- [[06 - LAB 06 - สร้าง FlowFuse Dashboard]]
- [[07 - LAB 07 - สร้าง Real-time Chart]]
- [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]
- [[09 - LAB 09 - จัดการเวลา UTC และเวลาไทย]]
- [[10 - LAB 10 - สืบค้น Sensor Data ด้วย SQL]]
- [[11 - LAB 11 - คำนวณ Rolling Statistics 5 นาทีล่าสุด]]
- [[12 - LAB 12 - แยก SQLite Write และ Statistics Flow]]
- [[13 - LAB 13 - Rule & Alert Processing]]
- [[14 - LAB 14 - MQTT Manual Control]]
- [[15 - LAB 15 - Automatic Control]]
- [[16 - LAB 16 - MQTT Topic Design for Multi-device IoT]]
- [[17 - LAB 17 - Multi-device Dashboard]]
- [[18 - LAB 18 - Device Status and Offline Detection]]
- [[19 - LAB 19 - Data Quality - VALID INVALID STALE]]
- [[20 - LAB 20 - Python MQTT Application on Raspberry Pi]]
- [[21 - LAB 21 - systemd Service - Autonomous Python IoT Gateway]]
- [[22 - LAB 22 - IoT Gateway - BLE UDP MQTT Protocol Translation]]
- [[23 - LAB 23 - Offline Store-and-Forward with SQLite]]
- [[24 - LAB 24 - MQTT Security - Authentication and ACL]]
- [[25 - LAB 25 - Remote Access with Cloudflare Tunnel]]
- [[26 - LAB 26 - Backup and Recovery for Raspberry Pi IoT Gateway]]
- [[27 - LAB 27 - Fault-Tolerant IoT Gateway]]
- [[28 - LAB 28 - Integrated IoT Mini Project]]

### Advanced / Optional

- [[Advanced - วิเคราะห์ Historical Data จาก SQLite]]
- [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE]]

### Appendix

- [[Appendix - Troubleshooting Checklist]]

## หมายเหตุการแยกไฟล์

- ไฟล์ต้นฉบับ `IoT Lab Teaching Guide.md` ไม่ถูกแก้ไข
- รวมเป้าหมายและเส้นทางการเรียนไว้ใน Hub และแยก Lab ตามหัวข้อเพื่อให้ Graph View
  และ Backlinks ใน Obsidian อ่านง่ายขึ้น
- ลิงก์ในเนื้อหาเดิมถูกปรับให้ใช้งานเป็น Obsidian wikilink ได้
