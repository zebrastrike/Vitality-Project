import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  let dbStatus: 'connected' | 'down' = 'down'
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    dbStatus = 'connected'
  } catch {
    dbStatus = 'down'
  }

  const payload = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(payload, {
    status: dbStatus === 'connected' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
