> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[24 - LAB 24 - MQTT Security - Authentication and ACL]]
> ถัดไป: [[26 - LAB 26 - Backup and Recovery for Raspberry Pi IoT Gateway]]

# LAB 25 --- Remote Access with Cloudflare Tunnel

> [!info] แก้ไขล่าสุด
> 2026-10-02 07:32:25 +07

## 25.1 แนวคิดของ LAB

จนถึง LAB 24 ระบบ IoT ของเรามีองค์ประกอบหลักแล้ว

```text
ESP32 / Sensors
      ↓
     MQTT
      ↓
  Mosquitto
      ↓
Raspberry Pi Gateway
      │
      ├── Node-RED
      ├── Dashboard
      ├── Python Service
      ├── SQLite
      ├── Store-and-Forward
      └── MQTT Authentication + ACL
```
ระบบเหล่านี้สามารถทำงานภายใน LAN ได้ดี

แต่ถ้าผู้ดูแลระบบอยู่นอก Network เช่น

```text
บ้าน
เครือข่ายมือถือ
อาคารอื่น
จังหวัดอื่น
```
และต้องการเข้าถึง

```text
Node-RED
Dashboard
SSH
```
จะเกิดปัญหาเพราะ Raspberry Pi มักอยู่หลัง

```text
NAT
CGNAT
University Firewall
```
วิธีดั้งเดิมคือ

```text
Public IPv4
     +
Port Forwarding
```
แต่ LAB นี้จะไม่ใช้วิธีดังกล่าว

เราจะใช้

```text
Cloudflare Tunnel
```
ให้ Raspberry Pi เป็นฝ่ายสร้าง Connection ออกไปยัง Cloudflare

```text
Raspberry Pi
     │
     │ Outbound Connection
     ▼
  Cloudflare
     ▲
     │
  Internet
     ▲
     │
  Remote User
```
จึงไม่จำเป็นต้องเปิด Incoming Port จาก Internet มายัง Raspberry Pi โดยตรง

---

## 25.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ

- อธิบายปัญหา NAT และ CGNAT
- อธิบายหลักการของ Reverse/Outbound Tunnel
- ติดตั้ง `cloudflared`
- สร้าง Named Tunnel
- เชื่อม Domain/Subdomain เข้ากับ Tunnel
- สร้าง Ingress Rules
- เปิด Node-RED ผ่าน HTTPS
- เปิด Web Service ผ่าน HTTPS
- ใช้งาน SSH ผ่าน Cloudflare Tunnel
- ติดตั้ง Tunnel เป็น systemd Service
- ตรวจสอบ Tunnel Status และ Log
- อธิบายความแตกต่างระหว่าง Tunnel กับ Port Forwarding
- อธิบายความแตกต่างระหว่าง Remote Access กับ MQTT Security
- ทดสอบ Service จาก Network ภายนอก
- เข้าใจว่า Tunnel ไม่ได้แทน Authentication ของ Application

---

## 25.3 Architecture ก่อน LAB 25

ภายใน LAN

```text
ESP32
   │
   ▼
Mosquitto
   │
   ▼
Raspberry Pi
   │
   ├── Node-RED :1880
   ├── nginx    :80
   ├── SSH      :22
   ├── SQLite
   └── Python
```
ผู้ใช้ใน LAN เข้าได้ผ่าน

```text
http://PI_IP:1880
```
หรือ

```bash
ssh PI_USER@PI_IP
```
แต่จาก Internet

```text
Remote User
    │
    ▼
 Internet
    │
    ▼
   NAT
    │
    X
    │
Raspberry Pi
```
ไม่สามารถเข้าถึงได้โดยตรงในหลายกรณี

---

## 25.4 Architecture หลัง LAB 25

```text
Remote User
     │
     │ HTTPS / SSH
     ▼
Cloudflare Edge
     │
     │ Cloudflare Tunnel
     ▼
  cloudflared
Raspberry Pi
     │
     ├── localhost:80
     │      └── nginx
     │
     ├── localhost:1880
     │      └── Node-RED
     │
     └── localhost:22
            └── SSH
```
จุดสำคัญคือ

```text
Raspberry Pi → Cloudflare
```
เป็น Connection ขาออก

ไม่ใช่

```text
Internet → Router → Raspberry Pi
```
โดยตรง

---

## 25.5 Port Forwarding แบบเดิม

Architecture

```text
Internet
   │
   ▼
Public IP
   │
   ▼
 Router
   │
   │ Port Forward
   ▼
Raspberry Pi
```
เช่น

```text
Public_IP:1880
      ↓
RaspberryPi:1880
```
ปัญหาที่อาจพบ

```text
ไม่มี Public IPv4
อยู่หลัง CGNAT
Router ตั้งค่าไม่ได้
University Firewall
เปิด Service ตรงสู่ Internet
```

---

## 25.6 Cloudflare Tunnel

Architecture

```text
Raspberry Pi
     │
     │ outbound encrypted tunnel
     ▼
  Cloudflare
     ▲
     │
  Internet
     ▲
     │
  Remote User
```
ข้อดีเชิงสถาปัตยกรรม

- ไม่ต้องใช้ Public IPv4 ที่ Raspberry Pi
- ไม่ต้องทำ Port Forwarding
- ทำงานได้ในหลาย Network ที่อยู่หลัง NAT/CGNAT
- Web Service สามารถเข้าผ่าน HTTPS
- ใช้ Subdomain แยกแต่ละ Service ได้
- Tunnel สามารถ Run เป็น Service
- ลดการเปิด Inbound Port ที่ Router

---

## 25.7 สิ่งที่ต้องมี

สำหรับ LAB นี้ต้องมี

```text
Raspberry Pi
Internet Connection
Cloudflare Account
Domain ที่จัดการ DNS ผ่าน Cloudflare
cloudflared
```
ตัวอย่าง Domain ใน LAB

```text
example.com
```
ตัวอย่าง Raspberry Pi

```text
PI_HOSTNAME
```
ดังนั้นจะใช้

```text
pi.example.com
```
สำหรับ Web

และ

```text
node-red.example.com
```
สำหรับ Node-RED

และ

```text
ssh.example.com
```
สำหรับ SSH

ชื่อจริงสามารถเปลี่ยนตามระบบของแต่ละกลุ่มได้

---

## 25.8 ตรวจสอบ Internet

บน Raspberry Pi

```bash
ping -c 4 1.1.1.1
```
ตรวจ DNS

```bash
ping -c 4 cloudflare.com
```
ถ้าทำงาน

แสดงว่า Pi สามารถออก Internet ได้

---

## 25.9 ตรวจสอบ Architecture ภายในก่อน

ก่อนทำ Tunnel ต้องให้ Service ภายในทำงานก่อน

ตรวจ nginx

```bash
systemctl status nginx
```
ตรวจ Node-RED

```bash
systemctl status nodered
```
ตรวจ SSH

```bash
systemctl status ssh
```
ตรวจ Port

```bash
sudo ss -lntp
```
ควรเห็น Service เช่น

```text
:22
:80
:1880
```

---

## 25.10 ทดสอบ Local Service

จาก Raspberry Pi

```bash
curl http://localhost
```
ทดสอบ Node-RED

```bash
curl -I http://localhost:1880
```
หรือจากเครื่องใน LAN เปิด

```text
http://PI_IP
```
และ

```text
http://PI_IP:1880
```
หลักสำคัญคือ

```text
Local Service ต้องทำงานก่อนสร้าง Tunnel
```
ถ้า

```text
localhost:1880
```
ยังเข้าไม่ได้

Cloudflare Tunnel ก็ไม่สามารถแก้ปัญหาของ Node-RED Service เองได้

---

## 25.11 ตรวจ Architecture ก่อนทำ Tunnel

ต้องแยกปัญหาเป็น Layer

```text
Application
    ↓
Local Network
    ↓
Tunnel
    ↓
DNS
    ↓
Internet Client
```
ควรทดสอบจากด้านในออกด้านนอก

```text
Step 1
localhost

Step 2
LAN IP

Step 3
Tunnel

Step 4
Domain

Step 5
External Network
```
วิธีนี้ช่วย Debug ได้ง่ายกว่า

---

## 25.12 ติดตั้ง cloudflared

วิธีติดตั้งอาจเปลี่ยนตาม Debian/Cloudflare เวอร์ชัน

หลังติดตั้งแล้ว สิ่งที่ LAB ต้องได้คือคำสั่ง

```text
cloudflared
```
ตรวจสอบ

```bash
cloudflared --version
```
ควรแสดง Version ของ cloudflared

---

## 25.13 ตรวจ Architecture ของ Raspberry Pi

ใช้

```bash
uname -m
```
ตัวอย่าง Raspberry Pi OS 64-bit

```text
aarch64
```
หรือ

```text
arm64
```
ต้องเลือก Package ให้ตรง Architecture

ไม่ควรนำ Package

```text
amd64
```
ของ PC x86-64 มาใช้กับ Raspberry Pi ARM

---

## 25.14 Login Cloudflare

ใช้

```bash
cloudflared tunnel login
```
Command จะให้ URL สำหรับ Authentication

เปิด URL นั้นใน Browser

Login Cloudflare

เลือก Domain ที่ต้องการอนุญาตให้ Tunnel ใช้งาน

เมื่อสำเร็จ cloudflared จะได้รับ Credential ที่จำเป็นสำหรับจัดการ Tunnel

---

## 25.15 ตรวจสอบ Directory

หลัง Login

ใช้

```bash
ls -la ~/.cloudflared
```
อาจพบ File ที่เกี่ยวข้องกับ Authentication/Credentials

ห้ามนำ Credential File ไปเผยแพร่

เช่น

```text
GitHub
Public Repository
Screenshot
Shared Folder
```
เพราะ Credential ถือเป็น Secret

---

## 25.16 สร้าง Named Tunnel

สร้าง Tunnel ชื่อ

```text
PI_HOSTNAME
```
ใช้

```bash
cloudflared tunnel create PI_HOSTNAME
```
ผลจะได้

```text
Tunnel ID
```
รูปแบบ UUID

เช่น

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
และ Credentials File

เช่น

```text
~/.cloudflared/TUNNEL_ID.json
```

---

## 25.17 ตรวจสอบ Tunnel

ใช้

```bash
cloudflared tunnel list
```
ควรเห็น

```text
NAME
PI_HOSTNAME
```
พร้อม Tunnel ID

เก็บ Tunnel ID ไว้ใช้ใน Configuration

---

## 25.18 Named Tunnel vs Quick Tunnel

Quick Tunnel เหมาะกับ

```text
Testing
Temporary Demo
```
URL อาจเป็น Temporary URL

แต่ LAB นี้ใช้

```text
Named Tunnel
```
เพราะต้องการ

```text
Stable Configuration
Custom Domain
Multiple Services
systemd
Reboot Recovery
```

---

## 25.19 สร้าง Configuration File

สร้าง

```bash
nano ~/.cloudflared/config.yml
```
ตัวอย่าง

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/PI_USER/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:80

  - hostname: node-red.example.com
    service: http://localhost:1880

  - hostname: ssh.example.com
    service: ssh://localhost:22

  - service: http_status:404
```
เปลี่ยน

```text
TUNNEL_ID
```
และ

```text
PI_USER
```
ให้ตรงกับเครื่องจริง

---

## 25.20 Ingress Rule

ส่วน

```yaml
ingress:
```
คือ Mapping ระหว่าง

```text
Public Hostname
```
กับ

```text
Local Service
```
ตัวอย่าง

```text
pi.example.com
      ↓
localhost:80

node-red.example.com
      ↓
localhost:1880

ssh.example.com
      ↓
localhost:22
```
ดังนั้นไม่ต้องเปิด Port

```text
80
1880
22
```
จาก Router สู่ Internet โดยตรง

---

## 25.21 Catch-all Rule

บรรทัดสุดท้าย

```yaml
- service: http_status:404
```
มีความสำคัญ

ใช้รองรับ Request ที่ไม่ตรงกับ Ingress Rule ใด

ผลคือ

```text
HTTP 404
```
แทนการ Forward ไปยัง Service ที่ไม่ต้องการ

---

## 25.22 ตรวจสอบ Configuration

ใช้

```bash
cloudflared tunnel ingress validate
```
ถ้า Configuration ถูกต้องควรผ่าน Validation

ถ้ามี YAML Error

ให้แก้ก่อน Run Tunnel

---

## 25.23 ตรวจสอบ Ingress Mapping

สามารถตรวจสอบ Rule ที่จะ Match กับ URL

เช่น

```bash
cloudflared tunnel ingress rule \
https://pi.example.com
```
ควร Match ไปยัง

```text
http://localhost:80
```
และ

```bash
cloudflared tunnel ingress rule \
https://node-red.example.com
```
ควร Match

```text
http://localhost:1880
```

---

## 25.24 สร้าง DNS Route

สำหรับ Web

```bash
cloudflared tunnel route dns \
PI_HOSTNAME \
pi.example.com
```
สำหรับ Node-RED

```bash
cloudflared tunnel route dns \
PI_HOSTNAME \
node-red.example.com
```
สำหรับ SSH

```bash
cloudflared tunnel route dns \
PI_HOSTNAME \
ssh.example.com
```
Cloudflare จะสร้าง DNS Mapping ที่ชี้ Hostname ไปยัง Tunnel

---

## 25.25 DNS Architecture

แนวคิดคือ

```text
pi.example.com
      │
      ▼
Cloudflare DNS
      │
      ▼
Cloudflare Tunnel
      │
      ▼
Raspberry Pi
      │
      ▼
localhost:80
```
ไม่ใช่

```text
DNS
  ↓
Public IP ของ Raspberry Pi
```
โดยตรง

---

## 25.26 Run Tunnel แบบ Manual ก่อน

ก่อนติดตั้งเป็น Service

ควร Run แบบ Manual

ใช้

```bash
cloudflared tunnel run PI_HOSTNAME
```
ควรเห็น Log แสดงว่า Tunnel พยายามเชื่อมต่อ Cloudflare

เปิด Terminal นี้ไว้

แล้วทดสอบจาก Client ภายนอก

---

## 25.27 ทดสอบ Web

เปิด Browser

```text
https://pi.example.com
```
ควรเห็น Web Page จาก

```text
nginx
```
บน Raspberry Pi

Flow คือ

```text
Browser
   ↓
HTTPS
   ↓
Cloudflare
   ↓
Tunnel
   ↓
cloudflared
   ↓
localhost:80
   ↓
nginx
```

---

## 25.28 ทดสอบ Node-RED

เปิด

```text
https://node-red.example.com
```
ควรเข้าถึง Node-RED

Flow

```text
Browser
   ↓
HTTPS
   ↓
Cloudflare
   ↓
Tunnel
   ↓
localhost:1880
   ↓
Node-RED
```

---

## 25.29 สำคัญ --- Tunnel ไม่ใช่ Node-RED Authentication

Cloudflare Tunnel ทำให้ Service

```text
Reachable
```
จากภายนอก

แต่ไม่ได้หมายความว่า Node-RED Application มี Authentication ที่เหมาะสมโดยอัตโนมัติ

ดังนั้น Node-RED ควรมี

```text
Authentication
```
ของตัวเอง

หรือเพิ่ม Access Policy ที่เหมาะสม

หลักสำคัญ

```text
Tunnel
   ≠
Application Login
```

---

## 25.30 อย่าเปิด Node-RED Editor แบบไม่มีการป้องกัน

Node-RED Editor สามารถ

```text
แก้ Flow
Deploy Flow
Publish MQTT
Run Logic
เข้าถึง Credential ที่ Flow ใช้ในบางรูปแบบ
```
ดังนั้นการเปิด

```text
Node-RED Editor
```
สู่ Internet โดยไม่มี Authentication เป็นความเสี่ยงสูง

อย่างน้อยควรมี

```text
Node-RED Admin Authentication
```
ก่อนใช้ Remote Access

---

## 25.31 Dashboard กับ Editor ควรคิดแยกกัน

ผู้ใช้ Dashboard อาจต้องการเพียง

```text
View Data
Control Device
```
แต่ Administrator ต้องการ

```text
Edit Flow
Deploy
Configure System
```
จึงไม่ควรถือว่า

```text
Dashboard User
    =
Node-RED Administrator
```
ระบบจริงควรแยก Permission ตามหน้าที่

---

## 25.32 SSH ผ่าน Cloudflare Tunnel

Ingress

```yaml
- hostname: ssh.example.com
  service: ssh://localhost:22
```
ไม่ได้หมายความว่า Client จะใช้

```bash
ssh PI_USER@ssh.example.com
```
แบบ TCP ปกติได้เสมอโดยตรง

Client ต้องใช้ cloudflared เป็น Proxy สำหรับ Tunnel รูปแบบนี้

---

## 25.33 ติดตั้ง cloudflared บน Client

เครื่องที่ใช้ Remote SSH เช่น

```text
Windows
macOS
Linux
```
ต้องมี

```text
cloudflared
```
ตรวจสอบ

```bash
cloudflared --version
```

---

## 25.34 ทดสอบ SSH Proxy

รูปแบบ

```bash
cloudflared access ssh \
--hostname ssh.example.com
```
สำหรับการใช้งานร่วมกับ OpenSSH

สามารถใช้เป็น

```text
ProxyCommand
```

---

## 25.35 SSH จาก macOS/Linux

แก้

```text
~/.ssh/config
```
เพิ่ม

```sshconfig
Host PI_HOSTNAME
    HostName ssh.example.com
    User PI_USER
    ProxyCommand cloudflared access ssh --hostname %h
```
จากนั้นใช้

```bash
ssh PI_HOSTNAME
```
แทน Command ยาว

---

## 25.36 SSH แบบ Command เดียว

สามารถใช้

```bash
ssh \
-o ProxyCommand="cloudflared access ssh --hostname %h" \
PI_USER@ssh.example.com
```
ถ้า Configuration ถูกต้องจะเชื่อมไปยัง

```text
Raspberry Pi SSH :22
```
ผ่าน Cloudflare

---

## 25.37 SSH จาก Windows

ถ้ามี

```text
OpenSSH Client
cloudflared
```
สามารถสร้าง File

```text
C:\Users\USERNAME\.ssh\config
```
เช่น

```sshconfig
Host PI_HOSTNAME
    HostName ssh.example.com
    User PI_USER
    ProxyCommand cloudflared access ssh --hostname %h
```
จากนั้นใช้

```bash
ssh PI_HOSTNAME
```

---

## 25.38 SSH Authentication ยังจำเป็น

Tunnel มีหน้าที่

```text
Transport / Reachability
```
แต่ SSH ยังต้องตรวจสอบ

```text
SSH Authentication
```
เช่น

```text
Password
SSH Key
```
ดังนั้น

```text
Cloudflare Tunnel
      ↓
SSH Server
      ↓
SSH Authentication
```
ยังเป็นคนละ Layer

---

## 25.39 แนะนำ SSH Key

บน Client

```bash
ssh-keygen -t ed25519
```
จากนั้นนำ Public Key ไปติดตั้งที่ Raspberry Pi

เช่น

```text
~/.ssh/authorized_keys
```
หลังทดสอบ Key Login สำเร็จแล้ว

สามารถพิจารณาปิด Password Login ตาม Requirement ของระบบ

ข้อสำคัญ

```text
อย่าปิด Password Login
ก่อนทดสอบ SSH Key สำเร็จ
```
ไม่เช่นนั้นอาจ Lock ตัวเองออกจากเครื่อง

---

## 25.40 Remote Access Security Layers

สำหรับ SSH

```text
Cloudflare Tunnel
       ↓
Cloudflare Access
       ↓
SSH Authentication
       ↓
Linux User Permission
```
สำหรับ Node-RED

```text
Cloudflare Tunnel
       ↓
Cloudflare Access
       ↓
Node-RED Authentication
       ↓
Application Permission
```
แต่ละ Layer มีหน้าที่ต่างกัน

---

## 25.41 Cloudflare Access

Tunnel ทำให้ Service สามารถเข้าถึงผ่าน Cloudflare

แต่ถ้าต้องการจำกัดว่า

```text
ใคร
```
สามารถเข้า Web Application ได้

สามารถเพิ่ม

```text
Cloudflare Access
```
หน้า Service

Flow

```text
Remote User
     ↓
Cloudflare Access
     ↓
Identity / Policy
     ↓
Tunnel
     ↓
Application
```
จึงเป็น Security Layer เพิ่มเติม

---

## 25.42 Tunnel ≠ Access Policy

ต้องแยกคำว่า

```text
Tunnel
```
กับ

```text
Access
```
Tunnel

```text
เชื่อม Cloudflare
กับ Local Service
```
Access

```text
กำหนดว่า User ใด
ได้รับอนุญาตให้ผ่าน
```
ดังนั้น

```text
Tunnel Active
```
ไม่ได้หมายความว่า

```text
Access Control Complete
```

---

## 25.43 Multiple Services One Tunnel

Tunnel เดียวสามารถ Route หลาย Hostname

เช่น

```text
pi.example.com
    → nginx:80

node-red.example.com
    → Node-RED:1880

ssh.example.com
    → SSH:22
```
ข้อดีคือ

```text
Tunnel เดียว
หลาย Service
```
ไม่จำเป็นต้องสร้าง Tunnel ใหม่ทุก Port

---

## 25.44 Multiple Raspberry Pi

ถ้ามี Raspberry Pi

```text
kata
karon
kathu
PI_HOSTNAME
```
แนวทางที่เข้าใจง่ายสำหรับ LAB คือให้แต่ละ Pi มี Tunnel ของตัวเอง

ตัวอย่าง

```text
kata.example.com
karon.example.com
kathu.example.com
pi.example.com
```
Node-RED

```text
nodered-kata.example.com
nodered-karon.example.com
nodered-kathu.example.com
node-red.example.com
```
SSH

```text
ssh-kata.example.com
ssh-karon.example.com
ssh-kathu.example.com
ssh.example.com
```
ทำให้ Mapping

```text
Hostname
   ↔
Raspberry Pi
```
ชัดเจน

---

## 25.45 Naming Convention

ควรกำหนด Naming Convention ตั้งแต่ต้น

ตัวอย่าง

```text
{service}-{device}.{domain}
```
เช่น

```text
node-red.example.com
ssh.example.com
```
หรือสำหรับ Web หลัก

```text
pi.example.com
```
เมื่อมี Device จำนวนมากจะช่วยลดความสับสน

---

## 25.46 ติดตั้ง Tunnel เป็น systemd Service

หลังทดสอบ

```bash
cloudflared tunnel run PI_HOSTNAME
```
สำเร็จแล้ว

จึงติดตั้งเป็น Service

แนวทางทั่วไปคือใช้

```bash
cloudflared service install
```
แต่ต้องระวังว่าเมื่อใช้ `sudo`

Home Directory/ตำแหน่ง Configuration ที่ cloudflared มองหาอาจต่างจาก User ปกติ

วิธีที่ชัดเจนสำหรับ LAB คือกำหนด Configuration Path ให้แน่นอนก่อนติดตั้ง Service

---

## 25.47 เก็บ Configuration ใน /etc/cloudflared

สร้าง Directory

```bash
sudo mkdir -p /etc/cloudflared
```
Copy Configuration

```bash
sudo cp \
~/.cloudflared/config.yml \
/etc/cloudflared/config.yml
```
Copy Credentials

```bash
sudo cp \
~/.cloudflared/TUNNEL_ID.json \
/etc/cloudflared/TUNNEL_ID.json
```
จากนั้นแก้

```bash
sudo nano \
/etc/cloudflared/config.yml
```
ให้

```yaml
credentials-file:
```
ชี้ไปยัง

```text
/etc/cloudflared/TUNNEL_ID.json
```
ตัวอย่าง

```yaml
tunnel: TUNNEL_ID

credentials-file: /etc/cloudflared/TUNNEL_ID.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:80

  - hostname: node-red.example.com
    service: http://localhost:1880

  - hostname: ssh.example.com
    service: ssh://localhost:22

  - service: http_status:404
```

---

## 25.48 ป้องกัน Credentials

กำหนด Permission

```bash
sudo chown -R root:root \
/etc/cloudflared
```
จากนั้นจำกัด Permission ของ Credential

```bash
sudo chmod 600 \
/etc/cloudflared/TUNNEL_ID.json
```
และ Configuration

```bash
sudo chmod 600 \
/etc/cloudflared/config.yml
```
อย่าเก็บ Credentials ใน

```text
GitHub
Shared Drive
Public Repository
Student Submission
```

---

## 25.49 Validate Configuration ใหม่

ใช้

```bash
cloudflared tunnel \
--config /etc/cloudflared/config.yml \
ingress validate
```
ต้องผ่านก่อนสร้าง Service

---

## 25.50 ทดสอบ Configuration จาก /etc

Run

```bash
sudo cloudflared tunnel \
--config /etc/cloudflared/config.yml \
run
```
ถ้าทำงาน

แสดงว่า Service สามารถใช้ Configuration ชุดนี้ได้

กด

```text
Ctrl+C
```
หลังทดสอบ

---

## 25.51 ติดตั้ง Service

ใช้

```bash
sudo cloudflared \
--config /etc/cloudflared/config.yml \
service install
```
จากนั้น

```bash
sudo systemctl enable cloudflared

sudo systemctl start cloudflared
```
หรือ

```bash
sudo systemctl enable --now cloudflared
```

---

## 25.52 ตรวจสอบ Service

ใช้

```bash
systemctl status cloudflared
```
ควรเห็น

```text
active (running)
```
ตรวจสอบว่า Enable แล้ว

```bash
systemctl is-enabled cloudflared
```
ควรได้

```text
enabled
```

---

## 25.53 ดู Log

ใช้

```bash
journalctl \
-u cloudflared \
-f
```
หรือดูย้อนหลัง

```bash
journalctl \
-u cloudflared \
-n 100 \
--no-pager
```
Log มีประโยชน์มากสำหรับ Debug

```text
DNS
Tunnel Connection
Ingress
Origin Service
Authentication
```

---

## 25.54 Reboot Test

Reboot Raspberry Pi

```bash
sudo reboot
```
หลังเครื่องกลับมา

ตรวจ

```bash
systemctl status cloudflared
```
ต้องเป็น

```text
active (running)
```
ทดสอบ

```text
https://pi.example.com
```
และ

```text
https://node-red.example.com
```
อีกครั้ง

นี่คือ

```text
Remote Access Recovery after Reboot
```

---

## 25.55 ทดสอบจาก Network ภายนอกจริง

อย่าทดสอบเฉพาะจาก LAN เดียวกัน

ใช้

```text
Smartphone 4G/5G
```
หรือ Network อื่น

แล้วเปิด

```text
https://pi.example.com
```
ถ้าเข้าได้

แสดงว่า Remote Access ใช้งานจากภายนอกได้จริง

---

## 25.56 Test Matrix

| Test | Expected |
|---|---|
| localhost:80 | PASS |
| localhost:1880 | PASS |
| Tunnel manual run | PASS |
| Public web hostname | PASS |
| Public Node-RED hostname | PASS |
| SSH through cloudflared | PASS |
| cloudflared service | active |
| Reboot Pi | Tunnel recovers |
| Stop nginx | Web hostname fails |
| Start nginx | Web hostname recovers |
| Stop Node-RED | Node-RED hostname fails |
| Start Node-RED | Node-RED hostname recovers |

---

## 25.57 ทดสอบ Origin Failure

หยุด nginx

```bash
sudo systemctl stop nginx
```
จากนั้นเปิด

```text
https://pi.example.com
```
Tunnel อาจยัง

```text
ONLINE
```
แต่ Origin Service

```text
nginx
```
ไม่ทำงาน

นี่แสดงว่า

```text
Tunnel Online
    ≠
Application Online
```

---

## 25.58 เปิด nginx กลับ

ใช้

```bash
sudo systemctl start nginx
```
ตรวจ

```bash
systemctl status nginx
```
จากนั้น Refresh

```text
https://pi.example.com
```
Service ควรกลับมา

---

## 25.59 ทดสอบ Node-RED Failure

หยุด

```bash
sudo systemctl stop nodered
```
Tunnel ยังทำงาน

แต่

```text
node-red.example.com
```
จะใช้งานไม่ได้

เปิดกลับ

```bash
sudo systemctl start nodered
```
นี่ช่วยให้นักศึกษาเข้าใจ Layer

```text
Cloudflare
    ↓
Tunnel
    ↓
Origin Service
```
แต่ละ Layer สามารถ Failure แยกกันได้

---

## 25.60 Troubleshooting Model

ถ้า

```text
https://node-red.example.com
```
เข้าไม่ได้

ตรวจตามลำดับ

```text
1. Node-RED ทำงานหรือไม่

2. localhost:1880 ใช้งานได้หรือไม่

3. cloudflared ทำงานหรือไม่

4. Ingress ถูกหรือไม่

5. DNS Route ถูกหรือไม่

6. Cloudflare Access Policy ถูกหรือไม่

7. Client Network ใช้งานได้หรือไม่
```
ไม่ควรเริ่มจากการแก้ DNS แบบสุ่ม

---

## 25.61 คำสั่งตรวจ Node-RED

```bash
systemctl status nodered

curl -I http://localhost:1880

sudo ss -lntp | grep 1880
```

---

## 25.62 คำสั่งตรวจ cloudflared

```bash
systemctl status cloudflared

journalctl \
-u cloudflared \
-n 50 \
--no-pager
```

---

## 25.63 คำสั่งตรวจ DNS

จาก Client

```bash
nslookup pi.example.com
```
หรือ

```bash
dig pi.example.com
```
ใช้เพื่อตรวจว่า Hostname Resolve ได้

แต่ต้องเข้าใจว่า Tunnel DNS Record ไม่ได้จำเป็นต้องเปิดเผย IP ของ Raspberry Pi

---

## 25.64 Tunnel Status

ใช้

```bash
cloudflared tunnel list
```
หรือ

```bash
cloudflared tunnel info PI_HOSTNAME
```
เพื่อตรวจสอบ Tunnel

ข้อมูลที่แสดงขึ้นกับ Version ของ cloudflared และสถานะ Connection

---

## 25.65 Service Dependency

หลัง Boot

```text
nginx
Node-RED
SSH
cloudflared
```
ต้องกลับมาทำงาน

ตรวจ

```bash
systemctl is-enabled nginx

systemctl is-enabled nodered

systemctl is-enabled ssh

systemctl is-enabled cloudflared
```
เพราะ Tunnel กลับมาอย่างเดียวไม่เพียงพอ

Origin Service ก็ต้องกลับมาด้วย

---

## 25.66 Remote Access ≠ Remote MQTT

LAB 25 เน้น

```text
Node-RED
Dashboard
SSH
Web Service
```
ไม่จำเป็นต้องเปิด MQTT Broker

```text
:1883
```
ออก Internet

โดยตรง

MQTT Architecture จาก LAB 24 ยังคง

```text
IoT Devices
     ↓
Local MQTT Broker
     ↓
Authentication + ACL
```
ถ้าต้องการ Remote MQTT จริง ควรออกแบบ Security เพิ่มเติม เช่น

```text
TLS
Certificate
ACL
VPN/Tunnel Architecture
```
ไม่ควรเปิด Port 1883 สู่ Internet เพียงเพราะทำได้

---

## 25.67 LAB 24 กับ LAB 25 ทำหน้าที่ต่างกัน

LAB 24

```text
MQTT Security
```
ตอบคำถาม

```text
"MQTT Client ใด
อ่าน/เขียน Topic ใดได้?"
```
LAB 25

```text
Remote Access
```
ตอบคำถาม

```text
"Administrator/User
จะเข้าถึง Service จากภายนอกได้อย่างไร?"
```
จึงเป็นคนละ Layer

---

## 25.68 Security Layers หลัง LAB 25

```text
Internet User
     │
     ▼
Cloudflare
     │
     ├── HTTPS
     ├── Tunnel
     └── Access Policy
     │
     ▼
Raspberry Pi
     │
     ├── Node-RED Authentication
     ├── SSH Authentication
     └── Linux Permission
     │
     ▼
  Mosquitto
     │
     ├── Authentication
     └── ACL
```
นี่คือ

```text
Defense in Depth
```
คือไม่พึ่ง Security Mechanism เพียงตัวเดียว

---

## 25.69 อย่าเปิดทุก Service โดยไม่จำเป็น

ถ้า Remote User ต้องใช้เพียง

```text
Dashboard
```
ไม่จำเป็นต้องเปิด

```text
Node-RED Editor
SSH
MQTT
```
ทั้งหมด

หลักการคือ

```text
Expose Only What Is Required
```
สอดคล้องกับ

```text
Least Privilege
```
จาก LAB 24

---

## 25.70 Cloudflare Tunnel กับ CGNAT

CGNAT ทำให้ Router ของเราอาจไม่ได้รับ Public IPv4 โดยตรง

ดังนั้น

```text
Port Forwarding
```
จาก Internet เข้ามาอาจทำไม่ได้

แต่ Cloudflare Tunnel ใช้

```text
Outbound Connection
```
จาก Raspberry Pi

จึงสามารถทำงานใน Network หลัง NAT/CGNAT ได้ในหลายกรณี ตราบใดที่ Network อนุญาต Outbound Traffic ที่ cloudflared ต้องใช้

---

## 25.71 University Network

ใน University Network

ผู้ใช้อาจ

```text
ไม่มีสิทธิ์ Router
ไม่มี Public IPv4
ไม่มี Port Forwarding
อยู่หลัง Firewall
```
Cloudflare Tunnel จึงเหมาะกับ LAB เพราะ

```text
Raspberry Pi
```
เป็นฝ่ายสร้าง Connection ออก

แต่ต้องเป็นไปตาม

```text
University Network Policy
```
และ Security Policy ขององค์กรด้วย

---

## 25.72 Internet Failure

ถ้า Internet ขาด

```text
Cloudflare Tunnel
     ↓
   OFFLINE
```
Remote Access จะหยุด

แต่ Local IoT System ควรยังทำงาน

```text
ESP32
   ↓
Local MQTT
   ↓
Gateway
   ↓
SQLite
   ↓
Local Control
```
และ LAB 23 ช่วยให้ Remote Data สามารถ

```text
Store
  ↓
Retry Later
```
ได้

นี่คือเหตุผลที่ Architecture ไม่ควรพึ่ง Cloud Service สำหรับ Local Operation ทั้งหมด

---

## 25.73 Architecture ระหว่าง Internet Failure

```text
               INTERNET
                  X
                  │
           Cloudflare
                  X

┌────────────────────────────────┐
│           LOCAL LAN            │
│                                │
│ ESP32                          │
│   ↓                            │
│ MQTT                           │
│   ↓                            │
│ Raspberry Pi                   │
│   ├── Node-RED                 │
│   ├── Local Dashboard          │
│   ├── SQLite                   │
│   ├── Automatic Control        │
│   └── Store-and-Forward        │
│                                │
└────────────────────────────────┘
```
Local System

```text
CONTINUES
```
Remote Access

```text
TEMPORARILY UNAVAILABLE
```

---

## 25.74 Internet Recovery

เมื่อ Internet กลับมา

```text
cloudflared
    ↓
Reconnect
    ↓
Remote Access Restored
```
พร้อมกับ LAB 23

```text
PENDING Data
    ↓
Forward
    ↓
Remote Service
```
ดังนั้นระบบมีความสามารถ

```text
Local Continuity
      +
Remote Recovery
```

---

## 25.75 Hostname Design สำหรับห้อง LAB

ตัวอย่างแต่ละ Raspberry Pi

```text
kata.example.com
karon.example.com
kathu.example.com
pi.example.com
```
Node-RED

```text
nodered-kata.example.com
nodered-karon.example.com
nodered-kathu.example.com
node-red.example.com
```
SSH

```text
ssh-kata.example.com
ssh-karon.example.com
ssh-kathu.example.com
ssh.example.com
```
ทำให้ผู้สอนสามารถทราบได้ทันทีว่า

```text
Service ไหน
อยู่บน Pi ตัวไหน
```

---

## 25.76 ไม่ควรแชร์ Tunnel Credential ระหว่างนักศึกษาโดยไม่จำเป็น

ถ้านักศึกษาแต่ละกลุ่มมี Raspberry Pi ของตัวเอง

ควรแยก

```text
Tunnel
Credentials
Hostname
```
เพื่อลดผลกระทบเมื่อ Credential ของกลุ่มหนึ่งมีปัญหา

แนวคิด

```text
One Gateway
   ↓
One Identity
   ↓
One Tunnel Credential
```
เหมือนกับแนวคิด

```text
Per-device MQTT Identity
```
ใน LAB 24

---

## 25.77 Credential Management

ข้อมูลที่ไม่ควรใส่ใน Public Repository

```text
Tunnel Credentials
API Tokens
MQTT Passwords
SSH Private Keys
```
สามารถเก็บ

```text
Configuration Template
```
ได้

เช่น

```yaml
tunnel: YOUR_TUNNEL_ID

credentials-file:
  /etc/cloudflared/YOUR_TUNNEL_ID.json
```
แต่ไม่ควร Commit Credential จริง

---

## 25.78 Backup อะไรบ้าง

สำหรับ Cloudflare Tunnel ควรรู้ว่า Configuration ใดต้อง Backup

เช่น

```text
/etc/cloudflared/config.yml
```
และควรมี Record ของ

```text
Tunnel Name
Hostnames
Ingress Mapping
```
แต่ Credential Backup ต้องจัดการอย่างปลอดภัย

เรื่อง Backup และ Restore จะต่อใน

```text
LAB 26
```

---

## 25.79 แบบฝึกหัดที่ 1 --- Local Service Verification

ตรวจ

```text
nginx
Node-RED
SSH
```
ใช้

```bash
systemctl status
```
และ

```text
curl
```
บันทึกผลว่าแต่ละ Service ใช้ Port ใด

---

## 25.80 แบบฝึกหัดที่ 2 --- Create Tunnel

สร้าง Named Tunnel

```bash
cloudflared tunnel create ...
```
บันทึก

```text
Tunnel Name
Tunnel ID
```
ห้ามส่ง Credential File ในรายงาน

---

## 25.81 แบบฝึกหัดที่ 3 --- Web Tunnel

สร้าง

```text
HOSTNAME
    ↓
localhost:80
```
ทดสอบจาก Browser ภายนอก

ต้องเห็น nginx

---

## 25.82 แบบฝึกหัดที่ 4 --- Node-RED Tunnel

สร้าง

```text
HOSTNAME
    ↓
localhost:1880
```
ทดสอบ Node-RED ผ่าน HTTPS

ต้องมี Authentication ที่เหมาะสมก่อนเปิดใช้งานจาก Internet

---

## 25.83 แบบฝึกหัดที่ 5 --- SSH Tunnel

สร้าง

```text
ssh-HOSTNAME
    ↓
localhost:22
```
ตั้งค่า

```text
ProxyCommand
```
บน Client

แล้วใช้

```bash
ssh HOST_ALIAS
```
เพื่อเข้า Raspberry Pi

---

## 25.84 แบบฝึกหัดที่ 6 --- systemd

ติดตั้ง

```text
cloudflared
```
เป็น Service

ตรวจ

```bash
systemctl status cloudflared
```
ต้องเป็น

```text
active (running)
```

---

## 25.85 แบบฝึกหัดที่ 7 --- Reboot Recovery

ใช้

```bash
sudo reboot
```
หลัง Boot

ตรวจ

```text
nginx
Node-RED
SSH
cloudflared
```
จากนั้นทดสอบ Public Hostname อีกครั้ง

โดยไม่ Run cloudflared ด้วยมือ

---

## 25.86 แบบฝึกหัดที่ 8 --- Origin Failure

หยุด Node-RED

```bash
sudo systemctl stop nodered
```
ตรวจว่า

```text
Tunnel
```
ยังทำงาน

แต่

```text
Node-RED Service
```
เข้าไม่ได้

จากนั้น

```bash
sudo systemctl start nodered
```
และตรวจ Recovery

---

## 25.87 แบบฝึกหัดที่ 9 --- Internet Failure

ตัด Internet ของ Raspberry Pi ชั่วคราวโดยไม่ทำลาย Local LAN ที่ใช้กับ IoT Nodes หากสภาพแวดล้อม LAB รองรับ

ตรวจว่า

```text
Remote Access
    → unavailable
```
แต่

```text
Local MQTT
Local Node-RED
Local SQLite
Local Control
```
ยังทำงาน

เมื่อ Internet กลับมา

ตรวจว่า

```text
Tunnel reconnects
```

---

## 25.88 แบบฝึกหัดที่ 10 --- Compare Architectures

ให้อธิบายความแตกต่าง

### Port Forwarding

```text
Internet
   ↓
Router
   ↓
Forward Port
   ↓
Raspberry Pi
```
### Cloudflare Tunnel

```text
Raspberry Pi
   ↓
Outbound Tunnel
   ↓
Cloudflare
   ↑
Remote User
```
อธิบายว่าทำไม Cloudflare Tunnel จึงเหมาะกับ Network ที่อยู่หลัง CGNAT หรือ Network ที่ผู้ใช้ไม่สามารถตั้ง Port Forwarding ได้

---

## 25.89 งานส่ง LAB 25

นักศึกษาส่ง

1. Architecture Diagram

```text
   Remote User
        ↓
   Cloudflare
        ↓
   Tunnel
        ↓
   Raspberry Pi
```
2. Tunnel Name

3. Tunnel ID

   สามารถแสดง ID ได้ แต่ห้ามส่ง Credential Secret

4. `config.yml`

   โดยลบข้อมูล Secret หากมี

5. Screenshot

```bash
   cloudflared tunnel list
```
6. Screenshot

```bash
   cloudflared tunnel ingress validate
```
7. Screenshot Web Service ผ่าน HTTPS

8. Screenshot Node-RED ผ่าน HTTPS

9. Screenshot SSH ผ่าน Tunnel

10. SSH Client Configuration

```text
   Host
   HostName
   User
   ProxyCommand
```
11. Screenshot

```bash
   systemctl status cloudflared
```
12. Screenshot

```bash
   systemctl is-enabled cloudflared
```
13. Screenshotหลัง Reboot ว่า Tunnel กลับมาทำงาน

14. Screenshot Node-RED Origin Failure Test

15. Screenshot Node-RED Recovery

16. อธิบาย

```text
   NAT
```
17. อธิบาย

```text
   CGNAT
```
18. อธิบาย

```text
   Outbound Tunnel
```
19. อธิบายความแตกต่าง

```text
   Port Forwarding
         vs
   Cloudflare Tunnel
```
20. อธิบายความแตกต่าง

```text
   Tunnel
         vs
   Application Authentication
```
21. อธิบายว่าเหตุใด

```text
   Internet Down
```
   ไม่ควรทำให้ Local IoT System หยุดทำงาน

22. ห้ามส่ง

```text
   Tunnel Credentials
   MQTT Password
   SSH Private Key
```

---

## 25.90 Checklist ก่อนถือว่าผ่าน LAB

```text
[ ] Local nginx ทำงาน

[ ] Local Node-RED ทำงาน

[ ] Local SSH ทำงาน

[ ] cloudflared ติดตั้งแล้ว

[ ] Login Cloudflare สำเร็จ

[ ] Named Tunnel ถูกสร้าง

[ ] config.yml ถูกต้อง

[ ] Ingress Validation ผ่าน

[ ] DNS Route ถูกสร้าง

[ ] Web ผ่าน HTTPS ได้

[ ] Node-RED ผ่าน HTTPS ได้

[ ] Node-RED มี Authentication

[ ] SSH ผ่าน cloudflared ได้

[ ] cloudflared ทำงานเป็น systemd Service

[ ] cloudflared Enable ตอน Boot

[ ] Reboot แล้ว Tunnel กลับมา

[ ] Origin Failure ถูกตรวจพบ

[ ] Origin Recovery ทำงาน

[ ] Internet Failure ไม่หยุด Local IoT

[ ] Credential ไม่ถูกเผยแพร่
```
ถ้าผ่านทั้งหมด

Raspberry Pi Gateway มีความสามารถ

```text
Remote Monitoring
       +
Remote Administration
```
โดยไม่ต้องเปิด Inbound Port จาก Router โดยตรง

---

## 25.91 สิ่งที่นักศึกษาต้องเข้าใจ

Cloudflare Tunnel ไม่ใช่เพียงวิธี

```text
"เปิดเว็บ Raspberry Pi จากข้างนอก"
```
แต่เป็นส่วนหนึ่งของ Architecture

ก่อน LAB 25

```text
IoT System
    │
    ▼
  Local LAN
```
หลัง LAB 25

```text
Local IoT System
    │
    ├── Local Operation
    │
    └── Controlled Remote Access
             │
             ▼
         Cloudflare
             │
             ▼
         Remote User
```
โดยยังรักษาหลักว่า

```text
Local Operation
```
ไม่ควรขึ้นอยู่กับ

```text
Remote Access
```

---

## 25.92 ความสัมพันธ์ LAB 23–25

LAB 23

```text
Internet Failure
      ↓
Store Locally
      ↓
Forward Later
```
LAB 24

```text
MQTT Client
      ↓
Authentication
      ↓
ACL
```
LAB 25

```text
Remote User
      ↓
Cloudflare
      ↓
Raspberry Pi Service
```
จึงครอบคลุมคนละปัญหา

```text
LAB 23 = Data Continuity

LAB 24 = MQTT Access Control

LAB 25 = Remote Connectivity
```

---

## 25.93 ความสัมพันธ์ของ LAB 20–25

```text
LAB 20
Python MQTT Application
      ↓
Programmable Gateway

      ↓

LAB 21
systemd
      ↓
Autonomous Service

      ↓

LAB 22
BLE / UDP / MQTT
      ↓
Multi-protocol Gateway

      ↓

LAB 23
SQLite Queue
      ↓
Offline Store-and-Forward

      ↓

LAB 24
MQTT Authentication + ACL
      ↓
Controlled MQTT Access

      ↓

LAB 25
Cloudflare Tunnel
      ↓
Remote Access
```
ผลคือ Raspberry Pi เริ่มทำหน้าที่เป็น

```text
Autonomous
Multi-protocol
Offline-capable
Access-controlled
Remotely manageable
```
IoT Gateway

---

## 25.94 Architecture หลัง LAB 25

```text
                     REMOTE USER
                          │
                          │ HTTPS / SSH
                          ▼
                   ┌──────────────┐
                   │ Cloudflare   │
                   │ Access/Tunnel│
                   └──────┬───────┘
                          │
                          │ Outbound Tunnel
                          ▼
┌──────────────────────────────────────────────┐
│             RASPBERRY PI GATEWAY             │
│                                              │
│  cloudflared                                 │
│      │                                       │
│      ├── nginx :80                           │
│      ├── Node-RED :1880                      │
│      └── SSH :22                             │
│                                              │
│  Mosquitto                                   │
│      ├── Authentication                      │
│      └── ACL                                 │
│                                              │
│  Python Gateway                              │
│      ├── MQTT                                │
│      ├── BLE                                 │
│      └── UDP                                 │
│                                              │
│  SQLite                                      │
│      └── Store-and-Forward                   │
│                                              │
└───────────────────┬──────────────────────────┘
                    │
                    │ LAN
                    ▼
           ┌──────────────────┐
           │    IoT Nodes     │
           │                  │
           │ ESP32-001        │
           │ ESP32-002        │
           │ ESP32-003        │
           │ BLE Sensors      │
           └──────────────────┘
```
เมื่อ Internet ใช้งานได้

```text
Local Operation
      +
Remote Access
      +
Remote Forwarding
```
เมื่อ Internet ขาด

```text
Local Operation
      +
SQLite Buffer
```
ยังทำงาน

เมื่อ Internet กลับ

```text
Tunnel Reconnect
      +
Store-and-Forward Recovery
```
ทำงานต่อ

---

## 25.95 จุดสำคัญที่สุดของ LAB

Cloudflare Tunnel ช่วยแก้ปัญหา

```text
Remote Reachability
```
ไม่ใช่แก้ทุกปัญหาด้าน Security

จึงต้องแยก Layer ให้ชัดเจน

```text
Cloudflare Tunnel
    → Connectivity

Cloudflare Access
    → User Access Policy

Node-RED Authentication
    → Application Access

SSH Key
    → SSH Authentication

MQTT Username/Password
    → MQTT Authentication

MQTT ACL
    → MQTT Authorization
```
การมี Tunnel ไม่ได้หมายความว่า

```text
ทุก Service ควรถูกเปิดออก Internet
```
หลักที่ควรใช้คือ

```text
Expose Only What Is Required
         +
   Least Privilege
         +
   Defense in Depth
```

---

## 25.96 แนวคิดระบบหลัง LAB 25

ตอนนี้ IoT Gateway สามารถ

```text
Acquire
   ↓
Communicate
   ↓
Process
   ↓
Store
   ↓
Analyze
   ↓
Decide
   ↓
Control
   ↓
Detect Device Failure
   ↓
Validate Data
   ↓
Translate Protocols
   ↓
Operate Offline
   ↓
Authenticate Clients
   ↓
Authorize Topics
   ↓
Provide Remote Access
```
แต่ยังมีคำถามสำคัญอีกข้อ

```text
"ถ้า Raspberry Pi หรือ SD Card มีปัญหา
เราจะสร้างระบบกลับมาได้อย่างไร?"
```
นี่คือหัวข้อถัดไป

## LAB 26 --- Backup & Recovery

LAB 26 จะ Backup สิ่งสำคัญ เช่น

```bash
Node-RED Flows
Mosquitto Configuration
MQTT Password File
MQTT ACL
SQLite Database
Python Gateway
systemd Services
cloudflared Configuration
```
จากนั้นจะไม่จบเพียง

```text
Backup สำเร็จ
```
แต่ต้องทดสอบ

```text
Restore
```
เพื่อพิสูจน์ว่า Backup ใช้งานได้จริง

แนวคิดสำคัญของ LAB 26 คือ

```text
Backup
   ≠
Recovery
```
จนกว่าจะสามารถ

```text
Restore
   ↓
Start Services
   ↓
Verify System
```
ได้สำเร็จ
