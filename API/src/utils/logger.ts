// Check if we're in development mode - multiple fallbacks
import { env } from '@/config/env';
import { inspect } from 'util';

// Check if we're in development mode - be more explicit
const isDev = env.ENV === 'development' || process.env.NODE_ENV === 'development';
interface Logger {
  info: (msg: string, obj?: any) => void;
  error: (msg: string, obj?: any) => void;
  warn: (msg: string, obj?: any) => void;
  debug: (msg: string, obj?: any) => void;
}

// Simple console logger that works everywhere
function getCaller(): string {
  const err = new Error();
  const stack = err.stack?.split('\n');

  if (stack && stack.length >= 4) {
    const callerLine = stack[3];
    const match = callerLine.match(/\(([^:]+):(\d+):\d+\)/) || callerLine.match(/at ([^:]+):(\d+):\d+/);

    if (match) {
      const filePath = match[1];
      const fileName = filePath.split('/').pop() || filePath;
      const lineNumber = match[2];
      return `${fileName}:${lineNumber}`;
    }
  }

  return 'unknown:0';
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function prettyPrint(obj: any): void {
  console.log(
    inspect(obj, {
      colors: true,
      depth: 4,
      compact: false,
      showHidden: false,
      maxArrayLength: 100,
      maxStringLength: 1000,
      breakLength: 80,
    })
  );
}

// ANSI color codes (works everywhere, no dependencies)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors.bright}${colors[color]}${text}${colors.reset}`;
}

// Create logger that works in all environments
const logger: Logger = {
  info: (msg: string, obj?: any) => {
    const time = formatTime();
    const caller = getCaller();

    if (isDev) {
      // Development: colored output with line numbers
      console.log(colorize('blue', 'INFO'), colorize('gray', time), colorize('white', caller), msg);
    } else {
      // Production: structured JSON
      const logData = {
        level: 'info',
        timestamp: new Date().toISOString(),
        message: msg,
        ...(obj && { data: obj }),
      };
      console.log(JSON.stringify(logData));
      return;
    }

    if (obj !== undefined) prettyPrint(obj);
  },

  error: (msg: string, obj?: any) => {
    const time = formatTime();
    const caller = getCaller();

    if (isDev) {
      console.log(colorize('red', 'ERROR'), colorize('gray', time), colorize('white', caller), msg);
    } else {
      const logData = {
        level: 'error',
        timestamp: new Date().toISOString(),
        message: msg,
        ...(obj && { data: obj }),
      };
      console.log(JSON.stringify(logData));
      return;
    }

    if (obj !== undefined) prettyPrint(obj);
  },

  warn: (msg: string, obj?: any) => {
    const time = formatTime();
    const caller = getCaller();

    if (isDev) {
      console.log(colorize('yellow', 'WARN'), colorize('gray', time), colorize('white', caller), msg);
    } else {
      const logData = {
        level: 'warn',
        timestamp: new Date().toISOString(),
        message: msg,
        ...(obj && { data: obj }),
      };
      console.log(JSON.stringify(logData));
      return;
    }

    if (obj !== undefined) prettyPrint(obj);
  },

  debug: (msg: string, obj?: any) => {
    const time = formatTime();
    const caller = getCaller();

    if (isDev) {
      console.log(colorize('green', 'DEBUG'), colorize('gray', time), colorize('white', caller), msg);
    } else {
      const logData = {
        level: 'debug',
        timestamp: new Date().toISOString(),
        message: msg,
        ...(obj && { data: obj }),
      };
      console.log(JSON.stringify(logData));
      return;
    }

    if (obj !== undefined) prettyPrint(obj);
  },
};

export default logger;
