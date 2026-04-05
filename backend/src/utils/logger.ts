/**
 * Simple logger for backend
 * Color-coded and timestamped for easy debugging
 */

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.prefix}]`

    const colors: Record<LogLevel, string> = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[90m',   // Gray
    }

    const reset = '\x1b[0m'

    let logMessage = `${colors[level]}${prefix} [${level.toUpperCase()}]${reset} ${message}`

    if (data !== undefined) {
      logMessage += `\n\x1b[90mData:${reset}`
      if (typeof data === 'string') {
        logMessage += ` ${data}`
      } else if (data instanceof Error) {
        logMessage += ` ${data.message}\n\x1b[31mStack:${reset}\n${data.stack}`
      } else {
        logMessage += `\n${JSON.stringify(data, null, 2)}`
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, data))
    }
  }

  separator() {
    console.log('\x1b[90m' + '─'.repeat(80) + '\x1b[0m')
  }
}

export const aiLogger = new Logger('AI-CHAT')
export default Logger
