> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[03 - LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line]]
> ถัดไป: [[05 - LAB 05 - แยกข้อมูล Sensor ใน Node-RED]]

# LAB 04 --- ตั้งค่า Node-RED สำหรับ MQTT

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 4.1 แนวคิดของ LAB

LAB นี้นำข้อมูล MQTT จาก LAB 03 เข้าสู่ Node-RED เพื่อให้เริ่มสร้าง data flow แบบ visual programming ได้ โดยยังเน้นการรับข้อมูลและ debug ก่อน ยังไม่แยก field หรือทำ dashboard

```text
MQTT Payload
     |
     v
Node-RED MQTT In
     |
     v
JSON Node
     |
     v
Debug Node
```

Node-RED จะเป็นตัวกลางสำคัญของ lab ช่วงต้น เพราะช่วยเชื่อม MQTT, Dashboard, SQLite และ Rule Processing เข้าด้วยกัน

## 4.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ตรวจสถานะ Node-RED service
- เปิด Node-RED editor ผ่าน browser
- ตั้งค่า MQTT broker ใน Node-RED
- สร้าง flow รับ MQTT message
- แปลง JSON string เป็น object
- อ่านผลใน debug sidebar
- แยกปัญหา MQTT broker, Node-RED service และ flow configuration ได้

## 4.3 Architecture

```text
mosquitto_pub / Sensor Simulator
             |
             | MQTT topic: pkru/iot/001/data
             v
+-----------------------------+
| Mosquitto Broker            |
+-------------+---------------+
              |
              v
+-----------------------------+
| Node-RED                    |
| MQTT In -> JSON -> Debug    |
+-----------------------------+
```

## 4.4 ตรวจ Node-RED Service

ตรวจสถานะ:

```bash
systemctl status nodered.service --no-pager
```

เริ่ม service ถ้ายังไม่ทำงาน:

```bash
sudo systemctl enable --now nodered.service
```

restart เมื่อแก้ config:

```bash
sudo systemctl restart nodered.service
```

ตรวจ port:

```bash
ss -lntp | grep 1880
```

## 4.5 เปิด Node-RED Editor

ถ้าเปิดจาก LAN:

```text
http://PI_HOSTNAME-IP:1880
```

ถ้าเปิดผ่าน Cloudflare Tunnel ที่ตั้งไว้แล้ว:

```text
https://node-red.example.com
```

> เปลี่ยน `PI_HOSTNAME-IP` เป็น IP จริงจาก LAB 01

## 4.6 ตั้งค่า MQTT Broker ใน Node-RED

เพิ่ม node `mqtt in` แล้วตั้งค่า server:

```text
Server: localhost
Port: 1883
Client ID: node-red-PI_HOSTNAME
```

ถ้า Mosquitto บังคับ login:

```text
Username: iotuser
Password: รหัสที่ผู้สอนกำหนด
```

ตั้งค่า topic:

```text
pkru/iot/001/data
```

ตั้ง output เป็น:

```text
auto-detect string/buffer
```

## 4.7 สร้าง Flow แรก

สร้าง flow:

```text
[MQTT In]
     |
     v
  [JSON]
     |
     v
  [Debug]
```

ตั้งค่า JSON node:

```text
Action: Always convert to JavaScript Object
Property: msg.payload
```

ตั้งค่า Debug node:

```text
Output: complete msg object
```

## 4.8 ทดสอบ Flow

ส่งข้อมูลจาก terminal:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70,"light":1200}'
```

ผลใน debug sidebar ควรเห็น object:

```json
{
  "payload": {
    "temp": 28.5,
    "humi": 70,
    "light": 1200
  },
  "topic": "pkru/iot/001/data"
}
```

## 4.9 ตรวจ Error จาก JSON Node

ส่ง payload ที่ผิด:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":}'
```

สิ่งที่ควรเห็น:

```text
JSON node แปลงไม่ได้
Debug อาจไม่แสดง payload แบบ object
Node-RED อาจแสดง error ใน sidebar หรือ log
```

## 4.10 อ่าน Log ของ Node-RED

ตรวจ log ล่าสุด:

```bash
journalctl -u nodered.service -n 80 --no-pager
```

ติดตาม log:

```bash
journalctl -u nodered.service -f
```

ใช้ log เมื่อตรวจใน editor แล้วไม่เห็นสาเหตุ เช่น node หาย, credential ผิด หรือ service restart เอง

## 4.11 ปัญหาที่พบบ่อย

| อาการ | จุดตรวจ |
|---|---|
| เปิด editor ไม่ได้ | service, port `1880`, network |
| MQTT In ขึ้น disconnected | broker host, port, username/password |
| Debug ไม่ขึ้นข้อมูล | topic ไม่ตรง หรือยังไม่กด Deploy |
| JSON node error | payload ไม่ใช่ JSON ที่ถูกต้อง |
| เห็น string ไม่ใช่ object | ยังไม่ได้ผ่าน JSON node |

## 4.12 Checklist ก่อนจบ LAB

- เปิด Node-RED editor ได้
- MQTT In connected กับ broker
- รับ topic `pkru/iot/001/data` ได้
- JSON node แปลง payload เป็น object ได้
- Debug node แสดง `msg.payload.temp`, `msg.payload.humi`, `msg.payload.light`
- ทดสอบ payload ผิดและเข้าใจอาการ

## 4.13 งานส่ง LAB

ให้ส่ง:

```text
1. ภาพ flow MQTT In -> JSON -> Debug
2. ตัวอย่าง payload ที่ส่งเข้า MQTT
3. ผล debug ที่เห็นเป็น object
4. อธิบายว่า JSON node มีหน้าที่อะไร
```

## 4.14 เชื่อมไป LAB ถัดไป

LAB 05 จะนำ object จาก `msg.payload` มาแยกเป็นค่า sensor แต่ละตัว เพื่อส่งต่อให้ gauge, chart และ database ได้ถูกต้อง

