> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[00 - IoT Lab Teaching Guide - Hub]]
> ถัดไป: [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]

# LAB 01 --- ตรวจสอบระบบ Raspberry Pi

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 1.1 แนวคิดของ LAB

LAB แรกใช้สำหรับตรวจสภาพ Raspberry Pi ก่อนเริ่มสร้างระบบ IoT จริง จุดประสงค์ไม่ใช่การติดตั้งโปรแกรมเพิ่ม แต่เป็นการอ่านสภาพเครื่องให้เป็นก่อนว่าเครื่องพร้อมทำหน้าที่เป็น IoT Gateway หรือยัง

ระบบที่จะต่อยอดใน lab ถัดไปต้องพึ่งพาองค์ประกอบพื้นฐานเหล่านี้:

```text
Raspberry Pi
   |
   +-- Network
   +-- Time
   +-- Storage
   +-- Memory
   +-- systemd service
   +-- Port / Log
```

ถ้าพื้นฐานเหล่านี้ยังไม่พร้อม ปัญหาใน Mosquitto, Node-RED, SQLite หรือ Cloudflare Tunnel จะวิเคราะห์ยากมาก เพราะอาการจะปนกันระหว่างปัญหาเครื่องกับปัญหา application

## 1.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ตรวจ hostname และ IP address ของ Raspberry Pi
- ตรวจระบบปฏิบัติการ, kernel, architecture และ uptime
- ตรวจ RAM, swap และพื้นที่ disk
- ตรวจเวลาและ timezone ของเครื่อง
- ตรวจ network path พื้นฐาน
- อ่านสถานะ service ด้วย systemd
- ตรวจ port ที่เปิดใช้งาน
- อ่าน log ด้วย journalctl
- สรุปได้ว่าเครื่องพร้อมเข้าสู่ LAB 02 หรือยัง

## 1.3 Architecture ของเครื่องใน LAB

```text
Student / Teacher Laptop
          |
          | SSH / Web / MQTT test
          v
+----------------------------------+
| Raspberry Pi                     |
| hostname: PI_HOSTNAME                  |
| user: PI_USER                     |
|                                  |
| OS + Network + systemd + logs    |
+----------------------------------+
```

ในเอกสารนี้ใช้ชื่อ `PI_HOSTNAME` เป็นตัวอย่าง hostname ของ Raspberry Pi เครื่องหลัก ถ้าใช้เครื่องอื่น ให้ใช้ค่าจริงของเครื่องนั้นแทน

## 1.4 ตรวจชื่อเครื่องและ IP Address

ตรวจ hostname:

```bash
hostname
```

ตรวจ IP address แบบสั้น:

```bash
hostname -I
```

ตรวจรายละเอียด interface:

```bash
ip addr show
```

ตรวจ default gateway:

```bash
ip route
```

ผลที่ควรตีความ:

| สิ่งที่ตรวจ | ความหมาย |
|---|---|
| `hostname` | ชื่อเครื่องที่ใช้เรียกใน lab |
| `hostname -I` | IP ที่ใช้ SSH, Node-RED, MQTT จากเครื่องอื่น |
| `ip route` | เส้นทางออก Internet ของ Pi |

> ถ้าไม่มี IP address ให้แก้ปัญหา network ก่อน ไม่ควรข้ามไปทำ MQTT หรือ Node-RED

## 1.5 ตรวจระบบปฏิบัติการและ Hardware

ตรวจรุ่นระบบปฏิบัติการ:

```bash
cat /etc/os-release
```

ตรวจ kernel:

```bash
uname -a
```

ตรวจ architecture:

```bash
uname -m
```

ตรวจ uptime และ load:

```bash
uptime
```

ตัวอย่างการอ่านผล:

```text
uname -m = aarch64  หมายถึงระบบ 64-bit
uptime สูงมาก       หมายถึงเครื่องเปิดมานาน อาจมี service ค้างได้
load สูงผิดปกติ     อาจกระทบ Node-RED หรือ SQLite ใน lab หลังๆ
```

## 1.6 ตรวจ RAM, Swap และ Disk

ตรวจหน่วยความจำ:

```bash
free -h
```

ตรวจพื้นที่เก็บข้อมูล:

```bash
df -h
```

ตรวจพื้นที่เฉพาะ home directory:

```bash
du -sh /home/PI_USER
```

ค่าที่ควรระวัง:

| รายการ | อาการที่ต้องระวัง |
|---|---|
| RAM เหลือน้อยมาก | Node-RED อาจช้า หรือ service restart เอง |
| Swap ถูกใช้สูง | เครื่องอาจตอบสนองช้า |
| Disk ใกล้เต็ม | SQLite เขียนข้อมูลไม่ได้ |
| Home directory โตเร็ว | log หรือ database อาจขยายตัวผิดปกติ |

## 1.7 ตรวจเวลาและ Timezone

ตรวจเวลาระบบ:

```bash
timedatectl
```

ตรวจเวลาแบบ command line:

```bash
date
```

หลักการของ lab นี้:

```text
System time ถูกต้อง
      |
      v
MQTT timestamp ถูกต้อง
      |
      v
SQLite query ตามเวลาได้ถูกต้อง
      |
      v
Rolling statistics ใน LAB 11 เชื่อถือได้
```

ถ้าเวลาผิด ให้บันทึกไว้เป็นปัญหาก่อน เพราะจะมีผลโดยตรงกับ LAB 09 เป็นต้นไป

## 1.8 ตรวจ Internet และ DNS

ทดสอบเชื่อมต่อ IP ภายนอก:

```bash
ping -c 4 1.1.1.1
```

ทดสอบ DNS:

```bash
ping -c 4 cloudflare.com
```

แปลผล:

| ผลทดสอบ | ความหมาย |
|---|---|
| ping IP ได้ แต่ ping domain ไม่ได้ | DNS มีปัญหา |
| ping IP ไม่ได้ | network หรือ gateway มีปัญหา |
| ping ได้ทั้งสองแบบ | พร้อมทำ lab ถัดไป |

## 1.9 ตรวจ systemd Service

คำสั่งพื้นฐานที่ต้องใช้ตลอดชุด lab:

```bash
systemctl status ssh --no-pager
systemctl status mosquitto --no-pager
systemctl status nodered.service --no-pager
```

คำสั่งควบคุม service ที่จะใช้ใน lab ถัดไป:

```bash
sudo systemctl start mosquitto
sudo systemctl stop mosquitto
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

> LAB นี้ให้เข้าใจความหมายของคำสั่งก่อน ไม่จำเป็นต้อง restart service ถ้ายังไม่มีเหตุผล

## 1.10 ตรวจ Port ที่เปิดใช้งาน

ดู port ที่กำลัง listen:

```bash
ss -lntp
```

ตัวอย่าง port ที่จะพบใน lab นี้และ lab ถัดไป:

| Port | Service |
|---|---|
| `22` | SSH |
| `1883` | Mosquitto MQTT |
| `1880` | Node-RED |

กรองเฉพาะ port ที่สนใจ:

```bash
ss -lntp | grep 1883
ss -lntp | grep 1880
```

## 1.11 อ่าน Log เบื้องต้น

อ่าน log ของ service:

```bash
journalctl -u ssh -n 30 --no-pager
```

อ่าน log แบบติดตามต่อเนื่อง:

```bash
journalctl -u ssh -f
```

หลักการอ่าน log:

```text
status บอกว่า service อยู่หรือไม่
log บอกว่า service ล้มเพราะอะไร
```

## 1.12 Checklist ก่อนจบ LAB

- รู้ hostname ของเครื่อง
- รู้ IP address ของเครื่อง
- ตรวจ network และ DNS ผ่านแล้ว
- ตรวจ RAM และ disk แล้วไม่มีปัญหารุนแรง
- ตรวจเวลาและ timezone แล้ว
- ใช้ `systemctl status` เป็น
- ใช้ `ss -lntp` ตรวจ port เป็น
- ใช้ `journalctl` อ่าน log เบื้องต้นได้

## 1.13 งานส่ง LAB

ให้บันทึกผลตรวจเป็นตารางสั้นๆ:

```text
hostname:
IP address:
OS version:
Architecture:
Disk free:
Timezone:
Internet test:
DNS test:
ปัญหาที่พบ:
```

## 1.14 เชื่อมไป LAB ถัดไป

LAB 02 จะใช้ Raspberry Pi เครื่องนี้เป็น MQTT Broker ด้วย Mosquitto ดังนั้นสิ่งที่ต้องพร้อมก่อนเริ่มคือ network, time, service และ port monitoring จาก LAB นี้

