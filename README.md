# Trading Dashboard with TradingView Integration

A professional trading dashboard built with Next.js, featuring user authentication, admin panel, account management, and TradingView chart integration.

## Features

- **User Authentication**: Sign up and login for regular users
- **Admin Panel**: Admin login and user management
- **Account Management**: Create and manage trading/challenge accounts
- **Deposit/Withdrawal**: Request deposits and withdrawals (admin approval required)
- **Wallet System**: Track balance, equity, margin, and floating profit
- **TradingView Integration**: Real-time charts and trading instruments
- **Profile Management**: User profile and account details

## Prerequisites

- Node.js 18+ 
- MongoDB (local or remote)
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/trading-dashboard

# JWT Secret Key (change in production)
JWT_SECRET=your-secret-key-change-in-production-please-use-a-strong-random-key

# Node Environment
NODE_ENV=development
```

### 3. Start MongoDB

Make sure MongoDB is running on your system. If using local MongoDB:

```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or use MongoDB Atlas (cloud) and update MONGO_URI in .env.local
```

### 4. Create Admin User (Optional)

Run the admin creation script:

```bash
npm run create-admin
# Or manually set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env.local
```

### 5. Start Development Server

```bash
npm run dev```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Application Routes

### User Routes
- `/login` - User login and signup
- `/` - Trading dashboard (requires authentication)
- `/profile` - User profile page
- `/deposit` - Deposit funds
- `/withdraw` - Withdraw funds

### Admin Routes
- `/admin/login` - Admin login
- `/admin` - Admin dashboard (requires admin authentication)
- `/admin/users` - User management
- `/admin/funds` - Transaction management

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User/Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### User APIs
- `GET /api/user/wallet` - Get wallet balance
- `GET /api/user/accounts` - Get user accounts
- `POST /api/user/accounts` - Create new account
- `GET /api/user/accounts/active` - Get active account
- `POST /api/user/deposit` - Request deposit
- `POST /api/user/withdraw` - Request withdrawal

### Admin APIs
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/transactions` - Get transactions
- `PUT /api/admin/transactions` - Approve/reject transactions
- `GET /api/admin/stats` - Dashboard statistics

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── api/          # API routes
│   ├── admin/        # Admin pages
│   ├── login/        # User login page
│   └── ...
├── components/       # React components
│   └── trading/      # Trading-specific components
├── models/           # Mongoose models
│   ├── User.ts
│   ├── Account.ts
│   ├── Wallet.ts
│   └── Transaction.ts
├── lib/              # Utility functions
│   └── auth.ts       # Authentication helpers
└── db/               # Database configuration
    └── dbConfig.ts
```

## Technologies Used


- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Tailwind CSS** - Styling
- **JWT (jose)** - Authentication
- **bcryptjs** - Password hashing
- **TradingView** - Chart integration
- **Sonner** - Toast notifications

## Troubleshooting

### Server Not Starting
1. Clear Next.js cache: `rm -rf .next .turbo node_modules/.cache`
2. Restart the server: `npm run dev`

### MongoDB Connection Issues
1. Verify MongoDB is running: `mongosh` or check MongoDB service
2. Check `MONGO_URI` in `.env.local`
3. Ensure MongoDB is accessible from your network

### Authentication Issues
1. Clear browser cookies
2. Check JWT_SECRET is set in `.env.local`
3. Verify session cookies are being set correctly

## Development Notes

- The application uses Turbopack for faster development builds
- User IDs are auto-generated starting from 100000
- Account numbers are 7-digit numeric IDs
- All financial transactions require admin approval
- Session cookies expire after 7 days

## License

This project is private and proprietary.
