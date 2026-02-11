# Table Management API Endpoints

## Authentication
All endpoints require Bearer token authentication in the Authorization header.

## Base URL
`/api/tables`

## Endpoints

### 1. Get All Tables
**GET** `/api/tables`

**Query Parameters:**
- `hall_id` (optional): Filter by hall ID
- `status` (optional): Filter by status (available/occupied/reserved/cleaning)
- `is_active` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "hall": {"id": 1, "name": "Main Hall"},
      "name": "T1",
      "capacity": 2,
      "status": "occupied",
      "shape": "square",
      "position_x": 0,
      "position_y": 0,
      "is_active": true,
      "sort_order": 1,
      "orders_count": 4,
      "current_order_id": 123,
      "held_orders_count": 0,
      "held_order_id": null,
      "occupied_reason": "order",
      "created_at": "2026-02-04T03:42:04.693Z"
    }
  ]
}
```

**Notes (important for frontend):**
- If `status = "occupied"` and `current_order_id = null` but `occupied_reason = "hold"`, the table is occupied because there is a held order for it.
- Use `held_order_id` to open/restore the held order.

### 2. Get Tables for POS (Floor Plan)
**GET** `/api/tables/pos`

**Response:** Same as above, optimized for POS display.

### 3. Get Table Statistics
**GET** `/api/tables/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 9,
    "available": 4,
    "occupied": 5,
    "reserved": 0,
    "cleaning": 0,
    "unavailable": 0,
    "total_capacity": 40,
    "available_capacity": 20
  }
}
```

### 4. Get Table Statistics with Consistency Check
**GET** `/api/tables/stats/consistency`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 9,
    "available": 4,
    "occupied": 5,
    "reserved": 0,
    "cleaning": 0,
    "unavailable": 0,
    "total_capacity": 40,
    "available_capacity": 20,
    "inconsistencies": 0,
    "needsCleanup": false
  }
}
```

### 5. Fix Table Status Inconsistencies
**POST** `/api/tables/fix-inconsistencies`

**Request Body:**
```json
{
  "branchId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Found 6 inconsistent table(s) out of 6 occupied tables",
    "found": 6,
    "totalOccupied": 6,
    "fixed": 6,
    "tables": [
      {"id": 1, "number": null},
      {"id": 2, "number": null},
      {"id": 3, "number": null},
      {"id": 5, "number": null},
      {"id": 6, "number": null},
      {"id": 7, "number": null}
    ]
  }
}
```

**What it fixes:**
- Tables marked as occupied but with no currentOrderId
- Tables marked as occupied but pointing to completed/cancelled/invoiced/refunded orders

### 6. Get Table by ID
**GET** `/api/tables/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "hall": {"id": 1, "name": "Main Hall"},
    "name": "T1",
    "capacity": 2,
    "status": "occupied",
    "shape": "square",
    "position_x": 0,
    "position_y": 0,
    "is_active": true,
    "sort_order": 1,
    "orders_count": 4,
    "current_order_id": 123,
    "created_at": "2026-02-04T03:42:04.693Z"
  }
}
```

### 7. Create Table
**POST** `/api/tables`

**Request Body:**
```json
{
  "branchId": 1,
  "hallId": 1,
  "name": "T10",
  "capacity": 4,
  "shape": "square",
  "positionX": 0,
  "positionY": 2
}
```

### 8. Update Table
**PUT** `/api/tables/:id`

**Request Body:**
```json
{
  "name": "T10",
  "capacity": 6,
  "status": "available",
  "positionX": 1,
  "positionY": 2
}
```

### 9. Update Table Status
**PATCH** `/api/tables/:id/status`

**Request Body:**
```json
{
  "status": "occupied",
  "currentOrderId": 123
}
```

### 10. Delete Table
**DELETE** `/api/tables/:id`

## Table Status Logic

### When Tables Become Occupied:
- When a dine-in order is created (`POST /api/orders`)
- When a held order is restored to active status
- When orders are merged to a table

### When Tables Become Available:
- When an order is completed and invoice is generated (`POST /api/orders/:id/complete`)
- When an order is cancelled (`DELETE /api/orders/:id` or `PATCH /api/orders/:id/status`)
- When a held order is deleted (`DELETE /api/orders/held/:id`)

### Status Values:
- `available`: Table is free for new orders
- `occupied`: Table has an active order in progress
- `reserved`: Table is reserved for future use
- `cleaning`: Table is being cleaned
- `unavailable`: Table is out of service

## Table Shapes
- `square`
- `rectangle`
- `round`
- `oval`

## Frontend Integration Notes

1. **Polling for Updates**: For real-time table status, consider polling `/api/tables/stats` every 30 seconds.

2. **Status Synchronization**: When creating orders, ensure table status is updated to 'occupied' with the order ID.

3. **Consistency Checks**: Use `/api/tables/stats/consistency` to monitor data integrity.

4. **Error Handling**: All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Current Issues
- ✅ **RESOLVED**: Table status inconsistencies have been identified and fixed
- All occupied tables now properly reflect active orders
- Available tables have null currentOrderId as expected
- Data consistency is maintained through automated cleanup endpoints
- Tables are freed when orders are completed, cancelled, or when held orders are deleted