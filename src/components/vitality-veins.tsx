'use client'

/*
 * VitalityVeins — healing-pattern background
 *
 * DNA double-helix strands + branching capillary networks
 * that grow and pulse with light. Organic, biological, alive.
 *
 * Clipped below the navbar (96px from top).
 * All CSS animation, no JS runtime.
 */

// ── DNA helix paths ──────────────────────────────────────────────
// Two intertwined sine-like curves that evoke a double helix
function helixPaths(
  cx: number, startY: number, amplitude: number, segments: number, phaseOffset: number
): string {
  let d = ''
  const segHeight = 100 / segments
  for (let i = 0; i <= segments; i++) {
    const y = startY + i * segHeight
    const x = cx + Math.sin((i / segments) * Math.PI * 4 + phaseOffset) * amplitude
    if (i === 0) d += `M ${x} ${y}`
    else {
      const prevY = startY + (i - 1) * segHeight
      const cpY = (prevY + y) / 2
      const prevX = cx + Math.sin(((i - 1) / segments) * Math.PI * 4 + phaseOffset) * amplitude
      d += ` S ${(prevX + x) / 2} ${cpY}, ${x} ${y}`
    }
  }
  return d
}

// ── Capillary branches ───────────────────────────────────────────
// Organic branching lines that grow outward from the helixes
const capillaries = [
  // Left network
  'M 12 30 Q 8 25, 5 18 Q 3 12, 2 5',
  'M 12 30 Q 16 22, 22 16 Q 26 12, 28 5',
  'M 15 55 Q 10 48, 6 42 Q 3 37, 1 30',
  'M 15 55 Q 20 50, 25 48 Q 30 45, 35 40',
  'M 10 75 Q 5 68, 3 60',
  'M 10 75 Q 15 70, 22 68 Q 28 65, 32 58',
  // Right network
  'M 88 25 Q 92 20, 95 12 Q 97 6, 98 0',
  'M 88 25 Q 84 18, 78 14 Q 74 10, 72 4',
  'M 85 50 Q 90 44, 94 38 Q 97 32, 99 25',
  'M 85 50 Q 80 44, 75 40 Q 70 36, 66 30',
  'M 90 72 Q 95 66, 97 58',
  'M 90 72 Q 85 66, 78 62 Q 72 58, 68 52',
  // Cross-connections (rungs between helixes, like DNA base pairs)
  'M 14 20 Q 20 18, 28 20',
  'M 10 40 Q 18 38, 25 40',
  'M 12 60 Q 20 58, 27 60',
  'M 8 80 Q 16 78, 24 80',
  'M 86 30 Q 80 28, 72 30',
  'M 90 50 Q 82 48, 75 50',
  'M 88 70 Q 80 68, 73 70',
  'M 92 90 Q 84 88, 76 90',
]

// ── Junction nodes ───────────────────────────────────────────────
// Glowing dots at branch intersections
const nodes = [
  { cx: 12, cy: 30, r: 1.2 },
  { cx: 15, cy: 55, r: 1.0 },
  { cx: 10, cy: 75, r: 0.8 },
  { cx: 88, cy: 25, r: 1.1 },
  { cx: 85, cy: 50, r: 1.0 },
  { cx: 90, cy: 72, r: 0.9 },
  { cx: 50, cy: 45, r: 0.6 },
  { cx: 50, cy: 65, r: 0.6 },
]

export function VitalityVeins() {
  // Generate helix strands
  const leftStrand1 = helixPaths(12, -5, 8, 12, 0)
  const leftStrand2 = helixPaths(12, -5, 8, 12, Math.PI)
  const rightStrand1 = helixPaths(88, -5, 8, 12, 0.5)
  const rightStrand2 = helixPaths(88, -5, 8, 12, Math.PI + 0.5)

  const helixes = [
    { d: leftStrand1, delay: 0 },
    { d: leftStrand2, delay: 1.5 },
    { d: rightStrand1, delay: 3 },
    { d: rightStrand2, delay: 4.5 },
  ]

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1, clipPath: 'inset(96px 0 0 0)' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="vein-glow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* ── DNA Helix strands ── */}
        {helixes.map((h, i) => (
          <g key={`helix-${i}`}>
            <path
              d={h.d}
              fill="none"
              stroke="rgba(129, 147, 248, 0.25)"
              strokeWidth={1.8}
              strokeLinecap="round"
              filter="url(#vein-glow)"
              style={{
                strokeDasharray: 3000,
                strokeDashoffset: 3000,
                animation: `vein-grow 16s cubic-bezier(0.25, 0.1, 0.25, 1) ${h.delay}s forwards`,
              }}
            />
            {/* Traveling pulse */}
            <path
              d={h.d}
              fill="none"
              stroke="rgba(160, 175, 255, 0.9)"
              strokeWidth={1}
              strokeLinecap="round"
              filter="url(#vein-glow)"
              style={{
                strokeDasharray: '80 2920',
                animation: `vein-pulse 10s ease-in-out ${h.delay + 14}s infinite`,
              }}
            />
          </g>
        ))}

        {/* ── Capillary branches ── */}
        {capillaries.map((d, i) => {
          const isCross = d.includes('Q') && i >= 12 // cross-connections are thinner
          return (
            <g key={`cap-${i}`}>
              <path
                d={d}
                fill="none"
                stroke={isCross ? 'rgba(129, 147, 248, 0.12)' : 'rgba(129, 147, 248, 0.18)'}
                strokeWidth={isCross ? 0.4 : 0.8}
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1200,
                  strokeDashoffset: 1200,
                  animation: `vein-grow ${8 + (i % 5) * 2}s cubic-bezier(0.25, 0.1, 0.25, 1) ${6 + i * 0.8}s forwards`,
                }}
              />
              {/* Branch pulse */}
              {!isCross && (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(160, 175, 255, 0.7)"
                  strokeWidth={0.5}
                  strokeLinecap="round"
                  filter="url(#vein-glow)"
                  style={{
                    strokeDasharray: '40 1160',
                    animation: `vein-pulse ${6 + (i % 4) * 2}s ease-in-out ${18 + i * 1.5}s infinite`,
                  }}
                />
              )}
            </g>
          )
        })}

        {/* ── Junction nodes — glowing dots ── */}
        {nodes.map((n, i) => (
          <g key={`node-${i}`}>
            {/* Outer glow */}
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r * 3}
              fill="rgba(129, 147, 248, 0.08)"
              filter="url(#node-glow)"
              style={{
                animation: `node-breathe 4s ease-in-out ${8 + i * 2}s infinite`,
                opacity: 0,
              }}
            />
            {/* Core dot */}
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill="rgba(160, 175, 255, 0.5)"
              style={{
                animation: `node-appear 2s ease-out ${6 + i * 1.5}s forwards`,
                opacity: 0,
              }}
            />
          </g>
        ))}
      </svg>

      <style>{`
        @keyframes vein-grow {
          0% { stroke-dashoffset: var(--length, 3000); opacity: 0; }
          3% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes vein-pulse {
          0% { stroke-dashoffset: 0; opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { stroke-dashoffset: -3000; opacity: 0; }
        }

        @keyframes node-appear {
          0% { opacity: 0; transform: scale(0); }
          60% { opacity: 0.8; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes node-breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
