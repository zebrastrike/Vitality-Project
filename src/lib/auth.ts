import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { logAudit } from './audit'
import bcrypt from 'bcryptjs'

const cookieDomain = process.env.NEXTAUTH_COOKIE_DOMAIN
const isSecure = (process.env.NEXTAUTH_URL || '').startsWith('https://')
const sessionCookieName = `${isSecure ? '__Secure-' : ''}next-auth.session-token`

export const authOptions: NextAuthOptions = {
  useSecureCookies: isSecure,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  cookies: cookieDomain
    ? {
        sessionToken: {
          name: sessionCookieName,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: isSecure,
            domain: cookieDomain,
          },
        },
      }
    : undefined,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) {
          await logAudit({
            userEmail: email,
            action: 'auth.login.failure',
            metadata: { reason: 'not_found_or_oauth_only' },
          })
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) {
          await logAudit({
            userId: user.id,
            userEmail: user.email,
            action: 'auth.login.failure',
            metadata: { reason: 'bad_password' },
          })
          return null
        }

        await logAudit({
          userId: user.id,
          userEmail: user.email,
          action: 'auth.login.success',
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
