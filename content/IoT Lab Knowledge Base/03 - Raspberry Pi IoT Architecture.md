---
type: architecture
platform: raspberry-pi
service:
  - mosquitto
  - node-red
  - sqlite
protocol:
  - mqtt
  - bluetooth-le
level: basic
status: tested
tags:
  - iot-lab
  - architecture
---

# Raspberry Pi IoT Architecture

> [!info] แก้ไขล่าสุด
> 2026-10-01 11:01:15 +07


Architecture กลางของ Lab แยกการรับข้อมูล, ประมวลผล, แสดงผล และจัดเก็บออกจากกัน

```text
Mijia BLE / ESP32 / Simulator
              │
              │ BLE หรือ MQTT
              ▼
         Raspberry Pi
              │
              ▼
       Mosquitto Broker
              │
              ▼
           Node-RED
      ┌───────┼──────────┐
      ▼       ▼          ▼
    Gauge   Chart   SQLite WRITE
                          │
                          ▼
                        iot.db
                          │
                          ▼
                    SQLite STAT
                          │
                          ▼
                   AVG / MIN / MAX
```

## หน้าที่ของแต่ละส่วน

- Sensor/Simulator สร้างข้อมูลและช่วยทดสอบแต่ละชั้นแยกกัน
- Mosquitto เป็น message broker ไม่ทำหน้าที่เก็บประวัติระยะยาว
- Node-RED แปลงและจัดเส้นทางข้อมูล
- FlowFuse Dashboard แสดงค่าปัจจุบันและแนวโน้ม
- SQLite เก็บประวัติและคำนวณสถิติด้วย SQL
- Remote Access เป็นทางเข้าระบบ ไม่ใช่ส่วนของ data pipeline

## หลักการออกแบบสำหรับการสอน

ทดสอบทีละรอยต่อ และหยุดแก้เมื่อชั้นนั้นทำงานแล้ว เช่น ตรวจ BLE raw data ก่อน decode,
ตรวจ MQTT ก่อน Node-RED และตรวจ INSERT ก่อนทำสถิติ วิธีนี้ลดตัวแปรที่ต้องวิเคราะห์พร้อมกัน

## Notes ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/05 - MQTT Topic Design|MQTT Topic Design]]
- [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]
- [[IoT Lab Knowledge Base/09 - SQLite Sensor Data|SQLite Sensor Data]]
- [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]
- [[สรุปผลและเส้นทางต่อไป#Architecture checkpoint หลังจบ MQTT/Database|Architecture checkpoint หลังจบ MQTT/Database]]

กลับไป [[index]]
