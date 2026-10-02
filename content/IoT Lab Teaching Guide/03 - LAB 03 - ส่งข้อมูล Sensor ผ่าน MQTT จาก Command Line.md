> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]
> ถัดไป: [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT]]

# LAB 03 --- ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 3.1 แนวคิดของ LAB

LAB นี้เปลี่ยนจากการทดสอบ MQTT แบบข้อความธรรมดา ไปเป็นการส่งข้อมูล sensor แบบ JSON ผ่าน command line เพื่อจำลองอุปกรณ์จริงก่อนใช้ ESP32 หรือ sensor จริง

```text
Command Line Simulator
          |
          | MQTT JSON
          v
Mosquitto Broker
          |
          v
Subscriber / Node-RED ใน lab ถัดไป
```

การจำลองด้วย command line ทำให้ตรวจ path ของข้อมูลได้เร็ว และช่วยแยกปัญหาว่าเกิดจาก MQTT, payload หรือ Node-RED

## 3.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ออกแบบ topic สำหรับ sensor หนึ่งตัว
- สร้าง payload JSON ที่มี `temp`, `humi`, `light`
- ส่งข้อมูลด้วย `mosquitto_pub`
- รับข้อมูลด้วย `mosquitto_sub`
- จำลอง sensor หลายรอบด้วย shell loop
- ตรวจความถูกต้องของ JSON payload
- เข้าใจความแตกต่างระหว่าง topic และ payload

## 3.3 Architecture

```text
Terminal Simulator
   |
   | mosquitto_pub
   | topic: pkru/iot/001/data
   v
+------------------------+
| Mosquitto Broker       |
+-----------+------------+
            |
            | mosquitto_sub
            v
       Debug Terminal
```

## 3.4 Topic ที่ใช้ใน LAB

ใช้ topic เดียวกันตลอดช่วงพื้นฐาน:

```text
pkru/iot/001/data
```

โครงสร้าง topic:

| ส่วน | ความหมาย |
|---|---|
| `pkru` | namespace ของ lab |
| `iot` | กลุ่มระบบ |
| `001` | device id |
| `data` | ประเภท message |

หลักคิด:

```text
Topic = ช่องทาง
Payload = ข้อมูล
```

## 3.5 Payload JSON มาตรฐาน

payload ที่ใช้:

```json
{"temp":28.5,"humi":70,"light":1200}
```

ความหมาย:

| Field | ความหมาย | ตัวอย่างหน่วย |
|---|---|---|
| `temp` | อุณหภูมิ | °C |
| `humi` | ความชื้น | `%RH` |
| `light` | ค่าแสง | lux หรือค่าจำลอง |

## 3.6 เปิด Subscriber เพื่อตรวจข้อมูล

เปิด terminal แรก:

```bash
mosquitto_sub -h localhost \
  -t "pkru/iot/001/data" \
  -v
```

ถ้า broker ใช้ authentication:

```bash
mosquitto_sub -h localhost \
  -u iotuser \
  -P 'YOUR_PASSWORD' \
  -t "pkru/iot/001/data" \
  -v
```

## 3.7 ส่งข้อมูลหนึ่งครั้ง

เปิด terminal ที่สอง:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70,"light":1200}'
```

ผลที่ terminal subscriber:

```text
pkru/iot/001/data {"temp":28.5,"humi":70,"light":1200}
```

## 3.8 ส่งข้อมูลหลายค่าเพื่อจำลอง Sensor

ใช้ loop ส่งข้อมูลทุก 2 วินาที:

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

หยุด loop ด้วย `Ctrl+C`

## 3.9 ทดสอบ Payload ผิดรูปแบบ

ส่ง JSON ที่ผิดเพื่อดูผลใน lab ถัดไป:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70,"light":}'
```

ส่ง payload ที่เป็น text ธรรมดา:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m 'hello'
```

สิ่งที่ต้องสังเกต:

```text
MQTT broker ไม่สนใจว่า payload เป็น JSON ถูกหรือผิด
Node-RED หรือ application layer ต้องเป็นฝ่ายตรวจ
```

## 3.10 ตรวจ JSON ด้วย jq ถ้ามีเครื่องมือ

ทดสอบ JSON string:

```bash
echo '{"temp":28.5,"humi":70,"light":1200}' | jq
```

ถ้า JSON ถูกต้อง จะถูกจัดรูปแบบใหม่ ถ้าผิดจะขึ้น error

## 3.11 รูปแบบข้อมูลที่ควรยึดให้คงที่

กำหนดให้ทุก message มี field เดิม:

```json
{
  "device_id": "001",
  "temp": 28.5,
  "humi": 70,
  "light": 1200
}
```

ถ้ายังไม่ใช้ `device_id` ใน flow ตอนต้นก็ยังควรเข้าใจว่าข้อมูลนี้จะสำคัญเมื่อเข้าสู่ multi-device lab

## 3.12 Checklist ก่อนจบ LAB

- เปิด subscriber และเห็น topic/payload ได้
- publish JSON ได้อย่างน้อย 3 ค่า
- เข้าใจว่า broker ไม่ validate JSON
- จำลองข้อมูลต่อเนื่องด้วย loop ได้
- รู้ว่า payload ผิดรูปแบบจะกระทบ Node-RED ใน lab ถัดไป

## 3.13 งานส่ง LAB

ให้บันทึก:

```text
Topic ที่ใช้:
ตัวอย่าง payload ที่ถูกต้อง:
ตัวอย่าง payload ที่ผิด:
ผลที่ mosquitto_sub เห็น:
ข้อสรุปเรื่อง topic และ payload:
```

## 3.14 เชื่อมไป LAB ถัดไป

LAB 04 จะนำ topic และ JSON payload จาก LAB นี้ไปรับด้วย Node-RED ผ่าน MQTT In node แล้วแสดงผลใน debug sidebar

