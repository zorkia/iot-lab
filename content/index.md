---
type: moc
platform: raspberry-pi
service:
  - mosquitto
  - node-red
  - sqlite
protocol:
  - mqtt
  - bluetooth-le
level: basic
status: maintained
tags:
  - iot-lab
  - moc
---

# IoT Lab MOC

> [!info] แก้ไขล่าสุด
> 2026-10-02 09:24:55 +07


หน้าเริ่มต้นสำหรับค้นคว้าและสอนระบบ IoT บน Raspberry Pi เนื้อหาแบ่งเป็น
Reference สำหรับทบทวนแนวคิด, Lab สำหรับลงมือทำ และเอกสาร Remote Access
สำหรับการเข้าถึงระบบจากภายนอก

## System

- [[IoT Lab Knowledge Base/00 - Installation Roadmap|Installation Roadmap]]
- [[IoT Lab Knowledge Base/01 - Raspberry Pi Setup|Raspberry Pi Setup]]
- [[IoT Lab Knowledge Base/02 - Raspberry Pi Network and Wi-Fi|Raspberry Pi Network and Wi-Fi]]
- [[IoT Lab Knowledge Base/03 - Raspberry Pi IoT Architecture|Raspberry Pi IoT Architecture]]
- [[Cloudflare Tunnel Setup|Cloudflare Tunnel Setup]]
- [[SSH Cloudflare Tunnel|SSH Cloudflare Tunnel]]
- Lab: [[25 - LAB 25 - Remote Access with Cloudflare Tunnel|LAB 25 - Remote Access with Cloudflare Tunnel]]
- Lab: [[26 - LAB 26 - Backup and Recovery for Raspberry Pi IoT Gateway|LAB 26 - Backup and Recovery]]

## MQTT

- [[IoT Lab Knowledge Base/04 - Mosquitto MQTT Broker|Mosquitto MQTT Broker]]
- [[IoT Lab Knowledge Base/05 - MQTT Topic Design|MQTT Topic Design]]
- [[IoT Lab Knowledge Base/06 - MQTT Testing|MQTT Testing]]
- Lab: [[02 - LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker|LAB 02 - ติดตั้งและทดสอบ Mosquitto MQTT Broker]]
- Lab: [[16 - LAB 16 - MQTT Topic Design for Multi-device IoT|LAB 16 - MQTT Topic Design for Multi-device IoT]]
- Lab: [[24 - LAB 24 - MQTT Security - Authentication and ACL|LAB 24 - MQTT Security]]

## Node-RED

- [[IoT Lab Knowledge Base/07 - Node-RED MQTT|Node-RED MQTT]]
- [[IoT Lab Knowledge Base/08 - FlowFuse Dashboard|FlowFuse Dashboard]]
- [[Node-RED Cloudflare Tunnel|Node-RED Cloudflare Tunnel]]
- Lab: [[04 - LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT|LAB 04 - ตั้งค่า Node-RED สำหรับ MQTT]]
- Lab: [[13 - LAB 13 - Rule & Alert Processing|LAB 13 - Rule & Alert Processing]]
- Lab: [[14 - LAB 14 - MQTT Manual Control|LAB 14 - MQTT Manual Control]]
- Lab: [[15 - LAB 15 - Automatic Control|LAB 15 - Automatic Control]]
- Lab: [[17 - LAB 17 - Multi-device Dashboard|LAB 17 - Multi-device Dashboard]]
- Lab: [[18 - LAB 18 - Device Status and Offline Detection|LAB 18 - Device Status and Offline Detection]]
- Lab: [[19 - LAB 19 - Data Quality - VALID INVALID STALE|LAB 19 - Data Quality]]

## Python / Gateway Application

- Lab: [[20 - LAB 20 - Python MQTT Application on Raspberry Pi|LAB 20 - Python MQTT Application]]
- Lab: [[21 - LAB 21 - systemd Service - Autonomous Python IoT Gateway|LAB 21 - systemd Service]]
- Lab: [[22 - LAB 22 - IoT Gateway - BLE UDP MQTT Protocol Translation|LAB 22 - IoT Gateway Protocol Translation]]
- Lab: [[23 - LAB 23 - Offline Store-and-Forward with SQLite|LAB 23 - Offline Store-and-Forward]]
- Lab: [[27 - LAB 27 - Fault-Tolerant IoT Gateway|LAB 27 - Fault-Tolerant IoT Gateway]]

## Database

- [[IoT Lab Knowledge Base/09 - SQLite Sensor Data|SQLite Sensor Data]]
- [[IoT Lab Knowledge Base/10 - SQL Statistics|SQL Statistics]]
- Lab: [[08 - LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite|LAB 08 - สร้างฐานข้อมูลและบันทึกข้อมูล MQTT ลง SQLite]]

## BLE / BTHome

- [[IoT Lab Knowledge Base/11 - Bluetooth Setup|Bluetooth Setup]]
- [[IoT Lab Knowledge Base/12 - BTHome Scan|BTHome Scan]]
- [[IoT Lab Knowledge Base/13 - Mijia BTHome Decode|Mijia BTHome Decode]]
- [[IoT Lab Knowledge Base/15 - Python BLE Environment and Libraries|Python BLE Environment and Libraries]]
- Optional: [[Optional - อ่านค่า Mijia BTHome ผ่าน BLE|อ่านค่า Mijia BTHome ผ่าน BLE]]

## Troubleshooting

- [[IoT Lab Knowledge Base/14 - Troubleshooting|Troubleshooting Index]]
- [[Appendix - Troubleshooting Checklist|Troubleshooting Checklist]]

## Teaching Guide

- [[00 - IoT Lab Teaching Guide - Hub|IoT Lab Teaching Guide - Hub]]
- [[00 - IoT Lab Teaching Guide - Hub|เป้าหมายและเส้นทางการเรียน]]
- [[สรุปผลและเส้นทางต่อไป|สรุปผลและเส้นทางต่อไป]]
- Lab: [[28 - LAB 28 - Integrated IoT Mini Project|LAB 28 - Integrated IoT Mini Project]]
