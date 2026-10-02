---
type: troubleshooting
platform: raspberry-pi
service:
  - mosquitto
  - node-red
  - sqlite
  - bluez
protocol:
  - mqtt
  - bluetooth-le
level: basic
status: tested
tags:
  - iot-lab
  - troubleshooting
---

# Troubleshooting

> [!info] แก้ไขล่าสุด
> 2026-10-01 11:01:15 +07


ตรวจจากชั้นที่ใกล้ service ที่สุดออกไปหา client:

```text
Process/Service → Log → Listening Port → Localhost → LAN Client → Application Data
```

เปลี่ยนทีละจุดและทดสอบซ้ำ เพื่อให้รู้ว่าการแก้ใดทำให้ผลเปลี่ยน

## Mosquitto

- [[Appendix - Troubleshooting Checklist#MQTT เข้าไม่ได้|MQTT เข้าไม่ได้]]
- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker#2.8 ตรวจปัญหาหลังแก้ Config|Broker ไม่เริ่มหลังแก้ Config]]
- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker#2.2 โครงสร้าง Config ที่ใช้|Password file permission]]
- [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker#2.6 ทดสอบ Anonymous Access|Authentication failed / Anonymous access]]

## Network / Wi-Fi

- [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi#ตรวจสถานะเครือข่าย|ตรวจว่าใช้ LAN หรือ Wi-Fi]]
- [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi#สร้าง Wi-Fi Profile|สร้าง Wi-Fi Profile]]
- [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi#ลบ Wi-Fi Configuration เก่าจาก Netplan|แก้ Netplan และ Profile เก่า]]

## Node-RED

- [[Appendix - Troubleshooting Checklist#Node-RED ไม่ขึ้น|Node-RED ไม่ขึ้น]]
- [[Appendix - Troubleshooting Checklist#Dashboard ไม่เปลี่ยน|Dashboard ไม่เปลี่ยน]]
- [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT#5.5 แยกชั้นปัญหาเมื่อเข้า Editor ไม่ได้|เข้า Editor ไม่ได้]]

## SQLite

- [[Appendix - Troubleshooting Checklist#SQLite ไม่มี Record|SQLite ไม่มี Record]]
- [[Appendix - Troubleshooting Checklist#Statistics หายเป็นช่วง ๆ|Statistics หายเป็นช่วง ๆ]]
- [[12 - LAB 12 - แยก SQLite Write และ Statistics Flow|สาเหตุ INSERT ทำค่า Statistics หาย]]

## Bluetooth / BTHome

- [[Appendix - Troubleshooting Checklist#Bluetooth ขึ้น NotReady|Bluetooth ขึ้น NotReady]]
- [[Appendix - Troubleshooting Checklist#BTHome พบ MAC แต่ไม่มี temp/humi ทุก packet|BTHome packet มีข้อมูลไม่ครบ]]
- [[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]

## คำสั่งพื้นฐาน

```bash
systemctl status SERVICE --no-pager
journalctl -u SERVICE -n 50 --no-pager
ss -lntp
```

กลับไป [[index]]
