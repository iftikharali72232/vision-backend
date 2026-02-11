# Halls and Tables API Documentation

This document describes the API endpoints for managing halls and tables in the POS system.

## Base URL
All endpoints are prefixed with `/api/v1/tables`

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.
Branch ID must be provided in the `X-Branch-Id` header.

---

## HALLS ENDPOINTS

### 1. Get All Halls
**GET** `/halls`

**Description:** Retrieve all halls for the current branch.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Hall",
      "description": "Main dining area",
      "is_active": true,
      "sort_order": 1,
      "tables_count": 6,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Single Hall
**GET** `/halls/:id`

**Description:** Retrieve a specific hall with its tables.

**Path Parameters:**
- `id` (integer): Hall ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Main Hall",
    "description": "Main dining area",
    "is_active": true,
    "sort_order": 1,
    "tables": [
      {
        "id": 1,
        "hall": { "id": 1, "name": "Main Hall" },
        "number": "T1",
        "name": "Table 1",
        "capacity": 4,
        "min_capacity": 2,
        "max_capacity": 6,
        "status": "available",
        "shape": "rectangle",
        "position_x": 0,
        "position_y": 0,
        "width": 100,
        "height": 80,
        "rotation": 0,
        "is_active": true,
        "sort_order": 1,
        "orders_count": 0,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Create Hall
**POST** `/halls`

**Description:** Create a new hall.

**Authorization:** Manager or Admin role required

**Request Body:**
```json
{
  "name": "Terrace",
  "description": "Outdoor seating area",
  "sort_order": 2,
  "is_active": true
}
```

**Required Parameters:**
- `name` (string): Hall name

**Optional Parameters:**
- `description` (string): Hall description
- `sort_order` (integer): Display order
- `is_active` (boolean): Active status (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Terrace",
    "description": "Outdoor seating area",
    "is_active": true,
    "sort_order": 2,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Hall
**PUT** `/halls/:id`

**Description:** Update an existing hall.

**Authorization:** Manager or Admin role required

**Path Parameters:**
- `id` (integer): Hall ID

**Request Body:**
```json
{
  "name": "Updated Hall Name",
  "description": "Updated description",
  "sort_order": 3,
  "is_active": true
}
```

**Optional Parameters:** All fields are optional for update

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Hall Name",
    "description": "Updated description",
    "is_active": true,
    "sort_order": 3,
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Delete Hall
**DELETE** `/halls/:id`

**Description:** Delete a hall (only if it has no tables).

**Authorization:** Admin role required

**Path Parameters:**
- `id` (integer): Hall ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Hall deleted successfully"
  }
}
```

### 6. Reorder Halls
**PUT** `/halls/reorder`

**Description:** Update the display order of multiple halls.

**Authorization:** Manager or Admin role required

**Request Body:**
```json
{
  "halls": [
    { "id": 1, "sort_order": 2 },
    { "id": 2, "sort_order": 1 }
  ]
}
```

**Required Parameters:**
- `halls` (array): Array of hall objects with id and sort_order

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Halls reordered successfully"
  }
}
```

---

## TABLES ENDPOINTS

### 1. Get All Tables
**GET** `/`

**Description:** Retrieve all tables for the current branch.

**Query Parameters:**
- `hall_id` (integer, optional): Filter by hall ID
- `status` (string, optional): Filter by status (available, occupied, reserved, maintenance)
- `is_active` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "hall": { "id": 1, "name": "Main Hall" },
      "number": "T1",
      "name": "Table 1",
      "capacity": 4,
      "min_capacity": 2,
      "max_capacity": 6,
      "status": "available",
      "shape": "rectangle",
      "position_x": 0,
      "position_y": 0,
      "width": 100,
      "height": 80,
      "rotation": 0,
      "is_active": true,
      "sort_order": 1,
      "orders_count": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Tables for POS
**GET** `/pos`

**Description:** Retrieve tables organized by halls for POS floor plan display.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Hall",
      "tables": [
        {
          "id": 1,
          "number": "T1",
          "name": "Table 1",
          "capacity": 4,
          "status": "available",
          "shape": "rectangle",
          "position_x": 0,
          "position_y": 0,
          "width": 100,
          "height": 80,
          "rotation": 0,
          "active_orders": [],
          "held_orders": []
        }
      ]
    }
  ]
}
```

### 3. Get Table Statistics
**GET** `/stats`

**Description:** Get table usage statistics.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tables": 10,
    "available_tables": 7,
    "occupied_tables": 2,
    "reserved_tables": 1,
    "maintenance_tables": 0,
    "active_orders": 3,
    "held_orders": 1
  }
}
```

### 4. Get Single Table
**GET** `/:id`

**Description:** Retrieve a specific table with detailed information.

**Path Parameters:**
- `id` (integer): Table ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "hall": { "id": 1, "name": "Main Hall" },
    "number": "T1",
    "name": "Table 1",
    "capacity": 4,
    "min_capacity": 2,
    "max_capacity": 6,
    "status": "available",
    "shape": "rectangle",
    "position_x": 0,
    "position_y": 0,
    "width": 100,
    "height": 80,
    "rotation": 0,
    "is_active": true,
    "sort_order": 1,
    "orders_count": 0,
    "active_orders": [],
    "held_orders": [],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Create Table
**POST** `/`

**Description:** Create a new table.

**Authorization:** Manager or Admin role required

**Request Body:**
```json
{
  "hall_id": 1,
  "number": "T7",
  "name": "Table 7",
  "capacity": 6,
  "min_capacity": 4,
  "max_capacity": 8,
  "shape": "round",
  "position_x": 3,
  "position_y": 1,
  "width": 120,
  "height": 120,
  "rotation": 0,
  "sort_order": 7,
  "is_active": true
}
```

**Required Parameters:**
- `hall_id` (integer): Hall ID where the table belongs
- `number` (string): Table number/identifier

**Optional Parameters:**
- `name` (string): Table name
- `capacity` (integer): Default capacity (default: 4)
- `min_capacity` (integer): Minimum capacity
- `max_capacity` (integer): Maximum capacity
- `shape` (string): Table shape (rectangle, square, round) (default: rectangle)
- `position_x` (integer): X position on floor plan
- `position_y` (integer): Y position on floor plan
- `width` (integer): Table width
- `height` (integer): Table height
- `rotation` (integer): Rotation angle (default: 0)
- `sort_order` (integer): Display order
- `is_active` (boolean): Active status (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "hall": { "id": 1, "name": "Main Hall" },
    "number": "T7",
    "name": "Table 7",
    "capacity": 6,
    "min_capacity": 4,
    "max_capacity": 8,
    "status": "available",
    "shape": "round",
    "position_x": 3,
    "position_y": 1,
    "width": 120,
    "height": 120,
    "rotation": 0,
    "is_active": true,
    "sort_order": 7,
    "orders_count": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Update Table
**PUT** `/:id`

**Description:** Update an existing table.

**Authorization:** Manager or Admin role required

**Path Parameters:**
- `id` (integer): Table ID

**Request Body:** Same as create table, all fields optional

**Response:** Same as create table response

### 7. Update Table Status
**PATCH** `/:id/status`

**Description:** Update the status of a table.

**Authorization:** Cashier or higher role

**Path Parameters:**
- `id` (integer): Table ID

**Request Body:**
```json
{
  "status": "occupied"
}
```

**Required Parameters:**
- `status` (string): New status (available, occupied, reserved, maintenance)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "occupied",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 8. Delete Table
**DELETE** `/:id`

**Description:** Delete a table.

**Authorization:** Admin role required

**Path Parameters:**
- `id` (integer): Table ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Table deleted successfully"
  }
}
```

### 9. Update Table Positions
**PUT** `/positions`

**Description:** Update positions of multiple tables.

**Authorization:** Manager or Admin role required

**Request Body:**
```json
{
  "tables": [
    {
      "id": 1,
      "position_x": 1,
      "position_y": 2,
      "rotation": 45
    },
    {
      "id": 2,
      "position_x": 2,
      "position_y": 1,
      "rotation": 0
    }
  ]
}
```

**Required Parameters:**
- `tables` (array): Array of table position updates

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Table positions updated successfully"
  }
}
```

### 10. Merge Tables
**POST** `/merge`

**Description:** Merge multiple tables into one logical table.

**Authorization:** Cashier or higher role

**Request Body:**
```json
{
  "table_ids": [1, 2, 3]
}
```

**Required Parameters:**
- `table_ids` (array): Array of table IDs to merge

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tables merged successfully",
    "merged_table": {
      "id": 1,
      "status": "occupied"
    }
  }
}
```

### 11. Free Tables
**POST** `/free`

**Description:** Mark tables as available.

**Authorization:** Cashier or higher role

**Request Body:**
```json
{
  "table_ids": [1, 2]
}
```

**Required Parameters:**
- `table_ids` (array): Array of table IDs to free

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tables freed successfully"
  }
}
```

---

## ERROR RESPONSES

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `SYS_001`: Validation error
- `HALL_EXISTS`: Hall name already exists
- `TABLE_EXISTS`: Table number already exists
- `HALL_HAS_TABLES`: Cannot delete hall with tables
- `NOT_FOUND`: Resource not found

---

## AUTHORIZATION ROLES

- **Cashier**: Can view tables, update status, merge/free tables
- **Manager**: Can create/update/delete tables and halls, reorder items
- **Admin**: Can delete tables and halls</content>
<parameter name="filePath">/home/iftikhar/www/pos-backend/HALLS_TABLES_API.md