# Prithvi Grid — API Documentation

**Base URL:** `https://api.prithvigrid.com/v1`  
**Real-time:** `wss://api.prithvigrid.com` (Socket.IO)  
**Auth:** Bearer JWT token in `Authorization` header  
**Content-Type:** `application/json` (unless noted)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Telemetry](#2-telemetry)
3. [Verification](#3-verification)
4. [Sanjivani Alerts](#4-sanjivani-alerts)
5. [Odor Predictor](#5-odor-predictor)
6. [Pit Monitor](#6-pit-monitor)
7. [Alarm Control](#7-alarm-control)
8. [Asset Management](#8-asset-management)
9. [User Management](#9-user-management)
10. [HQ Admin Endpoints](#10-hq-admin-endpoints)
11. [Socket.IO Events](#11-socketio-events)

---

## 1. Authentication

### `POST /auth/send-otp`

Sends a one-time password to the given phone number via WhatsApp/SMS.

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "otpSentAt": "2024-10-15T09:00:00.000Z",
    "expiresInSeconds": 300
  },
  "message": "OTP sent to +919876543210"
}
```

**Response 429 (rate limited):**
```json
{
  "success": false,
  "error": "Too many OTP requests. Try again after 15 minutes.",
  "code": "OTP_RATE_LIMITED",
  "statusCode": 429
}
```

---

### `POST /auth/verify-otp`

Verifies the OTP and issues a signed JWT.

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "847291"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-10-22T09:00:00.000Z",
    "user": {
      "id": "usr_01J2KX8M9P",
      "name": "Ravi Kumar",
      "role": "SAFAI_MITRA",
      "entityId": "ent_01J2BWG001",
      "assignedBoxes": ["box_001", "box_002", "box_007"],
      "assignedNodes": ["node_001", "node_002"]
    }
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": "Invalid or expired OTP.",
  "code": "OTP_INVALID",
  "statusCode": 401
}
```

---

### `POST /auth/refresh`

Refreshes an expiring JWT token.

**Headers:** `Authorization: Bearer <current_token>`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-10-29T09:00:00.000Z"
  }
}
```

---

### `POST /auth/logout`

Invalidates the current token (adds to Redis blocklist).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

---

## 2. Telemetry

### `GET /telemetry/live/:facilityId`

Returns the most recent telemetry reading for a facility (served from Redis cache).

**Access:** SAFAI_MITRA (own facilities), BWG_MANAGER, SUPREME_HEAD

**Response 200:**
```json
{
  "success": true,
  "data": {
    "nodeId": "node_001",
    "facilityId": "fac_01J2IMC001",
    "timestamp": "2024-10-15T09:14:32.000Z",
    "tempC": 52.4,
    "moisturePct": 58.7,
    "ph": 6.8,
    "methanePpm": 120,
    "airPressureHpa": 1012.3,
    "batteryMv": 3820,
    "signalRssi": -74
  }
}
```

---

### `GET /telemetry/history/:facilityId`

Returns paginated historical telemetry from the time-series collection.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `from` | ISO 8601 string | 24h ago | Start of time window |
| `to` | ISO 8601 string | now | End of time window |
| `page` | number | 1 | Page number |
| `limit` | number | 100 | Records per page (max 1000) |
| `resolution` | `raw` / `1m` / `5m` / `1h` | `raw` | Aggregation resolution |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "nodeId": "node_001",
        "facilityId": "fac_01J2IMC001",
        "timestamp": "2024-10-15T08:00:00.000Z",
        "tempC": 51.2,
        "moisturePct": 59.1,
        "ph": 6.9,
        "methanePpm": 115,
        "airPressureHpa": 1013.0,
        "batteryMv": 3840,
        "signalRssi": -72
      }
    ],
    "total": 1440,
    "page": 1,
    "limit": 100,
    "totalPages": 15
  }
}
```

---

### `POST /telemetry/ingest`

Ingest endpoint for LoRa gateway / MQTT bridge to push sensor readings.

**Access:** Internal (API key auth, `X-Node-Api-Key` header)

**Request:**
```json
{
  "nodeId": "node_001",
  "facilityId": "fac_01J2IMC001",
  "timestamp": "2024-10-15T09:14:32.000Z",
  "tempC": 52.4,
  "moisturePct": 58.7,
  "ph": 6.8,
  "methanePpm": 120,
  "airPressureHpa": 1012.3,
  "batteryMv": 3820,
  "signalRssi": -74
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "recorded": true,
    "facilityStatus": "HEALTHY"
  }
}
```

---

### `GET /telemetry/summary/:facilityId`

Returns an aggregated 24-hour summary for dashboards.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "facilityId": "fac_01J2IMC001",
    "windowStart": "2024-10-14T09:00:00.000Z",
    "windowEnd": "2024-10-15T09:00:00.000Z",
    "avgTempC": 51.8,
    "avgMoisturePct": 59.4,
    "avgPh": 6.85,
    "maxMethanePpm": 148,
    "avgAirPressureHpa": 1012.7,
    "minBatteryMv": 3780,
    "sampleCount": 1440
  }
}
```

---

## 3. Verification

### `POST /verification/submit`

Safai Mitra submits a pickup photo for AI verification.

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Description |
|---|---|---|
| `photo` | File | JPEG/PNG image (max 10 MB) |
| `facilityId` | string | Facility the photo is for |
| `gpsLat` | number | GPS latitude at time of capture |
| `gpsLong` | number | GPS longitude at time of capture |

**Response 202 (accepted, async verification):**
```json
{
  "success": true,
  "data": {
    "verificationId": "ver_01J2VRF001",
    "status": "PENDING",
    "message": "Photo received. AI verification in progress.",
    "estimatedCompletionMs": 8000
  }
}
```

---

### `GET /verification/:verificationId`

Polls the status of a verification record.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ver_01J2VRF001",
    "safaiMitraId": "usr_01J2KX8M9P",
    "facilityId": "fac_01J2IMC001",
    "photoUrl": "https://cdn.prithvigrid.com/verifications/ver_01J2VRF001.jpg",
    "gpsLat": 12.9716,
    "gpsLong": 77.5946,
    "submittedAt": "2024-10-15T09:14:00.000Z",
    "status": "VERIFIED_GENUINE",
    "aiConfidenceScore": 0.94,
    "aiReason": "Compost pit visible, location GPS matches facility within 50m, organic matter detected.",
    "reviewedAt": null,
    "reviewedBy": null
  }
}
```

---

### `GET /verification/list/:facilityId`

Returns paginated verification records for a facility.

**Query:** `page`, `limit`, `status` (filter by VerificationStatus)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "ver_01J2VRF001",
        "status": "VERIFIED_GENUINE",
        "submittedAt": "2024-10-15T09:14:00.000Z",
        "aiConfidenceScore": 0.94
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### `POST /verification/:verificationId/override`

BWG Manager overrides an AI decision.

**Access:** BWG_MANAGER, SUPREME_HEAD

**Request:**
```json
{
  "decision": "MANAGER_OVERRIDE",
  "reason": "Safai Mitra confirmed in person; GPS drift due to signal blockage."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ver_01J2VRF001",
    "status": "MANAGER_OVERRIDE",
    "overrideReason": "Safai Mitra confirmed in person; GPS drift due to signal blockage.",
    "reviewedBy": "usr_01J2BWG001",
    "reviewedAt": "2024-10-15T10:30:00.000Z"
  }
}
```

---

## 4. Sanjivani Alerts

### `GET /alerts`

Returns active alerts across all facilities the user has access to.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `facilityId` | string | Filter to specific facility |
| `alertType` | AlertType | Filter by type |
| `severity` | string | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `resolved` | boolean | `false` = active only (default), `true` = resolved |
| `page` | number | Page number |
| `limit` | number | Max 100 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "alr_01J2ALR001",
        "facilityId": "fac_01J2IMC001",
        "alertType": "ACID_CRASH",
        "severity": "HIGH",
        "message": "pH dropped to 4.9 — acid crash imminent. Apply lime immediately.",
        "triggeredAt": "2024-10-15T07:20:00.000Z",
        "acknowledgedAt": null,
        "resolvedAt": null,
        "telemetrySnapshot": {
          "ph": 4.9,
          "tempC": 38.2,
          "moisturePct": 72.1
        }
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### `POST /alerts/:alertId/acknowledge`

Acknowledges an alert (confirms it has been seen).

**Request:**
```json
{
  "note": "Dispatching Safai Mitra with lime additive."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "alr_01J2ALR001",
    "acknowledgedAt": "2024-10-15T07:35:00.000Z",
    "acknowledgedBy": "usr_01J2BWG001"
  }
}
```

---

### `POST /alerts/:alertId/resolve`

Marks an alert as resolved.

**Request:**
```json
{
  "resolutionNote": "Lime applied. pH normalised to 6.5 within 2 hours."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "alr_01J2ALR001",
    "resolvedAt": "2024-10-15T10:00:00.000Z",
    "resolvedBy": "usr_01J2BWG001"
  }
}
```

---

### `GET /alerts/sanjivani/status/:facilityId`

Returns the current Sanjivani health engine evaluation for a facility.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "facilityId": "fac_01J2IMC001",
    "evaluatedAt": "2024-10-15T09:00:00.000Z",
    "overallStatus": "ACID_CRASH_RISK",
    "riskScore": 72,
    "recommendations": [
      "Apply 2–3 kg of agricultural lime to neutralise pH.",
      "Reduce moisture input — current moisture (72%) exceeds healthy range.",
      "Turn the pile to improve aeration."
    ],
    "telemetryAtEvaluation": {
      "ph": 5.1,
      "tempC": 40.0,
      "moisturePct": 72.0,
      "methanePpm": 95
    }
  }
}
```

---

## 5. Odor Predictor

### `GET /odor/forecast/:facilityId`

Returns a 4-hour odor risk forecast for the specified facility.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "facilityId": "fac_01J2IMC001",
    "predictedAt": "2024-10-15T09:00:00.000Z",
    "forecastWindowHours": 4,
    "riskScore": 68,
    "riskLevel": "HIGH",
    "contributingFactors": [
      "Elevated methane (120 ppm) — anaerobic activity likely",
      "Low wind speed (2 km/h) — poor dispersion expected",
      "Afternoon temperature rise forecast (+4°C) — volatilisation risk"
    ],
    "weatherContext": {
      "tempC": 32.0,
      "humidity": 78,
      "windSpeedKmh": 2.1,
      "windDirection": "SW"
    }
  }
}
```

---

### `GET /odor/forecast/batch`

Returns odor forecasts for all facilities in the authenticated entity.

**Access:** BWG_MANAGER, SUPREME_HEAD

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "facilityId": "fac_01J2IMC001",
      "riskScore": 68,
      "riskLevel": "HIGH",
      "predictedAt": "2024-10-15T09:00:00.000Z"
    },
    {
      "facilityId": "fac_01J2IMC002",
      "riskScore": 12,
      "riskLevel": "LOW",
      "predictedAt": "2024-10-15T09:00:00.000Z"
    }
  ]
}
```

---

## 6. Pit Monitor

### `GET /pit/:facilityId/status`

Returns current pit fill and lifecycle status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "facilityId": "fac_01J2IMC001",
    "updatedAt": "2024-10-15T09:00:00.000Z",
    "fillPct": 78,
    "estimatedDaysToFull": 6,
    "lastEmptiedAt": "2024-09-28T08:00:00.000Z",
    "lastTurnedAt": "2024-10-10T07:30:00.000Z",
    "lastAdditiveAppliedAt": "2024-10-12T08:00:00.000Z",
    "currentPhase": "ACTIVE_DECOMPOSITION"
  }
}
```

---

### `POST /pit/:facilityId/log-action`

Log a manual pit action (turning, additive, emptying, sealing).

**Request:**
```json
{
  "actionType": "PIT_ADDITIVE_APPLIED",
  "metadata": {
    "additiveType": "LIME",
    "quantityKg": 3,
    "notes": "Applied to neutralise pH spike."
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "actionId": "act_01J2ACT001",
    "actionType": "PIT_ADDITIVE_APPLIED",
    "facilityId": "fac_01J2IMC001",
    "performedBy": "usr_01J2BWG001",
    "timestamp": "2024-10-15T09:30:00.000Z"
  }
}
```

---

## 7. Alarm Control

### `GET /alarms/config/:entityId`

Returns current AI threshold configuration for an entity.

**Access:** BWG_MANAGER, SUPREME_HEAD

**Response 200:**
```json
{
  "success": true,
  "data": {
    "entityId": "ent_01J2BWG001",
    "thresholds": {
      "tempMin": 45,
      "tempMax": 70,
      "moistureMin": 45,
      "moistureMax": 65,
      "methaneAlert": 100,
      "methaneCritical": 200,
      "phAcidCrash": 5.5,
      "pressureCompactionAlert": 1020,
      "verificationWaitMs": 5000,
      "nodeOfflineTimeoutMs": 300000,
      "pitCapacityAlertPct": 85
    }
  }
}
```

---

### `PATCH /alarms/config/:entityId`

Updates AI threshold configuration.

**Access:** SUPREME_HEAD only

**Request:**
```json
{
  "phAcidCrash": 5.8,
  "methaneAlert": 90,
  "pitCapacityAlertPct": 80
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "entityId": "ent_01J2BWG001",
    "updated": ["phAcidCrash", "methaneAlert", "pitCapacityAlertPct"],
    "updatedAt": "2024-10-15T10:00:00.000Z"
  }
}
```

---

### `POST /alarms/test/:facilityId`

Fires a test alert for a facility (for setup verification).

**Access:** SUPREME_HEAD only

**Request:**
```json
{
  "alertType": "ACID_CRASH"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "testAlertId": "alr_test_001",
    "notificationsSent": 3,
    "channels": ["WHATSAPP", "PUSH", "SOCKET"]
  }
}
```

---

## 8. Asset Management

### `GET /assets/nodes`

Returns all sensor nodes in the entity.

**Access:** BWG_MANAGER, SUPREME_HEAD

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "node_001",
        "deviceEui": "A8-40-41-10-00-1A-2B-3C",
        "facilityId": "fac_01J2IMC001",
        "status": "ONLINE",
        "firmwareVersion": "2.4.1",
        "lastSeenAt": "2024-10-15T09:14:32.000Z",
        "batteryMv": 3820,
        "signalRssi": -74,
        "tamperDetected": false,
        "installDate": "2024-06-01T00:00:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### `POST /assets/nodes`

Registers a new sensor node.

**Access:** SUPREME_HEAD only

**Request:**
```json
{
  "deviceEui": "A8-40-41-10-00-1A-2B-4D",
  "facilityId": "fac_01J2IMC003",
  "firmwareVersion": "2.4.1",
  "installDate": "2024-10-15"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "node_013",
    "deviceEui": "A8-40-41-10-00-1A-2B-4D",
    "facilityId": "fac_01J2IMC003",
    "status": "ONLINE",
    "createdAt": "2024-10-15T10:00:00.000Z"
  }
}
```

---

### `PATCH /assets/nodes/:nodeId`

Updates node assignment or status.

**Request:**
```json
{
  "facilityId": "fac_01J2IMC005",
  "status": "ONLINE"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "node_013",
    "facilityId": "fac_01J2IMC005",
    "status": "ONLINE",
    "updatedAt": "2024-10-15T11:00:00.000Z"
  }
}
```

---

### `GET /assets/facilities`

Returns all facilities in the entity.

**Query:** `page`, `limit`, `status` (FacilityStatus filter), `zone`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "fac_01J2IMC001",
        "entityId": "ent_01J2BWG001",
        "facilityName": "Ward 14 IMC Box — Gandhi Nagar",
        "gpsLat": 12.9716,
        "gpsLong": 77.5946,
        "imcZone": "Zone B",
        "status": "HEALTHY",
        "fillPct": 78,
        "compostPhase": "ACTIVE_DECOMPOSITION",
        "sensorNodeId": "node_001"
      }
    ],
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### `POST /assets/facilities`

Creates a new facility.

**Access:** SUPREME_HEAD, BWG_MANAGER

**Request:**
```json
{
  "facilityName": "Ward 18 IMC Box — Nehru Park Gate",
  "gpsLat": 12.9801,
  "gpsLong": 77.5892,
  "imcZone": "Zone C",
  "assignedSafaiMitraIds": ["usr_01J2KX8M9P"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "fac_01J2IMC025",
    "facilityName": "Ward 18 IMC Box — Nehru Park Gate",
    "status": "SENSOR_OFFLINE",
    "createdAt": "2024-10-15T12:00:00.000Z"
  }
}
```

---

## 9. User Management

### `GET /users`

Returns paginated list of users in the authenticated entity.

**Access:** BWG_MANAGER, SUPREME_HEAD

**Query:** `page`, `limit`, `role` (UserRole filter), `isActive` (boolean)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "usr_01J2KX8M9P",
        "name": "Ravi Kumar",
        "phone": "+919876543210",
        "role": "SAFAI_MITRA",
        "entityId": "ent_01J2BWG001",
        "assignedBoxes": ["box_001", "box_002"],
        "assignedNodes": ["node_001"],
        "isActive": true,
        "lastLoginAt": "2024-10-15T08:30:00.000Z"
      }
    ],
    "total": 18,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### `POST /users`

Creates a new user.

**Access:** BWG_MANAGER (can create SAFAI_MITRA), SUPREME_HEAD (can create any role)

**Request:**
```json
{
  "name": "Priya Sharma",
  "phone": "+919812345678",
  "role": "SAFAI_MITRA",
  "entityId": "ent_01J2BWG001",
  "assignedBoxes": ["box_009", "box_010"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "usr_01J2KX8M10",
    "name": "Priya Sharma",
    "role": "SAFAI_MITRA",
    "isActive": true,
    "createdAt": "2024-10-15T12:00:00.000Z"
  }
}
```

---

### `PATCH /users/:userId`

Updates user details or assignments.

**Request:**
```json
{
  "assignedBoxes": ["box_009", "box_010", "box_011"],
  "isActive": true
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "usr_01J2KX8M10",
    "assignedBoxes": ["box_009", "box_010", "box_011"],
    "updatedAt": "2024-10-15T13:00:00.000Z"
  }
}
```

---

### `DELETE /users/:userId`

Deactivates a user (soft delete — sets `isActive: false`).

**Access:** SUPREME_HEAD only

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "usr_01J2KX8M10",
    "isActive": false,
    "deactivatedAt": "2024-10-15T13:30:00.000Z"
  }
}
```

---

## 10. HQ Admin Endpoints

> All HQ endpoints require the `SUPREME_HEAD` role and are served only from `hq.prithvigrid.com` (IP-restricted).

### `GET /hq/dashboard/overview`

Returns aggregated KPIs across all entities for the Supreme Head dashboard.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalEntities": 5,
    "totalFacilities": 120,
    "activeSensorNodes": 115,
    "nodesOffline": 5,
    "facilitiesHealthy": 98,
    "facilitiesAtRisk": 17,
    "activeAlerts": 8,
    "verificationsToday": 342,
    "verificationPassRate": 0.91,
    "avgFillPct": 61.4,
    "odorRiskHighCount": 3,
    "generatedAt": "2024-10-15T09:00:00.000Z"
  }
}
```

---

### `GET /hq/entities`

Returns all registered BWG entities.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ent_01J2BWG001",
      "entityName": "Bruhat Bengaluru Mahanagara Palike — East Zone",
      "entityType": "MUNICIPAL_CORPORATION",
      "city": "Bengaluru",
      "state": "Karnataka",
      "totalFacilities": 24,
      "activeNodes": 23,
      "isActive": true,
      "onboardedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /hq/entities`

Onboards a new entity.

**Request:**
```json
{
  "entityName": "Mysuru City Corporation — North",
  "entityType": "MUNICIPAL_CORPORATION",
  "city": "Mysuru",
  "state": "Karnataka",
  "contactEmail": "swm@mysurucity.gov.in",
  "contactPhone": "+918212345678"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "ent_01J2BWG002",
    "entityName": "Mysuru City Corporation — North",
    "isActive": true,
    "createdAt": "2024-10-15T14:00:00.000Z"
  }
}
```

---

### `GET /hq/reports/compliance`

Generates a compliance report for a date range across one or all entities.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `entityId` | string | Optional — omit for all entities |
| `from` | ISO 8601 | Report start date |
| `to` | ISO 8601 | Report end date |
| `format` | `json` / `csv` | Response format (default `json`) |

**Response 200 (JSON):**
```json
{
  "success": true,
  "data": {
    "reportId": "rpt_01J2RPT001",
    "generatedAt": "2024-10-15T15:00:00.000Z",
    "period": { "from": "2024-10-01", "to": "2024-10-15" },
    "entitySummaries": [
      {
        "entityId": "ent_01J2BWG001",
        "entityName": "BBMP East Zone",
        "totalPickups": 1024,
        "verifiedPickups": 932,
        "complianceRate": 0.91,
        "totalAlerts": 28,
        "criticalAlerts": 3,
        "avgFillPct": 62.1
      }
    ]
  }
}
```

---

### `GET /hq/audit-log`

Returns the action audit log across the platform.

**Query:** `page`, `limit`, `actionType`, `entityId`, `from`, `to`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "act_01J2ACT999",
        "actionType": "THRESHOLD_UPDATED",
        "performedBy": "usr_supreme_001",
        "targetEntityId": "ent_01J2BWG001",
        "metadata": {
          "field": "phAcidCrash",
          "oldValue": 5.5,
          "newValue": 5.8
        },
        "timestamp": "2024-10-15T10:00:00.000Z",
        "ipAddress": "203.0.113.10"
      }
    ],
    "total": 5042,
    "page": 1,
    "limit": 50,
    "totalPages": 101
  }
}
```

---

## 11. Socket.IO Events

Connect to `wss://api.prithvigrid.com` with auth token:

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.prithvigrid.com', {
  auth: { token: '<jwt>' },
  transports: ['websocket', 'polling'],
});
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `subscribe:facility` | `{ facilityId: string }` | Subscribe to live updates for a facility |
| `unsubscribe:facility` | `{ facilityId: string }` | Unsubscribe from a facility room |
| `subscribe:entity` | `{ entityId: string }` | Subscribe to all facilities in an entity (managers) |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `telemetry:update` | `TelemetryReading` | New sensor reading received |
| `alert:new` | `Alert` | New Sanjivani alert triggered |
| `alert:acknowledged` | `{ alertId, acknowledgedBy, at }` | Alert has been acknowledged |
| `alert:resolved` | `{ alertId, resolvedBy, at }` | Alert has been resolved |
| `facility:status_change` | `{ facilityId, oldStatus, newStatus }` | Facility health status changed |
| `node:offline` | `{ nodeId, facilityId, lastSeenAt }` | Sensor node went offline |
| `verification:result` | `{ verificationId, status, score }` | AI verification completed |
| `odor:high_risk` | `OdorPrediction` | Odor risk crossed HIGH threshold |

---

*Documentation version: 1.0.0 — Updated October 2024*
