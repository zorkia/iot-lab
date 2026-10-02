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
  - design
---

# MQTT Topic Design

> [!info] แก้ไขล่าสุด
> 2026-10-01 01:53:11 +07


Topic ควรสื่อโครงสร้างระบบและรองรับหลายอุปกรณ์โดยไม่ต้องเปลี่ยน flow หลัก

## รูปแบบที่ใช้ใน Lab

```text
pkru/iot/device_id/data
pkru/iot/device_id/cmd
```

ตัวอย่าง:

```text
pkru/iot/001/data
pkru/iot/001/cmd
pkru/iot/002/data
```

- `data` ใช้ส่งค่าจากอุปกรณ์เข้าสู่ระบบ
- `cmd` ใช้ส่งคำสั่งกลับไปยังอุปกรณ์
- `device_id` แยกข้อมูลของแต่ละชุดทดลอง

## Wildcard

```text
pkru/iot/+/data
pkru/iot/#
```

`+` แทนหนึ่งระดับ ส่วน `#` แทนระดับที่เหลือทั้งหมด ควรใช้ subscription ที่แคบที่สุด
เท่าที่งานต้องการ เพื่อลดข้อความที่ไม่เกี่ยวข้อง

## Payload

```json
{"temp":30.5,"humi":70.2,"light":350}
```

ตั้งชื่อ field ให้คงที่ตลอด pipeline เพราะ Node-RED, SQL และ Dashboard
อ้างชื่อเหล่านี้โดยตรง Topic แยกเส้นทางข้อมูล ส่วน JSON บอกค่าภายในข้อความ

Authentication ยืนยันตัวตน แต่การจำกัดว่า client ใดเข้าถึง topic ใดต้องใช้ ACL

## Lab ที่เกี่ยวข้อง

- [[03 - LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line|LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line]]
- [[IoT Lab Knowledge Base/06 - MQTT Testing|MQTT Testing]]
- [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]

กลับไป [[index]]
