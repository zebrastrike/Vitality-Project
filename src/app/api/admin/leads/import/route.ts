import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseCsv } from '@/lib/csv'

interface ImportRow {
  businessName?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  source?: string
  notes?: string
  estimatedValue?: string
}

interface ImportError {
  row: number
  reason: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const csv: string = body?.csv
    if (!csv || typeof csv !== 'string') {
      return NextResponse.json(
        { error: 'csv body required' },
        { status: 400 },
      )
    }

    const rows = parseCsv(csv) as ImportRow[]
    const errors: ImportError[] = []
    let imported = 0
    let skipped = 0

    // Preload existing emails so we can dedupe in one query
    const emails = rows
      .map((r) => r.contactEmail?.trim().toLowerCase())
      .filter((e): e is string => !!e)

    const existing = await prisma.salesLead.findMany({
      where: { contactEmail: { in: emails } },
      select: { contactEmail: true },
    })
    const existingSet = new Set(existing.map((e) => e.contactEmail))

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2 // human-friendly (1 = header row)
      const row = rows[i]
      const businessName = row.businessName?.trim()
      const contactEmail = row.contactEmail?.trim().toLowerCase()
      const contactName = row.contactName?.trim()

      if (!businessName || !contactEmail) {
        errors.push({
          row: rowIndex,
          reason: 'Missing required businessName or contactEmail',
        })
        skipped++
        continue
      }
      if (existingSet.has(contactEmail)) {
        skipped++
        continue
      }

      let estimatedValue: number | null = null
      if (row.estimatedValue && row.estimatedValue.trim() !== '') {
        const n = parseInt(row.estimatedValue.trim(), 10)
        estimatedValue = isNaN(n) ? null : n
      }

      try {
        await prisma.salesLead.create({
          data: {
            businessName,
            contactName: contactName || businessName,
            contactEmail,
            contactPhone: row.contactPhone?.trim() || null,
            source: row.source?.trim() || 'csv_import',
            notes: row.notes?.trim() || null,
            estimatedValue,
          },
        })
        existingSet.add(contactEmail)
        imported++
      } catch (err) {
        errors.push({
          row: rowIndex,
          reason: err instanceof Error ? err.message : 'unknown error',
        })
        skipped++
      }
    }

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'lead.import',
      entityType: 'SalesLead',
      metadata: { imported, skipped, errorCount: errors.length },
    })

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('Import leads error:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 },
    )
  }
}
