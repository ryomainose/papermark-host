// Environment variable validation helper
export function validateEnvironmentVariables() {
  const requiredVars = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  };

  const optionalVars = {
    TINYBIRD_TOKEN: process.env.TINYBIRD_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const missingOptional = Object.entries(optionalVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingOptional.length > 0) {
    console.warn('Missing optional environment variables (some features may not work):', missingOptional);
  }

  // Validate specific tokens
  if (process.env.TINYBIRD_TOKEN && !process.env.TINYBIRD_TOKEN.startsWith('p.')) {
    console.warn('TINYBIRD_TOKEN may be invalid - should start with "p."');
  }

  if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.startsWith('vercel_blob_rw_')) {
    console.warn('BLOB_READ_WRITE_TOKEN may be invalid - should start with "vercel_blob_rw_"');
  }

  console.log('Environment validation completed');
}

// Check if we're in a serverless environment and validate
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    validateEnvironmentVariables();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}