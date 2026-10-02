> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[25 - LAB 25 - Remote Access with Cloudflare Tunnel]]
> ถัดไป: [[27 - LAB 27 - Fault-Tolerant IoT Gateway]]

# LAB 26 --- Backup & Recovery for Raspberry Pi IoT Gateway

> [!info] แก้ไขล่าสุด
> 2026-10-02 07:36:27 +07

## 26.1 แนวคิดของ LAB

เป้าหมาย:
ทำให้ Raspberry Pi IoT Gateway สามารถสำรองข้อมูลและกู้คืนระบบได้เมื่อ SD Card, Configuration หรือ Gateway เกิดปัญหา โดยต้องทดสอบ Restore จริง ไม่ใช่เพียงสร้างไฟล์ Backup

แนวคิดหลัก:

```text
Raspberry Pi IoT Gateway
        │
        ├── Mosquitto
        ├── Node-RED
        ├── Python Gateway
        ├── SQLite
        ├── systemd
        └── Cloudflare Tunnel
                │
                ▼
              Backup
                │
                ▼
        External Storage
```

เมื่อเกิด Failure:

```text
Failure
   ↓
Fresh OS / Replacement Pi
   ↓
Install Required Packages
   ↓
Restore Configuration
   ↓
Restore Application
   ↓
Restore Database
   ↓
Restore Services
   ↓
Start Services
   ↓
Verify End-to-End
   ↓
System Operational
```

สิ่งที่ต้อง Backup:

```text
1. Mosquitto
   - /etc/mosquitto/
   - mosquitto.conf
   - conf.d/
   - passwd
   - acl

2. Node-RED
   - ~/.node-red/
   - flows
   - settings
   - credentials/configuration ที่เกี่ยวข้อง

3. Python Gateway
   - gateway.py
   - store_forward.py
   - Python source/configuration อื่น
   - requirements.txt

4. SQLite
   - sensor_data.db
   - store_forward.db

5. systemd
   - iot-gateway.service
   - store-forward.service
   - Custom service อื่นของโครงการ
   - Environment File เช่น /etc/iot-gateway.env

6. Cloudflare Tunnel
   - /etc/cloudflared/config.yml
   - Tunnel Credential
```

หมายเหตุ:
Password, Environment File, Cloudflare Credential และ SSH Private Key ถือเป็น Secret ต้องไม่เผยแพร่หรือเก็บใน Public Repository


## 26.2 สร้าง Backup Directory

```bash
sudo mkdir -p /var/backups/iot-gateway
sudo chmod 700 /var/backups/iot-gateway
```

สร้าง Timestamp:

```bash
timestamp=$(date +"%Y%m%d-%H%M%S")
echo "$timestamp"
```

ตัวอย่างโครงสร้าง:

```text
/var/backups/iot-gateway/
└── 20261002-073000/
    ├── mosquitto/
    ├── node-red/
    ├── python/
    ├── sqlite/
    ├── systemd/
    ├── cloudflared/
    ├── manifest.txt
    └── checksums.sha256
```


## 26.3 Backup Mosquitto

```bash
sudo cp -a /etc/mosquitto BACKUP_DIRECTORY/
```

ต้อง Backup ทั้ง

```text
mosquitto.conf
passwd
acl
conf.d/
```

เพราะการ Backup เฉพาะ Configuration แต่ไม่มี passwd/ACL จะไม่สามารถ Restore MQTT Security จาก LAB 24 ได้ครบ


## 26.4 Backup Node-RED

ตรวจสอบ:

```bash
ls -la ~/.node-red
```

Backup:

```bash
cp -a ~/.node-red BACKUP_DIRECTORY/node-red
```

Node-RED ควร Backup User Directory ไม่ใช่เพียง flows.json เพราะอาจมี Configuration และ Credential ที่สัมพันธ์กัน


## 26.5 Backup Python Gateway

เก็บ Source Code เช่น

```text
gateway.py
store_forward.py
```

ไม่จำเป็นต้อง Backup venv เป็นหลัก

ให้สร้าง requirements.txt:

```bash
cd ~/iot-gateway
source venv/bin/activate
```

```bash
pip freeze > requirements.txt
```

ตอน Recovery ให้สร้าง venv ใหม่:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```


## 26.6 Backup SQLite

ควรใช้ SQLite .backup แทนการ Copy Database ขณะที่ระบบกำลังเขียนข้อมูล

ตัวอย่าง:

```bash
sqlite3 sensor_data.db \
".backup '/var/backups/iot-gateway/TIMESTAMP/sqlite/sensor_data.db'"
```

และ

```bash
sqlite3 store_forward.db \
".backup '/var/backups/iot-gateway/TIMESTAMP/sqlite/store_forward.db'"
```

ตรวจสอบ Backup:

```bash
sqlite3 BACKUP_DATABASE \
"PRAGMA integrity_check;"
```

ผลที่ต้องการ:

ok

ตรวจจำนวนข้อมูล เช่น:

```bash
sqlite3 store_forward.db \
"SELECT COUNT(*) FROM queue;"
```


## 26.7 Backup systemd

ตัวอย่าง:

```bash
sudo cp \
/etc/systemd/system/iot-gateway.service \
BACKUP_DIRECTORY/systemd/
```

```bash
sudo cp \
/etc/systemd/system/store-forward.service \
BACKUP_DIRECTORY/systemd/
```

ถ้ามี Environment File:

```bash
sudo cp \
/etc/iot-gateway.env \
BACKUP_DIRECTORY/systemd/
```

Environment File ที่มี Password ต้องถือเป็น Secret


## 26.8 Backup Cloudflare Tunnel

Backup:

```bash
sudo cp -a \
/etc/cloudflared \
BACKUP_DIRECTORY/
```

ประกอบด้วย

```text
config.yml
Tunnel Credential
```

Credential ต้องไม่ส่งขึ้น GitHub หรือแนบในรายงาน


## 26.9 Manifest

สร้าง manifest.txt เพื่อบันทึกว่า Backup ชุดนั้นมีอะไร

ตัวอย่าง:

```text
Backup Time: 2026-10-02 07:30
Hostname: PI_HOSTNAME
```

```text
Components:
- Mosquitto
- MQTT passwd
- MQTT ACL
- Node-RED
- Python Gateway
- SQLite
- systemd
- cloudflared
```


## 26.10 ตรวจสอบความสมบูรณ์ด้วย SHA-256

สร้าง:

```bash
find BACKUP_DIRECTORY \
-type f \
! -name "checksums.sha256" \
-exec sha256sum {} \; \
> BACKUP_DIRECTORY/checksums.sha256
```

ตรวจสอบ:

```bash
sha256sum -c checksums.sha256
```

ผลควรเป็น:

OK


## 26.11 สร้าง Backup Script

สร้าง:

```bash
sudo nano /usr/local/sbin/iot-backup.sh
```

Script ทำหน้าที่

```text
Mosquitto
    ↓
Node-RED
    ↓
Python
    ↓
SQLite .backup
    ↓
systemd
    ↓
cloudflared
    ↓
Manifest
    ↓
SHA-256
```

กำหนด Permission:

```bash
sudo chmod 700 /usr/local/sbin/iot-backup.sh
```

ทดสอบ:

```bash
sudo /usr/local/sbin/iot-backup.sh
```


## 26.12 Backup Automation

สร้าง systemd Service:

```text
/etc/systemd/system/iot-backup.service
```

```ini
[Unit]
Description=IoT Gateway Backup
```

```ini
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/iot-backup.sh
```

สร้าง Timer:

```text
/etc/systemd/system/iot-backup.timer
```

```ini
[Unit]
Description=Daily IoT Gateway Backup
```

```ini
[Timer]
OnCalendar=daily
Persistent=true
```

```ini
[Install]
WantedBy=timers.target
```

เปิดใช้งาน:

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl enable --now iot-backup.timer
```

ตรวจ:

```bash
systemctl list-timers
```

ทดสอบ Backup โดยไม่ต้องรอ:

```bash
sudo systemctl start iot-backup.service
```

ตรวจ Log:

```bash
journalctl \
-u iot-backup.service \
-n 50 \
--no-pager
```


## 26.13 Backup ต้องอยู่นอก Raspberry Pi ด้วย

ถ้า Original และ Backup อยู่บน SD Card เดียวกัน:

```text
SD Card Failure
      ↓
Original Lost
      +
Backup Lost
```

ดังนั้นควร Copy Backup ไปยัง

```text
USB Drive
NAS
Another Server
Secure Remote Storage
```

แนวคิด:

```text
Raspberry Pi
    │
    ├── Local Backup
    │
    └── External Backup
```


## 26.14 Recovery

ลำดับ Recovery:

```text
Fresh OS
   ↓
Network
   ↓
Install Packages
   ↓
Restore Mosquitto
   ↓
Restore Node-RED
   ↓
Restore Python
   ↓
Restore SQLite
   ↓
Restore systemd
   ↓
Restore cloudflared
   ↓
Start Services
   ↓
Verify
```


## 26.15 Restore Mosquitto

หยุด Service:

```bash
sudo systemctl stop mosquitto
```

Restore:

```bash
sudo cp -a \
BACKUP/mosquitto/. \
/etc/mosquitto/
```

Start:

```bash
sudo systemctl restart mosquitto
```

ตรวจ:

```bash
systemctl status mosquitto
```

```bash
journalctl -u mosquitto -n 50 --no-pager
```

หลัง Restore ต้องทดสอบ MQTT Security:

```text
Anonymous
    → DENY
```

```text
sensor001 → 001/data
    → ALLOW
```

```text
sensor001 → 002/data
    → DENY
```


## 26.16 Restore Node-RED

```bash
sudo systemctl stop nodered
```

```bash
cp -a \
BACKUP/node-red/. \
/home/PI_USER/.node-red/
```

```bash
sudo chown -R \
PI_USER:PI_USER \
/home/PI_USER/.node-red
```

```bash
sudo systemctl start nodered
```

ตรวจ:

```bash
systemctl status nodered
```

จากนั้นตรวจ

```text
Flows
Dashboard
MQTT Nodes
SQLite Nodes
```


## 26.17 Restore Python Gateway

```bash
mkdir -p ~/iot-gateway
```

```bash
cp -a \
BACKUP/python/. \
~/iot-gateway/
```

สร้าง venv ใหม่:

```bash
cd ~/iot-gateway
```

```bash
python3 -m venv venv
```

```bash
source venv/bin/activate
```

```bash
python -m pip install --upgrade pip
```

```bash
pip install -r requirements.txt
```


## 26.18 Restore SQLite

หยุด Application ที่กำลังใช้ Database ก่อน

Restore:

```bash
cp \
BACKUP/sqlite/store_forward.db \
~/iot-gateway/store_forward.db
```

ตรวจ:

```bash
sqlite3 \
~/iot-gateway/store_forward.db \
"PRAGMA integrity_check;"
```

ต้องได้:

ok

จากนั้นตรวจจำนวน Record


## 26.19 Restore systemd

```bash
sudo cp \
BACKUP/systemd/*.service \
/etc/systemd/system/
```

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl enable iot-gateway
sudo systemctl enable store-forward
```

จากนั้น Start/Restart Service


## 26.20 Restore Cloudflare

```bash
sudo systemctl stop cloudflared
```

```bash
sudo cp -a \
BACKUP/cloudflared/. \
/etc/cloudflared/
```

ตรวจ Configuration:

```bash
cloudflared tunnel \
--config /etc/cloudflared/config.yml \
ingress validate
```

Start:

```bash
sudo systemctl start cloudflared
```

ตรวจ:

```bash
systemctl status cloudflared
```


## 26.21 Recovery Verification

Recovery ไม่ถือว่าสำเร็จเพียงเพราะ

```bash
systemctl status = active
```

ต้องทดสอบ End-to-End:

```text
ESP32 / Simulator
       ↓
      MQTT
       ↓
Python / Node-RED
       ↓
     SQLite
       ↓
   Dashboard
```

และ Control Path:

```text
Dashboard / Rule
       ↓
 MQTT Command
       ↓
     ESP32
```

ต้องตรวจระบบจาก LAB ก่อนหน้าด้วย:

```text
LAB 18
ONLINE / OFFLINE
```

```text
LAB 19
VALID / INVALID / STALE
```

```text
LAB 23
PENDING → SENT
```

```text
LAB 24
Authentication + ACL
```

```text
LAB 25
Web / Node-RED / SSH Remote Access
```


## 26.22 RPO

RPO = Recovery Point Objective

ตอบคำถาม:

"ยอมสูญเสียข้อมูลย้อนหลังได้มากเท่าไร?"

ตัวอย่าง:

Backup ทุก 24 ชั่วโมง

อาจสูญเสียข้อมูลได้สูงสุดประมาณ 24 ชั่วโมง

ดังนั้น Backup Frequency มีผลต่อ RPO


## 26.23 RTO

RTO = Recovery Time Objective

ตอบคำถาม:

"หลังระบบเสีย ต้องกู้กลับมาได้เร็วแค่ไหน?"

ตัวอย่าง:

RTO = 30 นาที

หมายถึงตั้งเป้าให้ระบบกลับมาใช้งานได้ภายในประมาณ 30 นาที


## 26.24 Recovery Drill

กระบวนการทดสอบ:

```text
Create Backup
      ↓
Verify Backup
      ↓
Prepare Fresh/Test System
      ↓
Restore
      ↓
Start Services
      ↓
End-to-End Test
      ↓
Record Recovery Time
```

ควรใช้ Test Pi / Test SD Card

ไม่ควรลบระบบหลักเพียงเพื่อทดสอบ Recovery


## 26.25 งานส่ง LAB 26

นักศึกษาส่ง:

1. Backup Architecture
2. รายการ Component ที่ Backup
3. Backup Directory Structure
4. manifest.txt
5. iot-backup.sh
6. ผลการ Run Backup
7. ผล SQLite integrity_check = ok
8. ผล SHA-256 Verification
9. systemd Backup Timer
10. หลักฐาน Restore Mosquitto
11. หลักฐาน Restore Node-RED
12. หลักฐาน Restore Python
13. หลักฐาน Restore SQLite
14. หลักฐาน Restore systemd
15. หลักฐาน Restore Cloudflare
16. MQTT Security Test หลัง Restore
17. Store-and-Forward Test หลัง Restore
18. Remote Access Test หลัง Restore
19. End-to-End Test
20. Recovery Time
21. กำหนด RPO
22. กำหนด RTO

ห้ามส่ง:

```text
MQTT Password
Cloudflare Credential
SSH Private Key
```


## 26.26 แนวคิดสำคัญที่สุด

Backup Process:

```text
Identify
   ↓
Backup
   ↓
Protect
   ↓
Verify
   ↓
Restore
   ↓
Test
```

ประโยคสำคัญ:

Backup
   ≠
Recovery

จนกว่าจะสามารถ:

```text
Restore
   ↓
Start Services
   ↓
Verify End-to-End
   ↓
System Operational
```

ได้จริง


## 26.27 ความสัมพันธ์กับ LAB ก่อนหน้า

```text
LAB 23
Store-and-Forward
    ↓
รับมือ Network Failure
```

```text
LAB 24
Authentication + ACL
    ↓
รับมือ Unauthorized MQTT Access
```

```text
LAB 25
Cloudflare Tunnel
    ↓
Remote Access ผ่าน NAT/CGNAT
```

```text
LAB 26
Backup & Recovery
    ↓
รับมือ Storage / Configuration / Gateway Failure
```


## 26.28 เชื่อมไป LAB 27

LAB 26 เน้นการกู้ระบบหลัง Failure

LAB 27 จะพัฒนาไปสู่:

Fault-Tolerant IoT

ตัวอย่าง:

```text
Wi-Fi หลุด
    → reconnect
```

```text
MQTT หลุด
    → reconnect / retry
```

```text
Internet หาย
    → Store-and-Forward
```

```text
Python Crash
    → systemd restart
```

```text
Device หาย
    → OFFLINE
```

```text
ข้อมูลไม่อัปเดต
    → STALE
```

```text
ข้อมูลผิด
    → INVALID
```

```text
Service Hang
    → watchdog / recovery
```

แนวคิด LAB 27:

```text
Detect
   ↓
Recover
   ↓
Continue Operation
```

เป้าหมายคือเปลี่ยน IoT Gateway จาก

"ระบบที่ทำงานได้เมื่อทุกอย่างปกติ"

เป็น

"ระบบที่ตรวจพบความผิดปกติ ฟื้นตัว และให้บริการที่จำเป็นต่อไปได้"
