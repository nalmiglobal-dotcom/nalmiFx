/**
 * Application Constants
 * Centralized constant definitions
 */

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SIGNUP: '/api/auth/signup',
    ME: '/api/auth/me',
  },
  USER: {
    WALLET: '/api/user/wallet',
    ACCOUNTS: '/api/user/accounts',
    TRADES: '/api/user/trades',
    DEPOSIT: '/api/user/deposit',
    WITHDRAW: '/api/user/withdraw',
  },
  ADMIN: {
    USERS: '/api/admin/users',
    STATS: '/api/admin/stats',
    TRANSACTIONS: '/api/admin/transactions',
  },
} as const;

// Trading Constants
export const TRADING_CONSTANTS = {
  DEFAULT_LEVERAGE: 100,
  DEFAULT_CONTRACT_SIZE: 100000,
  MIN_LOT_SIZE: 0.01,
  MAX_LOT_SIZE: 100,
  PRICE_FETCH_INTERVAL: 300, // ms
} as const;

// Account Types
export const ACCOUNT_TYPES = {
  TRADING: 'trading',
  WALLET: 'wallet',
  CHALLENGE: 'challenge',
} as const;

// Challenge Types
export const CHALLENGE_TYPES = {
  ONE_STEP: 'one_step',
  TWO_STEP: 'two_step',
  ZERO_STEP: 'zero_step',
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Trade Status
export const TRADE_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  PARTIAL: 'partial',
} as const;

// User Roles
export const USER_ROLES = {
  USER: 'user',
  VIP: 'vip',
  PREMIUM: 'premium',
} as const;

// Admin Roles
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

