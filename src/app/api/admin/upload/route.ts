import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/admin/upload
 *
 * Accepts a multipart form upload from the admin product editor (or any
 * other admin form that takes images), writes the file under
 * /public/uploads/YYYY-MM/<uuid>.<ext>, and returns the public URL the
 * caller should store in the DB.
 *
 * Volume `./public/uploads` is already mounted into the container per
 * docker-compose.yml so files persist across image rebuilds.
 *
 * Auth: admin only.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}. Use JPG, PNG, WebP or GIF.` },
      { status: 415 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` },
      { status: 413 },
    )
  }

  // Bucket by year-month so a directory listing stays scannable.
  const now = new Date()
  const bucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const ext = (() => {
    const m = file.name.match(/\.([a-zA-Z0-9]+)$/)
    return m ? `.${m[1].toLowerCase()}` : '.bin'
  })()
  const filename = `${randomUUID()}${ext}`

  const dir = path.join(process.cwd(), 'public', 'uploads', bucket)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

  const url = `/uploads/${bucket}/${filename}`
  return NextResponse.json({
    url,
    size: file.size,
    type: file.type,
    name: file.name,
  })
}
