import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import mongoose from "mongoose";
import handler from "./handler/index.js";
import { loadEnvironment } from "./utils/env.js";
import { createLogger } from "./utils/logger.js";

loadEnvironment();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_ENV_VARS = ["DISCORD_TOKEN", "DATABASE_URL", "MESSAGE_SWEEP_INTERVAL_SECONDS", "MESSAGE_CACHE_LIFETIME_SECONDS"];
const MESSAGE_SWEEP_INTERVAL_SECONDS = Number.parseInt(process.env.MESSAGE_SWEEP_INTERVAL_SECONDS, 10);
const MESSAGE_CACHE_LIFETIME_SECONDS = Number.parseInt(process.env.MESSAGE_CACHE_LIFETIME_SECONDS, 10);
const logger = createLogger("app");
const startupLogger = logger.child("startup");
const shutdownLogger = logger.child("shutdown");
const runtimeLogger = logger.child("runtime");
let shutdownInProgress = false;

const client = new Client({
  intents: [
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
  ],
  sweepers: {
    messages: {
      interval: MESSAGE_SWEEP_INTERVAL_SECONDS,
      lifetime: MESSAGE_CACHE_LIFETIME_SECONDS,
    },
  },
});

// Garbage collection e limpeza de memória a cada 10 minutos
setInterval(() => {
  if (global.gc) {
    global.gc();
    runtimeLogger.info(`Manual GC executed. Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
}, 600000);

client.prefixcommands = new Collection();
client.slashcommands = new Collection();
const settingsFileName = process.env.NODE_ENV === "development" ? "settings.dev.json" : "settings.json";
const settingsPath = path.join(__dirname, `resources/configs/${settingsFileName}`);
try {
  client.settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
} catch (error) {
  const fallbackPath = path.join(__dirname, "resources/configs/settings.json");

  if (settingsFileName !== "settings.json") {
    try {
      client.settings = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
      startupLogger.warn(`Failed to load ${settingsFileName}. Falling back to settings.json.`, error);
    } catch (fallbackError) {
      startupLogger.error("Failed to load settings configuration", fallbackError);
      process.exit(1);
    }
  } else {
    startupLogger.error("Failed to load settings configuration", error);
    process.exit(1);
  }
}

await handler(client);

client.once("clientReady", () => {
  startupLogger.info(`Logged in as ${client.user.tag}`);
});

function getMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
}

async function bootstrap() {
  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    startupLogger.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      dbName: process.env.DATABASE_NAME || "database",
      // Otimizações de memória
      maxPoolSize: 5,
      minPoolSize: 1,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
    });
    startupLogger.info("Connected to MongoDB");

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    startupLogger.error("Failed to initialize application", error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  if (shutdownInProgress) {
    return;
  }

  shutdownInProgress = true;
  shutdownLogger.info(`Received ${signal}, closing resources...`);

  try {
    await mongoose.connection.close();
    client.destroy();
    shutdownLogger.info("Resources closed successfully");
    process.exit(0);
  } catch (error) {
    shutdownLogger.error("Error while closing resources", error);
    process.exit(1);
  }
}

process.once("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

process.once("SIGTSTP", () => {
  void gracefulShutdown("SIGTSTP");
});

await bootstrap();

export { client };

process.on("unhandledRejection", (reason, promise) => {
  runtimeLogger.error("Unhandled Promise Rejection", { reason, promise });
});
process.on("uncaughtException", (error, origin) => {
  runtimeLogger.error("Uncaught Exception", { message: error.message, origin, stack: error.stack });
});
process.on("uncaughtExceptionMonitor", (error, origin) => {
  runtimeLogger.error("Uncaught Exception (Monitor)", { message: error.message, origin, stack: error.stack });
});