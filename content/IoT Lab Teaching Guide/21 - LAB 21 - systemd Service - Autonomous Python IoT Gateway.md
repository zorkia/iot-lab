> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[20 - LAB 20 - Python MQTT Application on Raspberry Pi]]
> ถัดไป: [[22 - LAB 22 - IoT Gateway - BLE UDP MQTT Protocol Translation]]

# LAB 21 --- systemd Service: Autonomous Python IoT Gateway

> [!info] แก้ไขล่าสุด
> 2026-10-01 23:38:06 +07


## 21.1 แนวคิดของ LAB

LAB 20 สร้าง Python MQTT Application บน Raspberry Pi

Architecture

```text
ESP32
   ↓
  MQTT
   ↓
Mosquitto
   ↓
gateway.py
   │
   ├── Subscribe
   ├── JSON Parsing
   ├── Validation
   ├── Rule Processing
   └── MQTT Publish
```
แต่ยังมีข้อจำกัดสำคัญ

ทุกครั้งที่ Raspberry Pi เปิดเครื่องใหม่ ต้องมีผู้ใช้ SSH เข้าเครื่องแล้วสั่ง

```bash
cd ~/iot-gateway
source venv/bin/activate
python gateway.py
```
ถ้า Python Process หยุดทำงาน

```text
Gateway Application
      ↓
    STOP
```
และจะไม่กลับมาทำงานเอง

ระบบลักษณะนี้ยังไม่เหมาะกับ IoT Gateway ที่ต้องทำงานต่อเนื่อง

LAB 21 จะเปลี่ยน

```text
Python Script
```
ให้เป็น

```text
Linux Service
```
โดยใช้

```text
systemd
```
เพื่อให้ Application สามารถ

- Start อัตโนมัติหลัง Boot
- Stop
- Start
- Restart
- ตรวจสอบ Status
- Restart อัตโนมัติเมื่อ Process ล้ม
- เก็บ Log ผ่าน journal
- ทำงานโดยไม่ต้องเปิด Terminal
- ทำงานโดยไม่ต้อง Activate venv ด้วยมือ

เป้าหมายคือ

```text
Python Script
     ↓
Managed Service
     ↓
Autonomous IoT Gateway
```


## 21.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบายบทบาทของ systemd
- สร้าง systemd Service
- Run Python จาก Virtual Environment
- Start / Stop / Restart Service
- Enable Service ให้ทำงานหลัง Boot
- ตรวจสอบ Service Status
- ดู Log ด้วย journalctl
- ตั้ง Automatic Restart
- ทดสอบ Process Failure
- ทดสอบ Raspberry Pi Reboot
- เข้าใจความแตกต่างระหว่าง Process, Service และ Application
- สร้าง IoT Gateway ที่ทำงานโดยไม่ต้อง SSH เข้าไป Run Program


## 21.3 Architecture ก่อน LAB 21

```text
Raspberry Pi
     │
     ▼
    Boot
     │
     ▼
 Mosquitto
     │
     ▼
    User
     │
     ▼
    SSH
     │
     ▼
Activate venv
     │
     ▼
python gateway.py
     │
     ▼
 IoT Gateway
```
ปัญหา

```text
Human Dependency
```
ถ้าไม่มีคน Run

```text
gateway.py
```
ระบบไม่ทำงาน


## 21.4 Architecture หลัง LAB 21

```text
Raspberry Pi
     │
     ▼
    Boot
     │
     ▼
  systemd
     │
     ▼
iot-gateway.service
     │
     ▼
Python Virtual Environment
     │
     ▼
  gateway.py
     │
     ▼
   MQTT
     │
     ▼
  IoT Nodes
```
ไม่ต้อง

```text
SSH
source venv/bin/activate
python gateway.py
```
ทุกครั้งหลัง Boot


## 21.5 systemd คืออะไร

systemd เป็น Service Manager ที่ใช้ใน Linux หลาย Distribution รวมถึง Raspberry Pi OS / Debian

ใช้จัดการ Service เช่น

```text
ssh
mosquitto
NetworkManager
```
ตัวอย่าง

```bash
systemctl status mosquitto
```
Mosquitto ที่เราใช้มาตั้งแต่ LAB ก่อนหน้าก็ทำงานเป็น Service

ดังนั้นใน LAB นี้เราจะทำให้

```text
gateway.py
```
ทำงานในลักษณะเดียวกัน


## 21.6 ตรวจสอบ systemd

ใช้

```bash
systemctl --version
```
ควรเห็นข้อมูลประมาณ

```text
systemd xxx
```
ตรวจสอบ Mosquitto

```bash
systemctl status mosquitto
```
จะเห็น

```text
Active: active (running)
```
นี่คือตัวอย่าง Service ที่ systemd กำลังจัดการ


## 21.7 ตรวจสอบ Project จาก LAB 20

สมมติ Project อยู่ที่

```text
~/iot-gateway
```
ตรวจสอบ

```bash
cd ~/iot-gateway

ls
```
ควรมีอย่างน้อย

```text
gateway.py
venv/
```
ตรวจสอบ Python ใน venv

```bash
./venv/bin/python --version
```
ตรวจสอบ Paho MQTT

```bash
./venv/bin/python -c "import paho.mqtt.client; print('OK')"
```
ผล

```text
OK
```


## 21.8 ทดสอบ Program ก่อนสร้าง Service

สำคัญมาก

ต้องยืนยันว่า Program ทำงานด้วยคำสั่งตรงก่อน

```bash
cd ~/iot-gateway

./venv/bin/python gateway.py
```
ถ้า Program ยัง Error

อย่าเพิ่งสร้าง systemd Service

ควรแก้ Python Application ให้ทำงานก่อน

กด

```text
Ctrl+C
```
เมื่อทดสอบเสร็จ


## 21.9 หา Username

ใช้

```bash
whoami
```
ตัวอย่าง

```text
PI_USER
```
หรืออาจเป็นชื่ออื่นตาม Raspberry Pi ของแต่ละเครื่อง

จำ Username นี้ไว้ เพราะต้องใช้ใน Service File


## 21.10 หา Absolute Path

ใช้

```bash
pwd
```
ตัวอย่าง

```text
/home/PI_USER/iot-gateway
```
ดังนั้น Python Interpreter คือ

```text
/home/PI_USER/iot-gateway/venv/bin/python
```
และ Program คือ

```text
/home/PI_USER/iot-gateway/gateway.py
```
systemd ควรใช้

```text
Absolute Path
```
ไม่ใช้

```text
~/iot-gateway
```
เพราะ `~` ไม่ควรถูกพึ่งพาใน Service File


## 21.11 สร้าง systemd Service

สร้างไฟล์

```bash
sudo nano /etc/systemd/system/iot-gateway.service
```
ใส่

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
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python -u /home/PI_USER/iot-gateway/gateway.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
ต้องเปลี่ยน

```text
PI_USER
```
ให้ตรงกับ Username จริงของ Raspberry Pi


## 21.12 อธิบาย [Unit]

ส่วน

```ini
[Unit]
```
กำหนดข้อมูลและ Dependency ของ Service

```text
Description=Python IoT Gateway
```
คือคำอธิบาย Service


```text
After=network-online.target mosquitto.service
```
หมายถึงให้เริ่ม Service นี้หลังจาก systemd ดำเนินการถึง Network Online Target และหลัง Mosquitto Service

แต่ต้องเข้าใจว่า

```text
After=
```
กำหนดลำดับการ Start

ไม่ได้รับประกันว่า Internet หรือ MQTT Application จะพร้อมใช้งานสมบูรณ์ทุกกรณี

ดังนั้น Python Application ยังควรมี Reconnect/Error Handling ของตัวเอง


```text
Wants=network-online.target
```
บอก systemd ว่า Service นี้ต้องการ Network Online Target


```text
Requires=mosquitto.service
```
หมายถึง Service นี้มี Dependency กับ Mosquitto

ถ้าใช้ MQTT Broker ภายใน Raspberry Pi เครื่องเดียวกัน แนวทางนี้เหมาะกับ LAB

ถ้าใช้ Remote Broker อาจไม่จำเป็นต้องใช้

```text
Requires=mosquitto.service
```


## 21.13 อธิบาย [Service]

```text
Type=simple
```
เหมาะกับ Python Application ที่ทำงานเป็น Foreground Process


```text
User=PI_USER
```
กำหนดว่า Process จะทำงานในสิทธิ์ของ User

```text
PI_USER
```
ไม่จำเป็นต้อง Run Python Gateway เป็น

```text
root
```


```text
WorkingDirectory=/home/PI_USER/iot-gateway
```
กำหนด Working Directory

สำคัญเมื่อ Program ใช้ Relative Path เช่น

```text
data.db
config.json
logs/
```


## 21.14 ExecStart

```text
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python -u /home/PI_USER/iot-gateway/gateway.py
```
นี่คือคำสั่งที่ systemd ใช้ Run Application

สังเกตว่าไม่ต้อง

```bash
source venv/bin/activate
```
เพราะเราเรียก Python Interpreter ภายใน venv โดยตรง

```text
/home/PI_USER/iot-gateway/venv/bin/python
```
นี่เป็นวิธีที่เหมาะสมกว่าสำหรับ systemd


## 21.15 ทำไมใช้ `python -u`

Option

```text
-u
```
ทำให้ Python ใช้ Unbuffered Output

ช่วยให้

```text
print()
```
ปรากฏใน

```text
journalctl
```
ทันทีมากขึ้น

เหมาะสำหรับ Service ที่ใช้ Console Output เป็น Log ใน LAB


## 21.16 Automatic Restart

ใช้

```text
Restart=on-failure
```
หมายถึง systemd จะพยายาม Restart Service เมื่อ Process จบแบบ Failure

เช่น

```text
Python Crash
Unhandled Exception
Process exit ด้วย Error
```
และ

```text
RestartSec=5
```
หมายถึงรอประมาณ

```text
5 seconds
```
ก่อน Restart


## 21.17 ทำไมเลือก `Restart=on-failure`

ใน LAB นี้ใช้

```text
Restart=on-failure
```
แทน

```text
Restart=always
```
เพื่อให้นักศึกษาเห็นความแตกต่างระหว่าง

```text
Failure
```
กับ

```text
Intentional Stop
```
เมื่อสั่ง

```bash
sudo systemctl stop iot-gateway
```
systemd จะไม่พยายามเปิด Service กลับขึ้นมาทันที

จึงเหมาะกับการเรียนและการดูแล Service


## 21.18 [Install]

```ini
[Install]
```
ใช้กำหนดว่า Service จะถูกผูกเข้ากับ Target ใดเมื่อ Enable

```text
WantedBy=multi-user.target
```
ทำให้สามารถ

```text
enable
```
Service เพื่อ Start ระหว่าง Boot ตามปกติ


## 21.19 Reload systemd

หลังสร้างหรือแก้ Service File

ต้องสั่ง

```bash
sudo systemctl daemon-reload
```
เพื่อให้ systemd อ่าน Configuration ใหม่

ถ้าลืมขั้นตอนนี้ systemd อาจยังใช้ Configuration เดิม


## 21.20 Start Service

สั่ง

```bash
sudo systemctl start iot-gateway
```
ตรวจสอบ

```bash
systemctl status iot-gateway
```
ควรเห็นประมาณ

```text
Active: active (running)
```
และ Process

```text
gateway.py
```
กำลังทำงาน


## 21.21 ตรวจสอบ MQTT

เปิด Terminal

ส่งข้อมูล

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1500}'
```
ถ้า Python Gateway จาก LAB 20 ทำ Automatic Control

ตรวจสอบ Command

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/cmd" \
-v
```
ควรเห็น

```text
pkru/iot/001/cmd ON
```
หมายความว่า

```text
systemd
   ↓
gateway.py
   ↓
MQTT Processing
```
ทำงานจริง


## 21.22 Stop Service

```bash
sudo systemctl stop iot-gateway
```
ตรวจสอบ

```bash
systemctl status iot-gateway
```
ควรเห็นว่า Service ไม่ได้ Running

หลังจากนั้นส่ง Sensor Data

Python Gateway ไม่ควรประมวลผล Message


## 21.23 Start ใหม่

```bash
sudo systemctl start iot-gateway
```
ตรวจสอบ

```bash
systemctl status iot-gateway
```
ควรกลับเป็น

```text
active (running)
```


## 21.24 Restart Service

เมื่อแก้ไข

```text
gateway.py
```
สามารถใช้

```bash
sudo systemctl restart iot-gateway
```
แทนการ

```text
stop
start
```
สองครั้ง

คำสั่งนี้จะถูกใช้บ่อยมากในการพัฒนา Gateway


## 21.25 คำสั่งพื้นฐานที่ต้องจำ

Start

```bash
sudo systemctl start iot-gateway
```
Stop

```bash
sudo systemctl stop iot-gateway
```
Restart

```bash
sudo systemctl restart iot-gateway
```
Status

```bash
systemctl status iot-gateway
```
Enable

```bash
sudo systemctl enable iot-gateway
```
Disable

```bash
sudo systemctl disable iot-gateway
```


## 21.26 Enable Service

ตอนนี้ Service สามารถ Start ได้

แต่ยังต้องทดสอบว่า Start หลัง Boot หรือไม่

สั่ง

```bash
sudo systemctl enable iot-gateway
```
ตรวจสอบ

```bash
systemctl is-enabled iot-gateway
```
ควรได้

```text
enabled
```


## 21.27 Enable + Start พร้อมกัน

สามารถใช้

```bash
sudo systemctl enable --now iot-gateway
```
คำสั่งนี้ทำสองอย่าง

```text
enable
  +
start
```
เหมาะเมื่อสร้าง Service เสร็จแล้ว

แต่ใน LAB แนะนำให้ทดลอง

```text
start
status
stop
restart
```
ก่อน เพื่อให้นักศึกษาเข้าใจแต่ละคำสั่ง


## 21.28 ดู Log ด้วย journalctl

ไม่จำเป็นต้องเปิด Terminal ค้างไว้ดู

```text
print()
```
เพราะ systemd เก็บ Output ไว้ใน Journal

ใช้

```bash
journalctl -u iot-gateway
```
ดู Log ล่าสุด

```bash
journalctl -u iot-gateway -n 50
```
ดู Log แบบ Real-time

```bash
journalctl -u iot-gateway -f
```
คล้ายกับ

```text
tail -f
```


## 21.29 ทดสอบ Log

เปิด

```bash
journalctl -u iot-gateway -f
```
อีก Terminal ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1500}'
```
ควรเห็น Log จาก

```text
gateway.py
```
เช่น

```text
VALID device=001 temp=38.0 humi=70.0 light=1500.0
```
และเมื่อ State เปลี่ยน

```text
COMMAND device=001 fan=ON
```


## 21.30 ดู Log ตั้งแต่ Boot ปัจจุบัน

ใช้

```bash
journalctl -u iot-gateway -b
```
`-b`

หมายถึง

```text
Current Boot
```
เหมาะสำหรับ Debug ปัญหาหลัง Reboot


## 21.31 ทดสอบ Automatic Restart

จุดสำคัญของ LAB คือพิสูจน์ว่า

```text
Process Crash
     ↓
  systemd
     ↓
  Restart
```
ไม่ใช่เพียงอ่าน Configuration


## 21.32 หา Process ID

ใช้

```bash
systemctl status iot-gateway
```
หรือ

```bash
pgrep -af gateway.py
```
จะเห็น Process ของ

```text
gateway.py
```


## 21.33 จำลอง Process Failure

ใช้

```bash
sudo pkill -f gateway.py
```
เนื่องจาก Process ถูก Kill จากภายนอก

systemd จะตรวจพบว่า Service Process หาย

เมื่อใช้

```text
Restart=on-failure
```
systemd จะ Start ใหม่หลัง

```text
RestartSec=5
```
ตรวจสอบ

```bash
systemctl status iot-gateway
```
หรือ

```bash
journalctl -u iot-gateway -f
```
ควรเห็นลำดับประมาณ

```text
Process stopped
    ↓
Service failed
    ↓
Restart scheduled
    ↓
Python IoT Gateway started
```


## 21.34 ตรวจสอบ PID ก่อนและหลัง

ก่อน Kill

```bash
pgrep -af gateway.py
```
จด PID

จากนั้น

```bash
sudo pkill -f gateway.py
```
รอมากกว่า 5 วินาที

แล้ว

```bash
pgrep -af gateway.py
```
PID ใหม่ควรแตกต่างจาก PID เดิม

แสดงว่า Process ถูก Restart จริง


## 21.35 `systemctl stop` ต่างจาก Process Crash

ถ้าสั่ง

```bash
sudo systemctl stop iot-gateway
```
นี่คือ

```text
Intentional Stop
```
systemd รู้ว่า Administrator ต้องการหยุด Service

จึงไม่ควร Restart กลับทันทีเพียงเพราะตั้ง

```text
Restart=on-failure
```
แต่ถ้า Process จบผิดปกติ

```text
Crash
Kill
Error Exit
```
systemd สามารถ Restart ตาม Policy

นี่เป็นความแตกต่างสำคัญ


## 21.36 ทดสอบ Reboot

ตรวจสอบก่อนว่า

```bash
systemctl is-enabled iot-gateway
```
ได้

```text
enabled
```
จากนั้น

```bash
sudo reboot
```
SSH Connection จะขาด

รอ Raspberry Pi Boot กลับมา

SSH เข้าใหม่

แล้วใช้

```bash
systemctl status iot-gateway
```
ต้องเห็น

```text
active (running)
```
โดยไม่ต้องสั่ง

```bash
python gateway.py
```


## 21.37 ทดสอบ Gateway หลัง Reboot

หลัง Reboot

ไม่ต้อง Activate venv

ไม่ต้อง Run Python

เปิด MQTT Command Monitor

```bash
mosquitto_sub -h localhost \
-t "pkru/iot/+/cmd" \
-v
```
ส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1500}'
```
Gateway ต้องทำงานและส่ง

```text
pkru/iot/001/cmd ON
```
ถ้าได้ผลนี้ แสดงว่า

```text
Raspberry Pi Boot
      ↓
  Mosquitto
      ↓
   systemd
      ↓
Python Gateway
      ↓
MQTT Processing
```
ทำงานโดยอัตโนมัติ


## 21.38 ตรวจสอบ Service Dependency

ใช้

```bash
systemctl status mosquitto
```
และ

```bash
systemctl status iot-gateway
```
ควรเห็นทั้งสอง

```text
active (running)
```
Architecture

```text
systemd
   │
   ├── mosquitto.service
   │
   └── iot-gateway.service
```
ทำให้ Raspberry Pi มี Service หลักสำหรับ IoT Gateway อย่างน้อยสองส่วน


## 21.39 ปัญหา: Service ทำงานใน Terminal แต่ไม่ทำงานใน systemd

นี่เป็นปัญหาที่พบได้บ่อย

ตัวอย่าง

```bash
./venv/bin/python gateway.py
```
ทำงาน

แต่

```bash
systemctl start iot-gateway
```
ไม่ทำงาน

ให้ตรวจสอบตามลำดับ

```bash
systemctl status iot-gateway
```
จากนั้น

```bash
journalctl -u iot-gateway -n 50
```
สาเหตุที่พบบ่อย

- Path ผิด
- Username ผิด
- Permission
- WorkingDirectory ผิด
- Python Interpreter ผิด
- Package ไม่ได้ติดตั้งใน venv
- File ที่ Program ต้องใช้หาไม่เจอ
- Environment Variable ไม่มี
- Broker ยังไม่พร้อม


## 21.40 ตรวจสอบ Service File

ใช้

```bash
sudo systemctl cat iot-gateway
```
หรือ

```bash
cat /etc/systemd/system/iot-gateway.service
```
ตรวจสอบ

```text
User
WorkingDirectory
ExecStart
```
ให้ตรงกับเครื่องจริง


## 21.41 ตรวจสอบ Service Configuration

สามารถใช้

```bash
systemd-analyze verify \
/etc/systemd/system/iot-gateway.service
```
เพื่อช่วยตรวจสอบ Service Unit File

ถ้ามี Syntax หรือ Configuration Problem บางประเภท systemd จะแจ้งออกมา


## 21.42 หลังแก้ Service File

ทุกครั้งที่แก้

```text
/etc/systemd/system/iot-gateway.service
```
ต้อง

```bash
sudo systemctl daemon-reload
```
จากนั้น

```bash
sudo systemctl restart iot-gateway
```
แล้วตรวจสอบ

```bash
systemctl status iot-gateway
```


## 21.43 หลังแก้เฉพาะ Python Code

ถ้าแก้เฉพาะ

```text
gateway.py
```
ไม่จำเป็นต้อง

```text
daemon-reload
```
เพราะ Service File ไม่ได้เปลี่ยน

ใช้เพียง

```bash
sudo systemctl restart iot-gateway
```


## 21.44 Environment ของ systemd

อย่าสมมติว่า Environment ของ systemd เหมือน Terminal ของ User

ใน Terminal อาจมี

```text
PATH
HOME
Environment Variables
```
ที่เกิดจาก Shell Configuration

แต่ Service อาจไม่มีค่าบางอย่าง

ดังนั้นควรใช้

```text
Absolute Path
```
เช่น

```text
/home/PI_USER/iot-gateway/venv/bin/python
```
แทน

```text
python
```
และใช้

```text
WorkingDirectory=
```
อย่างชัดเจน


## 21.45 ไม่ต้อง Activate venv

สำหรับ Interactive Shell ใช้

```bash
source venv/bin/activate
```
แต่สำหรับ systemd

ไม่ต้องใช้

```text
source
```
เพียงกำหนด

```text
ExecStart=/home/PI_USER/iot-gateway/venv/bin/python ...
```
เพราะกำลังเรียก Python จาก Virtual Environment โดยตรง


## 21.46 Service กับ Process

ต้องแยกสองคำนี้

### Process

คือ Program ที่กำลังทำงาน

เช่น

```bash
python gateway.py
```
มี

```text
PID
```
เมื่อ Process จบ Program ก็หยุด


### Service

คือ Workload ที่ Service Manager ดูแล

เช่น

```text
iot-gateway.service
```
systemd สามารถ

```text
Start
Stop
Restart
Monitor
```
Process ให้

ดังนั้น

```text
Python Process
```
ถูกจัดการโดย

```text
systemd Service
```


## 21.47 ตรวจสอบ Process

ใช้

```bash
ps aux | grep gateway.py
```
หรือ

```bash
pgrep -af gateway.py
```
ควรเห็น Python Process

แต่การบริหาร Service ควรใช้

```text
systemctl
```
ไม่ควรใช้

```text
kill
```
เป็นวิธีปกติในการ Start/Stop Service

`kill` ใช้ใน LAB นี้เพื่อจำลอง Failure เท่านั้น


## 21.48 Restart Policy

ตัวอย่าง Policy ที่พบบ่อย

```text
Restart=no
```
ไม่ Restart อัตโนมัติ


```text
Restart=on-failure
```
Restart เมื่อ Process จบแบบ Failure

เหมาะกับ LAB นี้


```text
Restart=always
```
Restart เกือบทุกกรณีที่ Process จบ โดย systemd ยังแยกแยะการสั่ง Stop Service ตามกลไกของมัน

เหมาะกับบาง Long-running Service

แต่ต้องเลือกให้เหมาะกับ Application

ไม่ควรใช้

```text
Restart=always
```
โดยไม่เข้าใจพฤติกรรมของ Service


## 21.49 Restart Loop

ถ้า Program มี Error ตั้งแต่เริ่ม

เช่น

```text
Syntax Error
```
แล้วตั้ง

```text
Restart=on-failure
```
อาจเกิด

```text
Start
  ↓
Crash
  ↓
Restart
  ↓
Crash
  ↓
Restart
  ↓
 ...
```
จึงต้องดู

```text
journalctl
```
เพื่อหาสาเหตุ

ไม่ควรคิดว่า Automatic Restart สามารถแก้ Software Bug ได้


## 21.50 systemd ไม่แทน Error Handling

systemd ช่วย

```text
Process Recovery
```
แต่ Python ยังต้องมี

```text
try/except
MQTT reconnect
JSON validation
Data validation
```
เพราะไม่ควรให้ Application Crash ทุกครั้งที่เจอข้อมูลผิด

Architecture ที่ดีคือ

```text
Application-level Recovery
          +
   Service-level Recovery
```
ตัวอย่าง

```text
Invalid JSON
    ↓
Python handles it
    ↓
Process continues
```
แต่ถ้า

```text
Python crashes unexpectedly
    ↓
systemd restarts process
```


## 21.51 systemd ไม่แทน MQTT Reconnect

ถ้า Broker หายชั่วคราว

ไม่ควรออกแบบให้

```text
Python Crash
    ↓
systemd Restart
```
เป็นกลไกเดียว

Application ควรมี MQTT Reconnection Strategy

ส่วน systemd เป็น Recovery Layer อีกระดับหนึ่ง

แนวคิดนี้จะถูกขยายใน LAB 27 Fault-Tolerant IoT


## 21.52 Logging Architecture

ก่อนใช้ systemd

```text
gateway.py
    ↓
Terminal
    ↓
print()
```
หลังใช้ systemd

```text
gateway.py
    ↓
stdout / stderr
    ↓
systemd journal
    ↓
journalctl
```
จึงสามารถตรวจสอบ Application ได้แม้ไม่มี Terminal เปิดค้างไว้


## 21.53 ดู Log ล่าสุด

คำสั่งที่ควรจำ

```bash
journalctl -u iot-gateway -n 50
```
ติดตาม Real-time

```bash
journalctl -u iot-gateway -f
```
เฉพาะ Boot ปัจจุบัน

```bash
journalctl -u iot-gateway -b
```


## 21.54 ทดสอบ Full Autonomous Operation

การทดสอบ LAB ไม่ควรจบแค่

```bash
systemctl status
```
ต้องพิสูจน์การทำงานจริง

ขั้นตอน

1. Enable Service

```bash
   sudo systemctl enable iot-gateway
```
2. Reboot

```bash
   sudo reboot
```
3. ห้าม Run Python ด้วยมือ

4. หลัง Boot ตรวจสอบ

```bash
   systemctl status iot-gateway
```
5. ส่ง MQTT Sensor Data

6. ตรวจสอบ MQTT Command

7. Kill Python Process

8. รอ Automatic Restart

9. ส่ง Sensor Data ใหม่

10. ตรวจสอบว่า Gateway กลับมาทำงาน

นี่จึงถือว่าผ่าน LAB


## 21.55 Autonomous Gateway Test

Architecture ที่ต้องพิสูจน์

```text
POWER ON
   │
   ▼
Raspberry Pi
   │
   ▼
 Linux
   │
   ▼
 systemd
   │
   ├──→ Mosquitto
   │
   └──→ Python Gateway
             │
             ▼
            MQTT
             │
             ▼
        IoT Processing
```
โดย

```text
Human Intervention = 0
```
ในขั้นตอน Startup ปกติ


## 21.56 แบบฝึกหัดที่ 1 — Create Service

สร้าง

```text
iot-gateway.service
```
ให้ Run

```text
gateway.py
```
จาก LAB 20

ตรวจสอบ

```bash
systemctl status iot-gateway
```
ต้องเป็น

```text
active (running)
```


## 21.57 แบบฝึกหัดที่ 2 — Service Control

ทดลอง

```text
start
stop
restart
```
ด้วย

```text
systemctl
```
และตรวจสอบผลทุกครั้ง


## 21.58 แบบฝึกหัดที่ 3 — Logging

เปิด

```bash
journalctl -u iot-gateway -f
```
ส่ง

```text
VALID Data

INVALID Data
```
และ

```text
Invalid JSON
```
ตรวจสอบว่า Log แสดงเหตุการณ์แต่ละประเภท

และ Application ยังทำงานต่อ


## 21.59 แบบฝึกหัดที่ 4 — Automatic Restart

ตรวจสอบ PID

```bash
pgrep -af gateway.py
```
จากนั้น

```bash
sudo pkill -f gateway.py
```
รอประมาณ

```text
5 seconds
```
ตรวจสอบ PID ใหม่

```bash
pgrep -af gateway.py
```
ต้องมี Process กลับมา


## 21.60 แบบฝึกหัดที่ 5 — Reboot Recovery

สั่ง

```bash
sudo reboot
```
หลัง Boot

ห้าม Run Python ด้วยมือ

ตรวจสอบ

```bash
systemctl status iot-gateway
```
จากนั้นส่ง MQTT Sensor Data

Gateway ต้องทำงานได้ทันที


## 21.61 แบบฝึกหัดที่ 6 — MQTT Processing หลัง Recovery

ทำให้ Process Crash

รอ systemd Restart

จากนั้นส่ง

```bash
mosquitto_pub -h localhost \
-t "pkru/iot/001/data" \
-m '{"temp":38,"humi":70,"light":1500}'
```
ตรวจสอบ

```text
pkru/iot/001/cmd ON
```
เพื่อยืนยันว่าไม่ใช่เพียง Process Running แต่ Application Function กลับมาทำงานจริง


## 21.62 งานส่ง LAB 21

นักศึกษาส่ง

1. Service File

```text
   iot-gateway.service
```
2. Screenshot

```bash
   systemctl status iot-gateway
```
   แสดง

```text
   active (running)
```
3. Screenshot

```bash
   systemctl is-enabled iot-gateway
```
   แสดง

```text
   enabled
```
4. Screenshot

```bash
   journalctl -u iot-gateway
```
5. Screenshot PID ก่อนจำลอง Failure

6. Screenshot PID หลัง Automatic Restart

7. Screenshot Service หลัง Reboot

8. หลักฐาน MQTT Processing หลัง Reboot

9. หลักฐาน MQTT Processing หลัง Process Failure และ Recovery

10. อธิบายความหมายของ

```text
   ExecStart
   WorkingDirectory
   User
   Restart
   RestartSec
```
11. อธิบายความแตกต่างระหว่าง

```text
   Process
```
   และ

```text
   Service
```
12. อธิบายว่าเหตุใด systemd ไม่สามารถแทน

```text
   Error Handling
```
   และ

```text
   MQTT Reconnect
```
   ภายใน Application ได้


## 21.63 Checklist ก่อนถือว่าผ่าน LAB

ต้องผ่านทุกข้อ

```bash
[ ] gateway.py ทำงานด้วย Python โดยตรง

[ ] systemd สามารถ Start gateway.py

[ ] systemctl status = active (running)

[ ] Service ถูก Enable

[ ] journalctl แสดง Application Log

[ ] MQTT Sensor Data ถูกประมวลผล

[ ] Python สามารถ Publish MQTT Command

[ ] Kill Process แล้ว systemd Restart

[ ] Reboot แล้ว Service Start เอง

[ ] หลัง Reboot MQTT Processing ทำงานจริง
```
ถ้าผ่านทั้งหมด

Raspberry Pi สามารถทำงานเป็น

```text
Autonomous Python IoT Gateway
```
ในระดับพื้นฐานได้


## 21.64 สิ่งที่นักศึกษาต้องเข้าใจ

ก่อน LAB 21

```text
Raspberry Pi
    ↓
  Human
    ↓
   SSH
    ↓
Start Python
    ↓
  Gateway
```
หลัง LAB 21

```text
Raspberry Pi
    ↓
  systemd
    ↓
Start Python
    ↓
  Gateway
```
และเมื่อ Process Failure

```text
Python
   X
   │
   ▼
systemd
   │
   ▼
Restart
   │
   ▼
Python
   │
   ▼
Gateway
```
นี่คือการลด

```text
Human Dependency
```
และเพิ่ม

```text
Automatic Recovery
```


## 21.65 ความสัมพันธ์ของ LAB 20–21

LAB 20

```text
MQTT
  ↓
Python Application
  ↓
Application Logic
```
LAB 21

```text
systemd
  ↓
Python Application
  ↓
Managed Service
  ↓
Auto Start / Restart
```
ดังนั้น

```text
LAB 20
Python IoT Application

      +

LAB 21
Linux Service Management

      ↓

Autonomous IoT Gateway
```


## 21.66 Architecture หลัง LAB 21

```text
             IoT DEVICES

ESP32-001 ─┐
ESP32-002 ─┼──────────────┐
ESP32-003 ─┘              │
                          ▼
                   ┌─────────────┐
                   │ Mosquitto   │
                   │ MQTT Broker │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Python      │
                   │ Gateway     │
                   │             │
                   │ Parse       │
                   │ Validate    │
                   │ Rule        │
                   │ Control     │
                   └──────┬──────┘
                          ▲
                          │ manages
                   ┌──────┴──────┐
                   │ systemd     │
                   │             │
                   │ Start       │
                   │ Stop        │
                   │ Restart     │
                   │ Auto Start  │
                   │ Logging     │
                   └─────────────┘
```
Node-RED สามารถทำงานคู่ขนาน

```text
                   Mosquitto
                       │
                ┌──────┴──────┐
                ▼             ▼
             Python        Node-RED
             Gateway       Dashboard
```


## 21.67 จุดสำคัญที่สุดของ LAB

LAB นี้ไม่ใช่แค่การเรียนคำสั่ง

```text
systemctl
```
แต่เป็นการเปลี่ยนแนวคิดจาก

```text
"เปิดโปรแกรมให้ทำงาน"
```
เป็น

```text
"ออกแบบ Service ให้ระบบดูแลโปรแกรม"
```
Reliability Layers เริ่มเป็น

```text
Layer 1
Python Error Handling

      ↓

Layer 2
MQTT Reconnect

      ↓

Layer 3
systemd Process Restart

      ↓

Layer 4
Boot Recovery
```
ระบบจึงเริ่มมีคุณสมบัติ

```text
Autonomous
Recoverable
Continuously Running
```
มากขึ้น


## เชื่อมไป LAB 22 --- IoT Gateway: BLE / UDP / MQTT Protocol Translation

จนถึง LAB 21 Raspberry Pi รับข้อมูลหลักผ่าน

```text
MQTT
```
แต่ IoT Device จริงไม่ได้ใช้ MQTT ทุกตัว

ตัวอย่าง

```text
Mijia LYWSD03MMC
    ↓
BLE / BTHome
```
หรือ ESP32 บางระบบอาจส่ง

```text
UDP
```
ดังนั้น Raspberry Pi ต้องสามารถทำหน้าที่

```text
Protocol Gateway
```
Architecture ใน LAB 22 จะเป็น

```text
Mijia
  │
  │ BLE / BTHome
  ▼
Raspberry Pi
  │
  │ Decode
  ▼
 MQTT
  │
  ├──→ Node-RED
  ├──→ SQLite
  └──→ Dashboard
```
และอีกเส้นทาง

```text
ESP32
  │
  │ UDP
  ▼
Raspberry Pi
  │
  │ Protocol Translation
  ▼
 MQTT
```
รวมเป็น

```text
BLE Device ────┐
               │
UDP Device ────┼──→ Raspberry Pi Gateway
               │          │
MQTT Device ───┘          ▼
                         MQTT
                          │
                ┌─────────┼─────────┐
                ▼         ▼         ▼
             Node-RED   SQLite   Dashboard
```
LAB 22 จึงจะเปลี่ยน Raspberry Pi จาก

```text
MQTT Application Host
```
ไปเป็น

```text
Multi-protocol IoT Gateway
```
ซึ่งเป็นบทบาทของ Raspberry Pi ใน Edge/IoT Architecture ที่ชัดเจนยิ่งขึ้น
