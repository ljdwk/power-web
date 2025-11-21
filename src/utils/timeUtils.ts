import type { TimeRange } from '@/types'

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function getQuickRange(type: 'today' | '3days' | '7days'): TimeRange {
  const now = new Date()
  const start = new Date()

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case '3days':
      start.setDate(now.getDate() - 3)
      break
    case '7days':
      start.setDate(now.getDate() - 7)
      break
  }

  return {
    start: start.getTime(),
    end: now.getTime()
  }
}

export function formatDateTimeForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function parseDateTimeFromInput(dateTimeStr: string): Date {
  return new Date(dateTimeStr)
}

export function isValidTimeRange(startTime: number, endTime: number): boolean {
  const maxRange = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
  return startTime < endTime && (endTime - startTime) <= maxRange
}