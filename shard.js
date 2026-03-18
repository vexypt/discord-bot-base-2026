import { ShardingManager } from "discord.js";
import { loadEnvironment } from "./src/utils/env.js";
import { createLogger } from "./src/utils/logger.js";

loadEnvironment({ skipIfLoaded: false });
const logger = createLogger("shard");

if (process.env.NODE_ENV !== "development") {
  const manager = new ShardingManager("./src/index.js", {
    token: process.env.DISCORD_TOKEN
  });

  manager.on("shardCreate", (shard) => logger.info(`Launched shard ${shard.id}`));
  manager.spawn().catch((error) => logger.error("Shard failed to spawn.", error));
} else {
  await import("./src/index.js");
}