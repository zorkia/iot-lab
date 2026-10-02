---
type: reference
platform: raspberry-pi
service: python
protocol: bthome
level: intermediate
status: tested
tags:
  - iot-lab
  - bluetooth
  - bthome
  - mijia
---

# Mijia BTHome Decode

> [!info] แก้ไขล่าสุด
> 2026-10-01 10:55:15 +07


เส้นทางแปลง Advertisement ของ Mijia LYWSD03MMC ที่ใช้ BTHome:

```text
Bleak Advertisement
        ↓
BluetoothServiceInfoBleak.from_device_and_advertisement_data()
        ↓
BTHomeBluetoothDeviceData.update()
        ↓
SensorUpdate
```

ค่าที่ต้องการจาก `SensorUpdate.entity_values` คือ `temperature`, `humidity`
และ `battery` พร้อม RSSI จาก Advertisement

## หลักการสำคัญ

- สร้าง parser แยกตาม MAC เพื่อรักษา state ของแต่ละ sensor
- Advertisement แต่ละ packet อาจมี object ไม่ครบ
- เก็บค่าล่าสุดแยกตาม MAC แล้วอัปเดตเฉพาะ field ที่มีใน packet
- อย่าสรุปว่า sensor ไม่มีค่าอุณหภูมิจาก packet เพียงรอบเดียว
- ตรวจ API ของ library เวอร์ชันที่ติดตั้งจริงด้วย `dir()`, `help()` หรือ
  `inspect` ก่อนเขียนโค้ดตามตัวอย่างจากเวอร์ชันอื่น

ลำดับการสอนควรหยุดที่ “อ่านและแสดงผลถูกต้อง” ก่อนเชื่อมออก MQTT
เพื่อลดจำนวนระบบที่ต้องแก้พร้อมกัน

## ทดสอบ Bleak ก่อน Decode

ใช้โค้ดนี้เพื่อตรวจว่า Raspberry Pi เห็น BLE Advertisement จาก Mijia จริง
ก่อนส่งข้อมูลเข้า decoder:

```python
import asyncio
from bleak import BleakScanner


def callback(device, advertisement_data):
    if device.address.upper().startswith("AA:BB:CC"):
        print(
            device.address,
            "RSSI =", advertisement_data.rssi,
            "ServiceData =", advertisement_data.service_data
        )


async def main():
    scanner = BleakScanner(callback)
    await scanner.start()

    print("Scanning Mijia BLE...")
    await asyncio.sleep(30)

    await scanner.stop()


asyncio.run(main())
```

บันทึกเป็นไฟล์:

```bash
nano ~/ble_scan.py
```

รัน:

```bash
python ~/ble_scan.py
```

ตัวอย่างผลที่ต้องการ:

```text
AA:BB:CC:00:00:01 RSSI = -54 ServiceData = {'0000fcd2-0000-1000-8000-00805f9b34fb': ...}
AA:BB:CC:00:00:02 RSSI = -54 ServiceData = {'0000fcd2-0000-1000-8000-00805f9b34fb': ...}
AA:BB:CC:00:00:03 RSSI = -48 ServiceData = {'0000fcd2-0000-1000-8000-00805f9b34fb': ...}
```

## โปรแกรมอ่าน Mijia หลายตัว

โค้ดนี้ใช้สำหรับขั้น “อ่านและแสดง” โดยยังไม่ต่อ MQTT:

```python
import asyncio
import time

from bleak import BleakScanner
from habluetooth import BluetoothServiceInfoBleak
from bthome_ble import BTHomeBluetoothDeviceData


# BTHome parser ของแต่ละอุปกรณ์
parsers = {}

# ค่าล่าสุดของแต่ละอุปกรณ์
sensors = {}


def callback(device, adv):
    # รับเฉพาะ BTHome
    if not any("fcd2" in uuid.lower() for uuid in adv.service_data):
        return

    mac = device.address.upper()

    info = BluetoothServiceInfoBleak.from_device_and_advertisement_data(
        device=device,
        advertisement_data=adv,
        source="local",
        time=time.monotonic(),
        connectable=False,
    )

    parser = parsers.setdefault(
        mac,
        BTHomeBluetoothDeviceData()
    )

    try:
        result = parser.update(info)

        if mac not in sensors:
            sensors[mac] = {
                "temp": None,
                "humi": None,
                "batt": None
            }

        for key, value in result.entity_values.items():
            name = key.key
            val = value.native_value

            if name == "temperature":
                sensors[mac]["temp"] = val

            elif name == "humidity":
                sensors[mac]["humi"] = val

            elif name == "battery":
                sensors[mac]["batt"] = val

        data = sensors[mac]

        if (
            data["temp"] is not None
            and data["humi"] is not None
            and data["batt"] is not None
        ):
            print(
                f"{mac} | "
                f"temp={data['temp']:.2f} °C | "
                f"humi={data['humi']:.2f} % | "
                f"batt={data['batt']} %"
            )

    except Exception as e:
        print(mac, "ERROR:", e)


async def main():
    print("Scanning Mijia BTHome...")
    print("Press Ctrl+C to stop\n")

    scanner = BleakScanner(callback)
    await scanner.start()

    try:
        while True:
            await asyncio.sleep(1)
    finally:
        await scanner.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")
```

บันทึกเป็นไฟล์:

```bash
nano ~/bthome_scan.py
```

รัน:

```bash
python ~/bthome_scan.py
```

หยุด:

```text
Ctrl+C
```

ตัวอย่างผลที่คาดว่าจะได้:

```text
AA:BB:CC:00:00:04 | temp=23.57 °C | humi=71.31 % | batt=74 %
AA:BB:CC:00:00:05 | temp=23.87 °C | humi=71.74 % | batt=32 %
```

## Lab ที่เกี่ยวข้อง

- [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]]
- [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]
- [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

กลับไป [[index]]
