# POS System - Backend API Contract Documentation

> **Version**: 1.0.0  
> **Last Updated**: February 3, 2026  
> **Base URL**: `{API_BASE_URL}/api/v1`

This document defines the complete API contract between the POS Frontend and Backend. Please implement all endpoints exactly as specified to ensure smooth integration.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Products & Categories](#3-products--categories)
4. [Orders](#4-orders)
5. [Customers](#5-customers)
6. [Inventory](#6-inventory)
7. [Accounting](#7-accounting)
8. [Reports](#8-reports)
9. [Tables & Halls](#9-tables--halls)
10. [Menus](#10-menus)
11. [Notifications](#11-notifications)
12. [Settings](#12-settings)
13. [Users & Roles](#13-users--roles)
14. [Common Response Format](#14-common-response-format)

---

## 1. Authentication

### 1.1 Login
```http
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin",
      "permissions": ["dashboard", "pos", "products", "orders", ...]
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "branches": [
      { "id": 1, "name": "Main Branch", "address": "..." }
    ]
  }
}
```

### 1.2 Register (New User)
```http
POST /auth/register
Content-Type: application/json

Request:
{
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "business_name": "My Store"
}

Response (201):
{
  "status": "success",
  "message": "OTP sent to your email/phone",
  "data": {
    "verification_id": "uuid-here"
  }
}
```

### 1.3 Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

Request:
{
  "verification_id": "uuid-here",
  "otp": "123456"
}

Response (200):
{
  "status": "success",
  "data": {
    "user": { ... },
    "token": "..."
  }
}
```

### 1.4 Resend OTP
```http
POST /auth/resend-otp
Content-Type: application/json

Request:
{
  "verification_id": "uuid-here"
}

Response (200):
{
  "status": "success",
  "message": "OTP resent successfully"
}
```

### 1.5 Get Current User
```http
GET /auth/me
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "permissions": ["dashboard", "pos", "products", ...],
    "branch": {
      "id": 1,
      "name": "Main Branch"
    }
  }
}
```

### 1.6 Logout
```http
POST /auth/logout
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### 1.7 Select Branch
```http
POST /auth/select-branch
Authorization: Bearer {token}

Request:
{
  "branch_id": 1
}

Response (200):
{
  "status": "success",
  "data": {
    "branch": {
      "id": 1,
      "name": "Main Branch",
      "address": "...",
      "settings": { ... }
    }
  }
}
```

### 1.8 Get Available Branches (Public)
```http
GET /auth/branches

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      { "id": 1, "name": "Main Branch", "address": "..." }
    ]
  }
}
```

---

## 2. Dashboard

### 2.1 Get Dashboard Overview
```http
GET /dashboard
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": {
    "sales": {
      "total": 15000.00,
      "growth": 12.5  // percentage change from previous period
    },
    "orders": {
      "total": 45,
      "pending": 5,
      "completed": 40
    },
    "customers": {
      "total": 150,
      "new": 10
    },
    "products": {
      "total": 200,
      "low_stock": 15,
      "out_of_stock": 5
    }
  }
}
```

### 2.2 Get Sales Statistics
```http
GET /dashboard/sales
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD
- group_by: day|week|month

Response (200):
{
  "status": "success",
  "data": [
    { "date": "2026-02-01", "total": 1500.00, "orders": 10 },
    { "date": "2026-02-02", "total": 2000.00, "orders": 15 },
    ...
  ]
}
```

### 2.3 Get Top Selling Products
```http
GET /dashboard/top-products
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- limit: 5 (default)
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU001",
      "quantity_sold": 50,
      "total_sales": 5000.00
    },
    ...
  ]
}
```

### 2.4 Get Low Stock Alerts
```http
GET /dashboard/low-stock
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- threshold: 10 (default)

Response (200):
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU001",
      "stock_quantity": 5,
      "min_stock": 10
    },
    ...
  ]
}
```

---

## 3. Products & Categories

### 3.1 Get All Products
```http
GET /products
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- per_page: 20
- search: "query"
- category_id: 1
- low_stock: true|false
- out_of_stock: true|false
- is_active: true|false

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Product Name",
        "name_ar": "اسم المنتج",
        "sku": "SKU001",
        "barcode": "1234567890",
        "type": "simple|variable|combo|service",
        "category_id": 1,
        "category": { "id": 1, "name": "Category" },
        "description": "...",
        "selling_price": 100.00,
        "cost_price": 70.00,
        "stock_quantity": 50,
        "min_stock": 10,
        "track_stock": true,
        "is_taxable": true,
        "tax_rate": 15,
        "unit": "piece|kg|gram|liter|ml|box|pack",
        "image": "url-to-image",
        "is_active": true,
        "has_variations": false,
        "variations": [],
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 100,
      "last_page": 5
    }
  }
}
```

### 3.2 Get Single Product
```http
GET /products/{id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Product Name",
    ...
  }
}
```

### 3.3 Get Product by Barcode
```http
GET /products/barcode/{barcode}
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Product Name",
    ...
  }
}
```

### 3.4 Create Product
```http
POST /products
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "name": "New Product",
  "name_ar": "منتج جديد",
  "sku": "SKU002",
  "barcode": "9876543210",
  "type": "simple",
  "category_id": 1,
  "description": "Product description",
  "selling_price": 150.00,
  "cost_price": 100.00,
  "stock_quantity": 100,
  "min_stock": 10,
  "track_stock": true,
  "is_taxable": true,
  "tax_rate": 15,
  "unit": "piece",
  "is_active": true
}

Response (201):
{
  "status": "success",
  "message": "Product created successfully",
  "data": { ... }
}
```

### 3.5 Update Product
```http
PUT /products/{id}
Authorization: Bearer {token}
Content-Type: application/json

Request: { ... same as create ... }

Response (200):
{
  "status": "success",
  "message": "Product updated successfully",
  "data": { ... }
}
```

### 3.6 Delete Product
```http
DELETE /products/{id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "message": "Product deleted successfully"
}
```

### 3.7 Update Product Stock
```http
PATCH /products/{id}/stock
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "quantity": 50,
  "operation": "set|add|subtract",
  "reason": "Stock adjustment reason"
}

Response (200):
{
  "status": "success",
  "data": {
    "new_stock": 50
  }
}
```

### 3.8 Upload Product Image
```http
POST /products/{id}/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

Request:
- image: [File]

Response (200):
{
  "status": "success",
  "data": {
    "image_url": "https://..."
  }
}
```

### 3.9 Get Product Categories
```http
GET /product-categories
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Category Name",
        "name_ar": "اسم التصنيف",
        "parent_id": null,
        "image": "url",
        "is_active": true,
        "children": [
          { "id": 2, "name": "Sub Category", "parent_id": 1, ... }
        ]
      }
    ]
  }
}
```

### 3.10 Create/Update/Delete Category
```http
POST /product-categories
PUT /product-categories/{id}
DELETE /product-categories/{id}
```

### 3.11 Product Variations (for variable products)
```http
GET /products/{id}/variations
POST /products/{id}/variations
PUT /products/{id}/variations/{variationId}
DELETE /products/{id}/variations/{variationId}

Variation Object:
{
  "id": 1,
  "name": "Large",
  "sku": "SKU001-L",
  "price": 120.00,
  "stock_quantity": 20,
  "attributes": { "size": "Large", "color": "Red" }
}
```

---

## 4. Orders

### 4.1 Get All Orders
```http
GET /orders
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- limit: 20
- search: "invoice number or customer"
- status: draft|hold|confirmed|kitchen|ready|served|completed|cancelled|invoiced|refunded
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD
- customer_id: 1

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "order_number": "ORD-001",
        "invoice_no": "INV-001",
        "status": "completed",
        "order_type": "dine_in|takeaway|delivery|self_pickup",
        "customer": {
          "id": 1,
          "name": "John Doe",
          "phone": "+1234567890"
        },
        "table": {
          "id": 1,
          "name": "Table 1"
        },
        "items": [
          {
            "id": 1,
            "product_id": 1,
            "product_name": "Product",
            "quantity": 2,
            "unit_price": 100.00,
            "discount": 0,
            "total": 200.00
          }
        ],
        "items_count": 3,
        "subtotal": 500.00,
        "discount": 50.00,
        "discount_type": "percentage|fixed",
        "tax": 67.50,
        "total": 517.50,
        "payment_method": "cash|card|split|online|wallet",
        "payment_status": "pending|partial|paid",
        "notes": "Kitchen notes...",
        "created_by": { "id": 1, "name": "Cashier" },
        "created_at": "2026-02-01T10:00:00Z",
        "completed_at": "2026-02-01T10:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 100,
      "total_items": 100,
      "last_page": 5
    }
  }
}
```

### 4.2 Get Single Order
```http
GET /orders/{id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": { ... full order object ... }
}
```

### 4.3 Create Order (from POS)
```http
POST /orders
Authorization: Bearer {token}
X-Branch-ID: {branch_id}
Content-Type: application/json

Request:
{
  "order_type": "dine_in",
  "customer_id": 1,          // optional
  "table_id": 5,             // for dine_in
  "items": [
    {
      "product_id": 1,
      "variation_id": null,  // for variable products
      "quantity": 2,
      "unit_price": 100.00,
      "discount": 0,
      "discount_type": "fixed|percentage",
      "notes": "No onions"
    }
  ],
  "discount": 10,
  "discount_type": "percentage",
  "tax_rate": 15,
  "notes": "Kitchen notes...",
  "payment": {
    "method": "cash",
    "amount": 517.50
  }
}

Response (201):
{
  "success": true,
  "message": "Order created and completed successfully",
  "data": {
    "order": { ... },
    "invoice": { ... }  // auto-generated for paid orders
  }
}
```

**Note:** If payment amount equals or exceeds the order total, the order is automatically completed and an invoice is generated.

### 4.4 Update Order Status
```http
PUT /orders/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "status": "completed",
  "kitchen_notes": "Ready to serve"  // optional
}

Response (200):
{
  "status": "success",
  "message": "Order status updated"
}
```

### 4.5 Complete Order
```http
POST /orders/{id}/complete
Authorization: Bearer {token}
Content-Type: application/json

Request (optional - for adding payment):
{
  "payments": [
    {
      "method": "cash|card|split|bank_transfer|digital_wallet",
      "amount": 522.00,
      "reference": "optional payment reference"
    }
  ]
}

Response (200):
{
  "success": true,
  "message": "Order completed and invoice generated",
  "data": {
    "order": { ... },
    "invoice": {
      "id": 1,
      "invoice_no": "INV-001",
      ...
    }
  }
}
```

### 4.6 Cancel Order
```http
POST /orders/{id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "reason": "Customer request"
}

Response (200):
{
  "status": "success",
  "message": "Order cancelled"
}
```

### 4.7 Reopen Order
```http
POST /orders/{id}/reopen
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "message": "Order reopened"
}
```

### 4.8 Process Payment
```http
POST /orders/{id}/payment
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "method": "cash|card|split",
  "amount": 517.50,
  "reference": "TXN123456",  // for card/online
  "split_payments": [        // for split payment
    { "method": "cash", "amount": 300 },
    { "method": "card", "amount": 217.50, "reference": "TXN123" }
  ]
}

Response (200):
{
  "status": "success",
  "data": {
    "payment": { ... },
    "change_due": 0
  }
}
```

### 4.9 Refund Order
```http
POST /orders/{id}/refund
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "reason": "Customer complaint",
  "partial": false,           // true for partial refund
  "amount": 517.50,           // for partial
  "items": [                  // for item-level partial refund
    { "item_id": 1, "quantity": 1, "amount": 100 }
  ]
}

Response (200):
{
  "status": "success",
  "message": "Refund processed",
  "data": {
    "refund": { ... }
  }
}
```

### 4.10 Held Orders
```http
POST /held-orders
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "order_data": { ... cart data ... },
  "name": "Table 5 Order",
  "notes": "Waiting for customer"
}

GET /held-orders
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Table 5 Order",
        "order_data": { ... },
        "created_at": "..."
      }
    ]
  }
}

POST /held-orders/{id}/resume
DELETE /held-orders/{id}
```

---

## 5. Customers

### 5.1 Get All Customers
```http
GET /customers
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- limit: 20
- search: "name or phone"

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": "123 Main St",
        "total_orders": 15,
        "total_spent": 5000.00,
        "loyalty_points": 500,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2 Get Single Customer
```http
GET /customers/{id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": { ... customer object ... }
}
```

### 5.3 Create Customer
```http
POST /customers
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave"
}

Response (201):
{
  "status": "success",
  "data": { ... }
}
```

### 5.4 Update/Delete Customer
```http
PUT /customers/{id}
DELETE /customers/{id}
```

### 5.5 Get Customer Orders
```http
GET /customers/{id}/orders
Authorization: Bearer {token}

Query Parameters:
- page: 1
- limit: 10

Response (200):
{
  "status": "success",
  "data": {
    "items": [ ... orders ... ],
    "pagination": { ... }
  }
}
```

### 5.6 Get Customer Balance
```http
GET /customers/{id}/balance
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "balance": 500.00,
    "credit_limit": 1000.00,
    "loyalty_points": 500
  }
}
```

---

## 6. Inventory

### 6.1 Get Current Stock
```http
GET /inventory/stock
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- per_page: 20
- product_id: 1
- category_id: 1
- low_stock: true
- search: "product name"

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "name": "Product Name",
        "sku": "SKU001",
        "category": { "id": 1, "name": "Category" },
        "stock_quantity": 50,
        "min_stock": 10,
        "cost_price": 70.00,
        "image_url": "...",
        "last_updated": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 6.2 Get Stock Movements
```http
GET /inventory/movements
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- product_id: 1
- type: purchase|sale|adjustment|wastage|transfer|return|opening
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Product",
        "type": "purchase",
        "quantity": 100,
        "quantity_before": 50,
        "quantity_after": 150,
        "cost_price": 70.00,
        "reason": "Stock received",
        "reference": "PO-001",
        "created_by": { "id": 1, "name": "Admin" },
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 6.3 Create Stock Movement
```http
POST /inventory/movements
Authorization: Bearer {token}
X-Branch-ID: {branch_id}
Content-Type: application/json

Request:
{
  "product_id": 1,
  "quantity": 50,
  "type": "adjustment",
  "reason": "Physical count correction",
  "reference": "ADJ-001"
}

Response (201):
{
  "status": "success",
  "message": "Stock movement recorded"
}
```

### 6.4 Stock Adjustments
```http
GET /inventory/adjustments
POST /inventory/adjustments
POST /inventory/adjustments/{id}/approve
```

### 6.5 Low Stock Alerts
```http
GET /inventory/alerts
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Product",
        "sku": "SKU001",
        "current_stock": 5,
        "min_stock": 10,
        "alert_type": "low_stock|out_of_stock",
        "created_at": "..."
      }
    ]
  }
}

POST /inventory/alerts/{id}/dismiss
```

### 6.6 Bulk Stock Update
```http
POST /inventory/stock/bulk
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "items": [
    { "product_id": 1, "quantity": 100 },
    { "product_id": 2, "quantity": 50 }
  ]
}

Response (200):
{
  "status": "success",
  "message": "Stock updated for 2 products"
}
```

### 6.7 Import/Export Stock
```http
POST /inventory/stock/import
Content-Type: multipart/form-data
- file: [CSV File]

GET /inventory/stock/export
Response: CSV File Blob
```

---

## 7. Accounting

### 7.1 Chart of Accounts (6-Level Tree)
```http
GET /accounts
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "code": "1",
        "name": "Assets",
        "name_ar": "الأصول",
        "type": "asset|liability|equity|revenue|expense",
        "parent_id": null,
        "description": "...",
        "balance": 1042957536.01,
        "is_active": true,
        "is_system": true,
        "children": [
          {
            "id": 2,
            "code": "101",
            "name": "Current Assets",
            "name_ar": "الأصول المتداولة",
            "type": "asset",
            "parent_id": 1,
            "balance": 1093057535.01,
            "children": [
              {
                "id": 3,
                "code": "10",
                "name": "Cash & Cash Equivalents",
                "type": "asset",
                "parent_id": 2,
                "balance": 2534040.51,
                "children": [...]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Important**: Backend should return accounts as a flat array with `parent_id`. Frontend builds the tree. Each account should have:
- `id`: Unique identifier
- `code`: Account code (hierarchical, e.g., 1, 101, 1010101)
- `name`: English name
- `name_ar`: Arabic name (optional)
- `type`: asset, liability, equity, revenue, expense
- `parent_id`: Parent account ID (null for root)
- `balance`: Current balance
- `is_active`: Boolean
- `is_system`: Boolean (system accounts cannot be deleted)

### 7.2 Create Account
```http
POST /accounts
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "code": "1010102",
  "name": "Petty Cash",
  "name_ar": "النثرية",
  "type": "asset",
  "parent_id": 3,
  "description": "Petty cash fund",
  "is_active": true
}

Response (201):
{
  "status": "success",
  "data": { ... }
}
```

### 7.3 Update/Delete Account
```http
PUT /accounts/{id}
DELETE /accounts/{id}
```

### 7.4 Get Account Balance
```http
GET /accounts/{id}/balance
Query: date_from, date_to

Response (200):
{
  "status": "success",
  "data": {
    "opening_balance": 10000.00,
    "debits": 5000.00,
    "credits": 3000.00,
    "closing_balance": 12000.00
  }
}
```

### 7.5 Invoices
```http
GET /invoices
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- page: 1
- limit: 20
- status: draft|pending|paid|partial|cancelled|refunded
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "invoice_no": "INV-001",
        "order_id": 1,
        "customer": { ... },
        "items": [ ... ],
        "subtotal": 500.00,
        "discount": 50.00,
        "tax": 67.50,
        "total": 517.50,
        "status": "paid",
        "payment_method": "cash",
        "paid_at": "2026-02-01T10:30:00Z",
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 7.6 Generate Invoice from Order
```http
POST /invoices/generate
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "order_id": 1
}

Response (201):
{
  "status": "success",
  "data": {
    "invoice": { ... }
  }
}
```

### 7.7 Mark Invoice as Paid
```http
POST /invoices/{id}/pay
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "payment_method": "cash",
  "amount": 517.50,
  "reference": "TXN123"
}

Response (200):
{
  "status": "success",
  "message": "Invoice marked as paid"
}
```

### 7.8 Void Invoice
```http
POST /invoices/{id}/void
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "reason": "Customer cancelled"
}
```

### 7.9 Download Invoice PDF
```http
GET /invoices/{id}/pdf
Authorization: Bearer {token}

Response: PDF Blob
```

### 7.10 Transactions
```http
GET /transactions
Authorization: Bearer {token}

Query Parameters:
- page: 1
- account_id: 1
- type: debit|credit
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "account_id": 1,
        "account_name": "Cash",
        "type": "debit",
        "amount": 500.00,
        "description": "Sales revenue",
        "reference": "INV-001",
        "journal_entry_id": 1,
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}

POST /transactions
```

### 7.11 Journal Entries
```http
GET /journal-entries
Authorization: Bearer {token}

Query Parameters:
- page: 1
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "entry_number": "JE-001",
        "date": "2026-02-01",
        "description": "Daily sales entry",
        "entries": [
          { "account_id": 1, "account_name": "Cash", "debit": 500, "credit": 0 },
          { "account_id": 10, "account_name": "Sales", "debit": 0, "credit": 500 }
        ],
        "total_debit": 500.00,
        "total_credit": 500.00,
        "is_balanced": true,
        "status": "posted|draft|reversed",
        "created_by": { ... },
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}

POST /journal-entries
Request:
{
  "date": "2026-02-01",
  "description": "Manual adjustment",
  "entries": [
    { "account_id": 1, "debit": 100, "credit": 0 },
    { "account_id": 2, "debit": 0, "credit": 100 }
  ]
}

POST /journal-entries/{id}/reverse
Request:
{
  "reason": "Correction needed"
}
```

---

## 8. Reports

### 8.1 Daily Sales Report
```http
GET /reports/sales/daily
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": [
    {
      "date": "2026-02-01",
      "total_sales": 5000.00,
      "total_orders": 25,
      "average_order": 200.00,
      "cash_sales": 3000.00,
      "card_sales": 2000.00,
      "tax_collected": 675.00
    }
  ]
}
```

### 8.2 Sales Summary
```http
GET /reports/sales/summary
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "total_sales": 150000.00,
    "total_orders": 500,
    "average_order_value": 300.00,
    "total_items_sold": 1500,
    "total_discount": 5000.00,
    "total_tax": 20250.00,
    "net_sales": 144750.00,
    "growth_percentage": 12.5
  }
}
```

### 8.3 Product Sales Report
```http
GET /reports/sales/products
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD
- category_id: 1
- limit: 20

Response (200):
{
  "status": "success",
  "data": [
    {
      "product_id": 1,
      "product_name": "Product Name",
      "sku": "SKU001",
      "category": "Category",
      "quantity_sold": 100,
      "total_revenue": 10000.00,
      "cost_of_goods": 7000.00,
      "profit": 3000.00,
      "profit_margin": 30.0
    }
  ]
}
```

### 8.4 Category Sales Report
```http
GET /reports/sales/categories
```

### 8.5 Hourly Sales Report
```http
GET /reports/sales/hourly
Query: date (single day)

Response (200):
{
  "status": "success",
  "data": [
    { "hour": 9, "sales": 500.00, "orders": 5 },
    { "hour": 10, "sales": 1200.00, "orders": 12 },
    ...
  ]
}
```

### 8.6 Payment Method Breakdown
```http
GET /reports/sales/payments
```

### 8.7 Tax Report
```http
GET /reports/tax
Authorization: Bearer {token}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "total_taxable_sales": 145000.00,
    "total_tax_collected": 21750.00,
    "tax_by_rate": [
      { "rate": 15, "taxable_amount": 100000, "tax_amount": 15000 },
      { "rate": 5, "taxable_amount": 45000, "tax_amount": 2250 }
    ]
  }
}
```

### 8.8 Cashier Performance Report
```http
GET /reports/cashiers
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": [
    {
      "user_id": 1,
      "user_name": "John",
      "total_sales": 50000.00,
      "total_orders": 200,
      "average_order": 250.00,
      "refunds": 500.00
    }
  ]
}
```

### 8.9 Customer Report
```http
GET /reports/customers
```

### 8.10 Inventory Report
```http
GET /reports/inventory
```

### 8.11 Profit & Loss Report
```http
GET /reports/profit-loss
Authorization: Bearer {token}

Query Parameters:
- date_from: YYYY-MM-DD
- date_to: YYYY-MM-DD

Response (200):
{
  "status": "success",
  "data": {
    "revenue": {
      "sales": 150000.00,
      "other_income": 5000.00,
      "total": 155000.00
    },
    "cost_of_goods_sold": 90000.00,
    "gross_profit": 65000.00,
    "expenses": {
      "salaries": 20000.00,
      "rent": 5000.00,
      "utilities": 2000.00,
      "other": 3000.00,
      "total": 30000.00
    },
    "net_profit": 35000.00,
    "gross_margin": 41.94,
    "net_margin": 22.58
  }
}
```

### 8.12 Balance Sheet
```http
GET /reports/balance-sheet
Query: as_of_date
```

### 8.13 Cash Flow Statement
```http
GET /reports/cash-flow
Query: date_from, date_to
```

### 8.14 Trial Balance
```http
GET /reports/trial-balance
Query: as_of_date
```

### 8.15 Export Report
```http
GET /reports/{report_type}/export
Query: format=csv|xlsx|pdf, date_from, date_to

Response: File Blob
```

---

## 9. Tables & Halls

### 9.1 Get All Tables
```http
GET /tables
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- hall_id: 1
- status: available|occupied|reserved|cleaning
- is_active: true

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Table 1",
        "number": "T1",
        "capacity": 4,
        "hall_id": 1,
        "hall": { "id": 1, "name": "Main Hall" },
        "status": "available",
        "current_order": null,
        "is_active": true
      }
    ]
  }
}
```

### 9.2 Get Tables with Orders
```http
GET /tables/with-orders
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Table 1",
        "status": "occupied",
        "current_order": {
          "id": 5,
          "order_number": "ORD-005",
          "total": 350.00,
          "items_count": 3,
          "created_at": "..."
        }
      }
    ]
  }
}
```

### 9.3 Create/Update/Delete Table
```http
POST /tables
PUT /tables/{id}
DELETE /tables/{id}

Table Object:
{
  "name": "Table 10",
  "number": "T10",
  "capacity": 6,
  "hall_id": 1,
  "is_active": true
}
```

### 9.4 Update Table Status
```http
PATCH /tables/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "status": "occupied|available|reserved|cleaning"
}
```

### 9.5 Assign Order to Table
```http
POST /tables/{id}/assign
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "order_id": 5
}
```

### 9.6 Release Table
```http
POST /tables/{id}/release
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "needs_cleaning": true
}
```

### 9.7 Halls
```http
GET /halls
POST /halls
PUT /halls/{id}
DELETE /halls/{id}

Hall Object:
{
  "id": 1,
  "name": "Main Hall",
  "description": "...",
  "is_active": true
}
```

---

## 10. Menus

### 10.1 Get All Menus
```http
GET /menus
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Query Parameters:
- is_active: true
- menu_type: breakfast|lunch|dinner|all_day|special

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Lunch Menu",
        "menu_type": "lunch",
        "description": "...",
        "active_time_from": "11:00",
        "active_time_to": "15:00",
        "branch_id": 1,
        "is_active": true,
        "products": [
          {
            "product_id": 1,
            "display_order": 1,
            "price_override": null,
            "product": { ... }
          }
        ]
      }
    ],
    "pagination": { ... }
  }
}
```

### 10.2 Get Active Menus (Current Time)
```http
GET /menus/active
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Lunch Menu",
      ...
    }
  ]
}
```

### 10.3 Create/Update/Delete Menu
```http
POST /menus
PUT /menus/{id}
DELETE /menus/{id}

Menu Object:
{
  "name": "Dinner Menu",
  "menu_type": "dinner",
  "description": "Evening menu",
  "active_time_from": "18:00",
  "active_time_to": "23:00",
  "branch_id": null,  // null = all branches
  "is_active": true,
  "products": [
    { "product_id": 1, "display_order": 1, "price_override": null }
  ]
}
```

### 10.4 Add/Remove Products from Menu
```http
POST /menus/{id}/products
Request:
{
  "products": [
    { "product_id": 1, "display_order": 1, "price_override": 15.00 }
  ]
}

DELETE /menus/{id}/products/{productId}
```

---

## 11. Notifications

### 11.1 Get All Notifications
```http
GET /notifications
Authorization: Bearer {token}

Query Parameters:
- page: 1
- limit: 20
- is_read: true|false

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "type": "low_stock|order_ready|payment_received|new_order|order_cancelled|system",
        "title": "Low Stock Alert",
        "message": "Product X is running low (5 units left)",
        "data": { "product_id": 1, "current_stock": 5 },
        "is_read": false,
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "unread_count": 5,
    "pagination": { ... }
  }
}
```

### 11.2 Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "count": 5
  }
}
```

### 11.3 Mark as Read
```http
POST /notifications/{id}/read
Authorization: Bearer {token}

Response (200):
{
  "status": "success"
}
```

### 11.4 Mark All as Read
```http
POST /notifications/read-all
Authorization: Bearer {token}
```

### 11.5 Notification Settings
```http
GET /notifications/settings
PUT /notifications/settings

Settings Object:
{
  "email_notifications": true,
  "push_notifications": true,
  "sound_enabled": true,
  "low_stock_alerts": true,
  "order_notifications": true
}
```

### 11.6 Device Tokens (for Push Notifications)
```http
POST /notifications/device-tokens
Request:
{
  "token": "fcm-device-token",
  "platform": "web|ios|android"
}

DELETE /notifications/device-tokens/{token}
```

---

## 12. Settings

### 12.1 Get Settings
```http
GET /settings
Authorization: Bearer {token}
X-Branch-ID: {branch_id}

Response (200):
{
  "status": "success",
  "data": {
    "general": {
      "business_name": "My POS Store",
      "currency": "USD",
      "currency_symbol": "$",
      "date_format": "YYYY-MM-DD",
      "time_format": "HH:mm:ss",
      "timezone": "America/New_York"
    },
    "tax": {
      "enabled": true,
      "type": "exclusive|inclusive",
      "default_rate": 10,
      "tax_number": "TAX-123456"
    },
    "receipt": {
      "header": "Welcome!",
      "footer": "Thank you!",
      "show_logo": true,
      "show_barcode": true,
      "paper_width": 80
    },
    "pos": {
      "allow_negative_stock": false,
      "low_stock_alert": true,
      "require_customer": false,
      "quick_cash_amounts": "5,10,20,50,100"
    }
  }
}
```

### 12.2 Update Settings
```http
PUT /settings
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "general": { ... },
  "tax": { ... },
  "receipt": { ... },
  "pos": { ... }
}

Response (200):
{
  "status": "success",
  "message": "Settings updated"
}
```

### 12.3 Printers
```http
GET /printers
POST /printers
PUT /printers/{id}
DELETE /printers/{id}

Printer Object:
{
  "id": 1,
  "name": "Main Receipt Printer",
  "type": "thermal|inkjet|laser",
  "connection_type": "usb|network|bluetooth",
  "ip_address": "192.168.1.100",
  "port": 9100,
  "paper_width": 80,
  "is_default": true,
  "print_receipt": true,
  "print_kot": false
}
```

### 12.4 Tax Rates
```http
GET /tax-rates
POST /tax-rates
PUT /tax-rates/{id}
DELETE /tax-rates/{id}

Tax Rate Object:
{
  "id": 1,
  "name": "Standard VAT",
  "rate": 15,
  "is_default": true,
  "is_active": true
}
```

---

## 13. Users & Roles

### 13.1 Get All Users
```http
GET /users
Authorization: Bearer {token}

Query Parameters:
- page: 1
- search: "name or email"
- role: admin|manager|cashier|...
- is_active: true

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "role": "cashier",
        "role_name": "Cashier",
        "branch_id": 1,
        "branch": { "id": 1, "name": "Main" },
        "is_active": true,
        "last_login": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 13.2 Create/Update/Delete User
```http
POST /users
PUT /users/{id}
DELETE /users/{id}

User Object:
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "password": "password123",  // only on create
  "role_id": 3,
  "branch_id": 1,
  "is_active": true
}
```

### 13.3 Get All Roles
```http
GET /roles
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "admin",
        "display_name": "Administrator",
        "description": "Full access",
        "permissions": ["dashboard", "pos", "products", ...],
        "is_system": true
      }
    ]
  }
}
```

### 13.4 Create/Update/Delete Role
```http
POST /roles
PUT /roles/{id}
DELETE /roles/{id}

Role Object:
{
  "name": "supervisor",
  "display_name": "Supervisor",
  "description": "Limited admin access",
  "permissions": ["dashboard", "pos", "products", "orders"]
}
```

---

## 14. Common Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Optional success message",
  "data": { ... }
}
```

### Error Response
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

### Pagination Format
```json
{
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "total_items": 100,
    "last_page": 5,
    "from": 1,
    "to": 20
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `422` - Unprocessable Entity (validation error)
- `500` - Server Error

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer {token}
X-Branch-ID: {branch_id}
Accept-Language: en|ar|ur  (optional, for localized responses)
```

---

## Backend Implementation Notes

### 1. Chart of Accounts
- Return accounts as **flat array** with `parent_id`
- Frontend builds the tree structure
- Each account needs: `id`, `code`, `name`, `name_ar`, `type`, `parent_id`, `balance`, `is_active`, `is_system`
- Root accounts (level 1) have `parent_id: null`
- Support up to 6 levels of nesting

### 2. Order Status Flow
```
draft → confirmed → kitchen → ready → served → completed
                 ↘ cancelled
completed → invoiced → refunded/partially_refunded
```

### 3. Stock Management
- Automatically deduct stock when order is completed
- Track stock movements for audit trail
- Support bulk stock updates
- Low stock alerts based on `min_stock` threshold

### 4. Invoice Generation
- Auto-generate invoice number (INV-YYYYMM-XXXX)
- Create accounting entries automatically:
  - Debit: Cash/Bank Account
  - Credit: Sales Revenue
  - Credit: Tax Payable (if applicable)

### 5. Multi-Language Support
- Support `name` (English) and `name_ar` (Arabic) fields
- Return localized responses based on `Accept-Language` header

### 6. Branch Isolation
- All data should be filtered by `X-Branch-ID` header
- Products, orders, customers, inventory should be branch-specific
- Settings can be global or branch-specific

---

## Missing Endpoints to Implement

If any of these are not implemented, please add them:

1. `GET /orders/invoice/{invoiceNo}` - Get order by invoice number
2. `GET /tables/{id}/current-order` - Get table with current order
3. `POST /orders/{id}/reopen` - Reopen completed order
4. `GET /accounts/next-number` - Get next account number suggestion
5. `GET /accounts/check-unique` - Check if account code is unique
6. `GET /reports/wastage` - Wastage report

---

## Contact

For any questions or clarifications regarding this API contract, please contact the frontend team.
