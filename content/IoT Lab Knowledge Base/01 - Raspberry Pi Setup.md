---
type: reference
platform: raspberry-pi
service: systemd
protocol: linux
level: basic
status: tested
tags:
  - iot-lab
  - system
---

# Raspberry Pi Setup

> [!info] แก้ไขล่าสุด
> 2026-10-01 01:53:11 +07


รายการตรวจพื้นฐานก่อนเริ่ม IoT Lab เพื่อยืนยันว่าเครื่องมีทรัพยากรเพียงพอ
และ service ที่จำเป็นทำงานตามปกติ

## ลำดับการติดตั้งพื้นฐาน

ก่อนเข้าสู่ MQTT, Node-RED หรือ SQLite ให้เตรียม Pi ตามลำดับนี้:

1. ติดตั้ง Raspberry Pi OS ลง microSD/SSD
2. เปิด SSH ตั้งแต่ขั้นเตรียม image หรือเปิดหลัง boot ด้วย `raspi-config`
3. ตั้ง hostname ให้จำง่าย เช่น `PI_HOSTNAME`
4. ตั้ง user หลักของ Lab เช่น `PI_USER`
5. เชื่อม LAN หรือ Wi-Fi แล้วตรวจ IP
6. อัปเดต package พื้นฐาน
7. reboot หนึ่งครั้งก่อนเริ่มติดตั้ง service

คำสั่งหลังเข้าเครื่องได้แล้ว:

```bash
hostname
hostname -I
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

หลัง reboot ให้ SSH กลับเข้าเครื่อง แล้วค่อยตรวจทรัพยากรและติดตั้ง service ถัดไป

## ตรวจทรัพยากร

```bash
free -h
df -h
hostname -I
```

## ตรวจ Service, Port และ Log

```bash
systemctl status SERVICE --no-pager
ss -lntp
journalctl -u SERVICE -n 50 --no-pager
```

`enable` ทำให้ service เริ่มพร้อมระบบ ส่วน `--now` สั่งให้เริ่มในรอบปัจจุบันด้วย:

```bash
sudo systemctl enable --now SERVICE
```

เมื่อตรวจปัญหา ให้เริ่มจาก service และ log จากนั้นตรวจ listening port และทดสอบ
ผ่าน `localhost` ก่อนทดสอบจากเครื่องอื่นใน LAN

## ตรวจ LAN และ Wi-Fi

```bash
nmcli device status
ip -br addr
ip route get 8.8.8.8
hostname
hostname -I
```

การสร้าง Wi-Fi profile, ตรวจ SSID และจัดการ Netplan อยู่ที่
[[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi|Raspberry Pi Network and Wi-Fi]]

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[01 - LAB 01 - ตรวจสอบระบบ Raspberry Pi|LAB 01 - ตรวจสอบระบบ Raspberry Pi]]
- [[IoT Lab Knowledge Base/14 - Troubleshooting|Troubleshooting]]
- [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi|Raspberry Pi Network and Wi-Fi]]
- [[IoT Lab Knowledge Base/03 - Raspberry Pi IoT Architecture|Raspberry Pi IoT Architecture]]

กลับไป [[index]]
