'use client'

import { useEffect, useRef, useCallback } from 'react'

/*
 * VitalityVeins — Cortana-grade neural holographic network
 *
 * Dense, organic, alive. Breathes on idle. Fires on interaction.
 * The site IS the intelligence.
 */

export function VitalityVeins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1, y: -1 })
  const timeRef = useRef(0)
  const nodesRef = useRef<Float32Array>(new Float32Array(0))
  const edgesRef = useRef<Uint32Array>(new Uint32Array(0))
  const nodeCountRef = useRef(0)
  const edgeCountRef = useRef(0)
  const colsRef = useRef(0)

  // Cortana blue
  const R = 120, G = 160, B = 255

  const buildNetwork = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Dense organic grid — 32px base spacing
    const spacing = 32
    const cols = Math.ceil(vw / spacing) + 2
    const rows = Math.ceil(vh / spacing) + 2
    const nodeCount = cols * rows
    colsRef.current = cols

    // 6 floats per node: x, y, pulse, baseAlpha, jitterX, jitterY
    const nodes = new Float32Array(nodeCount * 6)

    // Seed organic clustering — some areas denser, some sparser
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 6

        // Organic jitter — varies by region (neural clustering)
        const regionNoise = Math.sin(r * 0.4 + c * 0.6) * Math.cos(r * 0.3 - c * 0.5)
        const jScale = spacing * (0.2 + Math.abs(regionNoise) * 0.3)
        const jx = Math.sin(r * 17.3 + c * 31.7 + regionNoise * 5) * jScale
        const jy = Math.cos(r * 23.1 + c * 13.9 + regionNoise * 3) * jScale

        nodes[i]     = c * spacing + jx - spacing  // x
        nodes[i + 1] = r * spacing + jy - spacing  // y
        nodes[i + 2] = 0                            // pulse
        // Base alpha varies — denser regions brighter (neural clusters)
        const density = 0.5 + 0.5 * Math.sin(r * 0.15 + 1.3) * Math.cos(c * 0.12 + 0.7)
        nodes[i + 3] = 0.03 + density * 0.04       // baseAlpha
        nodes[i + 4] = jx                           // stored jitter for organic edges
        nodes[i + 5] = jy
      }
    }

    // Edges: dense mesh — right, down, both diagonals (selective)
    const edgeList: number[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c

        // Right
        if (c < cols - 1) edgeList.push(idx, idx + 1)
        // Down
        if (r < rows - 1) edgeList.push(idx, idx + cols)
        // Diagonal down-right (organic selection)
        if (r < rows - 1 && c < cols - 1 && ((r + c) % 2 === 0 || Math.sin(r * 3.1 + c * 2.7) > 0.2))
          edgeList.push(idx, idx + cols + 1)
        // Diagonal down-left (sparser)
        if (r < rows - 1 && c > 0 && Math.sin(r * 5.3 + c * 4.1) > 0.5)
          edgeList.push(idx, idx + cols - 1)
      }
    }

    nodesRef.current = nodes
    edgesRef.current = new Uint32Array(edgeList)
    nodeCountRef.current = nodeCount
    edgeCountRef.current = edgeList.length / 2
  }, [])

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) {
      animRef.current = requestAnimationFrame(draw)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const dt = Math.min(time - (timeRef.current || time), 33) / 1000
    timeRef.current = time

    const vw = window.innerWidth
    const vh = window.innerHeight
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nodeCount = nodeCountRef.current
    const edgeCount = edgeCountRef.current
    const mouse = mouseRef.current
    const t = time * 0.001 // seconds

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── AMBIENT BREATHING ──
    // The whole network subtly pulses like a heartbeat
    const breathe = 0.3 + 0.15 * Math.sin(t * 0.8) + 0.08 * Math.sin(t * 1.3 + 0.5)

    // ── MOUSE PULSE INJECTION ──
    if (mouse.x > 0) {
      const r2 = 180 * 180
      for (let i = 0; i < nodeCount; i++) {
        const ni = i * 6
        const dx = nodes[ni] - mouse.x
        const dy = nodes[ni + 1] - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const strength = (1 - Math.sqrt(d2) / 180)
          nodes[ni + 2] = Math.min(1, nodes[ni + 2] + strength * strength * 0.25)
        }
      }
    }

    // ── PULSE DIFFUSION ──
    // Two passes for stronger propagation
    for (let pass = 0; pass < 2; pass++) {
      for (let e = 0; e < edgeCount; e++) {
        const ei = e * 2
        const ai = edges[ei] * 6
        const bi = edges[ei + 1] * 6
        const diff = (nodes[ai + 2] - nodes[bi + 2]) * 0.04
        nodes[ai + 2] -= diff
        nodes[bi + 2] += diff
      }
    }

    // Decay
    for (let i = 0; i < nodeCount; i++) {
      nodes[i * 6 + 2] *= 0.965
    }

    // ── DRAW EDGES ──
    ctx.lineCap = 'round'

    // Batch by alpha ranges for fewer state changes
    for (let e = 0; e < edgeCount; e++) {
      const ei = e * 2
      const a = edges[ei]
      const b = edges[ei + 1]
      const ai = a * 6
      const bi = b * 6

      const ax = nodes[ai], ay = nodes[ai + 1]
      const bx = nodes[bi], by = nodes[bi + 1]

      // Cull
      if ((ax < -40 && bx < -40) || (ax > vw + 40 && bx > vw + 40)) continue
      if ((ay < -40 && by < -40) || (ay > vh + 40 && by > vh + 40)) continue

      const pa = nodes[ai + 2]
      const pb = nodes[bi + 2]
      const avgPulse = (pa + pb) * 0.5
      const baseA = (nodes[ai + 3] + nodes[bi + 3]) * 0.5 * breathe
      const alpha = baseA + avgPulse * 0.55

      if (alpha < 0.006) continue

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = `rgba(${R}, ${G}, ${B}, ${alpha})`
      ctx.lineWidth = 0.25 + avgPulse * 0.6
      ctx.stroke()
    }

    // ── DRAW PULSE NODES ──
    for (let i = 0; i < nodeCount; i++) {
      const ni = i * 6
      const p = nodes[ni + 2]
      if (p < 0.06) continue

      const x = nodes[ni]
      const y = nodes[ni + 1]
      if (x < -10 || x > vw + 10 || y < -10 || y > vh + 10) continue

      // Hot dot
      const radius = 0.3 + p * 2
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${Math.min(p * 0.8, 0.8)})`
      ctx.fill()

      // Synapse fire — bright glow for strong pulses
      if (p > 0.25) {
        const gr = 3 + p * 12
        const grad = ctx.createRadialGradient(x, y, 0, x, y, gr)
        grad.addColorStop(0, `rgba(${R}, ${G}, ${B}, ${p * 0.35})`)
        grad.addColorStop(0.4, `rgba(${R}, ${G}, ${B}, ${p * 0.1})`)
        grad.addColorStop(1, `rgba(${R}, ${G}, ${B}, 0)`)
        ctx.beginPath()
        ctx.arc(x, y, gr, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }

    ctx.restore()
    animRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctxRef.current = canvas.getContext('2d')
      buildNetwork()
    }

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY

      // Extra strong burst on glass card hover
      const target = e.target as Element
      const card = target.closest?.('.glass, .glass-elevated, .card-hover')
      if (card) {
        const cr = card.getBoundingClientRect()
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        const nodes = nodesRef.current
        const nodeCount = nodeCountRef.current
        const r2 = 250 * 250
        for (let i = 0; i < nodeCount; i++) {
          const ni = i * 6
          const dx = nodes[ni] - cx
          const dy = nodes[ni + 1] - cy
          const d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const s = 1 - Math.sqrt(d2) / 250
            nodes[ni + 2] = Math.min(1, nodes[ni + 2] + s * s * 0.4)
          }
        }
      }
    }

    resize()
    animRef.current = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    document.addEventListener('mousemove', onMouse, { passive: true })

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mousemove', onMouse)
    }
  }, [buildNetwork, draw])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, top: 96 }}
      aria-hidden="true"
    />
  )
}
