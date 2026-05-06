'use client'

import { useEffect, useRef, useCallback } from 'react'

/*
 * VitalityVeins — Cortana neural network, fullscreen, touch-ready
 *
 * Covers entire viewport including behind navbar.
 * Muted but visible at idle. Breathes.
 * Mouse drag / touch scroll → light trail follows.
 * Glass card interaction → sustained heartbeat pulse.
 */

export function VitalityVeins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animRef = useRef<number>(0)
  const pointerRef = useRef({ x: -1, y: -1, down: false })
  const activeCardRef = useRef<Element | null>(null)
  const activeCardRectRef = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null)
  const activeCardTimeRef = useRef(0)
  const timeRef = useRef(0)
  const nodesRef = useRef<Float32Array>(new Float32Array(0))
  const edgesRef = useRef<Uint32Array>(new Uint32Array(0))
  const nodeCountRef = useRef(0)
  const edgeCountRef = useRef(0)
  // All glass-card rects on screen — keeps the network from drawing inside them
  const cardRectsRef = useRef<Array<{ left: number; top: number; right: number; bottom: number }>>([])
  const cardRefreshRef = useRef(0)

  const R = 120, G = 160, B = 255

  // Helper: is point inside any cached card rect?
  const isInsideCard = (x: number, y: number): boolean => {
    const rects = cardRectsRef.current
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true
    }
    return false
  }

  // Helper: shortest distance from point to rectangle perimeter (0 if inside)
  const distToRect = (x: number, y: number, r: { left: number; top: number; right: number; bottom: number }) => {
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    return Math.sqrt(dx * dx + dy * dy)
  }

  const buildNetwork = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    const spacing = 28
    const cols = Math.ceil(vw / spacing) + 2
    const rows = Math.ceil(vh / spacing) + 2
    const nodeCount = cols * rows

    // 4 floats: x, y, pulse, baseAlpha
    const nodes = new Float32Array(nodeCount * 4)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4
        const regionNoise = Math.sin(r * 0.4 + c * 0.6) * Math.cos(r * 0.3 - c * 0.5)
        const jScale = spacing * (0.15 + Math.abs(regionNoise) * 0.25)
        const jx = Math.sin(r * 17.3 + c * 31.7 + regionNoise * 5) * jScale
        const jy = Math.cos(r * 23.1 + c * 13.9 + regionNoise * 3) * jScale

        nodes[i]     = c * spacing + jx - spacing
        nodes[i + 1] = r * spacing + jy - spacing
        nodes[i + 2] = 0
        const density = 0.5 + 0.5 * Math.sin(r * 0.15 + 1.3) * Math.cos(c * 0.12 + 0.7)
        nodes[i + 3] = 0.035 + density * 0.035
      }
    }

    const edgeList: number[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (c < cols - 1) edgeList.push(idx, idx + 1)
        if (r < rows - 1) edgeList.push(idx, idx + cols)
        if (r < rows - 1 && c < cols - 1 && ((r + c) % 2 === 0 || Math.sin(r * 3.1 + c * 2.7) > 0.15))
          edgeList.push(idx, idx + cols + 1)
        if (r < rows - 1 && c > 0 && Math.sin(r * 5.3 + c * 4.1) > 0.4)
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
    if (!canvas || !ctx) { animRef.current = requestAnimationFrame(draw); return }

    const dpr = window.devicePixelRatio || 1
    const dt = Math.min(time - (timeRef.current || time), 33) / 1000
    timeRef.current = time

    const vw = window.innerWidth
    const vh = window.innerHeight
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nodeCount = nodeCountRef.current
    const edgeCount = edgeCountRef.current
    const ptr = pointerRef.current
    const t = time * 0.001

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Refresh glass card rects every ~250ms (debounced via frame timer) ──
    if (time - cardRefreshRef.current > 250) {
      cardRefreshRef.current = time
      const els = document.querySelectorAll('.glass, .glass-elevated, .card-hover')
      const rects: Array<{ left: number; top: number; right: number; bottom: number }> = []
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        // Only include visible rects on-screen
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
          rects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
        }
      })
      cardRectsRef.current = rects
    }

    // ── Ambient breathing ──
    const breathe = 0.35 + 0.12 * Math.sin(t * 0.7) + 0.06 * Math.sin(t * 1.4 + 0.5)

    // ── Pointer pulse injection — only OUTSIDE cards ──
    if (ptr.x > 0 && !isInsideCard(ptr.x, ptr.y)) {
      const radius = ptr.down ? 220 : 160
      const intensity = ptr.down ? 0.35 : 0.2
      const r2 = radius * radius
      for (let i = 0; i < nodeCount; i++) {
        const ni = i * 4
        const nx = nodes[ni], ny = nodes[ni + 1]
        // Skip nodes inside cards — preserves card "clean zone"
        if (isInsideCard(nx, ny)) continue
        const dx = nx - ptr.x
        const dy = ny - ptr.y
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const s = 1 - Math.sqrt(d2) / radius
          nodes[ni + 2] = Math.min(1, nodes[ni + 2] + s * s * intensity)
        }
      }
    }

    // ── Active card — pulses radiate FROM the perimeter outward ──
    // The card stays clean. Energy emits from its edges into the surrounding mesh.
    const card = activeCardRef.current
    if (card) {
      activeCardTimeRef.current += dt
      const ht = activeCardTimeRef.current

      // Refresh active card rect each frame to track scroll/layout
      const cr = card.getBoundingClientRect()
      const cardRect = { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom }
      activeCardRectRef.current = cardRect

      // Heartbeat rhythm
      const beatCycle = 1.4
      const beatPhase = (ht % beatCycle) / beatCycle

      const isCharging = beatPhase < 0.3
      const blastPhase = isCharging ? 0 : (beatPhase - 0.3) / 0.7

      // Pre-compute perimeter "halo" — nodes within N px of the rect's edge
      const haloMax = isCharging ? 220 : 280

      if (isCharging) {
        const chargeStr = Math.pow(beatPhase / 0.3, 2) * 0.9
        for (let i = 0; i < nodeCount; i++) {
          const ni = i * 4
          const nx = nodes[ni], ny = nodes[ni + 1]
          // Skip everything inside any card (card is a "clean zone")
          if (isInsideCard(nx, ny)) continue
          const d = distToRect(nx, ny, cardRect)
          if (d < haloMax) {
            const s = 1 - d / haloMax
            nodes[ni + 2] = Math.min(1, nodes[ni + 2] + s * s * chargeStr * dt * 10)
          }
        }
      } else {
        // BLAST: shockwave radiating outward from the card perimeter
        const maxRadius = Math.max(vw, vh) * 1.2
        const ringRadius = blastPhase * maxRadius
        const ringWidth = 200 + blastPhase * 100
        const ringStrength = (1 - blastPhase * 0.6) * 0.95

        for (let i = 0; i < nodeCount; i++) {
          const ni = i * 4
          const nx = nodes[ni], ny = nodes[ni + 1]
          // Cards are clean zones — skip
          if (isInsideCard(nx, ny)) continue
          // Distance from this node to the closest point on the card perimeter
          const dToEdge = distToRect(nx, ny, cardRect)
          const ringDist = Math.abs(dToEdge - ringRadius)
          if (ringDist < ringWidth) {
            const s = 1 - ringDist / ringWidth
            nodes[ni + 2] = Math.min(1, nodes[ni + 2] + s * s * ringStrength * dt * 18)
          }
        }

        // Keep the perimeter glowing hot during blast (inner halo)
        for (let i = 0; i < nodeCount; i++) {
          const ni = i * 4
          const nx = nodes[ni], ny = nodes[ni + 1]
          if (isInsideCard(nx, ny)) continue
          const d = distToRect(nx, ny, cardRect)
          if (d < 150) {
            const s = 1 - d / 150
            nodes[ni + 2] = Math.min(1, nodes[ni + 2] + s * 0.5 * dt * 8)
          }
        }
      }
    } else {
      activeCardRectRef.current = null
    }

    // ── Pulse diffusion (4 passes — energy spreads fast) ──
    for (let pass = 0; pass < 4; pass++) {
      for (let e = 0; e < edgeCount; e++) {
        const ei = e * 2
        const ai = edges[ei] * 4
        const bi = edges[ei + 1] * 4
        const diff = (nodes[ai + 2] - nodes[bi + 2]) * 0.045
        nodes[ai + 2] -= diff
        nodes[bi + 2] += diff
      }
    }

    // Decay — slow so energy lingers and travels far
    for (let i = 0; i < nodeCount; i++) {
      nodes[i * 4 + 2] *= 0.945
    }

    // ── Draw edges — skip any segment with either endpoint inside a card ──
    ctx.lineCap = 'round'
    for (let e = 0; e < edgeCount; e++) {
      const ei = e * 2
      const ai = edges[ei] * 4
      const bi = edges[ei + 1] * 4

      const ax = nodes[ai], ay = nodes[ai + 1]
      const bx = nodes[bi], by = nodes[bi + 1]
      if ((ax < -30 && bx < -30) || (ax > vw + 30 && bx > vw + 30)) continue
      if ((ay < -30 && by < -30) || (ay > vh + 30 && by > vh + 30)) continue
      // Cards are clean zones — skip edges that touch card interiors
      if (isInsideCard(ax, ay) || isInsideCard(bx, by)) continue

      const avgPulse = (nodes[ai + 2] + nodes[bi + 2]) * 0.5
      const baseA = (nodes[ai + 3] + nodes[bi + 3]) * 0.5 * breathe
      const alpha = baseA + avgPulse * 0.7

      if (alpha < 0.005) continue

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = `rgba(${R}, ${G}, ${B}, ${Math.min(alpha, 0.6)})`
      ctx.lineWidth = 0.2 + avgPulse * 0.8
      ctx.stroke()
    }

    // ── Draw pulse nodes — skip nodes inside cards ──
    for (let i = 0; i < nodeCount; i++) {
      const ni = i * 4
      const p = nodes[ni + 2]
      if (p < 0.04) continue

      const x = nodes[ni], y = nodes[ni + 1]
      if (x < -10 || x > vw + 10 || y < -10 || y > vh + 10) continue
      if (isInsideCard(x, y)) continue

      // Core dot
      const r = 0.3 + p * 2.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${Math.min(p * 0.8, 0.85)})`
      ctx.fill()

      // Synapse glow — bigger, more pronounced
      if (p > 0.15) {
        const gr = 4 + p * 18
        const grad = ctx.createRadialGradient(x, y, 0, x, y, gr)
        grad.addColorStop(0, `rgba(${R}, ${G}, ${B}, ${p * 0.4})`)
        grad.addColorStop(0.3, `rgba(${R}, ${G}, ${B}, ${p * 0.15})`)
        grad.addColorStop(0.7, `rgba(${R}, ${G}, ${B}, ${p * 0.04})`)
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

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX
      pointerRef.current.y = e.clientY
    }

    const onPointerDown = (e: PointerEvent) => {
      pointerRef.current.down = true
      pointerRef.current.x = e.clientX
      pointerRef.current.y = e.clientY

      // Check if a glass card was pressed
      const target = e.target as Element
      const card = target.closest?.('.glass, .glass-elevated, .card-hover')
      if (card && card !== activeCardRef.current) {
        activeCardRef.current = card
        activeCardTimeRef.current = 0
        const cr = card.getBoundingClientRect()
        activeCardRectRef.current = { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom }
      }
    }

    const onPointerUp = () => {
      pointerRef.current.down = false
    }

    // Track hover on glass cards for sustained heartbeat
    const onMouseEnter = (e: MouseEvent) => {
      const target = e.target as Element
      const card = target.closest?.('.glass, .glass-elevated, .card-hover')
      if (card && card !== activeCardRef.current) {
        activeCardRef.current = card
        activeCardTimeRef.current = 0
        const cr = card.getBoundingClientRect()
        activeCardRectRef.current = { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom }
      }
    }

    const onMouseLeave = (e: MouseEvent) => {
      const target = e.relatedTarget as Element | null
      if (!target || !target.closest?.('.glass, .glass-elevated, .card-hover')) {
        activeCardRef.current = null
        activeCardTimeRef.current = 0
      }
    }

    // Touch support
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch) {
        pointerRef.current.x = touch.clientX
        pointerRef.current.y = touch.clientY
        pointerRef.current.down = true
      }
    }

    const onTouchEnd = () => {
      pointerRef.current.down = false
      // Keep x/y so the last pulse fades naturally
    }

    resize()
    animRef.current = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('mouseover', onMouseEnter, { passive: true })
    document.addEventListener('mouseout', onMouseLeave, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('mouseover', onMouseEnter)
      document.removeEventListener('mouseout', onMouseLeave)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [buildNetwork, draw])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
