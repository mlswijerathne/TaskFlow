/**
 * Environment Configuration Utilities
 * 
 * Provides helper functions and constants for environment detection
 * and configuration management across development and production.
 */

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Application URLs
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Supabase Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_EDGE_URL || '';

// Validate required environment variables
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_EDGE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return { valid: false, missing };
  }

  console.log('✅ All required environment variables are set');
  return { valid: true, missing: [] };
}

// Get full URL for a path
export function getFullUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_URL}${cleanPath}`;
}

// Log environment info (development only)
export function logEnvironmentInfo(): void {
  if (isDevelopment) {
    console.log('🔧 Environment Information:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  App URL:', APP_URL);
    console.log('  Supabase URL:', SUPABASE_URL);
    console.log('  Edge Functions:', EDGE_FUNCTION_URL);
  }
}

// Check if running on client or server
export const isClient = typeof window !== 'undefined';
export const isServer = !isClient;

// Get environment name for display
export function getEnvironmentName(): string {
  if (isDevelopment) return 'Development';
  if (isProduction) return 'Production';
  if (isTest) return 'Test';
  return 'Unknown';
}

// Feature flags based on environment
export const features = {
  // Enable debug logs in development
  enableDebugLogs: isDevelopment,
  
  // Enable analytics in production
  enableAnalytics: isProduction,
  
  // Enable error reporting
  enableErrorReporting: isProduction,
  
  // Enable service worker
  enableServiceWorker: isProduction,
  
  // Show environment badge
  showEnvironmentBadge: isDevelopment,
};

// Export all as a single config object
export const config = {
  env: {
    isDevelopment,
    isProduction,
    isTest,
    name: getEnvironmentName(),
  },
  urls: {
    app: APP_URL,
    supabase: SUPABASE_URL,
    edgeFunctions: EDGE_FUNCTION_URL,
  },
  features,
  isClient,
  isServer,
};

export default config;
