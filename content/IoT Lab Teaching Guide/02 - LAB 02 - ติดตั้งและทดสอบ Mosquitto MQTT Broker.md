> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]
> ก่อนหน้า: [[01 - LAB 01 - ตรวจสอบระบบ Raspberry Pi]]
> ถัดไป: [[03 - LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line]]

# LAB 02 --- ติดตั้งและทดสอบ Mosquitto MQTT Broker

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:31:22 +07

## 2.1 แนวคิดของ LAB

LAB นี้ทำให้ Raspberry Pi ทำหน้าที่เป็น MQTT Broker ด้วย Mosquitto ซึ่งเป็นศูนย์กลางรับส่งข้อความระหว่าง sensor, simulator, Node-RED และระบบอื่นๆ ใน lab ต่อไป

```text
Publisher
    |
    | MQTT message
    v
Mosquitto Broker
    |
    | MQTT message
    v
Subscriber
```

ในชุด lab นี้ Mosquitto ทำหน้าที่เป็น message hub ไม่ได้ประมวลผลข้อมูลเอง หน้าที่หลักคือรับ message จาก publisher แล้วส่งต่อให้ subscriber ที่ subscribe topic ตรงกัน

## 2.2 วัตถุประสงค์

หลังจบ LAB นักศึกษาสามารถ:

- ตรวจว่า Mosquitto ติดตั้งและทำงานอยู่หรือไม่
- เข้าใจความสัมพันธ์ระหว่าง broker, publisher, subscriber, topic และ payload
- ตรวจ port `1883`
- ทดสอบ publish และ subscribe ภายในเครื่องเดียวกัน
- ตั้งค่า authentication พื้นฐานสำหรับ lab
- ตรวจ log เมื่อ Mosquitto มีปัญหา
- แยกปัญหา broker ออกจากปัญหา Node-RED หรือ sensor ได้

## 2.3 Architecture

```text
Terminal A                      Terminal B
mosquitto_sub                   mosquitto_pub
     |                                |
     | subscribe topic                | publish payload
     v                                v
+-------------------------------------------+
| Mosquitto Broker on Raspberry Pi          |
| port: 1883                                |
+-------------------------------------------+
```

## 2.4 ตรวจสถานะ Mosquitto

ตรวจ service:

```bash
systemctl status mosquitto --no-pager
```

ถ้า service ยังไม่ทำงาน ให้เริ่ม service:

```bash
sudo systemctl enable --now mosquitto
```

ตรวจ version:

```bash
mosquitto -h
```

ตรวจ port:

```bash
ss -lntp | grep 1883
```

ผลที่คาดหวัง:

```text
mosquitto listening on port 1883
```

## 2.5 Topic และ Payload

ใน lab นี้ใช้ topic มาตรฐาน:

```text
pkru/iot/001/data
```

payload ตัวอย่าง:

```json
{"temp":28.5,"humi":70,"light":1200}
```

องค์ประกอบ MQTT:

| คำ | ความหมาย |
|---|---|
| Broker | ตัวกลางรับส่ง message |
| Publisher | ฝั่งส่ง message |
| Subscriber | ฝั่งรับ message |
| Topic | ชื่อช่องทางของ message |
| Payload | ข้อมูลที่อยู่ใน message |

## 2.6 ทดสอบ Subscriber

เปิด terminal แรกบน Raspberry Pi:

```bash
mosquitto_sub -h localhost -t "pkru/iot/001/data" -v
```

คำอธิบาย option:

| Option | ความหมาย |
|---|---|
| `-h localhost` | broker อยู่เครื่องเดียวกัน |
| `-t` | topic ที่ต้องการรับ |
| `-v` | แสดง topic พร้อม payload |

## 2.7 ทดสอบ Publisher

เปิด terminal ที่สองแล้วส่ง message:

```bash
mosquitto_pub -h localhost \
  -t "pkru/iot/001/data" \
  -m '{"temp":28.5,"humi":70,"light":1200}'
```

terminal แรกควรเห็นผล:

```text
pkru/iot/001/data {"temp":28.5,"humi":70,"light":1200}
```

ถ้าเห็นผลนี้ แปลว่า data path พื้นฐานทำงานแล้ว:

```text
Publisher -> Broker -> Subscriber
```

## 2.8 ทดสอบจากเครื่องอื่นใน LAN

บนเครื่องอื่น ให้ใช้ IP ของ Raspberry Pi แทน `localhost`:

```bash
mosquitto_sub -h PI_IP -t "pkru/iot/001/data" -v
```

ส่งข้อมูลจากอีก terminal:

```bash
mosquitto_pub -h PI_IP \
  -t "pkru/iot/001/data" \
  -m '{"temp":29.1,"humi":68,"light":900}'
```

> เปลี่ยน `PI_IP` เป็น IP จริงจาก LAB 01

## 2.9 Authentication พื้นฐาน

ไฟล์รหัสผ่านที่ใช้ใน lab:

```text
/etc/mosquitto/passwd
```

สร้าง user สำหรับ lab:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd iotuser
```

ตั้งสิทธิ์ไฟล์:

```bash
sudo chown root:mosquitto /etc/mosquitto/passwd
sudo chmod 640 /etc/mosquitto/passwd
```

ตรวจว่า user `mosquitto` อ่านไฟล์ได้:

```bash
sudo -u mosquitto test -r /etc/mosquitto/passwd && echo "READ OK" || echo "CANNOT READ"
```

## 2.10 Config สำหรับ Lab

ไฟล์ config แนะนำ:

```text
/etc/mosquitto/conf.d/iot-lab.conf
```

ตัวอย่างเนื้อหา:

```conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
```

restart service:

```bash
sudo systemctl restart mosquitto
systemctl status mosquitto --no-pager
```

## 2.11 ทดสอบแบบใช้ Username และ Password

Subscriber:

```bash
mosquitto_sub -h localhost \
  -u iotuser \
  -P 'YOUR_PASSWORD' \
  -t "pkru/iot/001/data" \
  -v
```

Publisher:

```bash
mosquitto_pub -h localhost \
  -u iotuser \
  -P 'YOUR_PASSWORD' \
  -t "pkru/iot/001/data" \
  -m '{"temp":30,"humi":65,"light":1000}'
```

## 2.12 ตรวจ Log เมื่อมีปัญหา

ตรวจสถานะ:

```bash
systemctl status mosquitto --no-pager
```

อ่าน log ล่าสุด:

```bash
journalctl -u mosquitto -n 80 --no-pager
```

ดู log แบบต่อเนื่อง:

```bash
journalctl -u mosquitto -f
```

ปัญหาที่พบบ่อย:

| อาการ | สาเหตุที่เป็นไปได้ |
|---|---|
| connection refused | service ไม่ทำงานหรือ port ไม่เปิด |
| not authorised | username/password ผิด หรือ config บังคับ auth |
| no route to host | network หรือ IP ผิด |
| subscribe แล้วไม่เห็นข้อมูล | topic ไม่ตรงกัน |

## 2.13 Checklist ก่อนจบ LAB

- Mosquitto service เป็น `active`
- Port `1883` เปิด
- Subscribe และ publish บนเครื่องเดียวกันได้
- Subscribe และ publish จากเครื่องอื่นใน LAN ได้ หรือรู้สาเหตุที่ยังไม่ได้
- ทดสอบ authentication ได้
- อ่าน log Mosquitto ได้

## 2.14 งานส่ง LAB

ให้ส่งหลักฐาน:

```text
1. ผล systemctl status mosquitto
2. ผล ss -lntp ที่เห็น port 1883
3. Screenshot หรือข้อความจาก mosquitto_sub ที่รับ payload ได้
4. สรุปปัญหาที่พบและวิธีตรวจสอบ
```

## 2.15 เชื่อมไป LAB ถัดไป

LAB 03 จะใช้ Mosquitto ที่ตั้งค่าไว้ใน LAB นี้เพื่อจำลอง sensor data จาก command line แล้วส่งเข้า topic เดียวกันอย่างต่อเนื่อง

