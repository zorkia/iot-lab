> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]

# Appendix --- Troubleshooting Checklist

> [!info] แก้ไขล่าสุด
> 2026-10-01 11:01:15 +07


หน้านี้เป็น checklist สำหรับใช้ระหว่างสอนหรือใช้แก้ปัญหาหลังทำ Lab ไม่ใช่ Lab หลัก
เพราะไม่มีโจทย์ปฏิบัติและผลลัพธ์เฉพาะที่ต้องส่ง

## หลักการตรวจแบบแยกชั้น

สำหรับ service ที่เชื่อมต่อผ่านเครือข่าย ให้ตรวจจากใกล้ไปไกล:

```text
Process/Service → Log → Listening Port → Localhost → LAN Client → Application Data
```

วิธีนี้ช่วยระบุว่าปัญหาอยู่ที่โปรแกรม, config, permission, port หรือ network
แทนการเปลี่ยนหลายค่าในเวลาเดียวกัน

## MQTT เข้าไม่ได้

ตรวจ:

```bash
systemctl status mosquitto --no-pager
ss -lntp | grep 1883
journalctl -u mosquitto -n 50 --no-pager
```

ตรวจ username/password และ topic หากเพิ่งแก้ password file ให้ทดสอบสิทธิ์อ่าน:

```bash
sudo -u mosquitto test -r /etc/mosquitto/passwd && echo "READ OK" || echo "CANNOT READ"
```

ทดสอบ `localhost` บน Pi ก่อน แล้วจึงเปลี่ยนเป็น IP ของ Pi เพื่อทดสอบจาก LAN

## Node-RED ไม่ขึ้น

```bash
systemctl status nodered --no-pager
ss -lntp | grep 1880
curl -I http://localhost:1880
journalctl -u nodered.service -n 50 --no-pager
```

เปิด:

```text
http://PI_IP:1880
```

ถ้า `localhost` ได้แต่ `PI_IP` ไม่ได้ ปัญหามักอยู่ที่ interface ที่กำลัง listen,
IP ที่ใช้, firewall หรือเส้นทางเครือข่าย ไม่ใช่ flow ภายใน Node-RED

## Service เริ่มไม่ได้หลังแก้ Config

ตรวจสถานะและ log โดยแทน `SERVICE` ด้วยชื่อจริง:

```bash
systemctl status SERVICE --no-pager
journalctl -u SERVICE -n 50 --no-pager
```

มองหาข้อความ `permission denied`, `address already in use`, ชื่อ option ที่ไม่รู้จัก
หรือ path ของไฟล์ที่ไม่มีอยู่ แล้วแก้ทีละสาเหตุ ก่อน restart และตรวจซ้ำ

## Dashboard ไม่เปลี่ยน

ตรวจลำดับ:

```text
MQTT In
  ↓
JSON
  ↓
Debug
  ↓
Change
  ↓
Gauge/Chart
```

หลัง Change ต้องเป็นตัวเลขใน `msg.payload`

## SQLite ไม่มี Record

ตรวจ:

```bash
sqlite3 /home/PI_USER/iot.db
```

```sql
.tables
.schema sensor_data
SELECT * FROM sensor_data ORDER BY id DESC LIMIT 10;
```

## Statistics หายเป็นช่วง ๆ

ตรวจว่า INSERT และ SELECT ใช้ SQLite output path เดียวกันหรือไม่ ให้แยก:

```text
SQLite WRITE
SQLite STAT
```

## Bluetooth ขึ้น NotReady

```bash
rfkill list bluetooth
```

ถ้า:

```text
Soft blocked: yes
```

ใช้:

```bash
sudo rfkill unblock bluetooth
bluetoothctl power on
```

## BTHome พบ MAC แต่ไม่มี temp/humi ทุก packet

เป็นพฤติกรรมที่พบจริง: BTHome packet สามารถสลับ object ที่ broadcast ได้
โปรแกรมต้องเก็บ latest values แยกตาม MAC ไม่ควรบังคับให้ packet เดียวมีทุก field

------------------------------------------------------------------------
