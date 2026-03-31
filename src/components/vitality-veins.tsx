'use client'

import { useEffect, useRef, useCallback } from 'react'

/*
 * VitalityVeins — dense futuristic vascular network
 *
 * Ultra-thin lines, tons of them, connecting every glass card.
 * Intermediate routing nodes create a dense capillary mesh.
 * Hover a card → pulse cascades through the entire network.
 */

interface Node {
  x: number
  y: number
  el: Element | null
  connections: number[]
  pulse: number
  pulseVel: number
  baseOpacity: number
  size: number // 0=micro, 1=small, 2=card
}

interface Vein {
  from: number
  to: number
  progress: number
  pulse: number
  pulsePos: number
  thickness: number
}

export function VitalityVeins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const veinsRef = useRef<Vein[]>([])
  const animRef = useRef<number>(0)
  const hoveredRef = useRef<number>(-1)
  const lastTimeRef = useRef<number>(0)

  const brand = { r: 129, g: 147, b: 248 }

  const buildNetwork = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const vw = window.innerWidth
    const pageH = document.documentElement.scrollHeight
    const nodes: Node[] = []
    const veins: Vein[] = []

    // ── Card nodes ──
    const cards = document.querySelectorAll('.glass, .glass-elevated, .card-hover')
    const seen = new Set<Element>()
    cards.forEach((card) => {
      if (seen.has(card)) return
      seen.add(card)
      const cr = card.getBoundingClientRect()
      nodes.push({
        x: cr.left + cr.width / 2,
        y: cr.top + window.scrollY + cr.height / 2,
        el: card, connections: [], pulse: 0, pulseVel: 0,
        baseOpacity: 0.25, size: 2,
      })
    })

    const cardCount = nodes.length

    // ── Intermediate routing nodes — dense grid between cards ──
    // Creates the "vascular network" feel
    const gridSpacing = 120 // pixels between grid nodes
    const cols = Math.ceil(vw / gridSpacing)
    const rows = Math.ceil(pageH / gridSpacing)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Jitter to avoid perfect grid
        const jx = (Math.sin(r * 13.7 + c * 7.3) * 0.5 + 0.5) * gridSpacing * 0.4
        const jy = (Math.cos(r * 9.1 + c * 11.2) * 0.5 + 0.5) * gridSpacing * 0.4
        const x = c * gridSpacing + gridSpacing / 2 + jx
        const y = r * gridSpacing + gridSpacing / 2 + jy

        // Skip if too close to an existing card node
        let tooClose = false
        for (let i = 0; i < cardCount; i++) {
          const dx = nodes[i].x - x
          const dy = nodes[i].y - y
          if (dx * dx + dy * dy < 3600) { tooClose = true; break }
        }
        if (tooClose) continue

        nodes.push({
          x, y, el: null, connections: [], pulse: 0, pulseVel: 0,
          baseOpacity: 0.08, size: 0,
        })
      }
    }

    // ── Edge anchor nodes ──
    for (let i = 0; i < 30; i++) {
      const side = i % 4
      let x: number, y: number
      const t = (i / 30) * pageH
      switch (side) {
        case 0: x = -10; y = t; break
        case 1: x = vw + 10; y = t; break
        case 2: x = (i / 30) * vw; y = -10; break
        default: x = (i / 30) * vw; y = pageH + 10; break
      }
      nodes.push({
        x, y, el: null, connections: [], pulse: 0, pulseVel: 0,
        baseOpacity: 0.04, size: 0,
      })
    }

    // ── Connect: each node to nearest neighbors ──
    const maxDistCard = 500  // cards connect further
    const maxDistGrid = gridSpacing * 1.8
    const maxConnCard = 5
    const maxConnGrid = 3

    for (let i = 0; i < nodes.length; i++) {
      const isCard = i < cardCount
      const maxDist = isCard ? maxDistCard : maxDistGrid
      const maxConn = isCard ? maxConnCard : maxConnGrid

      const dists: { idx: number; dist: number }[] = []
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < maxDist) dists.push({ idx: j, dist })
      }
      dists.sort((a, b) => a.dist - b.dist)

      let added = 0
      for (const { idx } of dists) {
        if (added >= maxConn) break
        // Avoid duplicate veins
        const exists = veins.some(
          (v) => (v.from === i && v.to === idx) || (v.from === idx && v.to === i)
        )
        if (exists) { added++; continue }

        nodes[i].connections.push(idx)
        nodes[idx].connections.push(i)

        const isCardVein = i < cardCount || idx < cardCount
        veins.push({
          from: i, to: idx, progress: 0, pulse: 0, pulsePos: 0,
          thickness: isCardVein ? 0.5 : 0.3,
        })
        added++
      }
    }

    nodesRef.current = nodes
    veinsRef.current = veins
  }, [])

  const handleHover = useCallback((e: MouseEvent) => {
    const nodes = nodesRef.current
    const target = e.target as Element
    let found = -1
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].el && (nodes[i].el === target || nodes[i].el!.contains(target))) {
        found = i; break
      }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found
      if (found >= 0) triggerPulse(found)
    }
  }, [])

  const triggerPulse = (nodeIdx: number) => {
    const nodes = nodesRef.current
    const veins = veinsRef.current
    if (!nodes[nodeIdx]) return
    nodes[nodeIdx].pulse = 1.0
    nodes[nodeIdx].pulseVel = 0.018
    veins.forEach((v) => {
      if (v.from === nodeIdx || v.to === nodeIdx) {
        v.pulse = 1.0
        v.pulsePos = v.from === nodeIdx ? 0 : 1
      }
    })
  }

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05)
    lastTimeRef.current = time

    const scrollY = window.scrollY
    const vw = window.innerWidth
    const vh = window.innerHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const nodes = nodesRef.current
    const veins = veinsRef.current

    // ── Update ──
    veins.forEach((v) => {
      if (v.progress < 1) v.progress = Math.min(1, v.progress + dt * 0.25)
      if (v.pulse > 0) {
        const dir = v.pulsePos < 0.5 ? 1 : -1
        v.pulsePos += dir * dt * 1.2
        v.pulse -= dt * 0.4
        if (v.pulse <= 0) { v.pulse = 0; v.pulsePos = 0 }

        if ((dir === 1 && v.pulsePos >= 0.92) || (dir === -1 && v.pulsePos <= 0.08)) {
          const targetIdx = dir === 1 ? v.to : v.from
          if (nodes[targetIdx] && nodes[targetIdx].pulse < 0.25) {
            nodes[targetIdx].pulse = v.pulse * 0.65
            nodes[targetIdx].pulseVel = 0.012
            veins.forEach((v2) => {
              if (v2 === v) return
              if ((v2.from === targetIdx || v2.to === targetIdx) && v2.pulse < 0.15) {
                v2.pulse = v.pulse * 0.45
                v2.pulsePos = v2.from === targetIdx ? 0 : 1
              }
            })
          }
        }
      }
    })

    nodes.forEach((n) => {
      if (n.pulse > 0) {
        n.pulse -= n.pulseVel
        if (n.pulse < 0) n.pulse = 0
      }
    })

    // ── Draw veins ──
    veins.forEach((v) => {
      const a = nodes[v.from]
      const b = nodes[v.to]
      if (!a || !b) return

      const ay = a.y - scrollY
      const by = b.y - scrollY
      if ((ay < -300 && by < -300) || (ay > vh + 300 && by > vh + 300)) return

      const drawTo = v.progress
      const mx = a.x + (b.x - a.x) * drawTo
      const my = ay + (by - ay) * drawTo

      // Organic S-curve
      const dx = b.x - a.x
      const dy = by - ay
      const len = Math.sqrt(dx * dx + dy * dy)
      const bend = Math.sin(a.x * 0.01 + a.y * 0.007) * len * 0.06
      const cpx = (a.x + mx) / 2 + (by - ay) / len * bend
      const cpy = (ay + my) / 2 - (b.x - a.x) / len * bend

      const baseAlpha = 0.04 + v.pulse * 0.2
      ctx.beginPath()
      ctx.moveTo(a.x, ay)
      ctx.quadraticCurveTo(cpx, cpy, mx, my)
      ctx.strokeStyle = `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${baseAlpha})`
      ctx.lineWidth = v.thickness
      ctx.lineCap = 'round'
      ctx.stroke()

      // Pulse dot
      if (v.pulse > 0.05) {
        const px = a.x + (b.x - a.x) * v.pulsePos
        const py = ay + (by - ay) * v.pulsePos
        const pulseR = 15 + v.pulse * 10
        const grad = ctx.createRadialGradient(px, py, 0, px, py, pulseR)
        grad.addColorStop(0, `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${v.pulse * 0.5})`)
        grad.addColorStop(0.5, `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${v.pulse * 0.15})`)
        grad.addColorStop(1, 'rgba(129, 147, 248, 0)')
        ctx.beginPath()
        ctx.arc(px, py, pulseR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    })

    // ── Draw nodes ──
    nodes.forEach((n) => {
      const ny = n.y - scrollY
      if (ny < -100 || ny > vh + 100) return

      const alpha = n.baseOpacity + n.pulse * 0.5
      const r = n.size === 2 ? 1.5 + n.pulse * 3 : n.size === 1 ? 1 + n.pulse * 1.5 : 0.5 + n.pulse * 1

      // Glow for pulsing nodes
      if (n.pulse > 0.1) {
        const gr = r * 8
        const grad = ctx.createRadialGradient(n.x, ny, 0, n.x, ny, gr)
        grad.addColorStop(0, `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${n.pulse * 0.25})`)
        grad.addColorStop(1, 'rgba(129, 147, 248, 0)')
        ctx.beginPath()
        ctx.arc(n.x, ny, gr, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // Tiny dot
      ctx.beginPath()
      ctx.arc(n.x, ny, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${alpha})`
      ctx.fill()
    })

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
    }

    const init = () => {
      resize()
      buildNetwork()
      animRef.current = requestAnimationFrame(draw)
    }

    const timer = setTimeout(init, 400)

    let scrollTimer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(buildNetwork, 200)
    }

    const onResize = () => { resize(); buildNetwork() }

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mousemove', handleHover, { passive: true })

    return () => {
      clearTimeout(timer)
      clearTimeout(scrollTimer)
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousemove', handleHover)
    }
  }, [buildNetwork, draw, handleHover])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, top: 96 }}
      aria-hidden="true"
    />
  )
}
