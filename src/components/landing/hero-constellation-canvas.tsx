"use client"

import { useEffect, useRef } from "react"

interface NodePoint {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

/**
 * Lightweight 60fps interactive knowledge-node constellation canvas.
 * Gives the spatial depth of a WebGL/Three.js scene in Notra's Muted Olive
 * palette (#A5AD91) with zero bundle bloat.
 */
export function HeroConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let animationFrameId = 0
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      if (!canvas) return
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const count = Math.min(42, Math.max(22, Math.floor((width * height) / 28000)))
    const nodes: NodePoint[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 1.6 + 1,
      alpha: Math.random() * 0.45 + 0.2,
    }))

    const pointer = { x: -9999, y: -9999, active: false }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= width &&
        pointer.y >= 0 &&
        pointer.y <= height
    }

    const onPointerLeave = () => {
      pointer.active = false
    }

    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerleave", onPointerLeave)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Update positions
      if (!prefersReducedMotion) {
        for (const node of nodes) {
          node.x += node.vx
          node.y += node.vy

          if (node.x < 0 || node.x > width) node.vx *= -1
          if (node.y < 0 || node.y > height) node.vy *= -1

          // Gentle attraction/parallax toward pointer
          if (pointer.active) {
            const dx = pointer.x - node.x
            const dy = pointer.y - node.y
            const dist = Math.hypot(dx, dy)
            if (dist < 180 && dist > 1) {
              node.x += (dx / dist) * 0.18
              node.y += (dy / dist) * 0.18
            }
          }
        }
      }

      // Draw connecting filaments between nearby nodes
      const maxDist = 145
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.16
            ctx.strokeStyle = `rgba(165, 173, 145, ${opacity})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        // Connect nodes near cursor for interactive constellation effect
        if (pointer.active) {
          const pdx = pointer.x - a.x
          const pdy = pointer.y - a.y
          const pdist = Math.hypot(pdx, pdy)
          if (pdist < 170) {
            const opacity = (1 - pdist / 170) * 0.28
            ctx.strokeStyle = `rgba(165, 173, 145, ${opacity})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(pointer.x, pointer.y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        ctx.fillStyle = `rgba(165, 173, 145, ${node.alpha})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full mask-[radial-gradient(ellipse_85%_75%_at_55%_45%,#000_35%,transparent_100%)] -z-10"
    />
  )
}
