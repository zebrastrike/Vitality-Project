'use client'

import { useEffect, useRef, useCallback } from 'react'

/*
 * VitalityVeins — ultra-dense vascular network
 *
 * Millions of hairline capillaries. Already visible on load.
 * Mouse movement anywhere sends light pulses outward.
 * Glass cards are organs in a living body.
 */

export function VitalityVeins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1, y: -1, active: false })
  const lastPulseRef = useRef(0)
  const nodesRef = useRef<Float32Array>(new Float32Array(0))  // x, y, pulse, baseAlpha
  const edgesRef = useRef<Uint32Array>(new Uint32Array(0))    // from, to pairs
  const nodeCountRef = useRef(0)
  const edgeCountRef = useRef(0)
  const builtRef = useRef(false)

  const R = 129, G = 147, B = 248

  const buildNetwork = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const dpr = window.devicePixelRatio || 1

    // Dense grid — 40px spacing = ~2500 nodes on 1920x1080
    const spacing = 40
    const cols = Math.ceil(vw / spacing) + 1
    const rows = Math.ceil(vh / spacing) + 1
    const nodeCount = cols * rows

    // 4 floats per node: x, y, pulse, baseAlpha
    const nodes = new Float32Array(nodeCount * 4)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4
        // Jitter for organic feel
        const jx = Math.sin(r * 17.3 + c * 31.7) * spacing * 0.25
        const jy = Math.cos(r * 23.1 + c * 13.9) * spacing * 0.25
        nodes[i]     = c * spacing + jx       // x
        nodes[i + 1] = r * spacing + jy       // y
        nodes[i + 2] = 0                       // pulse
        nodes[i + 3] = 0.025 + Math.abs(Math.sin(r * 0.3 + c * 0.7)) * 0.015 // baseAlpha
      }
    }

    // Edges: connect to right neighbor and bottom neighbor + one diagonal
    // This creates a dense mesh with ~3 edges per node
    const edgeList: number[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        // Right
        if (c < cols - 1) {
          edgeList.push(idx, idx + 1)
        }
        // Down
        if (r < rows - 1) {
          edgeList.push(idx, idx + cols)
        }
        // Diagonal (alternating direction for organic feel)
        if (r < rows - 1 && c < cols - 1 && (r + c) % 2 === 0) {
          edgeList.push(idx, idx + cols + 1)
        }
        if (r < rows - 1 && c > 0 && (r + c) % 3 === 0) {
          edgeList.push(idx, idx + cols - 1)
        }
      }
    }

    nodesRef.current = nodes
    edgesRef.current = new Uint32Array(edgeList)
    nodeCountRef.current = nodeCount
    edgeCountRef.current = edgeList.length / 2
    builtRef.current = true
  }, [])

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx || !builtRef.current) {
      animRef.current = requestAnimationFrame(draw)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const vw = window.innerWidth
    const vh = window.innerHeight
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nodeCount = nodeCountRef.current
    const edgeCount = edgeCountRef.current
    const mouse = mouseRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Mouse pulse injection ──
    // Every frame the mouse is active, inject pulse into nearby nodes
    if (mouse.active && mouse.x > 0) {
      const pulseRadius = 120
      const r2 = pulseRadius * pulseRadius
      for (let i = 0; i < nodeCount; i++) {
        const ni = i * 4
        const dx = nodes[ni] - mouse.x
        const dy = nodes[ni + 1] - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const strength = 1 - Math.sqrt(d2) / pulseRadius
          nodes[ni + 2] = Math.min(1, nodes[ni + 2] + strength * 0.15)
        }
      }
    }

    // ── Propagate pulse to neighbors + decay ──
    // Simple diffusion: each node averages a tiny bit from connected neighbors
    // We do this on edges for efficiency
    for (let e = 0; e < edgeCount; e++) {
      const ei = e * 2
      const a = edges[ei]
      const b = edges[ei + 1]
      const ai = a * 4
      const bi = b * 4
      const pa = nodes[ai + 2]
      const pb = nodes[bi + 2]
      const diff = (pa - pb) * 0.03
      nodes[ai + 2] -= diff
      nodes[bi + 2] += diff
    }

    // Decay all pulses
    for (let i = 0; i < nodeCount; i++) {
      const ni = i * 4
      nodes[ni + 2] *= 0.97 // smooth decay
    }

    // ── Draw edges ──
    ctx.lineCap = 'round'
    for (let e = 0; e < edgeCount; e++) {
      const ei = e * 2
      const a = edges[ei]
      const b = edges[ei + 1]
      const ai = a * 4
      const bi = b * 4

      const ax = nodes[ai], ay = nodes[ai + 1]
      const bx = nodes[bi], by = nodes[bi + 1]

      // Cull off-screen
      if ((ax < -20 && bx < -20) || (ax > vw + 20 && bx > vw + 20)) continue
      if ((ay < -20 && by < -20) || (ay > vh + 20 && by > vh + 20)) continue

      const pa = nodes[ai + 2]
      const pb = nodes[bi + 2]
      const avgPulse = (pa + pb) * 0.5
      const baseA = (nodes[ai + 3] + nodes[bi + 3]) * 0.5
      const alpha = baseA + avgPulse * 0.4

      if (alpha < 0.008) continue

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = `rgba(${R}, ${G}, ${B}, ${alpha})`
      ctx.lineWidth = 0.3 + avgPulse * 0.4
      ctx.stroke()
    }

    // ── Draw bright pulse nodes ──
    for (let i = 0; i < nodeCount; i++) {
      const ni = i * 4
      const p = nodes[ni + 2]
      if (p < 0.08) continue

      const x = nodes[ni]
      const y = nodes[ni + 1]
      if (x < -10 || x > vw + 10 || y < -10 || y > vh + 10) continue

      const r = 0.4 + p * 1.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${p * 0.6})`
      ctx.fill()

      // Glow for strong pulses
      if (p > 0.3) {
        const gr = 4 + p * 8
        const grad = ctx.createRadialGradient(x, y, 0, x, y, gr)
        grad.addColorStop(0, `rgba(${R}, ${G}, ${B}, ${p * 0.2})`)
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
      mouseRef.current.active = true
    }

    const onMouseLeave = () => {
      mouseRef.current.active = false
    }

    // Also pulse from glass card hovers
    const onHover = (e: MouseEvent) => {
      const target = e.target as Element
      const card = target.closest?.('.glass, .glass-elevated, .card-hover')
      if (card) {
        const cr = card.getBoundingClientRect()
        // Inject a strong pulse at card center
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        const now = Date.now()
        if (now - lastPulseRef.current > 100) {
          lastPulseRef.current = now
          const nodes = nodesRef.current
          const nodeCount = nodeCountRef.current
          const r2 = 200 * 200
          for (let i = 0; i < nodeCount; i++) {
            const ni = i * 4
            const dx = nodes[ni] - cx
            const dy = nodes[ni + 1] - cy
            const d2 = dx * dx + dy * dy
            if (d2 < r2) {
              const strength = 1 - Math.sqrt(d2) / 200
              nodes[ni + 2] = Math.min(1, nodes[ni + 2] + strength * 0.5)
            }
          }
        }
      }
    }

    resize()
    animRef.current = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    document.addEventListener('mousemove', onMouse, { passive: true })
    document.addEventListener('mousemove', onHover, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mousemove', onMouse)
      document.removeEventListener('mousemove', onHover)
      document.removeEventListener('mouseleave', onMouseLeave)
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
