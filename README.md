# POS Backend API

A production-ready Node.js backend for a Point of Sale (POS) system built with Express, MySQL, Prisma ORM, and JWT authentication.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Manager, Cashier)
- **Branch-based Data Isolation**: Multi-branch support with data isolation per branch
- **Products & Inventory**: Complete product management with stock tracking and low-stock alerts
- **Orders Management**: Full order lifecycle including hold, complete, cancel, and refund
- **Customers**: Customer management with order history tracking
- **Dashboard**: Real-time sales statistics and charts
- **Reports**: Sales, product, cashier, and inventory reports with export capability
- **Security**: Helmet, CORS, rate limiting, password hashing with bcrypt

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit, bcryptjs

## Project Structure

```
pos-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.js                # Database seeding
├── src/
│   ├── config/
│   │   ├── constants.js       # App constants & permissions
│   │   └── database.js        # Database connection
│   ├── controllers/           # Route handlers
│   ├── middlewares/
│   │   ├── auth.js            # Authentication & authorization
│   │   ├── errorHandler.js    # Centralized error handling
│   │   └── validate.js        # Request validation
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   ├── validations/           # Input validation rules
│   └── app.js                 # Express application entry
├── uploads/                   # File uploads directory
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="mysql://username:password@localhost:3306/pos_db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=5000
NODE_ENV=development
```

### 3. Create Database

Create the MySQL database:

```sql
CREATE DATABASE pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migrations

Generate and apply database migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 5. Seed Database

Populate the database with initial data:

```bash
npx prisma db seed
```

This creates:
- Default settings
- Main Branch (code: MB001)
- Admin user (admin@example.com / admin123)
- Cashier user (cashier@example.com / cashier123)
- Sample categories and products

### 6. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/change-password` | Change password |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/:id` | Get user |
| PUT | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Delete user |
| POST | `/api/v1/users/:id/reset-password` | Reset password |

### Branches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/branches` | List branches |
| POST | `/api/v1/branches` | Create branch |
| GET | `/api/v1/branches/:id` | Get branch |
| PUT | `/api/v1/branches/:id` | Update branch |
| DELETE | `/api/v1/branches/:id` | Delete branch |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | List categories |
| POST | `/api/v1/categories` | Create category |
| GET | `/api/v1/categories/:id` | Get category |
| PUT | `/api/v1/categories/:id` | Update category |
| DELETE | `/api/v1/categories/:id` | Delete category |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products |
| GET | `/api/v1/products/pos` | Get products for POS |
| GET | `/api/v1/products/low-stock` | Get low stock products |
| GET | `/api/v1/products/barcode/:barcode` | Get by barcode |
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products/:id` | Get product |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |
| PUT | `/api/v1/products/:id/stock` | Update stock |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List customers |
| GET | `/api/v1/customers/search` | Search customers |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/:id` | Get customer |
| GET | `/api/v1/customers/:id/orders` | Get customer orders |
| PUT | `/api/v1/customers/:id` | Update customer |
| DELETE | `/api/v1/customers/:id` | Delete customer |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/held` | Get held orders |
| GET | `/api/v1/orders/held/:id` | Get held order |
| DELETE | `/api/v1/orders/held/:id` | Delete held order |
| POST | `/api/v1/orders` | Create order |
| POST | `/api/v1/orders/hold` | Hold order |
| GET | `/api/v1/orders/:id` | Get order |
| GET | `/api/v1/orders/:id/receipt` | Get receipt |
| POST | `/api/v1/orders/:id/cancel` | Cancel order |
| POST | `/api/v1/orders/:id/refund` | Refund order |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Get statistics |
| GET | `/api/v1/dashboard/sales-chart` | Get sales chart |
| GET | `/api/v1/dashboard/top-products` | Get top products |
| GET | `/api/v1/dashboard/recent-orders` | Get recent orders |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/sales` | Sales report |
| GET | `/api/v1/reports/products` | Product report |
| GET | `/api/v1/reports/cashiers` | Cashier report |
| GET | `/api/v1/reports/inventory` | Inventory report |
| GET | `/api/v1/reports/export` | Export report |

### Settings (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/settings` | Get settings |
| PUT | `/api/v1/settings` | Update settings |

## Sample API Requests

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

### Create Order (requires branch header)
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Branch-Id: 1" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 2, "price": 999.99}
    ],
    "payment_method": "cash",
    "amount_received": 2100
  }'
```

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Manager** | Manage products, categories, customers, orders, view reports |
| **Cashier** | Create orders, manage customers (limited), view assigned branch data |

## Branch Selection

Use the `X-Branch-Id` header for branch-specific operations:

```bash
X-Branch-Id: 1
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Validation errors if applicable
}
```

## License

MIT
