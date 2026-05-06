import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Same regex as register API. Lives here too so the reset-password flow
// (used by tenant + admin invites for first-time activation) can let
// users pick a handle while they set their password.
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,23}$/

const schema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  // Optional. Only sent during activation; ignored on routine resets.
  username: z
    .string()
    .regex(USERNAME_REGEX, 'Username must be 3-24 chars (letters, numbers, _ . -); start with a letter or digit')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { token, password, username } = parsed.data
    const usernameLower = username?.toLowerCase()

    const user = await prisma.user.findUnique({ where: { resetToken: token } })
    if (
      !user ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: 'Reset link is invalid or expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Username uniqueness — only enforce when one is being set on this
    // account for the first time. We never overwrite an existing username
    // here (settings page handles renames).
    if (usernameLower && !user.username) {
      const clash = await prisma.user.findUnique({ where: { username: usernameLower } })
      if (clash && clash.id !== user.id) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        // Only set a username if (a) the user passed one AND (b) the
        // account doesn't already have one. Avoids accidentally renaming
        // existing handles via the reset flow.
        ...(usernameLower && !user.username ? { username: usernameLower } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
