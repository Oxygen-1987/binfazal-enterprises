// src/app/login/lamp.tsx
"use client"

import { useEffect, useRef } from "react"
import styles from "./login.module.css"

interface LampProps {
  isOn: boolean
  onToggle: (newState: boolean) => void
}

export function Lamp({ isOn, onToggle }: LampProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pullRef = useRef<SVGGElement>(null)
  const cordRef = useRef<SVGPathElement>(null)
  const beadRef = useRef<SVGRectElement>(null)
  const hitRef = useRef<SVGCircleElement>(null)
  const onRef = useRef(isOn)
  const onToggleRef = useRef(onToggle)

  // Keep latest values available to the animation loop without re-running effect
  useEffect(() => {
    onRef.current = isOn
  }, [isOn])
  useEffect(() => {
    onToggleRef.current = onToggle
  }, [onToggle])

  useEffect(() => {
    const svg = svgRef.current
    const pull = pullRef.current
    const cord = cordRef.current
    const bead = beadRef.current
    const hit = hitRef.current
    if (!svg || !pull || !cord || !bead || !hit) return

    // Audio context (lazy)
    let ac: AudioContext | null = null
    function clickSound() {
      try {
        ac = ac || new (window.AudioContext || (window as any).webkitAudioContext)()
        const o = ac.createOscillator()
        const g = ac.createGain()
        const t = ac.currentTime
        o.type = "square"
        o.frequency.setValueAtTime(1400, t)
        o.frequency.exponentialRampToValueAtTime(300, t + 0.04)
        g.gain.setValueAtTime(0.05, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
        o.connect(g)
        g.connect(ac.destination)
        o.start(t)
        o.stop(t + 0.07)
      } catch {}
    }

    // Physics
    const A = { x: 188, y: 88 }
    const L = 88
    const rest = { x: A.x, y: A.y + L }
    const pos = { x: rest.x, y: rest.y }
    const vel = { x: 0, y: 0 }
    let dragging = false
    let raf = 0
    let fired = false
    let moved = 0

    function draw() {
      const dx = pos.x - A.x
      const dy = pos.y - A.y
      const ang = (Math.atan2(dx, dy) * 180) / Math.PI * -1
      cord!.setAttribute("d", `M${A.x} ${A.y} L${pos.x} ${pos.y - 10}`)
      bead!.setAttribute(
        "transform",
        `translate(${pos.x} ${pos.y}) rotate(${ang})`
      )
      hit!.setAttribute("cx", String(pos.x))
      hit!.setAttribute("cy", String(pos.y))
    }

    function loop() {
      if (!dragging) {
        vel.x += (rest.x - pos.x) * 0.07
        vel.y += (rest.y - pos.y) * 0.07
        vel.x *= 0.9
        vel.y *= 0.9
        pos.x += vel.x
        pos.y += vel.y
        if (
          Math.abs(vel.x) + Math.abs(vel.y) < 0.02 &&
          Math.abs(rest.x - pos.x) + Math.abs(rest.y - pos.y) < 0.05
        ) {
          pos.x = rest.x
          pos.y = rest.y
          draw()
          raf = 0
          return
        }
      }
      draw()
      raf = requestAnimationFrame(loop)
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    function toSvg(e: PointerEvent) {
      const p = svg!.createSVGPoint()
      p.x = e.clientX
      p.y = e.clientY
      return p.matrixTransform(svg!.getScreenCTM()!.inverse())
    }

    function setLamp(value: boolean) {
      clickSound()
      onToggleRef.current(value)
    }

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      fired = false
      moved = 0
      pull!.setPointerCapture(e.pointerId)
      e.preventDefault()
      kick()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const p = toSvg(e)
      let dx = p.x - A.x
      let dy = Math.max(p.y - A.y, L * 0.7)
      const d = Math.hypot(dx, dy)
      const max = L + 58
      if (d > max) {
        dx *= max / d
        dy *= max / d
      }
      pos.x = A.x + dx
      pos.y = A.y + dy
      vel.x = vel.y = 0
      moved = Math.max(moved, Math.hypot(pos.x - rest.x, pos.y - rest.y))
      if (!fired && pos.y - rest.y > 34) {
        fired = true
        setLamp(!onRef.current)
      }
    }

    const release = () => {
      if (!dragging) return
      dragging = false
      if (!fired && moved < 5) {
        vel.y = 12
        setLamp(!onRef.current)
      }
      kick()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        vel.y = 14
        vel.x = 2
        setLamp(!onRef.current)
        kick()
      }
    }

    pull.addEventListener("pointerdown", onPointerDown)
    pull.addEventListener("pointermove", onPointerMove)
    pull.addEventListener("pointerup", release)
    pull.addEventListener("pointercancel", release)
    pull.addEventListener("keydown", onKeyDown)

    draw()

    // Idle sway
    const swayTimer = setTimeout(() => {
      vel.x = 1.6
      vel.y = 1
      kick()
    }, 500)

    return () => {
      pull.removeEventListener("pointerdown", onPointerDown)
      pull.removeEventListener("pointermove", onPointerMove)
      pull.removeEventListener("pointerup", release)
      pull.removeEventListener("pointercancel", release)
      pull.removeEventListener("keydown", onKeyDown)
      clearTimeout(swayTimer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={styles.lamp}>
      <div className={styles.hint}>Pull the string to reveal the login form</div>
      <div className={styles.glow} />
      <svg
        ref={svgRef}
        viewBox="0 0 320 400"
        aria-label="Floor lamp with pull string"
      >
        <defs>
          <linearGradient id="coneG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd23c" stopOpacity=".62" />
            <stop offset=".55" stopColor="#e8b830" stopOpacity=".24" />
            <stop offset="1" stopColor="#d9a520" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="shadeG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#26262b" />
            <stop offset="1" stopColor="#101012" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* Light cone */}
        <polygon
          className={styles.cone}
          points="82,92 178,92 340,350 -80,350"
          fill="url(#coneG)"
          filter="url(#soft)"
        />
        <ellipse
          className={styles.floor}
          cx="130"
          cy="350"
          rx="215"
          ry="13"
          fill="#ffd23c"
          opacity=".16"
          filter="url(#soft)"
        />

        {/* Lamp body */}
        <rect x="128.5" y="90" width="3" height="260" fill="#2a2a2f" />
        <rect x="92" y="346" width="76" height="11" rx="5" fill="#1a1a1d" />
        <path
          d="M58 92 C58 56 90 40 130 40 C170 40 202 56 202 92 Z"
          fill="url(#shadeG)"
        />
        <ellipse
          className={styles.bulb}
          cx="130"
          cy="92"
          rx="48"
          ry="4.5"
          fill="#fff5c4"
        />

        {/* Pull string */}
        <g
          ref={pullRef}
          className={styles.pull}
          tabIndex={0}
          role="button"
          aria-label="Pull the string to toggle the lamp"
        >
          <path ref={cordRef} className={styles.cord} d="M188 88 L188 172" />
          <circle ref={hitRef} r="26" fill="transparent" cx="188" cy="176" />
          <rect
            ref={beadRef}
            className={styles.bead}
            x="-5"
            y="-11"
            width="10"
            height="22"
            rx="5"
            transform="translate(188 176)"
          />
        </g>
      </svg>
    </div>
  )
}
