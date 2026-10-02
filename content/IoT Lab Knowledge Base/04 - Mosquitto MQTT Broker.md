---
type: reference
platform: raspberry-pi
service: mosquitto
protocol: mqtt
level: basic
status: tested
tags:
  - iot-lab
  - mqtt
  - authentication
---

# Mosquitto MQTT Broker

> [!info] แก้ไขล่าสุด
> 2026-10-01 02:17:17 +07

## ความสัมพันธ์กับ Lab อื่น

Mosquitto เป็น MQTT Broker กลางของ `PI_HOSTNAME` สำหรับรับข้อมูลจาก ESP32 ภายใน LAN และส่งต่อให้ Node-RED

> Lab นี้เปิด MQTT ที่ port `1883` ภายในเครือข่ายและใช้ Username/Password; ไม่ได้เปิด MQTT Broker ผ่าน Cloudflare Tunnel

เป้าหมาย

```text
ESP32 / MQTT Client
        │
        │ MQTT :1883
        │ Username: iotuser
        │ Password: ********
        ▼
┌───────────────────────┐
│ Mosquitto MQTT Broker │
│ Raspberry Pi: PI_HOSTNAME   │
│                       │
│ allow_anonymous false │
└───────────────────────┘
```

ผู้ที่ไม่มี Username/Password จะไม่สามารถเชื่อมต่อ Broker ได้

## 1. ติดตั้ง Mosquitto และ MQTT client tools

ถ้า Pi ยังไม่มี Mosquitto ให้ติดตั้งก่อนขั้น authentication:

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable --now mosquitto
systemctl status mosquitto --no-pager
```

ตรวจว่า broker เปิด port `1883`:

```bash
ss -lntp | grep 1883
```

ถ้ายังไม่เห็น `1883` ให้อ่าน log ก่อนแก้ config:

```bash
journalctl -u mosquitto -n 50 --no-pager
```


==================================================
2. สร้าง Username / Password
==================================================

กรณียังไม่มีไฟล์ password ให้สร้างครั้งแรกด้วย -c

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd iotuser
```

ระบบจะถาม:

Password:
Reenter password:

กำหนดรหัสผ่านที่ต้องการ


==================================================
3. ตรวจสอบว่า User ถูกสร้างแล้ว
==================================================

```bash
sudo cat /etc/mosquitto/passwd
```

ควรพบ:

iotuser:$7$...

Mosquitto เก็บ Password ในรูปแบบ hash
จึงไม่เห็น Password จริงในไฟล์


==================================================
4. กำหนด Permission ของ Password File
==================================================

ไฟล์ที่สร้างด้วย sudo อาจมี permission เช่น:

-rw------- root root

ทำให้ service ของ Mosquitto อ่านไม่ได้

แก้ด้วย:

```bash
sudo chown root:mosquitto /etc/mosquitto/passwd
sudo chmod 640 /etc/mosquitto/passwd
```

ตรวจสอบ:

```bash
ls -l /etc/mosquitto/passwd
```

ควรได้ประมาณ:

-rw-r----- 1 root mosquitto ... /etc/mosquitto/passwd

ทดสอบว่า user mosquitto อ่านได้:

```bash
sudo -u mosquitto test -r /etc/mosquitto/passwd && echo "READ OK" || echo "CANNOT READ"
```

ควรได้:

READ OK


==================================================
5. ตั้งค่า Mosquitto ให้บังคับใช้ Username/Password
==================================================

เปิดไฟล์:

```bash
sudo nano /etc/mosquitto/conf.d/iot-lab.conf
```

กำหนด:

listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd

บันทึกไฟล์:

```bash
Ctrl+O
Enter
Ctrl+X
```


==================================================
6. Restart Mosquitto
==================================================

```bash
sudo systemctl restart mosquitto
```

ตรวจสอบ:

```bash
systemctl status mosquitto --no-pager
```

ต้องพบ:

Active: active (running)


==================================================
7. ตรวจสอบ Port 1883
==================================================

```bash
ss -lnt | grep 1883
```

ควรพบประมาณ:

0.0.0.0:1883

แสดงว่า Broker รับ MQTT connection จาก network interface


==================================================
8. ทดสอบ Subscribe ด้วย Username/Password
==================================================

Terminal 1:

```bash
mosquitto_sub \
  -h localhost \
  -p 1883 \
  -u iotuser \
  -P 'PASSWORD' \
  -t 'pkru/iot/#' \
  -v
```

คำสั่งจะค้างรอ Message ซึ่งเป็นปกติ


==================================================
9. ทดสอบ Publish
==================================================

เปิด Terminal 2:

```bash
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u iotuser \
  -P 'PASSWORD' \
  -t 'pkru/iot/001/data' \
  -m '{"temp":30.5,"humi":72,"light":850}'
```

Terminal 1 ควรได้รับ:

pkru/iot/001/data {"temp":30.5,"humi":72,"light":850}


==================================================
10. ทดสอบว่า Anonymous เข้าไม่ได้
==================================================

ลอง Subscribe โดยไม่ใส่ Username/Password:

```bash
mosquitto_sub \
  -h localhost \
  -p 1883 \
  -t 'pkru/iot/#' \
  -v
```

ควรถูกปฏิเสธ เช่น:

Connection error: Connection Refused: not authorised.

แสดงว่า:

```text
ไม่มี Username/Password
        │
        X
    Mosquitto
```

```text
มี Username/Password
        │
        ▼
    Mosquitto ✓
```


==================================================
11. การเพิ่ม User คนใหม่ในภายหลัง
==================================================

หลังจากมี /etc/mosquitto/passwd แล้ว

ห้ามใช้ -c อีก

เพิ่ม user เช่น student:

```bash
sudo mosquitto_passwd /etc/mosquitto/passwd student
```

จากนั้น:

```bash
sudo systemctl restart mosquitto
```

ถ้าใช้ -c อีกครั้ง จะเป็นการสร้าง password file ใหม่
และอาจทำให้ User เดิมในไฟล์หาย


==================================================
12. เปลี่ยน Password ของ User เดิม
==================================================

เช่นเปลี่ยน Password ของ iotuser:

```bash
sudo mosquitto_passwd /etc/mosquitto/passwd iotuser
```

กรอก Password ใหม่ แล้ว:

```bash
sudo systemctl restart mosquitto
```


==================================================
12. ลบ User
==================================================

ตัวอย่างลบ student:

```bash
sudo mosquitto_passwd -D /etc/mosquitto/passwd student
```

แล้ว:

```bash
sudo systemctl restart mosquitto
```


==================================================
Configuration ที่ใช้ในแล็บปัจจุบัน
==================================================

Broker:
Raspberry Pi PI_HOSTNAME

Port:
1883

Authentication:
Username/Password

Anonymous:
ไม่อนุญาต

/etc/mosquitto/conf.d/iot-lab.conf

listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd


==================================================
ตัวอย่างสำหรับนักศึกษา
==================================================

Broker   : IP ของ PI_HOSTNAME
Port     : 1883
Username : iotuser
Password : รหัสกลางของห้องแล็บ

Topic แยกตามรหัสนักศึกษา:

pkru/iot/001/data
pkru/iot/002/data
pkru/iot/003/data
...


Architecture:

```text
ESP32 #001 ──┐
ESP32 #002 ──┤
ESP32 #003 ──┤
             │
             │ MQTT :1883
             │ Username/Password
             ▼
      ┌─────────────────┐
      │ Mosquitto       │
      │ PI_HOSTNAME           │
      │                 │
      │ Authentication  │
      └────────┬────────┘
               │
               ▼
            Node-RED
               │
               ▼
             SQLite
```


หมายเหตุ:

การตั้งค่านี้เป็น Authentication เท่านั้น
ยังไม่ได้ทำ ACL แยกสิทธิ์แต่ละ Topic

ดังนั้นทุกคนที่รู้ Username/Password กลาง
สามารถ Publish/Subscribe Topic อื่นได้

เหมาะสำหรับแล็บเพื่อเรียนรู้ MQTT Authentication ก่อน
แล้วจึงเพิ่ม ACL เป็นขั้นต่อไป

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker|LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]
- [[IoT Lab Knowledge Base/05 - MQTT Topic Design|MQTT Topic Design]]
- [[IoT Lab Knowledge Base/06 - MQTT Testing|MQTT Testing]]
- [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]

กลับไป [[index]]
