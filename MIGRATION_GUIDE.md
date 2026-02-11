# Multi-Tenant POS System - Migration Guide

## Overview

This document describes the restructured multi-tenant POS system architecture. The system has been rebuilt with a proper separation between system-level data (authentication, authorization) and tenant-level data (business operations).

## Architecture

### Database Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         MySQL Server                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    system_db                              │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │  │
│  │  │ SystemUser  │ │   Company   │ │    SystemMenu    │   │  │
│  │  │ (all users) │ │(all tenants)│ │ (menu hierarchy) │   │  │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │  │
│  │  │    Role     │ │RolePermission││      Token      │   │  │
│  │  │ (per company)│ │ (granular)  │ │ (JWT tracking)  │   │  │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    tenant_1                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │  │
│  │  │   Branch    │ │  BranchUser │ │     Product      │   │  │
│  │  │ (locations) │ │ (user-branch)│ │ (per branch)    │   │  │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │  │
│  │  │    Order    │ │  Inventory  │ │    Accounting    │   │  │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    tenant_2                               │  │
│  │                    (same structure)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Hierarchy

```
Company (Tenant)
├── Master User (Company Owner)
│   ├── Can access all branches
│   ├── Can create/manage users
│   ├── Can create/manage roles
│   └── Has all permissions
│
├── Branch 1
│   ├── Manager (Custom Role)
│   ├── Cashier 1 (Custom Role)
│   └── Cashier 2 (Custom Role)
│
└── Branch 2
    ├── Manager (Custom Role)
    └── Cashier (Custom Role)
```

## New Files Created

### Prisma Schemas
- `prisma/schema.system.prisma` - System database schema
- `prisma/schema.tenant.prisma` - Tenant database schema

### Services
- `src/services/auth.service.new.js` - Authentication service
- `src/services/tenant.service.new.js` - Tenant provisioning
- `src/services/role.service.js` - Role management
- `src/services/systemMenu.service.js` - Menu management
- `src/services/branch.service.new.js` - Branch management
- `src/services/user.service.new.js` - User management

### Controllers
- `src/controllers/auth.controller.new.js` - Auth endpoints
- `src/controllers/role.controller.js` - Role endpoints
- `src/controllers/systemMenu.controller.js` - Menu endpoints
- `src/controllers/branch.controller.new.js` - Branch endpoints
- `src/controllers/user.controller.new.js` - User endpoints

### Middleware
- `src/middlewares/auth.new.js` - Updated auth middleware

### Routes
- `src/routes/auth.routes.new.js` - Auth routes
- `src/routes/role.routes.js` - Role routes
- `src/routes/systemMenu.routes.js` - Menu routes
- `src/routes/branch.routes.new.js` - Branch routes
- `src/routes/user.routes.new.js` - User routes

### Scripts
- `scripts/setup-system-db.js` - System database setup
- `prisma/seed.system.js` - System database seeding

### Configuration
- `src/config/database.js` - Updated for multi-tenancy

## Setup Instructions

### 1. Update Environment Variables

Add the following to your `.env` file:

```env
# System database (stores auth, users, companies, roles, menus)
SYSTEM_DATABASE_URL="mysql://root:password@localhost:3306/system_db"

# Base database URL (for tenant database connections)
DATABASE_URL="mysql://root:password@localhost:3306/pos_db"
```

### 2. Create System Database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS system_db;"
```

### 3. Run Setup Script

```bash
node scripts/setup-system-db.js
```

This will:
- Generate Prisma clients for both schemas
- Create system database tables
- Seed system database with menus and templates

### 4. Switch to New Routes

To use the new authentication system, update `src/routes/index.js`:

```javascript
// Replace old imports with new ones
const authRoutes = require('./auth.routes.new');
const branchRoutes = require('./branch.routes.new');
const userRoutes = require('./user.routes.new');

// Update middleware import
const { authenticate, requirePermission, requireBranch } = require('../middlewares/auth.new');
```

## API Changes

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "company_name": "My Restaurant"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": {
    "user_id": 1,
    "otp_sent": true
  }
}
```

#### Verify OTP
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "user_id": 1,
  "otp": "123456"
}
```

This creates the tenant database and seeds it with default data.

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response includes:
- User profile
- Company details
- Accessible branches
- User permissions
- JWT token

### Role Management

#### Get Roles
```http
GET /api/v1/roles
Authorization: Bearer <token>
```

#### Create Role
```http
POST /api/v1/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Branch Manager",
  "code": "BRANCH_MANAGER",
  "description": "Manager role for branch operations",
  "permissions": [
    { "menuId": 1, "action": "VIEW" },
    { "menuId": 1, "action": "CREATE" },
    { "menuId": 2, "action": "VIEW" }
  ]
}
```

### Menu Management

#### Get User Menus
```http
GET /api/v1/system-menus/user
Authorization: Bearer <token>
```

Returns hierarchical menu structure based on user's permissions.

### Branch Management

#### Create Branch
```http
POST /api/v1/branches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Downtown Branch",
  "code": "DOWNTOWN",
  "address": "123 Main St",
  "phone": "+1234567890"
}
```

#### Add User to Branch
```http
POST /api/v1/branches/:id/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "systemUserId": 5,
  "roleId": 2
}
```

### User Management

#### Create User
```http
POST /api/v1/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "branchId": 1,
  "roleId": 2
}
```

## Permission Structure

Permissions are structured as `menu_code.action`:

- `pos.view` - View POS screen
- `pos.create` - Create orders
- `products.view` - View products
- `products.create` - Create products
- `products.update` - Update products
- `products.delete` - Delete products
- `reports.view` - View reports
- `reports.export` - Export reports
- etc.

Actions available:
- `VIEW` - Read access
- `CREATE` - Create records
- `UPDATE` - Modify records
- `DELETE` - Remove records
- `EXPORT` - Export data

## Menu Modules

The system comes with pre-configured menus:

1. **Dashboard** - Overview and statistics
2. **POS** - Point of sale operations
3. **Sales** - Orders and invoices
4. **Inventory** - Stock management
5. **Accounts** - Financial management
6. **Reports** - Business analytics
7. **Tables** - Table/hall management
8. **Settings** - System configuration
9. **Users** - User management
10. **Notifications** - System notifications

## Backward Compatibility

The new files use the `.new.js` suffix to avoid breaking existing functionality. You can:

1. **Gradual Migration**: Switch routes one at a time
2. **Parallel Running**: Run both old and new systems
3. **Full Switch**: Replace all old files with new ones

## Next Steps

After Phase 1 is complete:

1. **Phase 2**: Update remaining services (products, orders, inventory) to use tenant Prisma
2. **Phase 3**: Implement frontend authentication with dynamic menus
3. **Phase 4**: Build role management UI
4. **Phase 5**: Testing and optimization

## Troubleshooting

### "SYSTEM_DATABASE_URL not set"
Add `SYSTEM_DATABASE_URL` to your `.env` file.

### "Cannot find module './auth.routes.new'"
Run `npm install` to ensure all dependencies are installed.

### "Token is invalid"
The new authentication uses system_db for tokens. Old tokens won't work.

### "User not found in tenant"
Non-master users must be assigned to a branch before they can login.
