# Smart Shoes Module

**Responsable:** Yassine (IoT)

## Fichiers:
- `sync.js` - Synchroniser les données du shoe

## Endpoints:
- POST `/api/shoes/sync`
- GET `/api/shoes/devices`

## Format Données:
```json
{
  "deviceId": "SHOE_ABC123",
  "steps": 5000,
  "distance": 3.5,
  "calories": 250,
  "timestamp": "2025-11-04T10:00:00Z"
}
```
