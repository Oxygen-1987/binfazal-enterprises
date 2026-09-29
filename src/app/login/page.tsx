// src/app/login/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "next-themes"
import { showToast } from "@/lib/utils/toast"
import { getErrorMessage } from "@/lib/utils/errors"
import { Lamp } from "./lamp"
import styles from "./login.module.css"
import Image from "next/image"
import { Eye, EyeOff, Moon, Sun } from "lucide-react"

export default function LoginPage() {
  const { signIn } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isLampOn, setIsLampOn] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fireflies, setFireflies] = useState<Array<{
    left: string; top: string; size: number;
    x: string; y: string; d: string; t: string; delay: string;
  }>>([])

  // Prevent hydration mismatch for theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate fireflies on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const count = typeof window !== "undefined" && window.innerWidth < 600 ? 16 : 30
    const flies = Array.from({ length: count }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 3,
      x: `${Math.random() * 80 - 40}px`,
      y: `${Math.random() * 80 - 40}px`,
      d: `${3 + Math.random() * 4}s`,
      t: `${2 + Math.random() * 3}s`,
      delay: `${-Math.random() * 8}s`,
    }))
    setFireflies(flies)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signIn(email, password)
      showToast.success("Welcome back!")
    } catch (err: any) {
      const msg = getErrorMessage(err)
      setError(msg)
      showToast.error("Sign in failed", msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} ${isLampOn ? styles.on : ""}`}>
      {/* Fireflies */}
      <div className={styles.flies} aria-hidden="true">
        {fireflies.map((f, i) => (
          <i
            key={i}
            className={styles.fly}
            style={{
              left: f.left,
              top: f.top,
              width: `${f.size}px`,
              height: `${f.size}px`,
              ["--x" as any]: f.x,
              ["--y" as any]: f.y,
              ["--d" as any]: f.d,
              ["--t" as any]: f.t,
              animationDelay: f.delay,
            }}
          />
        ))}
      </div>

      {/* Theme toggle */}
      {mounted && (
        <button
          className={styles.themeToggle}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      )}

      <main className={styles.stage}>
        <div className={styles.wrap}>
          {/* Lamp */}
          <Lamp isOn={isLampOn} onToggle={setIsLampOn} />

          {/* Form */}
          <form
            className={styles.card}
            onSubmit={handleSubmit}
            aria-hidden={!isLampOn}
          >
            {/* Business Logo */}
            <div className={styles.logo}>
              <Image
                src="/binfazal-logo.png"
                alt="BinFazal Enterprises"
                width={220}
                height={48}
                priority
              />
            </div>

            <h1>Welcome Back</h1>
            <p className={styles.sub}>
              {isLampOn ? "Sign in to continue" : "Pull the string to begin"}
            </p>

            {/* Email */}
            <div className={styles.field}>
              <svg className={styles.ico} viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              <input
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!isLampOn || loading}
              />
            </div>

            {/* Password */}
            <div className={styles.field}>
              <svg className={styles.ico} viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!isLampOn || loading}
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {/* Error */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Sign In */}
            <button
              type="submit"
              className={`${styles.signin} ${loading ? styles.loading : ""}`}
              disabled={!isLampOn || loading}
            >
              <span className={styles.spin}></span>
              <span>{loading ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
