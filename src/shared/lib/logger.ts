type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

// Patterns for messages that should be suppressed (too verbose/repetitive)
const SUPPRESSED_PATTERNS = [
  /Offers searched successfully/i,
  /Fetching offer by ID:/i,
  /Returning successful response:/i,
  /Offer inspected successfully:/i,
  /Query.*: Added \d+ orders/i,
  /Query.*orders response/i,
  /Orders after deduplication:/i,
  /useOrderBook filters changed:/i,
  /Event listeners already registered/i,
  /Wallet request for (chia_getAddress|chia_getBalance|chia_getTransactions)/i,
  /Fetching order book/i,
  /Query: (all orders|\d+)/i,
  /\[trackEffectRun\] Potential infinite loop detected/i,
]

// Rate limiting for repeated messages
const RATE_LIMIT_WINDOW = 5000 // 5 seconds
const MAX_MESSAGES_PER_WINDOW = 3
const messageCounts = new Map<string, { count: number; resetTime: number }>()

class LoggerService implements Logger {
  private readonly isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      // In production, only log errors and warnings
      return level === 'error' || level === 'warn'
    }
    return true
  }

  private isSuppressed(message: string): boolean {
    return SUPPRESSED_PATTERNS.some((pattern) => pattern.test(message))
  }

  private isRateLimited(message: string): boolean {
    const now = Date.now()
    const key = message.substring(0, 100) // Use first 100 chars as key

    const entry = messageCounts.get(key)
    if (!entry || now > entry.resetTime) {
      messageCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      return false
    }

    entry.count++
    if (entry.count > MAX_MESSAGES_PER_WINDOW) {
      return true
    }

    return false
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    const emoji = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level]

    return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) {
      return
    }

    // Suppress debug messages that are too verbose
    if (this.isSuppressed(message) || this.isRateLimited(message)) {
      return
    }

    // eslint-disable-next-line no-console
    console.debug(this.formatMessage('debug', message), ...args)
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) {
      return
    }

    // Suppress repetitive info messages
    if (this.isSuppressed(message) || this.isRateLimited(message)) {
      return
    }

    // eslint-disable-next-line no-console
    console.info(this.formatMessage('info', message), ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args)
    }
  }
}

export const logger = new LoggerService()
