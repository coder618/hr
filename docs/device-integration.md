# Biometric & External Device Integration Guide

This guide details how external biometric devices (e.g. ZKTeco, Hikvision, Realand) and custom hardware punch clocks communicate with the Office Management System on cPanel shared hosting.

---

## 1. Hosting Realities & cPanel Constraints

1. **Plain HTTP Support:** Many biometric attendance devices have fixed firmware that either does not support HTTPS or only supports deprecated TLS 1.0/1.1 protocols rejected by modern SSL certificates.
2. **Apache `.htaccess` Exemption:** The system includes a dedicated rule in `backend/public/.htaccess` that redirects all normal web traffic to HTTPS **except** device push routes matching `/api/v1/devices/*`.
3. **Lightweight Ingestion:** Device endpoints accept punches, validate HMAC / device secret, write raw records to `attendance_punch_logs`, and immediately return HTTP 200/OK. Heavy punch calculations are deferred to scheduled queue batches.

---

## 2. Authentication Mechanism

Every biometric terminal is registered in the tenant's admin dashboard:
* **Device Serial Number:** e.g. `ZK-SN9827364`
* **Branch Assignment:** Determines physical office location and geofence.
* **API Key / Secret:** Generated on device creation and stored as a hash (`bcrypt` / `sha256`).

### Device Authentication Header
Devices or push forwarders authenticate via HTTP headers:
```http
X-Device-Serial: ZK-SN9827364
X-Device-Key: sec_live_9a8b7c6d5e...
Content-Type: application/json
```

---

## 3. Generic JSON Push Endpoint

### Endpoint
`POST /api/v1/devices/punches`

### Request Payload
```json
{
  "device_serial": "ZK-SN9827364",
  "punches": [
    {
      "device_user_id": "10042",
      "timestamp": "2026-11-20 09:04:12",
      "punch_type": "check_in",
      "verify_mode": 1
    },
    {
      "device_user_id": "10088",
      "timestamp": "2026-11-20 09:05:30",
      "punch_type": "check_in",
      "verify_mode": 15
    }
  ]
}
```

### Idempotency & Debounce
* A unique database constraint on `[organization_id, device_id, employee_id, punch_time]` prevents duplicate writes.
* The processing engine applies a configurable debounce window (default: 60 seconds) to prevent accidental double-taps.

---

## 4. ZKTeco ADMS / Push Protocol Driver

For devices communicating natively via ZKTeco ADMS protocol:
* **Handshake / Config Endpoint:** `GET /api/v1/devices/zkteco/iclock/cdata?SN=...`
* **Punch Push Endpoint:** `POST /api/v1/devices/zkteco/iclock/cdata?SN=...&table=ATTLOG`
* **Server Response:** Returns plain text `OK` or formatted command instructions expected by ZK terminals.
