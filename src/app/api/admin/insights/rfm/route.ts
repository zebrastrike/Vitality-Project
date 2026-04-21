import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeRFMDistribution } from '@/lib/rfm-scoring'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await computeRFMDistribution()

  return NextResponse.json({
    distribution: data.distribution,
    totalCustomers: data.totalCustomers,
    top: data.top,
    atRisk: data.atRisk,
  })
}
