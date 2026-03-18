import { sendErrorWebhook } from "./webhookLogger.js";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

const USE_COLORS = Boolean(process.stdout?.isTTY);

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTimestamp(date = new Date()) {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function colorize(text, color) {
  if (!USE_COLORS) {
    return text;
  }

  return `${color}${text}${ANSI.reset}`;
}

function normalizeMeta(meta) {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }

  return meta;
}

function formatPrefix(level, scope) {
  const levelLabel = level.toUpperCase().padEnd(5, " ");
  const timestamp = colorize(formatTimestamp(), ANSI.dim);

  let levelColor = ANSI.cyan;

  if (level === "info") {
    levelColor = ANSI.green;
  } else if (level === "warn") {
    levelColor = ANSI.yellow;
  } else if (level === "error") {
    levelColor = ANSI.red;
  }

  return `${timestamp} ${colorize(levelLabel, levelColor)} ${colorize(`[${scope}]`, ANSI.magenta)}`;
}

function write(level, scope, message, meta) {
  const prefix = formatPrefix(level, scope);
  const normalizedMeta = normalizeMeta(meta);

  if (typeof normalizedMeta === "undefined") {
    console.log(`${prefix} ${message}`);
    return;
  }

  if (level === "error") {
    console.error(`${prefix} ${message}`, normalizedMeta);
    void sendErrorWebhook(scope, message, normalizedMeta);
    return;
  }

  if (level === "warn") {
    console.warn(`${prefix} ${message}`, normalizedMeta);
    return;
  }

  console.log(`${prefix} ${message}`, normalizedMeta);
}

function createLogger(scope = "app") {
  return {
    child(childScope) {
      return createLogger(`${scope}:${childScope}`);
    },
    debug(message, meta) {
      write("debug", scope, message, meta);
    },
    info(message, meta) {
      write("info", scope, message, meta);
    },
    warn(message, meta) {
      write("warn", scope, message, meta);
    },
    error(message, meta) {
      write("error", scope, message, meta);
    },
  };
}

export { createLogger };
