import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/lib/prisma";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  const startTime = Date.now();
  
  try {
    // Log environment check
    const criticalEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'NODE_ENV'
    ];
    
    const missingEnvVars = criticalEnvVars.filter(env => !process.env[env]);
    if (missingEnvVars.length > 0) {
      console.error('Missing critical environment variables:', missingEnvVars);
    }

    // Test database connection with timeout
    console.log('Testing database connection...');
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as health_check`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);

    const responseTime = Date.now() - startTime;
    console.log(`Database connection successful in ${responseTime}ms`);

    return res.json({
      status: "ok",
      message: "All systems operational",
      checks: {
        database: "ok",
        envVars: missingEnvVars.length === 0 ? "ok" : "missing",
        responseTime: `${responseTime}ms`
      },
      timestamp: new Date().toISOString(),
      ...(missingEnvVars.length > 0 && { missingEnvVars })
    });
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error('Health check failed:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : 'Unknown error',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
}
