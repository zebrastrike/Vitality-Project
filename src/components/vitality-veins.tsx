'use client'

import { useEffect, useRef, useCallback } from 'react'

/*
 * VitalityVeins — interactive neural network connecting glass cards
 *
 * How it works:
 * 1. Finds all .glass / .glass-elevated elements on screen
 * 2. Draws organic vein connections between nearby cards
 * 3. Junction nodes glow at connection points
 * 4. On card hover → a light pulse ripples outward through the network
 * 5. Background ambient veins grow organically from edges
 *
 * Uses <canvas> for smooth 60fps rendering. Cleaned up on unmount.
 */

interface Node {
  x: number
  y: number
  el: Element | null    // null = ambient node (no element)
  connections: number[] // indices of connected nodes
  pulse: number         // 0-1, animated glow intensity
  pulseVel: number      // how fast pulse decays
  baseOpacity: number
}

interface Vein {
  from: number
  to: number
  progress: number  // 0-1, draw animation
  pulse: number     // 0-1, glow traveling along
  pulsePos: number  // 0-1, where the pulse is along the line
}

export function VitalityVeins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const veinsRef = useRef<Vein[]>([])
  const animRef = useRef<number>(0)
  const hoveredRef = useRef<number>(-1)
  const lastTimeRef = useRef<number>(0)
  const initedRef = useRef(false)

  const brandColor = { r: 129, g: 147, b: 248 }

  const buildNetwork = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const nodes: Node[] = []
    const veins: Vein[] = []

    // Find all glass cards
    const cards = document.querySelectorAll('.glass, .glass-elevated, .card-hover')
    const seen = new Set<Element>()

    cards.forEach((card) => {
      if (seen.has(card)) return
      seen.add(card)

      const cr = card.getBoundingClientRect()
      const scrollY = window.scrollY
      const x = cr.left + cr.width / 2
      const y = cr.top + scrollY + cr.height / 2

      nodes.push({
        x,
        y,
        el: card,
        connections: [],
        pulse: 0,
        pulseVel: 0,
        baseOpacity: 0.35,
      })
    })

    // Add ambient nodes along edges for organic feel
    const ambientCount = 12
    for (let i = 0; i < ambientCount; i++) {
      const side = Math.floor(Math.random() * 4)
      const pageHeight = document.documentElement.scrollHeight
      let x: number, y: number
      switch (side) {
        case 0: x = 0; y = Math.random() * pageHeight; break
        case 1: x = rect.width; y = Math.random() * pageHeight; break
        case 2: x = Math.random() * rect.width; y = 0; break
        default: x = Math.random() * rect.width; y = pageHeight; break
      }
      nodes.push({
        x, y, el: null,
        connections: [], pulse: 0, pulseVel: 0,
        baseOpacity: 0.12,
      })
    }

    // Connect nearby nodes (max distance relative to viewport)
    const maxDist = Math.max(rect.width, rect.height) * 0.45
    for (let i = 0; i < nodes.length; i++) {
      // Find nearest 2-3 connections
      const dists: { idx: number; dist: number }[] = []
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < maxDist) dists.push({ idx: j, dist })
      }
      dists.sort((a, b) => a.dist - b.dist)
      const maxConn = nodes[i].el ? 3 : 2
      dists.slice(0, maxConn).forEach(({ idx }) => {
        nodes[i].connections.push(idx)
        nodes[idx].connections.push(i)
        veins.push({
          from: i,
          to: idx,
          progress: 0,
          pulse: 0,
          pulsePos: 0,
        })
      })
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
        found = i
        break
      }
    }

    if (found !== hoveredRef.current) {
      hoveredRef.current = found
      if (found >= 0) {
        // Trigger pulse from this node
        triggerPulse(found)
      }
    }
  }, [])

  const triggerPulse = (nodeIdx: number) => {
    const nodes = nodesRef.current
    const veins = veinsRef.current
    if (!nodes[nodeIdx]) return

    nodes[nodeIdx].pulse = 1.0
    nodes[nodeIdx].pulseVel = 0.02

    // Pulse along connected veins
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

    const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05)
    lastTimeRef.current = time

    const scrollY = window.scrollY
    const vw = canvas.width
    const vh = canvas.height

    ctx.clearRect(0, 0, vw, vh)

    const nodes = nodesRef.current
    const veins = veinsRef.current

    // Update vein draw-in progress
    veins.forEach((v) => {
      if (v.progress < 1) v.progress = Math.min(1, v.progress + dt * 0.15)

      // Animate pulse traveling along vein
      if (v.pulse > 0) {
        const dir = v.pulsePos < 0.5 ? 1 : -1
        v.pulsePos += dir * dt * 0.8
        v.pulse -= dt * 0.5
        if (v.pulse <= 0) { v.pulse = 0; v.pulsePos = 0 }

        // When pulse reaches the other end, trigger that node
        if ((dir === 1 && v.pulsePos >= 0.95) || (dir === -1 && v.pulsePos <= 0.05)) {
          const targetIdx = dir === 1 ? v.to : v.from
          if (nodes[targetIdx] && nodes[targetIdx].pulse < 0.3) {
            nodes[targetIdx].pulse = v.pulse * 0.7
            nodes[targetIdx].pulseVel = 0.015
            // Cascade to connected veins
            veins.forEach((v2) => {
              if (v2 === v) return
              if ((v2.from === targetIdx || v2.to === targetIdx) && v2.pulse < 0.2) {
                v2.pulse = v.pulse * 0.5
                v2.pulsePos = v2.from === targetIdx ? 0 : 1
              }
            })
          }
        }
      }
    })

    // Update node pulses
    nodes.forEach((n) => {
      if (n.pulse > 0) {
        n.pulse -= n.pulseVel
        if (n.pulse < 0) n.pulse = 0
      }
    })

    // Draw veins
    veins.forEach((v) => {
      const a = nodes[v.from]
      const b = nodes[v.to]
      if (!a || !b) return

      const ax = a.x
      const ay = a.y - scrollY
      const bx = b.x
      const by = b.y - scrollY

      // Skip if both endpoints are way off screen
      if ((ay < -200 && by < -200) || (ay > vh + 200 && by > vh + 200)) return

      const drawTo = v.progress
      const mx = ax + (bx - ax) * drawTo
      const my = ay + (by - ay) * drawTo

      // Organic curve — offset midpoint slightly
      const cpx = (ax + mx) / 2 + (by - ay) * 0.08
      const cpy = (ay + my) / 2 + (ax - bx) * 0.08

      // Base vein
      const baseAlpha = 0.06 + v.pulse * 0.15
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.quadraticCurveTo(cpx, cpy, mx, my)
      ctx.strokeStyle = `rgba(${brandColor.r}, ${brandColor.g}, ${brandColor.b}, ${baseAlpha})`
      ctx.lineWidth = 0.8
      ctx.lineCap = 'round'
      ctx.stroke()

      // Pulse glow along vein
      if (v.pulse > 0.05) {
        const px = ax + (bx - ax) * v.pulsePos
        const py = ay + (by - ay) * v.pulsePos
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 40)
        grad.addColorStop(0, `rgba(${brandColor.r}, ${brandColor.g}, ${brandColor.b}, ${v.pulse * 0.6})`)
        grad.addColorStop(1, 'rgba(129, 147, 248, 0)')
        ctx.beginPath()
        ctx.arc(px, py, 40, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    })

    // Draw nodes
    nodes.forEach((n) => {
      const ny = n.y - scrollY
      if (ny < -100 || ny > vh + 100) return

      const alpha = n.baseOpacity + n.pulse * 0.6
      const radius = n.el ? 2.5 + n.pulse * 4 : 1.5 + n.pulse * 2

      // Outer glow
      if (alpha > 0.15) {
        const grad = ctx.createRadialGradient(n.x, ny, 0, n.x, ny, radius * 6)
        grad.addColorStop(0, `rgba(${brandColor.r}, ${brandColor.g}, ${brandColor.b}, ${alpha * 0.3})`)
        grad.addColorStop(1, 'rgba(129, 147, 248, 0)')
        ctx.beginPath()
        ctx.arc(n.x, ny, radius * 6, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // Core
      ctx.beginPath()
      ctx.arc(n.x, ny, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${brandColor.r}, ${brandColor.g}, ${brandColor.b}, ${alpha})`
      ctx.fill()
    })

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
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }

    const init = () => {
      resize()
      buildNetwork()
      initedRef.current = true
      animRef.current = requestAnimationFrame(draw)
    }

    // Delay init to let cards render
    const timer = setTimeout(init, 500)

    // Rebuild on scroll (for new cards entering) — debounced
    let scrollTimer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(buildNetwork, 300)
    }

    window.addEventListener('resize', () => { resize(); buildNetwork() })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mousemove', handleHover, { passive: true })

    return () => {
      clearTimeout(timer)
      clearTimeout(scrollTimer)
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
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
