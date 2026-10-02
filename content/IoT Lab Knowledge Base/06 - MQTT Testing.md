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
---

# MQTT Testing

> [!info] แก้ไขล่าสุด
> 2026-10-01 01:53:11 +07


การทดสอบ Publish/Subscribe จาก command line ช่วยตรวจระบบ MQTT ได้ก่อนต่อ
ESP32, sensor หรือ Node-RED

## Subscriber

```bash
mosquitto_sub \
  -h <BROKER-IP> -p 1883 \
  -u iotuser -P 'MQTT_PASSWORD' \
  -t 'pkru/iot/#' -v
```

## Publisher

```bash
mosquitto_pub \
  -h <BROKER-IP> -p 1883 \
  -u iotuser -P 'MQTT_PASSWORD' \
  -t 'pkru/iot/001/data' \
  -m '{"temp":30.5,"humi":70.2,"light":350}'
```

หน้าต่าง Subscriber ต้องแสดงทั้ง topic และ payload การเปิด `mosquitto_sub`
ค้างเพื่อรอข้อความเป็นพฤติกรรมปกติ

## ลำดับการตรวจ

1. ทดสอบ broker ผ่าน `localhost` บน Raspberry Pi
2. ทดสอบจาก client ใน LAN ด้วย IP ของ Pi
3. ตรวจ username/password
4. ตรวจว่า topic ของ publisher ตรงกับ subscription และ wildcard
5. ตรวจ JSON ก่อนส่งต่อให้ Node-RED

## Lab ที่เกี่ยวข้อง

- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker|LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]
- [[03 - LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT จาก Command Line|LAB 03 - ส่งข้อมูล Sensor ผ่าน MQTT]]
- [[IoT Lab Knowledge Base/05 - MQTT Topic Design|MQTT Topic Design]]
- [[IoT Lab Knowledge Base/04 - Mosquitto MQTT Broker|Mosquitto MQTT Broker]]

กลับไป [[index]]
