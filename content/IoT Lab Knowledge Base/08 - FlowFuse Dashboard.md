---
type: reference
platform: raspberry-pi
service: node-red
protocol: http
level: basic
status: tested
tags:
  - iot-lab
  - dashboard
  - node-red
---

# FlowFuse Dashboard

> [!info] แก้ไขล่าสุด
> 2026-10-01 02:17:17 +07


Dashboard แสดงข้อมูลล่าสุดด้วย Gauge และแสดงแนวโน้มระยะสั้นด้วย Chart โดยใช้แพ็กเกจ:

```text
@flowfuse/node-red-dashboard
```

## ติดตั้ง Dashboard Package

ติดตั้งผ่าน Node-RED editor:

```text
Menu → Manage palette → Install → @flowfuse/node-red-dashboard
```

หลังติดตั้งแล้วจะมี node กลุ่ม Dashboard เพิ่มใน editor และเข้า Dashboard ได้ที่:

```text
http://PI_IP:1880/dashboard
```

ถ้าไม่เห็นหน้า Dashboard ให้ตรวจว่า Node-RED service ทำงานและ port `1880`
เปิดอยู่ก่อน แล้วค่อยตรวจ package ใน Palette Manager

## Data Contract

Widget รับค่าตัวเลขจาก `msg.payload` ดังนั้นต้องแยก field หลัง JSON ก่อน:

```text
Change Temp  → Temperature Gauge / Chart
Change Humi  → Humidity Gauge / Chart
Change Light → Light Gauge / Chart
```

ช่วงตัวอย่างที่ใช้ใน Lab:

| Sensor | Min | Max | Unit |
|---|---:|---:|---|
| Temperature | 0 | 50 | °C |
| Humidity | 0 | 100 | % |
| Light | 0 | 1000 | lx |

## Real-time Chart

ใช้ Line chart, X-axis แบบ Timescale และ Append ข้อมูลใหม่ จำกัดหน้าต่างเวลา
เช่น 5 นาที และกำหนดชื่อ Series เป็นค่าคงที่ `Temperature`, `Humidity`, `Light`
เพื่อไม่ให้ชื่อ topic MQTT กลายเป็นชื่อทุกเส้น

## Lab ที่เกี่ยวข้อง

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[06 - LAB 06 - สร้าง FlowFuse Dashboard|LAB 06 - สร้าง FlowFuse Dashboard]]
- [[07 - LAB 07 - สร้าง Real-time Chart|LAB 07 - สร้าง Real-time Chart]]
- [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]

กลับไป [[index]]
