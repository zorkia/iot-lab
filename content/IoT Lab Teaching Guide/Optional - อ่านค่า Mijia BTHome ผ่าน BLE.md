> [[00 - IoT Lab Teaching Guide - Hub|กลับหน้า Hub]]

# Optional --- อ่านค่า Mijia BTHome ผ่าน BLE

> [!info] แก้ไขล่าสุด
> 2026-10-01 10:55:15 +07


หัวข้อนี้เป็น optional BLE extension ไม่อยู่ในลำดับ Lab หลัก เพราะเส้นทางหลักควรต่อจาก
MQTT, Dashboard, SQLite และ Statistics ไปสู่ Rules / Control / Reliability ก่อน

เป้าหมายช่วงนี้คืออ่านค่า Mijia หลายตัวผ่าน BLE Advertisement แล้วแสดง
`temp`, `humi`, `batt` แยกตาม MAC โดยยังไม่ต่อ MQTT

## ภาพรวม

```text
Mijia หลายตัว
    ↓
BTHome BLE Advertisement
    ↓
Raspberry Pi
    ↓
อ่าน temp / humi / batt
```

**ช่วงแรกหยุดแค่ "อ่านแล้วแสดง" ไม่รีบต่อ MQTT**

Reference หลัก:

- [[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]
- [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]
- [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]
- [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

## ตรวจ Bluetooth บน Raspberry Pi

เป้าหมายคือยืนยันว่า Bluetooth controller พร้อมสำหรับ BLE scan

ผลที่ต้องได้:

```text
Soft blocked: no
Hard blocked: no
Powered: yes
PowerState: on
```

ถ้าพบ `Soft blocked: yes` หรือ `PowerState: off-blocked` ให้แก้ตาม
[[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]

## Scan BTHome Advertisement

เป้าหมายคือยืนยันว่า Raspberry Pi เห็น Advertisement จาก Mijia

ผลที่ต้องยืนยัน:

```text
เห็น MAC ของ Mijia
เห็น BTHome Service UUID 0000fcd2-0000-1000-8000-00805f9b34fb
ไม่ต้อง pair
ไม่ต้อง connect
```

รายละเอียดคำสั่งอยู่ที่ [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]

## เตรียม Python Environment และ Library

เป้าหมายคือใช้ Python virtual environment สำหรับงาน BLE/BTHome
โดยไม่ติดตั้ง library ปนกับ Python ของระบบ

ผลที่ต้องยืนยัน:

```text
activate ~/iot-venv ได้
ติดตั้ง bthome-ble ได้
ติดตั้ง bleak ได้
มี habluetooth เป็น dependency
```

รายละเอียดคำสั่งอยู่ที่
[[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]

## ทดสอบ Bleak ก่อน Decode

เป้าหมายคือทดสอบว่า Python + Bleak อ่าน Advertisement จาก Mijia ได้
ก่อนเริ่ม decode ค่า BTHome

โค้ดและคำสั่งอยู่ที่
[[IoT Lab Knowledge Base/13 - Mijia BTHome Decode#ทดสอบ Bleak ก่อน Decode|Mijia BTHome Decode - ทดสอบ Bleak ก่อน Decode]]

ผลที่ต้องยืนยัน:

```text
Mijia → BLE → Raspberry Pi → Bleak
```

## ตรวจ API ของ bthome-ble

เป้าหมายคือฝึกตรวจ API ของ library ที่ติดตั้งจริงก่อนเขียนโค้ด decode

คำสั่งตรวจ API อยู่ที่
[[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries#ตรวจ API ของ bthome-ble และ habluetooth|Python BLE Environment and Libraries - ตรวจ API]]

ผลที่ต้องยืนยัน:

```text
BTHomeBluetoothDeviceData
BTHomeBluetoothDeviceData.update()
BluetoothServiceInfoBleak.from_device_and_advertisement_data()
```

## Decode BTHome

เป้าหมายคือเข้าใจลำดับการแปลง BLE Advertisement เป็นค่า sensor
และรู้ว่าค่าในแต่ละ packet อาจมาไม่ครบ

รายละเอียดการ decode อยู่ที่ [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]

ผลที่ต้องยืนยัน:

```text
อ่าน battery ได้
อ่าน temperature ได้
อ่าน humidity ได้
รู้ว่าต้องเก็บค่าล่าสุดแยกตาม MAC
```

## โปรแกรมอ่าน Mijia หลายตัว

เป้าหมายคือรันโปรแกรมอ่าน Mijia หลายตัว และแสดง `temp`, `humi`, `batt`
ให้ถูกต้องก่อนนำข้อมูลไปใช้กับ MQTT

โค้ดอยู่ที่
[[IoT Lab Knowledge Base/13 - Mijia BTHome Decode#โปรแกรมอ่าน Mijia หลายตัว|Mijia BTHome Decode - โปรแกรมอ่าน Mijia หลายตัว]]

ผลที่ต้องยืนยัน:

```text
เห็นค่า temp
เห็นค่า humi
เห็นค่า batt
เก็บค่าล่าสุดแยกตาม MAC ได้
```

ณ จุดนี้ยังไม่ต่อ MQTT ตามลำดับการสอนที่กำหนดไว้: อ่านและแสดงให้ถูกต้องก่อน

------------------------------------------------------------------------
