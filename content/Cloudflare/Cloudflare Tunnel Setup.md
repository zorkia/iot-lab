# LAB — สร้าง Cloudflare Tunnel เพื่อเปิด Web Server บน Raspberry Pi จาก Internet

> [!info] แก้ไขล่าสุด
> 2026-10-01 03:00:33 +07

## ความสัมพันธ์กับ Lab อื่น

Lab นี้เป็นพื้นฐานสำหรับการเปิดบริการบน `PI_HOSTNAME` ผ่าน Internet โดยใช้ Cloudflare Tunnel

- [[SSH Cloudflare Tunnel]]
- [[Node-RED Cloudflare Tunnel]]

> [!note] รูปแบบ Tunnel ที่ใช้ใน Lab
> เอกสารชุดนี้ใช้ **Locally-managed Tunnel** โดยเก็บ ingress configuration ไว้ที่
> `/etc/cloudflared/config.yml` เพื่อให้นักศึกษาเห็นและตรวจสอบ routing ได้จาก command line
> โดยตรง ส่วน Cloudflare แนะนำ **Remotely-managed Tunnel** สำหรับระบบทั่วไปที่ต้องการ
> จัดการ configuration ผ่าน Dashboard, API หรือ Terraform
>
> เอกสารอ้างอิง: [Locally-managed tunnels](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/)

เป้าหมาย
-------
เปิด Web Server ที่มีอยู่แล้วบน Raspberry Pi ให้สามารถเข้าจาก Internet
โดยไม่ต้องใช้ Public IP, DDNS หรือ Port Forwarding

ตัวอย่างที่ใช้ใน Lab:

Domain      : example.com
Pi hostname : PI_HOSTNAME
Public URL  : https://pi.example.com
Origin type : Web service ที่ฟังอยู่บน Pi
Origin URL  : http://localhost:80

> [!info] ชื่อเหล่านี้เป็นคนละค่า
> `PI_HOSTNAME` ในช่อง **Pi hostname** คือชื่อเครื่องที่ผู้ดูแลตั้งขึ้น ส่วน Tunnel name
> และ public hostname เป็นชื่อที่กำหนดแยกกัน ใน Lab นี้ตั้งให้คล้ายกันเพื่อให้จำง่าย
> ดูคำอธิบายทั้งหมดที่
> [[00 - IoT Lab Teaching Guide - Hub#ชื่อที่ใช้ในเอกสาร|ชื่อที่ใช้ในเอกสาร]]


สถาปัตยกรรม
------------

```text
ผู้ใช้จาก Internet
       │
       │ HTTPS
       ▼
https://pi.example.com
       │
       ▼
 Cloudflare Edge
       │
       │ Cloudflare Tunnel
       │
       ▼
 cloudflared
 Raspberry Pi: PI_HOSTNAME
       │
       ▼
http://localhost:80
       │
       ▼
  Web service
       │
       ▼
Local application
```


============================================================
1. ตรวจสอบ Origin Web Service
============================================================

ไฟล์นี้ถือว่า web service ถูกติดตั้งไว้แล้ว ขั้นนี้ตรวจเพียงว่า origin ที่จะเอาเข้า
Cloudflare Tunnel ทำงานจริงบน Pi

ตรวจ service ที่ใช้จริง เช่น `nginx` หรือ service อื่น:

```bash
systemctl status <WEB-SERVICE> --no-pager
```

ทดสอบจาก Pi โดยตรง:

```bash
curl http://localhost
```

หรือถ้า origin อยู่ port อื่น ให้เปลี่ยน port ให้ตรงกับบริการจริง:

```bash
curl -I http://localhost:<PORT>
```

ถ้ายังไม่มี web service ให้ติดตั้งและตั้งค่าใน Knowledge Base หรือ Lab ของบริการนั้นก่อน
แล้วจึงกลับมาทำเฉพาะส่วน Cloudflare ในไฟล์นี้


============================================================
2. ติดตั้ง cloudflared
============================================================

สร้าง directory สำหรับ key:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
```

เพิ่ม Cloudflare signing key:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
```

เพิ่ม Cloudflare repository:

```bash
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
```

ติดตั้ง:

```bash
sudo apt update
sudo apt install cloudflared -y
```

ตรวจสอบ:

```bash
cloudflared --version
```

ตัวอย่างผลที่ได้:

```bash
cloudflared version 2026.9.3
```


============================================================
3. ทดลอง Quick Tunnel
============================================================

ขั้นนี้ยังไม่ต้องมี Domain หรือ Cloudflare Account

รัน:

```bash
cloudflared tunnel --url http://localhost:80
```

Cloudflare จะสร้าง URL ชั่วคราว เช่น:

https://xxxxx.trycloudflare.com

นำ URL ไปเปิดจาก Internet เช่น โทรศัพท์ที่ใช้ 4G/5G

ถ้าเห็นหน้า Web ของ Pi แสดงว่า

```text
Pi
 │
 └── Internet
       │
       └── Cloudflare Tunnel
```

สามารถทำงานผ่านเครือข่ายปัจจุบันได้


ข้อควรทราบ:

Quick Tunnel
- URL ถูกสุ่ม
- URL ไม่ถาวร
- เมื่อหยุด cloudflared URL จะหยุดทำงาน
- เหมาะสำหรับทดลองเท่านั้น

หยุดด้วย:

```bash
Ctrl + C
```


============================================================
4. Login Cloudflare
============================================================

ขั้นต่อไปเป็นการสร้าง Named Tunnel แบบถาวร

ต้องมี:

- Cloudflare Account
- Domain ที่จัดการ DNS ด้วย Cloudflare

Login:

```bash
cloudflared tunnel login
```

คำสั่งจะแสดง URL

เปิด URL ด้วย Browser
→ Login Cloudflare
→ เลือก Domain
→ Authorize

จากนั้นตรวจสอบ:

```bash
ls -la ~/.cloudflared/
```

ควรพบ:

cert.pem

ตัวอย่าง:

~/.cloudflared/cert.pem

สำคัญ:
cert.pem เป็น credential
ห้ามแจกหรือเผยแพร่


============================================================
5. สร้าง Named Tunnel
============================================================

ตัวอย่างสร้าง Tunnel ชื่อ:

PI_HOSTNAME

คำสั่ง:

```bash
cloudflared tunnel create PI_HOSTNAME
```

ตัวอย่างผล:

Created tunnel PI_HOSTNAME with id

TUNNEL_UUID

และจะสร้าง credentials file:

~/.cloudflared/TUNNEL_UUID.json

ไฟล์ .json นี้เป็น credential เช่นกัน
ห้ามเผยแพร่


============================================================
6. ตรวจสอบ Tunnel
============================================================

```bash
cloudflared tunnel list
```

ตัวอย่าง:

ID                                    NAME
TUNNEL_UUID PI_HOSTNAME


ดูรายละเอียด:

```bash
cloudflared tunnel info PI_HOSTNAME
```


============================================================
7. สร้าง DNS สำหรับ Tunnel
============================================================

ต้องการ:

pi.example.com

ให้ชี้ไปยัง Tunnel ชื่อ PI_HOSTNAME

ใช้:

```bash
cloudflared tunnel route dns PI_HOSTNAME pi.example.com
```

ถ้าสำเร็จจะพบข้อความประมาณ:

Added CNAME pi.example.com which will route to this tunnel


โครงสร้าง:

```text

pi.example.com
       │
       ▼
Cloudflare DNS
       │
       ▼
Tunnel: PI_HOSTNAME

```


============================================================
8. สร้าง Cloudflare Tunnel Configuration
============================================================

ระบบ `PI_HOSTNAME` กำหนดให้ systemd ใช้ config กลางที่:

```
/etc/cloudflared/config.yml
```

สร้าง directory และเปิดไฟล์:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

ใส่:

```yaml
tunnel: TUNNEL_UUID
credentials-file: /home/PI_USER/.cloudflared/TUNNEL_UUID.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:80

  - service: http_status:404
```


หมายเหตุ:

Tunnel UUID ของแต่ละเครื่องไม่เหมือนกัน
ต้องใช้ UUID ที่ได้จาก:

```bash
cloudflared tunnel list
```


============================================================
9. ตรวจสอบ Configuration
============================================================

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```

ถ้าถูกต้องควรได้:

```
Validating rules from /etc/cloudflared/config.yml
OK
```

ตรวจว่า hostname จับคู่กับ ingress rule ที่ถูกต้อง:

```bash
cloudflared --config /etc/cloudflared/config.yml \
  tunnel ingress rule https://pi.example.com
```


============================================================
10. ทดลองรัน Named Tunnel
============================================================

รัน:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel run PI_HOSTNAME
```

ถ้าทำงานสำเร็จจะพบข้อความลักษณะ:

```
Registered tunnel connection
```

จากนั้นเปิด:

https://pi.example.com

ถ้าเห็นหน้า web service แสดงว่าเส้นทางทั้งหมดทำงานแล้ว:

```text
Internet
   │
   ▼
pi.example.com
   │
   ▼
Cloudflare
   │
   ▼
Tunnel: PI_HOSTNAME
   │
   ▼
cloudflared
   │
   ▼
localhost:80
   │
   ▼
Web service
```


============================================================
11. หยุดการทดสอบ Foreground
============================================================

กด:

```bash
Ctrl + C
```

เมื่อหยุดคำสั่งนี้ Tunnel จะหยุด

ดังนั้นสำหรับใช้งานจริงต้องทำเป็น systemd service


============================================================
12. ติดตั้ง cloudflared เป็น Service
============================================================

ติดตั้ง service โดยระบุ config ที่ระบบจะใช้งานจริง:

```bash
sudo cloudflared \
  --config /etc/cloudflared/config.yml \
  service install
```


จากนั้นเปิด service:

```bash
sudo systemctl enable --now cloudflared
```


============================================================
13. ตรวจสอบ Service
============================================================

```bash
systemctl status cloudflared --no-pager
```

ควรพบ:

Active: active (running)

ตรวจคำสั่งที่ systemd ใช้เริ่ม service:

```bash
systemctl cat cloudflared
```

ใน `ExecStart` ต้องพบ:

```
--config /etc/cloudflared/config.yml
```

หากไม่พบ path นี้ อย่าแก้ config ต่อจนกว่าจะยืนยันว่า service ใช้ไฟล์ใด


ตรวจ Tunnel:

```bash
cloudflared tunnel info PI_HOSTNAME
```


============================================================
14. ทดสอบหลังติดตั้ง Service
============================================================

โดยไม่ต้องรัน:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel run PI_HOSTNAME
```

ให้เปิด:

https://pi.example.com

ถ้าเข้าได้ แสดงว่า systemd service ทำงานถูกต้อง


============================================================
15. ทดสอบหลัง Reboot
============================================================

```bash
sudo reboot
```

หลัง Pi boot เสร็จ ไม่ต้องรัน cloudflared ด้วยตนเอง

ทดลองเปิด:

https://pi.example.com

ถ้าเข้าได้ แสดงว่าระบบทำงานอัตโนมัติสมบูรณ์


============================================================
16. ตรวจสอบ Service หลัง Reboot
============================================================

```bash
systemctl status <WEB-SERVICE> --no-pager
```

```bash
systemctl status cloudflared --no-pager
```


ตรวจ process:

```bash
ps aux | grep cloudflared
```


============================================================
17. ตรวจสอบ Log
============================================================

ดู log ของ cloudflared:

```bash
journalctl -u cloudflared
```

ดูแบบล่าสุด:

```bash
journalctl -u cloudflared -n 50
```

ดูแบบ Real-time:

```bash
journalctl -u cloudflared -f
```


============================================================
18. คำสั่งสำคัญที่ควรรู้
============================================================

ตรวจ version:

```bash
cloudflared --version
```


ดู Tunnel:

```bash
cloudflared tunnel list
```


ดูรายละเอียด Tunnel:

```bash
cloudflared tunnel info PI_HOSTNAME
```


ตรวจ config:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```


รัน Tunnel ด้วยตนเอง:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel run PI_HOSTNAME
```


ตรวจ service:

```bash
systemctl status cloudflared
```


Restart:

```bash
sudo systemctl restart cloudflared
```


Stop:

```bash
sudo systemctl stop cloudflared
```


Start:

```bash
sudo systemctl start cloudflared
```


ดู log:

```bash
journalctl -u cloudflared -f
```


============================================================
20. ไฟล์สำคัญ
============================================================

Cloudflare certificate:

~/.cloudflared/cert.pem


Tunnel credential:

`~/.cloudflared/TUNNEL_UUID.json`


Tunnel configuration:

/etc/cloudflared/config.yml

============================================================
21. สิ่งที่ Cloudflare Tunnel ไม่ต้องใช้
============================================================

ไม่ต้องมี:

Public IPv4
Fixed IP
Dynamic DNS
Port Forwarding
สิทธิ์ตั้งค่า Router
Inbound Port จาก Internet

เพราะ cloudflared เป็นฝ่ายสร้าง connection ออกจาก Pi:

```text
Raspberry Pi
     │
     │ Outbound Tunnel
     ▼
 Cloudflare
     ▲
     │ HTTPS
     │
 Internet User
```


ดังนั้นสามารถใช้ได้แม้ Pi อยู่หลัง:

NAT
CGNAT
4G/5G Router
Wi-Fi มหาวิทยาลัย

ตราบใดที่เครือข่ายนั้นอนุญาตให้ cloudflared เชื่อมต่อออกไปยัง Cloudflare


============================================================
22. Quick Tunnel vs Named Tunnel
============================================================

Quick Tunnel:

```
cloudflared tunnel --url http://localhost:80
```

URL:

xxxxx.trycloudflare.com

เหมาะสำหรับ:
- ทดลอง
- ตรวจสอบ Network
- Demo ชั่วคราว


Named Tunnel:

pi.example.com

เหมาะสำหรับ:
- Lab จริง
- Server ถาวร
- Dashboard
- IoT Web Application
- Production/Test Server


## 23. Architecture สุดท้ายของ Lab

เส้นทางการเชื่อมต่อสุดท้าย:

```text
Internet user
      │
      │ HTTPS
      ▼
pi.example.com
      │
      ▼
Cloudflare Edge
      │
      │ Cloudflare Tunnel: PI_HOSTNAME
      ▼
cloudflared on Raspberry Pi
      │
      ▼
http://localhost:80
      │
      ▼
Web service / Local application
```


## 24. สำหรับ Pi หลายเครื่อง

สามารถใช้ Domain เดียว แล้วแยก subdomain:

| Hostname | Tunnel | Raspberry Pi |
|---|---|---|
| `pi.example.com` | `PI_HOSTNAME` | Pi `PI_HOSTNAME` |
| `kata.example.com` | `kata` | Pi `kata` |
| `karon.example.com` | `karon` | Pi `karon` |
| `kathu.example.com` | `kathu` | Pi `kathu` |

ตัวอย่าง:

`Internet → Cloudflare → Hostname → Tunnel → Raspberry Pi`


แต่ละ Pi สามารถอยู่คนละ Network ได้

เช่น:

PI_HOSTNAME → University Wi-Fi
kata  → University LAN
karon → 4G Router
kathu → Home Internet

ไม่จำเป็นต้องอยู่ LAN เดียวกัน


============================================================
ข้อควรระวังด้าน Security
============================================================

ห้ามเผยแพร่:

~/.cloudflared/cert.pem

และ

`~/.cloudflared/TUNNEL_UUID.json`

อย่านำไฟล์เหล่านี้ขึ้น:

GitHub
Google Drive Public
Web Server
หรือส่งให้นักศึกษากลุ่มอื่น

Cloudflare Tunnel ทำให้ Web Service เข้าถึงจาก Internet ได้
ดังนั้น Application ที่มีความสามารถควบคุมอุปกรณ์หรือข้อมูลสำคัญ
ควรเพิ่ม Authentication/Cloudflare Access

โดยเฉพาะ:

Node-RED Editor
Admin Page
Device Control
MQTT Management Interface

ไม่ควรเปิด Public โดยไม่มี Authentication
