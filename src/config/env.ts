/**
 * Environment Configuration
 * Centralized environment variable management
 */

export const env = {
  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/trading-dashboard',

  // Authentication - Role-based JWT secrets
  // Support both new role-based format and legacy JWT_ACCESS_SECRET format
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production', // Legacy fallback
  JWT_SECRET_USER: process.env.JWT_SECRET_USER || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'jwt-secret-user-change-in-production',
  JWT_SECRET_ADMIN: process.env.JWT_SECRET_ADMIN || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'jwt-secret-admin-change-in-production',
  JWT_SECRET_IB: process.env.JWT_SECRET_IB || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'jwt-secret-ib-change-in-production',
  JWT_SECRET_TRADEMASTER: process.env.JWT_SECRET_TRADEMASTER || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'jwt-secret-trademaster-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  // Legacy refresh token support (if needed)
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET || 'jwt-refresh-secret-change-in-production',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // MetaAPI
  METAAPI_TOKEN: process.env.METAAPI_TOKEN || '',
  METAAPI_ACCOUNT_ID: process.env.METAAPI_ACCOUNT_ID || '',

  // API
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // External Services
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
} as const;

// Validate required environment variables (runtime only, not during build)
// Note: JWT secrets can be provided as role-specific (JWT_SECRET_USER, etc.) or as legacy JWT_ACCESS_SECRET
const requiredEnvVars = ['MONGO_URI'] as const;
const requiredJwtSecrets = ['JWT_SECRET_USER', 'JWT_SECRET_ADMIN', 'JWT_SECRET_IB', 'JWT_SECRET_TRADEMASTER'] as const;

// Only validate at runtime, not during build
// During build, Next.js may not have access to all environment variables
// Detect build phase: check for Next.js build indicators
// Note: We only use NEXT_PHASE to avoid Edge Runtime issues with process.argv
function isBuildPhase(): boolean {
  // Check NEXT_PHASE (most reliable and Edge Runtime compatible)
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.NEXT_PHASE === 'phase-development-build';
}

// Only validate in production runtime (not during build, not in browser)
// Also check if we're in a serverless function context (runtime indicator)
function isRuntime(): boolean {
  if (typeof process === 'undefined') return false;
  
  const buildPhase = isBuildPhase();
  
  return !!(
    process.env.VERCEL || 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_RUNTIME ||
    (process.env.NODE_ENV === 'production' && !buildPhase)
  );
}

if (env.isProduction && !isBuildPhase() && typeof window === 'undefined' && isRuntime()) {
  // Validate required non-JWT env vars
  for (const varName of requiredEnvVars) {
    const envValue = process.env[varName];
    if (!envValue || envValue === 'mongodb://localhost:27017/trading-dashboard') {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Validate JWT secrets - accept either role-specific or legacy JWT_ACCESS_SECRET
  const hasJwtAccessSecret = !!process.env.JWT_ACCESS_SECRET && 
    process.env.JWT_ACCESS_SECRET !== 'jwt-secret-user-change-in-production';
  const hasRoleBasedSecrets = requiredJwtSecrets.some(varName => {
    const value = process.env[varName];
    return value && 
      value !== 'jwt-secret-user-change-in-production' &&
      value !== 'jwt-secret-admin-change-in-production' &&
      value !== 'jwt-secret-ib-change-in-production' &&
      value !== 'jwt-secret-trademaster-change-in-production';
  });
  
  if (!hasJwtAccessSecret && !hasRoleBasedSecrets) {
    throw new Error('Missing required JWT secrets. Provide either JWT_ACCESS_SECRET (legacy) or role-specific secrets (JWT_SECRET_USER, JWT_SECRET_ADMIN, JWT_SECRET_IB, JWT_SECRET_TRADEMASTER)');
  }
}

