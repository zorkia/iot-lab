> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT]]
> ถัดไป: [[06 - LAB 06 - สร้าง FlowFuse Dashboard]]

# LAB 05 --- แยกข้อมูล Sensor ใน Node-RED

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 5.1 แนวคิดของ LAB

LAB นี้แยกข้อมูล sensor จาก JSON object ให้เป็น message ย่อยที่พร้อมใช้งานใน dashboard และ database เพราะ Node-RED widget ส่วนใหญ่ต้องการค่าเดี่ยวใน `msg.payload` ไม่ใช่ object ทั้งก้อน

จาก LAB 04 เรามีข้อมูลแบบนี้:

```json
{
  "temp": 28.5,
  "humi": 70,
  "light": 1200
}
```

แต่ Gauge หรือ Chart ต้องการ message แบบนี้:

```text
msg.payload = 28.5
msg.topic = temp
```

## 5.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- เข้าใจโครงสร้าง `msg.payload` หลังผ่าน JSON node
- แยก `temp`, `humi`, `light` เป็น message แยกกัน
- ตั้ง `msg.topic` เพื่อบอกชนิดข้อมูล
- ใช้ Debug node ตรวจ message แต่ละเส้นทาง
- ป้องกันข้อมูลผิดรูปแบบก่อนส่งต่อ
- เตรียม flow สำหรับ Gauge, Chart และ SQLite

## 5.3 Architecture

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
  temp       humi       light
```

## 5.4 Input ที่ใช้

Topic:

```text
pkru/iot/001/data
```

Payload:

```json
{"temp":28.5,"humi":70,"light":1200}
```

หลังผ่าน JSON node:

```javascript
msg.payload.temp
msg.payload.humi
msg.payload.light
```

## 5.5 สร้าง Function Node

เพิ่ม `function` node หลัง JSON node แล้วตั้งชื่อ:

```text
Split Sensor Fields
```

ตั้งจำนวน output เป็น 3 ช่อง

ใช้โค้ด:

```javascript
let data = msg.payload;

if (typeof data !== "object" || data === null) {
    node.warn("payload is not an object");
    return null;
}

let temp = Number(data.temp);
let humi = Number(data.humi);
let light = Number(data.light);

if (!Number.isFinite(temp) || !Number.isFinite(humi) || !Number.isFinite(light)) {
    node.warn("invalid sensor value");
    return null;
}

let base = {
    device_id: data.device_id || "001",
    ts: data.ts || new Date().toISOString()
};

return [
    { topic: "temp", payload: temp, meta: base },
    { topic: "humi", payload: humi, meta: base },
    { topic: "light", payload: light, meta: base }
];
```

## 5.6 ต่อ Debug แยกแต่ละ Output

ต่อ flow:

```text
[Split Sensor Fields] output 1 -> [Debug temp]
[Split Sensor Fields] output 2 -> [Debug humi]
[Split Sensor Fields] output 3 -> [Debug light]
```

ตั้งค่า Debug node ให้แสดง:

```text
complete msg object
```

## 5.7 ทดสอบข้อมูลปกติ

ส่ง payload:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70,"light":1200}'
```

ผลที่ควรเห็น:

```text
Debug temp  -> msg.topic = temp,  msg.payload = 28.5
Debug humi  -> msg.topic = humi,  msg.payload = 70
Debug light -> msg.topic = light, msg.payload = 1200
```

## 5.8 ทดสอบข้อมูลผิดรูปแบบ

ส่ง payload ที่ไม่มี `light`:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70}'
```

ผลที่ควรเข้าใจ:

```text
Function node ควรหยุด flow
ไม่ควรส่งค่า NaN ไปยัง Dashboard หรือ SQLite
```

## 5.9 เหตุผลที่ต้องตั้ง msg.topic

`msg.topic` ช่วยบอกว่า message นี้คือค่าอะไร โดยเฉพาะเมื่อหลายค่าถูกส่งเข้า Chart node เดียวกัน

```text
msg.topic = temp   -> เส้นกราฟอุณหภูมิ
msg.topic = humi   -> เส้นกราฟความชื้น
msg.topic = light  -> เส้นกราฟแสง
```

ถ้าไม่ตั้ง `msg.topic` chart อาจรวมข้อมูลหลายชนิดเป็นเส้นเดียว ทำให้ตีความผิด

## 5.10 ปัญหาที่พบบ่อย

| อาการ | สาเหตุ |
|---|---|
| ได้ `undefined` | field ใน JSON ไม่ตรงชื่อ |
| ได้ `NaN` | ค่าไม่ใช่ตัวเลข |
| Debug ออกแค่ output แรก | ยังไม่ได้ตั้ง function เป็น 3 outputs |
| Chart รวมเส้นผิด | ไม่ได้ตั้ง `msg.topic` |

## 5.11 Checklist ก่อนจบ LAB

- Function node มี 3 outputs
- `temp`, `humi`, `light` ถูกแยกเป็น message คนละชุด
- ทุก message มี `msg.topic`
- payload ที่ผิดไม่ไหลต่อ
- พร้อมนำค่าไปใช้ใน dashboard

## 5.12 งานส่ง LAB

ให้ส่ง:

```text
1. ภาพ flow หลังเพิ่ม Split Sensor Fields
2. โค้ดใน function node
3. ตัวอย่าง debug ของ temp, humi, light
4. อธิบายว่าทำไมต้องตั้ง msg.topic
```

## 5.13 เชื่อมไป LAB ถัดไป

LAB 06 จะนำ message ที่แยกแล้วไปแสดงบน FlowFuse Dashboard ด้วย Gauge และ Text widget

