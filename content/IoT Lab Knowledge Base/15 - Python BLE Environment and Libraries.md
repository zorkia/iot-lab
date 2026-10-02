---
type: reference
platform: raspberry-pi
service: python
protocol:
  - bluetooth-le
  - bthome
level: basic
status: tested
tags:
  - iot-lab
  - python
  - bluetooth
  - bthome
---

# Python BLE Environment and Libraries

> [!info] แก้ไขล่าสุด
> 2026-10-01 10:55:15 +07

ใช้หน้านี้เป็น reference สำหรับ Python environment ที่ใช้กับงาน BLE/BTHome บน Raspberry Pi
โดยแยก library ออกจากระบบหลักด้วย virtual environment

## ตรวจ Environment เดิม

```bash
ls -la ~
```

ในเครื่องที่ใช้สอนพบ environment เดิม:

```text
/home/PI_USER/iot-venv
```

Activate:

```bash
source ~/iot-venv/bin/activate
```

ตรวจ Python และ pip:

```bash
python --version
pip --version
```

เวอร์ชันที่ใช้จริงใน Lab:

```text
Python 3.13.5
pip 25.1.1
```

Prompt หลัง activate ควรมีชื่อ environment:

```text
(iot-venv) PI_USER@PI_HOSTNAME:~ $
```

## สร้าง Environment ใหม่ ถ้ายังไม่มี

```bash
sudo apt update
sudo apt install python3-venv python3-pip -y
python3 -m venv ~/iot-venv
source ~/iot-venv/bin/activate
```

## ติดตั้ง Library สำหรับ BTHome

ภายใน virtual environment:

```bash
pip install bthome-ble bleak
```

ตรวจ package:

```bash
pip show bthome-ble bleak
```

เวอร์ชันที่ใช้จริงใน Lab:

```text
bthome-ble 3.24.0
bleak      3.0.2
```

Dependency สำคัญที่ถูกติดตั้งตามมา:

```text
habluetooth
```

## ตรวจ API ของ bthome-ble และ habluetooth

ตรวจตำแหน่ง library และ object ที่มีจริง:

```bash
python -c "import bthome_ble; print(bthome_ble.__file__); print(dir(bthome_ble))"
```

ควรพบ:

```text
BTHomeBluetoothDeviceData
```

ตรวจ method ของ class:

```bash
python -c "from bthome_ble import BTHomeBluetoothDeviceData; print([x for x in dir(BTHomeBluetoothDeviceData) if not x.startswith('_')])"
```

ควรพบ:

```text
update
```

ตรวจ signature/source ของ `update`:

```bash
python -c "import inspect; from bthome_ble import BTHomeBluetoothDeviceData; print(inspect.signature(BTHomeBluetoothDeviceData.update)); print(inspect.getsource(BTHomeBluetoothDeviceData.update))"
```

ผลที่พบ:

```text
(self, data: 'BluetoothServiceInfo | BluetoothServiceInfoBleak') -> 'SensorUpdate'
```

ตรวจ `habluetooth`:

```bash
python -c "import habluetooth; print([x for x in dir(habluetooth) if 'Bleak' in x or 'ServiceInfo' in x])"
```

ควรพบ:

```text
BluetoothServiceInfo
BluetoothServiceInfoBleak
HaBleakClientWrapper
HaBleakScannerWrapper
```

`BluetoothServiceInfoBleak` เป็น Cython class จึงอาจใช้ `inspect.signature()` ไม่ได้
ให้ดู `help()` แทน:

```bash
python -c "from habluetooth import BluetoothServiceInfoBleak; help(BluetoothServiceInfoBleak)" | head -60
```

factory method ที่ใช้กับ Bleak:

```text
from_device_and_advertisement_data(
    device,
    advertisement_data,
    source,
    time,
    connectable
)
```

บทเรียนสำคัญ: ตรวจ API ของ library เวอร์ชันที่ติดตั้งจริงก่อนเขียนโค้ด
เพราะตัวอย่างจากอินเทอร์เน็ตอาจใช้ชื่อ class หรือ method ของคนละเวอร์ชัน

## Lab ที่เกี่ยวข้อง

- [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]]
- [[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]
- [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]

กลับไป [[index]]
