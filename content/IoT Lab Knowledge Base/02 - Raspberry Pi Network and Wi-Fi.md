---
type: reference
platform: raspberry-pi
service: networkmanager
protocol:
  - ethernet
  - wifi
level: basic
status: tested
tags:
  - iot-lab
  - network
  - wifi
---

# Raspberry Pi Network and Wi-Fi

> [!info] แก้ไขล่าสุด
> 2026-10-01 01:53:11 +07


คำสั่งตรวจการเชื่อมต่อ LAN/Wi-Fi, IP address, default route และการจัดการ
Wi-Fi profile บน Raspberry Pi ที่ใช้ NetworkManager

> [!important] ตรวจ Network Manager ก่อน
> คำสั่ง `nmcli` ใช้ได้เมื่อ interface ถูกจัดการโดย NetworkManager ตรวจด้วย
> `systemctl is-active NetworkManager` หากใช้ระบบอื่น เช่น `dhcpcd` หรือ
> `systemd-networkd` ขั้นตอนจัดการ profile จะแตกต่างกัน

## ตรวจสถานะเครือข่าย

ดูว่า LAN/Wi-Fi interface ใดเชื่อมต่ออยู่:

```bash
nmcli device status
```

ดู IP ของแต่ละ interface แบบย่อ:

```bash
ip -br addr
```

ดูว่า traffic ไป Internet จะออกทาง interface และ gateway ใด:

```bash
ip route get 8.8.8.8
```

ผลลัพธ์จะมี `via GATEWAY` และ `dev INTERFACE` เช่น `dev eth0` หมายถึงออกทาง LAN
และ `dev wlan0` หมายถึงออกทาง Wi-Fi คำสั่งนี้ตรวจเส้นทางที่ kernel เลือก แต่ไม่ได้ยืนยันว่า
ปลายทาง Internet ตอบกลับ

ดู SSID ที่เชื่อมอยู่:

```bash
iwgetid -r
```

ถ้าไม่มี `iwgetid` ใช้ NetworkManager แทน:

```bash
nmcli -t -f ACTIVE,SSID device wifi | grep '^yes:'
```

ดู hostname และ IP address ของ Raspberry Pi:

```bash
hostname
hostname -I
```

`PI_HOSTNAME` ที่ใช้ในคู่มือคือ hostname ที่ผู้ดูแลตั้งให้ Raspberry Pi เครื่องหลักของ Lab
ไม่ใช่ชื่อที่ Raspberry Pi ทุกเครื่องต้องใช้ ตรวจคำอธิบายความต่างระหว่าง hostname,
Tunnel name, public hostname และ `PI_IP` ได้ที่
[[00 - IoT Lab Teaching Guide - Hub#ชื่อที่ใช้ในเอกสาร|ชื่อที่ใช้ในเอกสาร]]

`hostname -I` อาจแสดงหลาย address ให้เทียบกับ `ip -br addr` ก่อนเลือก IP
ที่อยู่ใน subnet เดียวกับเครื่อง client

## สร้าง Wi-Fi Profile

กำหนดค่าต่อไปนี้ให้ตรงกับระบบ:

```text
PROFILE_NAME  ชื่อ profile เช่น phuket-iot
WIFI_SSID     ชื่อเครือข่าย Wi-Fi
WIFI_PASSWORD รหัสผ่าน Wi-Fi
```

สร้างและตั้งค่า profile:

```bash
sudo nmcli connection add \
  type wifi \
  ifname wlan0 \
  con-name "PROFILE_NAME" \
  ssid "WIFI_SSID"

sudo nmcli connection modify "PROFILE_NAME" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "WIFI_PASSWORD" \
  connection.autoconnect yes

sudo nmcli connection up "PROFILE_NAME"
```

> [!warning] รักษาความลับของรหัสผ่าน
> อย่าใส่รหัสผ่านจริงลงในโน้ต, screenshot หรือ repository คำสั่งที่มีรหัสผ่านอาจถูกเก็บ
> ใน shell history หากไม่ต้องการพิมพ์รหัสผ่านบน command line ให้ใช้
> `sudo nmcli --ask device wifi connect "WIFI_SSID" ifname wlan0 name "PROFILE_NAME"`

## ตรวจ Profile ที่บันทึกไว้

```bash
nmcli connection show
nmcli -f NAME,TYPE,AUTOCONNECT connection show | grep wifi
nmcli device status
```

ตรวจรายละเอียด profile โดยไม่แสดง secret:

```bash
nmcli connection show "PROFILE_NAME"
```

## ลบ Wi-Fi Configuration เก่าจาก Netplan

> [!danger] อาจทำให้ SSH หลุด
> ถ้า SSH ผ่าน Wi-Fi ที่กำลังแก้ การเชื่อมต่ออาจหลุดทันที ควรทำผ่านจอ/คีย์บอร์ด,
> serial console หรือเชื่อม LAN ไว้เป็นทางสำรอง และอย่าลบไฟล์จนกว่าจะระบุเจ้าของ
> configuration ได้แน่ชัด

### 1. บันทึกสถานะก่อนแก้

```bash
nmcli -f NAME,TYPE,AUTOCONNECT connection show | grep wifi
nmcli device status
ip -br addr
ip route
```

### 2. ตรวจไฟล์ Netplan

```bash
ls -l /etc/netplan/
sudo cat /etc/netplan/*.yaml
```

ตรวจชื่อ interface, SSID และ renderer ในแต่ละไฟล์ เลือกเฉพาะไฟล์ Wi-Fi เก่าที่ต้องการเอาออก

### 3. ย้ายไฟล์ไปสำรองแทนการลบทันที

```bash
sudo install -d -m 700 /etc/netplan/backup
sudo cp -a /etc/netplan/<OLD-WIFI-FILE>.yaml /etc/netplan/backup/
sudo mv /etc/netplan/<OLD-WIFI-FILE>.yaml /etc/netplan/backup/
```

### 4. ตรวจ syntax แล้วจึงใช้ configuration

```bash
sudo netplan generate
sudo netplan apply
```

ถ้า `netplan generate` แจ้ง error ให้คืนไฟล์ก่อน apply:

```bash
sudo mv /etc/netplan/backup/<OLD-WIFI-FILE>.yaml /etc/netplan/
sudo netplan generate
sudo netplan apply
```

### 4. ลบ NetworkManager Profile ที่ไม่ใช้

ไฟล์ Netplan และ NetworkManager connection profile เป็นคนละชั้นกัน หลังเชื่อมกลับมา
ให้ตรวจว่ามี profile เก่าค้างอยู่หรือไม่ แล้วลบด้วยชื่อที่ตรวจสอบแล้วเท่านั้น:

```bash
nmcli connection show
sudo nmcli connection delete "<OLD-PROFILE-NAME>"
```

### 5. ตรวจผลสุดท้าย

```bash
nmcli device status
nmcli connection show
ip -br addr
ip route get 8.8.8.8
```

## Notes ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/01 - Raspberry Pi Setup|Raspberry Pi Setup]]
- [[IoT Lab Knowledge Base/14 - Troubleshooting|Troubleshooting]]
- [[Cloudflare Tunnel Setup|Cloudflare Tunnel Setup]]

กลับไป [[index]]
