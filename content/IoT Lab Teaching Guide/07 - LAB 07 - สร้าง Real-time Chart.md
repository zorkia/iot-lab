> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[06 - LAB 06 - สร้าง FlowFuse Dashboard]]
> ถัดไป: [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]

# LAB 07 --- สร้าง Real-time Chart

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 7.1 แนวคิดของ LAB

LAB นี้เพิ่ม Real-time Chart เพื่อแสดงแนวโน้มของ sensor ตามเวลา จากเดิม LAB 06 แสดงแค่ค่าล่าสุดด้วย Gauge

```text
Gauge = ตอนนี้ค่าเท่าไร
Chart = ค่าเปลี่ยนอย่างไรตามเวลา
```

Chart ช่วยให้เห็น pattern เช่น ค่าแกว่ง, ค่าสูงผิดปกติ หรือ sensor หยุดส่งข้อมูล

## 7.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ส่งข้อมูลหลาย series เข้า Chart node
- ใช้ `msg.topic` แยกเส้นกราฟ
- ตั้งช่วงเวลาที่แสดงบน chart
- ทดสอบกราฟด้วย MQTT simulator
- อ่านแนวโน้มข้อมูลจาก dashboard
- เตรียมความพร้อมสำหรับการบันทึกข้อมูลลง SQLite

## 7.3 Architecture

```text
[Split Sensor Fields]
    |          |          |
    v          v          v
  temp       humi       light
    \          |          /
     \         |         /
      v        v        v
        [Real-time Chart]
```

## 7.4 หลักการใช้ msg.topic กับ Chart

Chart node ใช้ `msg.topic` เพื่อแยก series:

```text
msg.topic = temp   -> เส้น Temperature
msg.topic = humi   -> เส้น Humidity
msg.topic = light  -> เส้น Light
```

ถ้า topic หายหรือเหมือนกันหมด กราฟอาจแสดงเป็นเส้นเดียวหรือทับกันจนอ่านยาก

## 7.5 สร้าง Chart Node

เพิ่ม Chart widget ใน Dashboard group เดิม:

```text
Label: Sensor Trend
Type: Line chart
X-axis: Time
Y-axis: Value
Time window: 5 minutes
```

ต่อ output ทั้ง 3 จาก function `Split Sensor Fields` เข้า chart เดียวกัน

## 7.6 ตั้งค่า Flow

โครงสร้าง flow:

```text
[MQTT In]
    |
    v
  [JSON]
    |
    v
[Split Sensor Fields]
    |          |          |
    +----------+----------+
               |
               v
       [Sensor Trend Chart]
```

เพื่อความชัดเจน สามารถต่อ Gauge และ Chart พร้อมกันได้:

```text
temp  -> Temperature Gauge
      -> Sensor Trend Chart

humi  -> Humidity Gauge
      -> Sensor Trend Chart

light -> Light Gauge
      -> Sensor Trend Chart
```

## 7.7 ทดสอบด้วยข้อมูลหลายค่า

ส่งค่าชุดแรก:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28,"humi":60,"light":800}'
```

ส่งค่าชุดที่สอง:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":32,"humi":65,"light":1200}'
```

ส่งค่าชุดที่สาม:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":35,"humi":70,"light":1600}'
```

## 7.8 ทดสอบด้วย Simulator

ใช้ loop ต่อเนื่อง:

```bash
while true; do
  TEMP=$((25 + RANDOM % 12))
  HUMI=$((50 + RANDOM % 30))
  LIGHT=$((400 + RANDOM % 1800))

  mosquitto_pub -h localhost \
    -t "pkru/iot/001/data" \
    -m "{\"temp\":$TEMP,\"humi\":$HUMI,\"light\":$LIGHT}"

  sleep 2
done
```

## 7.9 การอ่านกราฟ

สิ่งที่ควรสังเกต:

| ลักษณะกราฟ | ความหมายที่เป็นไปได้ |
|---|---|
| เส้นนิ่งนาน | sensor ไม่เปลี่ยนค่า หรือข้อมูลหยุด |
| เส้นกระโดดสูงมาก | payload ผิด หรือ sensor noise |
| เส้นหายบางช่วง | MQTT ขาดช่วง หรือ flow มี error |
| หลายเส้นทับกัน | scale ไม่เหมาะ หรือ topic ไม่ชัด |

## 7.10 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| Chart มีเส้นเดียว | `msg.topic` ไม่ต่างกัน |
| Chart ไม่ขึ้นค่า | payload ไม่ใช่ number |
| Gauge ขึ้นแต่ chart ไม่ขึ้น | ต่อสายเข้า chart ไม่ครบ |
| กราฟอ่านยาก | ค่าแต่ละ sensor scale ต่างกันมาก |

## 7.11 Checklist ก่อนจบ LAB

- Chart แสดงข้อมูลแบบ real-time
- มีอย่างน้อย 3 series หรือรู้เหตุผลที่แยก chart
- `msg.topic` ของแต่ละค่าไม่ซ้ำกัน
- ใช้ simulator ส่งข้อมูลต่อเนื่องได้
- อ่านแนวโน้มเบื้องต้นจากกราฟได้

## 7.12 งานส่ง LAB

ให้ส่ง:

```text
1. ภาพ chart หลังปล่อย simulator อย่างน้อย 1 นาที
2. ภาพ flow ที่ต่อ Gauge และ Chart
3. อธิบายบทบาทของ msg.topic ต่อ chart
4. ระบุปัญหาที่พบจากการอ่านกราฟ
```

## 7.13 เชื่อมไป LAB ถัดไป

LAB 08 จะเพิ่ม database เพื่อเก็บข้อมูลย้อนหลัง เพราะ Gauge และ Chart ใน dashboard ไม่ใช่แหล่งข้อมูลถาวร

