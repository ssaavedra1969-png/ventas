type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const LOG_PREFIX = '[FALPAT]'

function log(level: LogLevel, module: string, message: string, context?: LogContext) {
  const base = `${LOG_PREFIX} [${level.toUpperCase()}] [${module}] ${message}`

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(base, context ?? '')
      }
      break
    case 'info':
      console.info(base, context ?? '')
      break
    case 'warn':
      console.warn(base, context ?? '')
      break
    case 'error':
      console.error(base, context ?? '', context?.error instanceof Error ? context.error : '')
      break
  }
}

export const logger = {
  debug: (module: string, message: string, context?: LogContext) => log('debug', module, message, context),
  info: (module: string, message: string, context?: LogContext) => log('info', module, message, context),
  warn: (module: string, message: string, context?: LogContext) => log('warn', module, message, context),
  error: (module: string, message: string, context?: LogContext) => log('error', module, message, context),
}
