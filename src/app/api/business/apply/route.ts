import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { newBusinessApplication } from '@/lib/email-templates'
import { createAdminNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, type, contactName, email, phone, website, reason } = body

    if (!businessName || !type || !contactName || !email || !phone) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    const validTypes = ['GYM', 'CLINIC', 'DOCTOR_OFFICE', 'OTHER']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid business type' },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      // Create user with a temporary password hash
      const tempPassword = await bcrypt.hash(
        Math.random().toString(36).slice(2) + Date.now().toString(36),
        10
      )
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: contactName,
          passwordHash: tempPassword,
          role: 'CUSTOMER',
        },
      })
    }

    // Check if user already has an organization
    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId: user.id, role: 'OWNER' },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You already have a business application on file' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = slugify(businessName)
    const existingOrg = await prisma.organization.findUnique({ where: { slug } })
    if (existingOrg) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Create organization with SUSPENDED status (pending approval)
    const organization = await prisma.organization.create({
      data: {
        name: businessName,
        slug,
        type: type as any,
        status: 'SUSPENDED', // Pending review — admin approves to ACTIVE
      },
    })

    // Create owner membership
    await prisma.orgMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'OWNER',
      },
    })

    // Notify admin (fire-and-forget) — email + in-app
    void (async () => {
      try {
        await createAdminNotification({
          type: 'APPLICATION_NEW',
          title: `New business application: ${businessName}`,
          body: `${contactName} (${user.email}) applied — ${type.toLowerCase()}`,
          link: '/admin/organizations',
          entityType: 'Organization',
          entityId: organization.id,
        })

        const adminEmail = process.env.ADMIN_EMAIL
        if (!adminEmail) return
        const tpl = newBusinessApplication({
          adminEmail,
          businessName,
          contactEmail: user.email,
        })
        await sendEmail({
          to: adminEmail,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
      } catch (err) {
        console.error('Admin application email failed:', err)
      }
    })()

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
    })
  } catch (error) {
    console.error('Business application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
