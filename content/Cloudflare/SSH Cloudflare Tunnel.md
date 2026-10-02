
# SSH จาก Internet เข้า Raspberry Pi ผ่าน Cloudflare Tunnel

> [!info] แก้ไขล่าสุด
> 2026-10-01 02:17:17 +07

## ความสัมพันธ์กับ Lab อื่น

Lab นี้ต่อยอดจาก [[Cloudflare Tunnel Setup]] โดยเพิ่ม SSH เป็นอีก service ภายใต้ Tunnel `PI_HOSTNAME` เดียวกัน

ตัวอย่างระบบ
------------
Domain          : example.com
Web             : pi.example.com
SSH             : ssh.example.com
Raspberry Pi    : PI_HOSTNAME
Linux user      : PI_USER
SSH Server      : localhost:22
Tunnel          : PI_HOSTNAME


============================================================
1. โครงสร้างการเชื่อมต่อ
============================================================

```text
เครื่อง Client ภายนอก
        │
        │ SSH
        ▼
OpenSSH Client
        │
        │ ProxyCommand
        ▼
cloudflared (Client)
        │
        │ Internet
        ▼
    Cloudflare
        │
        │ Cloudflare Tunnel
        ▼
cloudflared (Raspberry Pi)
        │
        ▼
   localhost:22
        │
        ▼
      sshd
        │
        ▼
   PI_USER@PI_HOSTNAME
```


ข้อดี:

- ไม่ต้องมี Public IPv4
- ใช้งานได้หลัง NAT / CGNAT
- ไม่ต้อง Port Forward TCP/22 ที่ Router
- Pi กับ Client ไม่ต้องอยู่ Network เดียวกัน
- ใช้ชื่อ Domain แทน IP
- Tunnel เป็นการเชื่อมต่อออกจาก Pi ไปยัง Cloudflare


============================================================
2. ตรวจสอบ SSH Server บน Raspberry Pi
============================================================

ไฟล์นี้ถือว่า SSH server บน Raspberry Pi ถูกเตรียมไว้แล้ว ขั้นนี้ตรวจเพียงว่า
origin สำหรับ Cloudflare Tunnel พร้อมใช้งาน

ตรวจสอบ:

```bash
systemctl status ssh --no-pager
```

ควรพบ:

Active: active (running)

และ:

Server listening on 0.0.0.0 port 22


ทดสอบจาก Pi:

```bash
ssh PI_USER@localhost
```

ออกจาก SSH:

```
exit
```

ถ้า SSH server ยังไม่ทำงาน ให้กลับไปตั้งค่าในส่วน Raspberry Pi/ระบบปฏิบัติการก่อน
แล้วจึงกลับมาทำเฉพาะ Cloudflare Tunnel ในไฟล์นี้


============================================================
3. ตรวจสอบ Cloudflare Tunnel
============================================================

ดู Tunnel:

```bash
cloudflared tunnel list
```

ตัวอย่าง:

NAME
PI_HOSTNAME


ตรวจสอบ cloudflared service:

```bash
systemctl status cloudflared --no-pager
```

ควรพบ:

Active: active (running)

และมีข้อความประมาณ:

Registered tunnel connection


============================================================
4. สร้าง Subdomain สำหรับ SSH
============================================================

ไม่ควรใช้:

pi.example.com

เพราะเราใช้ hostname นี้กับ Web Server อยู่แล้ว:

```text
pi.example.com
       ↓
http://localhost:80
```


สร้าง hostname แยกสำหรับ SSH:

```bash
ssh.example.com
```


ใช้ Tunnel PI_HOSTNAME ตัวเดิม:

```bash
cloudflared tunnel route dns PI_HOSTNAME ssh.example.com
```


ควรได้ข้อความประมาณ:

Added CNAME ssh.example.com which will route to this tunnel


ดังนั้นไม่จำเป็นต้องสร้าง Tunnel ใหม่


============================================================
5. กำหนด SSH Service ใน Cloudflare Tunnel
============================================================

ถ้า cloudflared ทำงานเป็น systemd service ให้ตรวจสอบก่อนว่า
service ใช้ config ตัวไหน:

```bash
systemctl status cloudflared --no-pager
```

ของระบบตัวอย่างนี้พบว่าใช้:

--config /etc/cloudflared/config.yml


ดังนั้นแก้:

```bash
sudo nano /etc/cloudflared/config.yml
```


ตัวอย่าง:

tunnel: TUNNEL_UUID
credentials-file: /home/PI_USER/.cloudflared/TUNNEL_UUID.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:80

  - hostname: ssh.example.com
    service: ssh://localhost:22

  - service: http_status:404


ความหมาย:

```text
pi.example.com
      ↓
http://localhost:80
      ↓
Web service
```


```text
ssh.example.com
      ↓
ssh://localhost:22
      ↓
OpenSSH Server
```


============================================================
6. ตรวจสอบ Tunnel Configuration
============================================================

ใช้ config ตัวเดียวกับที่ systemd ใช้งานจริง:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```


ถ้าถูกต้องควรได้:

OK


============================================================
7. Restart Cloudflare Tunnel
============================================================

```bash
sudo systemctl restart cloudflared
```


ตรวจสอบ:

```bash
systemctl status cloudflared --no-pager
```


ควรพบ:

Active: active (running)

และ:

Registered tunnel connection


ตอนนี้ฝั่ง Raspberry Pi พร้อมแล้ว:

```text
                    Cloudflare
                        │
                 Tunnel: PI_HOSTNAME
                  /           \
                 /             \
pi.example.com                  ssh.example.com
      │                                │
      ▼                                ▼
 Web :80                            SSH :22
       \                              /
        └───────── Pi PI_HOSTNAME ─────────┘
```


============================================================
8. ป้องกัน SSH ด้วย Cloudflare Access
============================================================

ก่อนให้นักศึกษาหรือผู้ดูแลเชื่อมต่อจาก Internet ต้องสร้าง Cloudflare Access
application สำหรับ:

```
ssh.example.com
```

ขั้นตอนใน Cloudflare Zero Trust Dashboard:

1. ไปที่ **Access → Applications** และเพิ่ม application แบบ **Self-hosted**
2. กำหนด hostname เป็น `ssh.example.com`
3. สร้าง policy แบบ **Allow** เฉพาะ email, email domain หรือกลุ่มผู้ใช้ที่อนุญาต
4. หลีกเลี่ยง policy ที่อนุญาต `Everyone`
5. ทดสอบ policy ก่อนแจก SSH configuration ให้ผู้ใช้

เมื่อใช้ `cloudflared access ssh` ระบบจะเปิด Browser ให้ยืนยันตัวตนกับ Cloudflare Access
ก่อนส่งต่อการเชื่อมต่อไปยัง `sshd` จากนั้นผู้ใช้ยังต้องผ่าน SSH key หรือรหัสผ่านของ Linux
อย่าดำเนินการทดสอบจาก Internet หากยังไม่มี Access policy


============================================================
9. ฝั่ง Client ต้องมี cloudflared
============================================================

SSH ที่ Publish ผ่าน Cloudflare Tunnel แบบนี้
ไม่ได้เชื่อม TCP/22 ของ Pi จาก Internet โดยตรง

ดังนั้น Client ใช้:

```
OpenSSH
   +
cloudflared
```

โดย cloudflared ทำหน้าที่เป็น Proxy ให้ SSH


============================================================
10. ติดตั้ง cloudflared บน macOS
============================================================

ถ้ามี Homebrew:

```bash
brew install cloudflared
```


ตรวจสอบ:

```bash
cloudflared --version
```


ดูตำแหน่ง:

```bash
which cloudflared
```


Mac Apple Silicon โดยทั่วไปจะได้:

/opt/homebrew/bin/cloudflared


============================================================
11. ทดลอง SSH จาก macOS
============================================================

ทดสอบโดยยังไม่แก้ ~/.ssh/config:

```bash
ssh \
  -o ProxyCommand="/opt/homebrew/bin/cloudflared access ssh --hostname ssh.example.com" \
  PI_USER@ssh.example.com
```


คำสั่งจะเปิด Browser เพื่อ Login ผ่าน Cloudflare Access ก่อน เมื่อผ่าน policy แล้ว
ครั้งแรกที่เชื่อมต่อ SSH อาจพบ:

The authenticity of host 'ssh.example.com' can't be established.

ตรวจสอบ fingerprint แล้วตอบ:

yes


จากนั้น:

PI_USER@ssh.example.com's password:


ใส่ password ของ user PI_USER บน Raspberry Pi


ถ้าสำเร็จจะเข้าสู่:

PI_USER@PI_HOSTNAME:~ $


============================================================
12. ทำให้คำสั่งบน macOS สั้นลง
============================================================

ไม่ควรต้องพิมพ์คำสั่งยาวทุกครั้ง

สร้าง/แก้:

```bash
nano ~/.ssh/config
```


เพิ่ม:

```sshconfig
Host PI_HOSTNAME
    HostName ssh.example.com
    User PI_USER
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h
```


จากนั้นใช้งานเพียง:

```bash
ssh PI_HOSTNAME
```


แทน:

```bash
ssh \
  -o ProxyCommand="/opt/homebrew/bin/cloudflared access ssh --hostname ssh.example.com" \
  PI_USER@ssh.example.com
```


============================================================
13. การทำงานของ "ssh PI_HOSTNAME"
============================================================

เมื่อสั่ง:

```bash
ssh PI_HOSTNAME
```


OpenSSH อ่าน:

```
~/.ssh/config
```


แล้วแปลงเป็น:

```
HostName = ssh.example.com
User     = PI_USER
```


จากนั้นเรียก:

```bash
cloudflared access ssh --hostname ssh.example.com
```


เส้นทางจึงเป็น:

```text
ssh PI_HOSTNAME
    │
    ▼
OpenSSH
    │
    ▼
cloudflared
    │
    ▼
ssh.example.com
    │
    ▼
Cloudflare
    │
    ▼
Tunnel PI_HOSTNAME
    │
    ▼
localhost:22
    │
    ▼
sshd
    │
    ▼
PI_USER@PI_HOSTNAME
```


============================================================
14. ใช้จาก Windows
============================================================

Windows ใช้หลักการเดียวกัน:

```
Windows OpenSSH
       +
cloudflared
```


ติดตั้ง cloudflared จาก PowerShell:

```bash
winget install --id Cloudflare.cloudflared
```


ตรวจสอบ:

```bash
cloudflared --version
```

```bash
ssh -V
```


สร้าง/แก้ไฟล์:

```
C:\Users\<username>\.ssh\config
```


ตัวอย่าง:

```sshconfig
Host PI_HOSTNAME
    HostName ssh.example.com
    User PI_USER
    ProxyCommand cloudflared access ssh --hostname %h
```


จากนั้นใช้:

```bash
ssh PI_HOSTNAME
```


============================================================
15. การใช้งานหลาย Raspberry Pi
============================================================

สามารถใช้ Domain เดียวกัน:

example.com


แล้วแยก SSH hostname:

```
ssh.example.com
ssh-kata.example.com
ssh-karon.example.com
ssh-kathu.example.com
```


แต่ละเครื่องมี Tunnel ของตัวเอง:

```text
ssh.example.com
        ↓
Tunnel PI_HOSTNAME
        ↓
Pi PI_HOSTNAME
```


```text
ssh-kata.example.com
        ↓
Tunnel kata
        ↓
Pi kata
```


```text
ssh-karon.example.com
        ↓
Tunnel karon
        ↓
Pi karon
```


```text
ssh-kathu.example.com
        ↓
Tunnel kathu
        ↓
Pi kathu
```


============================================================
16. กำหนด ~/.ssh/config สำหรับหลายเครื่อง
============================================================

ตัวอย่างบน macOS:

Host PI_HOSTNAME
    HostName ssh.example.com
    User PI_USER
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h

Host kata
    HostName ssh-kata.example.com
    User PI_USER
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h

Host karon
    HostName ssh-karon.example.com
    User PI_USER
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h

Host kathu
    HostName ssh-kathu.example.com
    User PI_USER
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h


จากนั้นใช้งานได้ง่าย:

```bash
ssh PI_HOSTNAME
```

```bash
ssh kata
```

```bash
ssh karon
```

```bash
ssh kathu
```


============================================================
17. คำสั่งตรวจสอบเมื่อ SSH ไม่ได้
============================================================

[บน Raspberry Pi]

ตรวจ SSH:

```bash
systemctl status ssh --no-pager
```


ตรวจ Port 22:

```bash
ss -lntp | grep :22
```


ตรวจ cloudflared:

```bash
systemctl status cloudflared --no-pager
```


ดู Log:

```bash
journalctl -u cloudflared -n 50 --no-pager
```


ดู Log แบบ Real-time:

```bash
journalctl -u cloudflared -f
```


ตรวจ config:

```bash
cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```


ดู Tunnel:

```bash
cloudflared tunnel list
```


ดู Tunnel PI_HOSTNAME:

```bash
cloudflared tunnel info PI_HOSTNAME
```


============================================================
18. สิ่งที่ไม่ต้องทำ
============================================================

ไม่ต้องเปิด:

TCP/22

บน Router


ไม่ต้องทำ:

Port Forwarding


ไม่ต้องมี:

Public IPv4
Static Public IP
DDNS


และไม่จำเป็นต้องใช้:

```bash
ssh PI_USER@192.168.x.x
```

เมื่อเชื่อมจาก Internet


============================================================
19. Security
============================================================

Cloudflare Tunnel ไม่ได้หมายความว่าไม่ต้องรักษาความปลอดภัย SSH

อย่างน้อยควร:

- ใช้ password ที่แข็งแรง
- หรือใช้ SSH Public Key แทน password
- ไม่ใช้ root login
- เก็บ Tunnel credential ให้เป็นความลับ

ไฟล์สำคัญ เช่น:

/home/PI_USER/.cloudflared/TUNNEL_UUID.json

และ:

~/.cloudflared/cert.pem

ห้ามเผยแพร่


สำหรับระบบที่ให้นักศึกษาเข้าจาก Internet ต้องตรวจว่า Cloudflare Access application
และ Allow policy ยังทำงานอยู่เสมอ ควรใช้ SSH Public Key แทนรหัสผ่านเมื่อพร้อม
และยกเลิกสิทธิ์ Access เมื่อผู้ใช้ไม่จำเป็นต้องเข้าเครื่องแล้ว


============================================================
20. สถาปัตยกรรมสุดท้าย
============================================================

```text
                INTERNET
                    │
                    │
              ┌─────▼─────┐
              │ Cloudflare │
              └─────┬─────┘
                    │
             Cloudflare Tunnel
                    │
             ┌──────▼──────┐
             │   Pi PI_HOSTNAME   │
             │              │
             │ cloudflared  │
             │      │       │
             │      ▼       │
             │ localhost:22 │
             │      │       │
             │      ▼       │
             │    sshd      │
             └──────▲───────┘
                    │
                    │
          ssh.example.com
                    ▲
                    │
              cloudflared
                    ▲
                    │
                OpenSSH
                    ▲
                    │
                 Client
```


บน macOS หลังตั้ง ~/.ssh/config แล้ว:

```bash
ssh PI_HOSTNAME
```


เพียงคำสั่งเดียวก็สามารถ SSH จาก Internet
เข้า Raspberry Pi PI_HOSTNAME ผ่าน Cloudflare Tunnel ได้
โดยไม่เปิด Port 22 จาก Internet โดยตรง
