import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'The Vitality Project — Premium Peptides'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0c0e1a',
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(98,112,242,0.28) 0%, rgba(12,14,26,0) 45%), radial-gradient(circle at 85% 80%, rgba(129,147,248,0.22) 0%, rgba(12,14,26,0) 40%)',
          padding: '80px 100px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: '0.3em',
            color: '#8193f8',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 36,
          }}
        >
          The Vitality Project
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Premium research</span>
          <span style={{ color: '#8193f8' }}>peptides.</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 28,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 820,
            lineHeight: 1.35,
          }}
        >
          Private label, lab-tested, direct to qualified researchers.
        </div>
        <div
          style={{
            marginTop: 'auto',
            fontSize: 20,
            color: 'rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>vitalityproject.global</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
