# Node-RED บน Raspberry Pi และเปิดใช้งานจากภายนอกผ่าน Cloudflare Tunnel

> [!info] แก้ไขล่าสุด
> 2026-10-01 02:17:17 +07

## ความสัมพันธ์กับ Lab อื่น

Lab นี้ต่อยอดจาก [[Cloudflare Tunnel Setup]] โดยเพิ่ม Node-RED เป็นอีก origin service
ภายใต้ Tunnel `PI_HOSTNAME` เดียวกัน

สรุปการเปิด Node-RED ที่ติดตั้งไว้แล้วบน Raspberry Pi จากภายนอก
เครื่อง: PI_HOSTNAME
วิธี Remote Access: Cloudflare Tunnel

## เป้าหมาย

```text
Internet
   │
   │ HTTPS
   ▼
node-red.example.com
   │
   │ Cloudflare Tunnel
   ▼
Raspberry Pi: PI_HOSTNAME
   │
   └── Node-RED :1880
```

ไม่ต้องเปิด Port 1880 ที่ Router
ไม่ต้องมี Public IPv4


==================================================
1. ตรวจสอบ Node-RED ก่อนเข้า Cloudflare
==================================================

ไฟล์นี้ถือว่า Node-RED ถูกติดตั้งและตั้งค่าไว้แล้ว ขั้นนี้ตรวจเพียงว่า origin
พร้อมสำหรับส่งผ่าน Cloudflare Tunnel

ตรวจ service:

```bash
systemctl status nodered.service --no-pager
```

ควรพบ:

Active: active (running)


ตรวจว่า Node-RED เปิด port `1880`:

```bash
ss -lntp | grep 1880
```

ควรพบประมาณ:

0.0.0.0:1880


ทดสอบจาก Raspberry Pi:

```bash
curl -I http://localhost:1880
```

ควรได้:

HTTP/1.1 200 OK


ถ้ายังไม่ได้ติดตั้ง Node-RED หรือยังไม่ได้ตั้งค่า User Security ให้กลับไปทำที่
[[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]] ก่อน

ทดสอบจากเครื่องใน LAN:

หา IP ของ Raspberry Pi:

```bash
hostname -I
```

สมมติได้:

PI_IP

เครื่องอื่นใน LAN เปิด:

http://PI_IP:1880

จะเข้าสู่หน้า Node-RED

Login ด้วย Username/Password ที่กำหนดไว้


==================================================
2. การเปิด Node-RED จาก Internet
==================================================

ในระบบ PI_HOSTNAME ใช้ Cloudflare Tunnel

มี Tunnel:

Name:
PI_HOSTNAME

Tunnel UUID:

TUNNEL_UUID


==================================================
3. สร้าง DNS สำหรับ Node-RED
==================================================

บน Raspberry Pi:

```bash
cloudflared tunnel route dns PI_HOSTNAME node-red.example.com
```

แนวคิดคือ:

```text
node-red.example.com
        │
        ▼
Cloudflare
        │
        ▼
Tunnel: PI_HOSTNAME
```


==================================================
4. เพิ่ม Node-RED ใน Cloudflare Tunnel Config
==================================================

เปิด:

```bash
sudo nano /etc/cloudflared/config.yml
```

ตัวอย่าง configuration:

```
tunnel: TUNNEL_UUID
credentials-file: /home/PI_USER/.cloudflared/TUNNEL_UUID.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:80

  - hostname: node-red.example.com
    service: http://localhost:1880

  - hostname: ssh.example.com
    service: ssh://localhost:22

  - service: http_status:404
```


==================================================
5. ตรวจสอบ Cloudflare Tunnel Configuration
==================================================

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```

ควรได้:

OK


==================================================
6. Restart Cloudflare Tunnel
==================================================

```bash
sudo systemctl restart cloudflared
```

ตรวจสอบ:

```bash
systemctl status cloudflared --no-pager
```

ควรพบ:

Active: active (running)


==================================================
7. ป้องกัน Node-RED ด้วย Cloudflare Access
==================================================

ก่อนเปิด Editor ให้ผู้ใช้ภายนอก ต้องสร้าง Cloudflare Access application สำหรับ:

```
node-red.example.com
```

ขั้นตอนใน Cloudflare Zero Trust Dashboard:

1. ไปที่ **Access → Applications** และเพิ่ม application แบบ **Self-hosted**
2. กำหนด hostname เป็น `node-red.example.com`
3. สร้าง policy แบบ **Allow** เฉพาะ email, email domain หรือกลุ่มผู้ใช้ที่อนุญาต
4. หลีกเลี่ยง policy ที่อนุญาต `Everyone` สำหรับ Node-RED Editor
5. บันทึกแล้วทดสอบด้วย Private/Incognito Window

ผู้ใช้ต้องผ่าน Cloudflare Access ก่อน แล้วจึง Login ด้วย Node-RED User Security อีกชั้นหนึ่ง
อย่าเปิดใช้งานจาก Internet หากยังไม่มี Access policy


==================================================
8. เปิด Node-RED จาก Internet
==================================================

จาก Notebook / PC / Smartphone ที่อยู่นอก LAN
เปิด Browser ไปที่:

https://node-red.example.com

เส้นทางการเชื่อมต่อ:

```
Browser
   │
   │ HTTPS
   ▼
Cloudflare
   │
   │ Cloudflare Tunnel
   ▼
cloudflared @ PI_HOSTNAME
   │
   │ localhost:1880
   ▼
Node-RED
```


==================================================
9. ไม่ต้องทำ Port Forwarding
==================================================

วิธีนี้ไม่ต้องเปิด:

1880 → Internet

ที่ Router

ดังนั้นไม่ต้องตั้ง:

Port Forward
NAT
DDNS
Public IPv4

เพราะ Raspberry Pi เป็นฝ่ายสร้าง outbound connection ไปยัง Cloudflare


==================================================
10. ตรวจสอบ Node-RED Service
==================================================

ดูสถานะ:

```bash
systemctl status nodered.service --no-pager
```

ไฟล์นี้ใช้ตรวจว่า Node-RED พร้อมเป็น origin สำหรับ Cloudflare Tunnel เท่านั้น
การติดตั้ง, restart หรือแก้ configuration ของ Node-RED ให้ทำใน Knowledge Base ของ Node-RED


==================================================
11. ดู Log ของ Node-RED
==================================================

ดู log ล่าสุด:

```bash
journalctl -u nodered.service -n 50 --no-pager
```

ดูแบบ Real-time:

```bash
journalctl -u nodered.service -f
```


==================================================
12. ดู Log ของ Cloudflare Tunnel
==================================================

```bash
journalctl -u cloudflared -n 50 --no-pager
```

Real-time:

```bash
journalctl -u cloudflared -f
```


==================================================
13. Node-RED Security
==================================================

เนื่องจาก Node-RED Editor เปิดให้เข้าจาก Internet
ควรเปิด Authentication ของ Node-RED

ไฟล์:

/home/PI_USER/.node-red/settings.js

ระบบ PI_HOSTNAME ได้ตั้ง Node-RED User Security ไว้แล้ว:

Username: admin
Password: ********

ดังนั้นผู้ที่ผ่าน Cloudflare Access และเปิด:

https://node-red.example.com

ต้อง Login ด้วยบัญชี Node-RED อีกครั้งก่อนเข้า Editor การใช้ Access และ Node-RED
Authentication ร่วมกันเป็นการป้องกันสองชั้น ไม่ควรปิดอย่างใดอย่างหนึ่ง


==================================================
14. Architecture ปัจจุบัน
==================================================

```text
                     INTERNET
                        │
                        │ HTTPS
                        ▼
                  Cloudflare
                        │
                  Tunnel: PI_HOSTNAME
                        │
        ┌───────────────┼─────────────────┐
        │               │                 │
        ▼               ▼                 ▼
 pi.example.com   node-red-PI_HOSTNAME     ssh-PI_HOSTNAME
        │          .example.com          .example.com
        │               │                 │
        ▼               ▼                 ▼
 Web :80        Node-RED :1880       SSH :22
```


==================================================
15. จุดสำคัญสำหรับการเปิดจากภายนอก
==================================================

LAN:

http://IP-RASPBERRY-PI:1880

Internet:

https://node-red.example.com

```text
Internet
   │
   │ HTTPS
   ▼
Cloudflare Tunnel
   │
   ▼
Node-RED :1880
```

ไม่ควรเปิด Port 1880 จาก Router ออก Internet โดยตรง


==================================================
สรุปคำสั่งสำคัญ
==================================================

ตรวจ service
```bash
systemctl status nodered.service --no-pager
```

ตรวจ port
```bash
ss -lntp | grep 1880
```

ทดสอบ local
```bash
curl -I http://localhost:1880
```

สร้าง DNS route ของ Cloudflare Tunnel
```bash
cloudflared tunnel route dns PI_HOSTNAME node-red.example.com
```

แก้ Tunnel configuration
```bash
sudo nano /etc/cloudflared/config.yml
```

Validate Tunnel configuration
```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```

Restart Tunnel
```bash
sudo systemctl restart cloudflared
```

ตรวจ Tunnel
```bash
systemctl status cloudflared --no-pager
```

เปิดจากภายนอก
https://node-red.example.com
