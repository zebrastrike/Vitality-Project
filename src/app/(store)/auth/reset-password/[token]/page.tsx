import { ResetPasswordForm } from './reset-form'
import { KeyRound } from 'lucide-react'

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-dark-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-white/40 mt-1">
            Choose a strong password you haven&apos;t used before.
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  )
}
