/**
 * Simple logger for AI Copilot
 * Color-coded and timestamped for easy debugging
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
}

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
    const prefix = `[${timestamp}] [${this.prefix}]`

    let color = COLORS.reset
    let levelStr = level.toUpperCase()

    switch (level) {
      case 'info':
        color = COLORS.blue
        break
      case 'success':
        color = COLORS.green
        break
      case 'warning':
        color = COLORS.yellow
        break
      case 'error':
        color = COLORS.red
        break
      case 'debug':
        color = COLORS.cyan
        break
    }

    let logMessage = `${color}${prefix} [${levelStr}]${COLORS.reset} ${message}`

    if (data !== undefined) {
      logMessage += `\n${COLORS.cyan}Data:${COLORS.reset}`
      if (typeof data === 'string') {
        logMessage += ` ${data}`
      } else if (data instanceof Error) {
        logMessage += ` ${data.message}\n${COLORS.red}Stack:${COLORS.reset}\n${data.stack}`
      } else {
        logMessage += ` ${JSON.stringify(data, null, 2)}`
      }
    }

    return logMessage
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('info', message, data))
  }

  success(message: string, data?: any) {
    console.log(this.formatMessage('success', message, data))
  }

  warning(message: string, data?: any) {
    console.log(this.formatMessage('warning', message, data))
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('error', message, data))
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, data))
    }
  }

  // Group related logs
  group(label: string, callback: () => void) {
    console.group(`${COLORS.magenta}[${this.prefix}]${COLORS.reset} ${label}`)
    callback()
    console.groupEnd()
  }

  // Separator for readability
  separator() {
    console.log(`${COLORS.gray}─${'─'.repeat(80)}${COLORS.reset}`)
  }
}

// Export a singleton logger for AI Copilot
export const aiLogger = new Logger('AI-COPILOT')

// Export the class for creating other loggers
export default Logger
