> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[05 - LAB 05 - แยกข้อมูล Sensor ใน Node-RED]]
> ถัดไป: [[07 - LAB 07 - สร้าง Real-time Chart]]

# LAB 06 --- สร้าง FlowFuse Dashboard

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 6.1 แนวคิดของ LAB

LAB นี้เริ่มสร้างหน้าจอแสดงผลจากข้อมูล sensor ด้วย FlowFuse Dashboard โดยใช้ค่าที่แยกจาก LAB 05 แล้วส่งเข้า widget แบบ real-time

```text
MQTT -> JSON -> Split Fields -> Dashboard Widgets
```

Dashboard เป็น presentation layer ของระบบ IoT ทำให้ผู้ใช้ดูสถานะได้โดยไม่ต้องเปิด terminal หรือ debug sidebar

## 6.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ตรวจว่ามี FlowFuse Dashboard node พร้อมใช้งานหรือไม่
- สร้าง Dashboard tab และ group
- สร้าง Gauge สำหรับ temperature, humidity และ light
- ตั้ง range และหน่วยของแต่ละค่า
- ทดสอบ dashboard ด้วย MQTT simulator
- แยกหน้าที่ระหว่าง data processing และ presentation

## 6.3 Architecture

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Split Sensor Fields]
    |          |          |
    v          v          v
 [Gauge]    [Gauge]    [Gauge]
  Temp       Humi       Light
```

## 6.4 ตรวจ Dashboard Node

ใน Node-RED ให้ตรวจใน palette ว่ามี node ของ dashboard อยู่แล้วหรือไม่:

```text
@flowfuse/node-red-dashboard
```

ถ้ายังไม่มี ให้ดูขั้นตอนติดตั้งใน knowledge base ของ Node-RED หรือเอกสารติดตั้งกลางของระบบก่อน แล้วกลับมาทำ LAB นี้

LAB นี้เน้นการใช้งาน dashboard ไม่เน้นการติดตั้ง package

## 6.5 สร้าง Tab และ Group

สร้าง Dashboard Tab:

```text
Tab name: IoT Lab
```

สร้าง Group:

```text
Group name: Sensor Overview
Width: 6
```

โครงสร้างหน้าจอ:

```text
IoT Lab
└── Sensor Overview
    ├── Temperature Gauge
    ├── Humidity Gauge
    └── Light Gauge
```

## 6.6 Temperature Gauge

ต่อ output `temp` จาก LAB 05 เข้ากับ Gauge node

ตั้งค่า:

```text
Label: Temperature
Unit: °C
Range: 0 - 50
Format: {{msg.payload}}
```

ข้อมูลที่เข้า widget:

```text
msg.topic = temp
msg.payload = 28.5
```

## 6.7 Humidity Gauge

ต่อ output `humi` เข้ากับ Gauge node

ตั้งค่า:

```text
Label: Humidity
Unit: %RH
Range: 0 - 100
Format: {{msg.payload}}
```

## 6.8 Light Gauge

ต่อ output `light` เข้ากับ Gauge node

ตั้งค่า:

```text
Label: Light
Unit: lux
Range: 0 - 3000
Format: {{msg.payload}}
```

## 6.9 ทดสอบ Dashboard

ส่ง payload:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":30,"humi":65,"light":1500}'
```

ส่งอีกค่าหนึ่งเพื่อดูการเปลี่ยนแปลง:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":35,"humi":72,"light":2100}'
```

Dashboard ควรเปลี่ยนตามค่าล่าสุด

## 6.10 ทดสอบด้วย Simulator ต่อเนื่อง

ใช้ simulator จาก LAB 03:

```bash
while true; do
  TEMP=$((25 + RANDOM % 10))
  HUMI=$((55 + RANDOM % 25))
  LIGHT=$((500 + RANDOM % 1500))

  mosquitto_pub -h localhost \
    -t "pkru/iot/001/data" \
    -m "{\"temp\":$TEMP,\"humi\":$HUMI,\"light\":$LIGHT}"

  sleep 2
done
```

## 6.11 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| Dashboard ไม่ขึ้น | ยังไม่ Deploy หรือ URL ไม่ถูก |
| Gauge ไม่เปลี่ยน | flow ไม่ได้รับ MQTT หรือ output ต่อผิด |
| ค่าเป็น `[object Object]` | ส่ง object ทั้งก้อนเข้า Gauge |
| หน่วยไม่ตรง | ตั้งค่า widget ไม่ถูก |
| ค่าเกิน range | range ของ Gauge แคบเกินไป |

## 6.12 Checklist ก่อนจบ LAB

- มี Tab `IoT Lab`
- มี Group `Sensor Overview`
- มี Gauge อย่างน้อย 3 ตัว
- Gauge รับค่าเดี่ยวจาก `msg.payload`
- Dashboard เปลี่ยนตาม MQTT simulator
- เข้าใจว่า Dashboard ไม่ใช่ที่เก็บข้อมูลถาวร

## 6.13 งานส่ง LAB

ให้ส่ง:

```text
1. ภาพ Dashboard ที่แสดง temp/humi/light
2. ภาพ flow จาก MQTT ถึง Gauge
3. Payload ที่ใช้ทดสอบ
4. อธิบายว่าถ้าส่ง object เข้า Gauge จะเกิดอะไร
```

## 6.14 เชื่อมไป LAB ถัดไป

LAB 07 จะเพิ่ม Real-time Chart เพื่อดูแนวโน้มของข้อมูลตามเวลา ไม่ใช่แค่ค่าล่าสุด

