---
type: reference
platform: raspberry-pi
service: bluez
protocol: bluetooth-le
level: basic
status: tested
tags:
  - iot-lab
  - bluetooth
  - ble
---

# Bluetooth Setup

> [!info] แก้ไขล่าสุด
> 2026-10-01 10:55:15 +07


ก่อนสแกน BLE ต้องยืนยันว่า BlueZ ทำงาน, controller ไม่ถูก block และเปิด power แล้ว

## ติดตั้ง Python Environment สำหรับ BLE

ถ้ายังไม่มี virtual environment ให้สร้างก่อน:

```bash
sudo apt update
sudo apt install python3-venv python3-pip -y
python3 -m venv ~/iot-venv
```

จากนั้น activate และติดตั้ง library ที่ใช้ใน BTHome Lab:

```bash
source ~/iot-venv/bin/activate
pip install bthome-ble bleak
pip show bthome-ble bleak
```

เอกสาร [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]] ระบุ dependency ที่ใช้ร่วมคือ `habluetooth` ซึ่งถูกติดตั้งตามมาพร้อม
ชุด library สำหรับ BTHome

## ตรวจสถานะ

```bash
systemctl status bluetooth --no-pager
rfkill list bluetooth
bluetoothctl show
```

ถ้าพบ `Soft blocked: yes` หรือ `PowerState: off-blocked`:

```bash
sudo rfkill unblock bluetooth
bluetoothctl power on
```

ตรวจซ้ำจนได้ `Soft blocked: no` และ `Powered: yes` ส่วน `Hard blocked: yes`
มักต้องตรวจ hardware, firmware หรือการตั้งค่าระบบ ไม่สามารถแก้ด้วย `rfkill unblock`
เพียงอย่างเดียว

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]]
- [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]
- [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

กลับไป [[index]]
