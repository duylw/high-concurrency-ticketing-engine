import { useState, useEffect, useMemo } from 'react'

export interface CountdownState {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
  formatted: string
}

export function useCountdown(targetDate: string | Date | number | null | undefined): CountdownState {
  const targetTime = useMemo(() => {
    if (!targetDate) return null
    return new Date(targetDate).getTime()
  }, [targetDate])

  const calculateRemaining = (): CountdownState => {
    if (!targetTime || isNaN(targetTime)) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formatted: '00:00:00',
      }
    }

    const now = Date.now()
    const diffMs = targetTime - now
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))

    if (totalSeconds <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formatted: 'Đã mở bán',
      }
    }

    const days = Math.floor(totalSeconds / (3600 * 24))
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const formattedParts: string[] = []
    if (days > 0) {
      formattedParts.push(`${days} ngày`)
    }
    formattedParts.push(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    )

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
      formatted: formattedParts.join(' '),
    }
  }

  const [state, setState] = useState<CountdownState>(calculateRemaining)

  useEffect(() => {
    setState(calculateRemaining())

    const interval = setInterval(() => {
      const next = calculateRemaining()
      setState(next)
      if (next.isExpired) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetTime])

  return state
}
