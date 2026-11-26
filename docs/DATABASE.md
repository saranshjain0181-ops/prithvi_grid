# 🗄️ Prithvi Grid — "Infinite" MongoDB Atlas Data Lake Schema

> **Architecture:** Schema-less Data Lake supporting infinite horizontal scalability. Integrated directly into the Supreme Command Center (hq.prithvigrid.com) as a live editable data grid.

---

## 🏗️ Relational Hierarchy Flow

```
Supreme Head (Super Admin)
  └── Global_Entities (Client Orgs, RWAs, Commercial BWGs)
        └── Facilities_Locations (GPS Lat/Long, IMC Zones & Wards)
              └── Physical_Assets (Compost Boxes)
                    ├── Physical_Assets (ESP32 Master-Slave Nodes)
                    │     └── Live_Telemetry_Lake (Infinite Time-Series)
                    └── User_Auth_Roster (Safai Mitras & BWG Managers)
                          ├── Labour_Execution_Ledger (Kaam Ka Saboot)
                          └── Khad_Kachra_Flow (Material In/Out Ledger)
```

---

## 📑 The 9 Central Collections

### 1. `global_entities`
Root B2B tenant records for bulk waste generators.
```json
{
  "_id": "ObjectId",
  "orgName": "String (e.g. Apollo Hospitals Indore)",
  "orgType": "RWA | COMMERCIAL_ESTABLISHMENT | HOTEL_RESTAURANT | INSTITUTIONAL | MARKET",
  "swmRegNo": "String (unique, e.g. SWM-IND-2026-089)",
  "phone": "String",
  "email": "String",
  "billingAddress": {
    "street": "String",
    "city": "String",
    "state": "String",
    "pincode": "String"
  },
  "imcZone": "String (Zone 1 to Zone 19)",
  "imcWard": "String",
  "active": "Boolean (default: true)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ swmRegNo: 1 }` (Unique)
- `{ active: 1, imcZone: 1 }`

---

### 2. `facilities_locations`
Specific geographic site or composting plant location.
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId -> global_entities",
  "facilityName": "String",
  "gpsLat": "Number (e.g. 22.7196)",
  "gpsLong": "Number (e.g. 75.8577)",
  "imcZone": "String",
  "imcWard": "String",
  "active": "Boolean",
  "createdAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ entityId: 1 }`
- `{ gpsLat: 1, gpsLong: 1 }` (2dsphere geospatial)

---

### 3. `user_auth_roster`
All personnel across the hierarchy: Supreme Head -> BWG Manager -> Safai Mitra.
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId -> global_entities",
  "facilityId": "ObjectId -> facilities_locations",
  "name": "String",
  "phone": "String (10-digit, unique)",
  "role": "SUPREME_HEAD | BWG_MANAGER | SAFAI_MITRA",
  "assignedBoxes": ["ObjectId -> physical_assets"],
  "assignedNodes": ["ObjectId -> physical_assets"],
  "shiftStart": "String (HH:MM e.g. '08:00')",
  "shiftEnd": "String (HH:MM e.g. '16:00')",
  "activeDays": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  "isActive": "Boolean",
  "accessLogs": [
    { "at": "ISODate", "ip": "String", "action": "String" }
  ],
  "lastLoginAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ phone: 1 }` (Unique)
- `{ role: 1, facilityId: 1 }`

---

### 4. `physical_assets`
Compost Boxes and hardware IoT sensor nodes.
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId -> global_entities",
  "facilityId": "ObjectId -> facilities_locations",
  "parentBoxId": "ObjectId (optional, for IOT_NODE)",
  "type": "COMPOST_BOX | IOT_NODE",
  "name": "String",
  "capacityKg": "Number (for boxes)",
  "architectureType": "STANDALONE | MASTER_SLAVE",
  "macAddress": "String (for nodes)",
  "imei": "String (A7670C module)",
  "simNumber": "String (Airtel IoT SIM)",
  "qrCodeUrl": "String (DataURL for scanning)",
  "deviceKeyHash": "String (SHA-256 for hardware authentication)",
  "lastSeenAt": "ISODate",
  "status": "ACTIVE | DECOMMISSIONED"
}
```
**Recommended Indexes:**
- `{ macAddress: 1 }` (Sparse, Unique)
- `{ facilityId: 1, type: 1 }`

---

### 5. `live_telemetry_lake` *(Time-Series Collection)*
Streamed encrypted payloads from ESP32 + A7670C hardware.
```json
{
  "nodeId": "ObjectId -> physical_assets",
  "facilityId": "ObjectId -> facilities_locations",
  "boxId": "ObjectId -> physical_assets",
  "timestamp": "ISODate",
  "tempC": "Number (e.g. 58.4)",
  "moisturePct": "Number (e.g. 52.1)",
  "ph": "Number (e.g. 6.8)",
  "methanePpm": "Number (e.g. 140)",
  "airPressureHpa": "Number (e.g. 1013.25)",
  "batteryMv": "Number (e.g. 3850)",
  "signalRssi": "Number (e.g. -68)",
  "rawEncrypted": "String (optional hex audit)"
}
```
**MongoDB Time-Series Configuration:**
```javascript
db.createCollection("live_telemetry_lake", {
  timeseries: {
    timeField: "timestamp",
    metaField: "nodeId",
    granularity: "minutes"
  },
  expireAfterSeconds: 31536000 // 1 year retention or infinite in data lake tier
});
```

---

### 6. `labour_execution_ledger`
"Kaam Ka Saboot" record with thermodynamic sensor variance validation.
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId",
  "facilityId": "ObjectId",
  "labourId": "ObjectId -> user_auth_roster",
  "managerId": "ObjectId (optional, for overrides)",
  "nodeId": "ObjectId",
  "boxId": "ObjectId",
  "actionType": "String (e.g. KACHRA_GHUMAYA)",
  "actionLabelHi": "String",
  "executedAt": "ISODate",
  "verifiedAt": "ISODate",
  "verificationStatus": "PENDING | VERIFIED_GENUINE | FAKE_FLAG | MANAGER_OVERRIDE",
  "sensorDelta": {
    "temp": "Number (Delta °C)",
    "moisture": "Number (Delta %)",
    "pressure": "Number (Delta hPa)"
  },
  "managerRemark": "String"
}
```
**Recommended Indexes:**
- `{ labourId: 1, executedAt: -1 }`
- `{ verificationStatus: 1 }`

---

### 7. `khad_kachra_flow`
Back-dated manual material inputs and outputs (Visual Calculator digital diary).
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId",
  "facilityId": "ObjectId",
  "boxId": "ObjectId",
  "recordedBy": "ObjectId -> user_auth_roster",
  "flowType": "WASTE_IN | FERTILIZER_OUT | REJECT_OUT | LEACHATE_OUT",
  "weightKg": "Number",
  "wasteCategory": "WET_WASTE | DRY_WASTE | MIXED",
  "recordedAt": "ISODate (Back-dated timestamp)",
  "pitFillKgAfter": "Number (Calculated running pit capacity)",
  "notes": "String",
  "createdAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ boxId: 1, recordedAt: -1 }`
- `{ facilityId: 1, flowType: 1 }`

---

### 8. `ai_alerts_sanjivani`
Triggered emergency biological events, rescue recipes, and odor warnings.
```json
{
  "_id": "ObjectId",
  "facilityId": "ObjectId",
  "nodeId": "ObjectId",
  "boxId": "ObjectId",
  "alertType": "ACID_CRASH | ODOR_WARNING | PIT_FULL | METHANE_SPIKE | HARDWARE_TAMPER",
  "severity": "WARNING | CRITICAL",
  "triggerValues": {
    "ph": 4.8,
    "tempC": 38.5,
    "moisturePct": 68.0,
    "methanePpm": 340.0,
    "airPressureHpa": 1015.0
  },
  "recipeCard": {
    "titleHi": "String",
    "titleEn": "String",
    "instructionsHi": ["String"],
    "instructionsEn": ["String"],
    "immediateAction": "String"
  },
  "acknowledged": "Boolean",
  "acknowledgedBy": "ObjectId",
  "acknowledgedAt": "ISODate",
  "whatsappSent": "Boolean",
  "createdAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ facilityId: 1, acknowledged: 1 }`
- `{ alertType: 1, createdAt: -1 }`

---

### 9. `swm_compliance_archive`
Generated audit certificates and ROI logs under SWM Rules 2016.
```json
{
  "_id": "ObjectId",
  "entityId": "ObjectId",
  "period": "String (e.g. '2026-Q3')",
  "pdfUrl": "String (Cloudflare R2 archive URL)",
  "totalWasteInKg": "Number",
  "totalCompostOutKg": "Number",
  "violationsPrevented": "Number",
  "finesSavedInr": "Number",
  "generatedAt": "ISODate"
}
```
**Recommended Indexes:**
- `{ entityId: 1, period: 1 }` (Unique)
