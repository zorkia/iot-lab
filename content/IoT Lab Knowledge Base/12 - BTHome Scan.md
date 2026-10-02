---
type: reference
platform: raspberry-pi
service: bluez
protocol: bthome
level: basic
status: tested
tags:
  - iot-lab
  - bluetooth
  - bthome
---

# BTHome Scan

> [!info] แก้ไขล่าสุด
> 2026-10-01 10:55:15 +07


BTHome ส่งข้อมูลด้วย BLE Advertisement จึงอ่านได้ด้วยการ scan โดยทั่วไปไม่ต้อง pair
และไม่ต้อง connect กับ sensor

## Scan ด้วย bluetoothctl

```bash
bluetoothctl
power on
scan on
```

หยุดด้วย `scan off` แล้วออกด้วย `quit`

BTHome Service UUID:

```text
0000fcd2-0000-1000-8000-00805f9b34fb
```

ตัวอย่าง ServiceData ที่พบจาก Mijia:

```text
ServiceData.0000fcd2-0000-1000-8000-00805f9b34fb:
  40 00 c6 01 4d 02 44 09 03 3e 1b
```

สรุปขั้นตอน:

```text
Pair    : ไม่ต้อง
Connect : ไม่ต้อง
Scan    : ต้อง
Decode  : ต้อง
```

เมื่อใช้ Bleak ให้ตรวจ `advertisement_data.service_data` และกรอง UUID ที่มี `fcd2`
ก่อนส่งข้อมูลให้ decoder การเห็น MAC, RSSI และ service data ยืนยันได้ว่าเส้นทาง
Sensor → BLE → Raspberry Pi ทำงานแล้ว แม้ยังไม่ได้ decode ค่าอุณหภูมิ

## Lab ที่เกี่ยวข้อง

- [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]]
- [[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]
- [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]
- [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

กลับไป [[index]]
