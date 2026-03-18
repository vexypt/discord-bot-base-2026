import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { Collection, ApplicationCommandType, EmbedBuilder, MessageFlags } from "discord.js";
import { db } from "../functions/db.js";
import { ensureNotBlacklisted } from "../utils/blacklist.js";
import { createLogger } from "../utils/logger.js";
import { sendWebhookLog } from "../utils/webhookLogger.js";

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX;
const logger = createLogger("handler");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureCollections(client) {
  if (!(client.prefixcommands instanceof Collection)) {
    client.prefixcommands = client.commands instanceof Collection ? client.commands : new Collection();
  }

  if (!(client.slashcommands instanceof Collection)) {
    client.slashcommands = client.slashCommands instanceof Collection ? client.slashCommands : new Collection();
  }

  client.commands = client.prefixcommands;
  client.slashCommands = client.slashcommands;
}

async function loadModulesRecursively(dir, onModuleLoad, label) {
  if (!fs.existsSync(dir)) {
    logger.warn(`${label} directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      await loadModulesRecursively(filePath, onModuleLoad, label);
      continue;
    }

    if (!file.endsWith(".js")) {
      continue;
    }

    try {
      const importedModule = await import(pathToFileURL(filePath).href);
      const moduleData = importedModule.default ?? importedModule;
      await onModuleLoad(moduleData, filePath);
    } catch (error) {
      logger.error(`Failed to load ${label} file: ${filePath}`, error);
    }
  }
}

function getCommandByName(collection, commandName) {
  return (
    collection.get(commandName) ||
    collection.find((command) => Array.isArray(command.aliases) && command.aliases.includes(commandName))
  );
}

function buildDevOnlyMessage() {
  return "🔒 Este comando e exclusivo para os desenvolvedores do bot.";
}

function buildPremiumOnlyMessage() {
  return "💎 Este comando esta disponivel apenas para usuarios premium.";
}

async function incrementExecutedCommands(userData) {
  userData.executedCommands += 1;
  await userData.save();
}

async function sendSlashCommandLog(client, interaction) {
  const commandType =
    interaction.commandType === ApplicationCommandType.ChatInput
      ? "ChatInput"
      : interaction.commandType === ApplicationCommandType.Message
      ? "Message"
      : "User";

  const subcommand = interaction.options?.getSubcommand(false) || "Nenhum";

  const embed = new EmbedBuilder({
    title: "🧾 Comando slash executado",
    fields: [
      { name: "⚙️ Comando", value: `\`${interaction.commandName}\``, inline: true },
      { name: "🧩 Subcomando", value: `\`${subcommand}\``, inline: true },
      { name: "📌 Tipo", value: `\`${commandType}\``, inline: true },
      { name: "👤 Usuario", value: `\`${interaction.user.username}\` (\`${interaction.user.id}\`)`, inline: false },
    ],
    timestamp: new Date(),
  });

  if (interaction.guild) {
    embed.addFields({
      name: "🏠 Servidor",
      value: `\`${interaction.guild.name}\` (\`${interaction.guild.id}\`)`,
      inline: false,
    });
  }

  try {
    await sendWebhookLog("LOG_WEBHOOK_COMMANDS_URL", { embeds: [embed] });
  } catch (error) {
    logger.error("Failed to send slash command log.", error);
  }
}

async function sendPrefixCommandLog(client, message, commandName, args) {
  const embed = new EmbedBuilder({
    title: "🧾 Comando prefix executado",
    fields: [
      { name: "⚙️ Comando", value: `\`${commandName}\``, inline: true },
      { name: "📦 Argumentos", value: args.join(" ") || "Nenhum", inline: true },
      { name: "👤 Usuario", value: `\`${message.author.username}\` (\`${message.author.id}\`)`, inline: true },
      { name: "🏠 Servidor", value: `\`${message.guild.name}\` (\`${message.guild.id}\`)`, inline: true }
    ],
    timestamp: new Date(),
  });

  try {
    await sendWebhookLog("LOG_WEBHOOK_COMMANDS_URL", { embeds: [embed] });
  } catch (error) {
    logger.error("Failed to send prefix command log.", error);
  }
}

export default async (client) => {
  ensureCollections(client);

  const loadPrefixCommands = async (dir) => {
    await loadModulesRecursively(
      dir,
      (command, filePath) => {
        if (!command?.name || typeof command.execute !== "function") {
          logger.warn(`Skipping invalid prefix command module: ${filePath}`);
          return;
        }

        client.prefixcommands.set(command.name, command);
        logger.info(`Prefix command loaded: ${command.name}`);
      },
      "prefix commands"
    );
  };

  const loadSlashCommands = async (dir) => {
    await loadModulesRecursively(
      dir,
      (command, filePath) => {
        if (!command?.name || typeof command.execute !== "function") {
          logger.warn(`Skipping invalid slash command module: ${filePath}`);
          return;
        }

        client.slashcommands.set(command.name, command);
        logger.info(`Slash command loaded: ${command.name}`);
      },
      "slash commands"
    );
  };

  const loadEvents = async (dir) => {
    await loadModulesRecursively(
      dir,
      (event, filePath) => {
        if (!event?.name || typeof event.execute !== "function") {
          logger.warn(`Skipping invalid event module: ${filePath}`);
          return;
        }

        const eventName = event.customName || event.name;
        const runEvent = async (...args) => {
          try {
            await event.execute(...args, client);
          } catch (error) {
            logger.error(`Error while handling event \"${eventName}\".`, error);
          }
        };

        if (event.once) {
          client.once(event.name, (...args) => {
            void runEvent(...args);
          });
          logger.info(`Event loaded (once): ${eventName}`);
        } else {
          client.on(event.name, (...args) => {
            void runEvent(...args);
          });
          logger.info(`Event loaded: ${eventName}`);
        }
      },
      "events"
    );
  };

  await loadPrefixCommands(path.join(__dirname, "../commands/prefix"));
  await loadSlashCommands(path.join(__dirname, "../commands/slash"));
  await loadEvents(path.join(__dirname, "../events"));

  client.once("clientReady", async () => {
    try {
      if (!client.application) {
        logger.warn("Client application is not available yet. Skipping slash command registration.");
        return;
      }

      const allCommands = client.slashcommands.map((command) => ({
        name: command.name,
        description: command.description,
        type: command.type || ApplicationCommandType.ChatInput,
        options: command.options || [],
        integration_types: command.integration_types || [0],
        contexts: command.contexts || [0],
      }));

      await client.application.commands.set(allCommands);
      logger.info("Slash commands registered.");
    } catch (error) {
      logger.error("Failed to register slash commands.", error);
    }
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    let guildData;
    try {
      guildData = await db.guilds.get(message.guild);
    } catch (error) {
      logger.error("Failed to fetch guild data.", error);
      return;
    }

    const prefix = guildData?.prefix || DEFAULT_PREFIX;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/).filter(Boolean);
    const commandName = (args.shift() || "").toLowerCase();
    if (!commandName) return;
    const command = getCommandByName(client.prefixcommands, commandName);

    if (!command) return;

    let userData;
    try {
      const blacklistCheck = await ensureNotBlacklisted(client, message);
      if (blacklistCheck.blocked) {
        return;
      }

      userData = blacklistCheck.userData;
    } catch (error) {
      logger.error("Failed to fetch user data.", error);
      return;
    }

    if (command.devOnly && !client.settings.devs.includes(message.author.id)) return;

    if (command.premium) {
      return await message.reply({
        content: buildPremiumOnlyMessage(),
      });
    }

    try {
      await command.execute(message, args);
      await incrementExecutedCommands(userData);
      await sendPrefixCommandLog(client, message, commandName, args);
    } catch (error) {
      logger.error(`Error executing prefix command "${commandName}".`, error);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.slashcommands.get(interaction.commandName);
      if (!command) return;

      try {
        const blacklistCheck = await ensureNotBlacklisted(client, interaction);
        if (blacklistCheck.blocked) {
          return;
        }

        const userData = blacklistCheck.userData;

        if (command.devOnly && !client.settings.devs.includes(interaction.user.id)) {
          return await interaction.reply({
            content: buildDevOnlyMessage(),
            flags: [MessageFlags.Ephemeral]
          });
        }

        if (command.premium) {
          return await interaction.reply({
            content: buildPremiumOnlyMessage(),
            flags: [MessageFlags.Ephemeral]
          });
        }

        await command.execute(interaction);
        await incrementExecutedCommands(userData);
        await sendSlashCommandLog(client, interaction);
      } catch (error) {
        logger.error(`Error executing slash command "${interaction.commandName}".`, error);

        try {
          const content = "❌ Ocorreu um erro inesperado ao executar este comando.";

          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
              content,
              flags: [MessageFlags.Ephemeral],
            });
          } else {
            await interaction.reply({
              content,
              flags: [MessageFlags.Ephemeral],
            });
          }
        } catch (replyError) {
          logger.error(`Failed to send error response for slash command "${interaction.commandName}".`, replyError);
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.slashcommands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        const blacklistCheck = await ensureNotBlacklisted(client, interaction);
        if (blacklistCheck.blocked) {
          return;
        }

        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(`Error handling autocomplete for "${interaction.commandName}".`, error);
      }
    }
  });
};