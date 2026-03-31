'use client'

import { useEffect, useRef } from 'react'

/*
 * VitalityVeins — organic neural/vascular network background
 *
 * How it works:
 * - Generates ~18 organic SVG paths using cubic beziers
 * - Each path has a unique length, position, and animation delay
 * - Paths "grow" via stroke-dasharray/dashoffset animation
 * - A pulse of light travels along each path via a second animated overlay
 * - All animation is CSS-only (no JS runtime), GPU-composited
 * - Canvas-free, lightweight, works on all browsers
 */

interface Vein {
  d: string
  length: number
  delay: number
  duration: number
  opacity: number
  width: number
}

function generateVeins(): Vein[] {
  const veins: Vein[] = []

  // Seed-based pseudo-random for deterministic layout
  let seed = 42
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }

  // Main trunk lines — long, sweeping curves
  const trunks = [
    // Left side ascending
    { sx: -5, sy: 85, c1x: 10, c1y: 60, c2x: 25, c2y: 35, ex: 20, ey: 5 },
    { sx: -3, sy: 95, c1x: 15, c1y: 70, c2x: 30, c2y: 50, ex: 35, ey: 15 },
    // Right side ascending
    { sx: 105, sy: 80, c1x: 90, c1y: 55, c2x: 75, c2y: 30, ex: 80, ey: 0 },
    { sx: 103, sy: 90, c1x: 85, c1y: 65, c2x: 70, c2y: 40, ex: 65, ey: 10 },
    // Bottom horizontal flow
    { sx: 20, sy: 105, c1x: 35, c1y: 95, c2x: 55, c2y: 92, ex: 80, ey: 100 },
    // Central diagonal
    { sx: 30, sy: 100, c1x: 40, c1y: 70, c2x: 55, c2y: 45, ex: 50, ey: 10 },
    { sx: 70, sy: 105, c1x: 60, c1y: 75, c2x: 50, c2y: 50, ex: 55, ey: 5 },
  ]

  // Create trunk veins
  trunks.forEach((t, i) => {
    veins.push({
      d: `M ${t.sx} ${t.sy} C ${t.c1x} ${t.c1y}, ${t.c2x} ${t.c2y}, ${t.ex} ${t.ey}`,
      length: 1800 + rand() * 400,
      delay: i * 3,
      duration: 12 + rand() * 8,
      opacity: 0.12 + rand() * 0.08,
      width: 1.5 + rand() * 1,
    })
  })

  // Branch veins — shorter, thinner, sprout from rough trunk midpoints
  const branchPoints = [
    { ox: 15, oy: 55 }, { ox: 22, oy: 40 }, { ox: 85, oy: 50 },
    { ox: 75, oy: 35 }, { ox: 40, oy: 75 }, { ox: 55, oy: 55 },
    { ox: 60, oy: 70 }, { ox: 45, oy: 35 }, { ox: 35, oy: 60 },
    { ox: 50, oy: 80 }, { ox: 25, oy: 70 },
  ]

  branchPoints.forEach((bp, i) => {
    const angle = rand() * Math.PI * 2
    const len = 8 + rand() * 15
    const ex = bp.ox + Math.cos(angle) * len
    const ey = bp.oy + Math.sin(angle) * len
    const cx1 = bp.ox + Math.cos(angle + 0.3) * len * 0.4
    const cy1 = bp.oy + Math.sin(angle + 0.3) * len * 0.4
    const cx2 = bp.ox + Math.cos(angle - 0.2) * len * 0.7
    const cy2 = bp.oy + Math.sin(angle - 0.2) * len * 0.7

    veins.push({
      d: `M ${bp.ox} ${bp.oy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`,
      length: 600 + rand() * 400,
      delay: 4 + i * 2.5 + rand() * 3,
      duration: 8 + rand() * 6,
      opacity: 0.06 + rand() * 0.08,
      width: 0.5 + rand() * 0.8,
    })
  })

  return veins
}

const veins = generateVeins()

export function VitalityVeins() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for the pulse */}
          <filter id="vein-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {veins.map((vein, i) => (
          <g key={i}>
            {/* Base vein — grows into view */}
            <path
              d={vein.d}
              fill="none"
              stroke="rgba(129, 147, 248, 0.4)"
              strokeWidth={vein.width}
              strokeLinecap="round"
              opacity={vein.opacity}
              style={{
                strokeDasharray: vein.length,
                strokeDashoffset: vein.length,
                animation: `vein-grow ${vein.duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${vein.delay}s forwards`,
              }}
            />

            {/* Pulse overlay — light that travels along the vein */}
            <path
              d={vein.d}
              fill="none"
              stroke="rgba(129, 147, 248, 0.8)"
              strokeWidth={vein.width * 0.6}
              strokeLinecap="round"
              filter="url(#vein-glow)"
              opacity={0}
              style={{
                strokeDasharray: `${vein.length * 0.08} ${vein.length * 0.92}`,
                animation: `vein-pulse ${vein.duration * 0.6}s ease-in-out ${vein.delay + vein.duration * 0.8}s infinite`,
              }}
            />
          </g>
        ))}
      </svg>

      <style>{`
        @keyframes vein-grow {
          0% {
            stroke-dashoffset: var(--length, 1800);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes vein-pulse {
          0% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          85% {
            opacity: 0.6;
          }
          100% {
            stroke-dashoffset: ${-1800};
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
