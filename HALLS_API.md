# Halls API Documentation

This document describes the API endpoints for managing halls in the POS system.

## Base URL
All endpoints are prefixed with `/api/v1`

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
  "status": "success",
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
  "status": "success",
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
  "status": "success",
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
  "status": "success",
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
  "status": "success",
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
  "status": "success",
  "data": {
    "message": "Halls reordered successfully"
  }
}
```

---

## HALL OBJECT STRUCTURE

```json
{
  "id": 1,
  "name": "Main Hall",
  "description": "Main dining area",
  "is_active": true,
  "sort_order": 1,
  "tables_count": 6,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

---

## ERROR RESPONSES

All endpoints return errors in the following format:

```json
{
  "status": "error",
  "message": "Human readable error message",
  "errors": {
    "field_name": ["Validation error 1", "Validation error 2"]
  },
  "code": "ERROR_CODE"
}
```

Common error codes:
- `SYS_001`: Validation error
- `HALL_EXISTS`: Hall name already exists
- `HALL_HAS_TABLES`: Cannot delete hall with tables
- `NOT_FOUND`: Hall not found

---

## AUTHORIZATION ROLES

- **Cashier**: Can view halls
- **Manager**: Can create/update/delete halls, reorder items
- **Admin**: Can delete halls

---

## RELATIONSHIPS

- **Hall → Tables**: One-to-many relationship
- **Hall → Branch**: Many-to-one relationship
- Each hall belongs to a specific branch
- Tables are organized within halls for floor plan management</content>
<parameter name="filePath">/home/iftikhar/www/pos-backend/HALLS_API.md