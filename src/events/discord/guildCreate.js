import { EmbedBuilder } from "discord.js";
import { db } from "../../functions/index.js";
import { createLogger } from "../../utils/logger.js";
import { sendWebhookLog } from "../../utils/webhookLogger.js";

const logger = createLogger("event:guild-create");

async function sendGuildCreateLog(guild, client) {
    const now = Math.floor(Date.now() / 1000);
    const logEmbed = new EmbedBuilder()
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTitle("🟢 Novo Servidor")
        .setDescription(`<t:${now}:D> (<t:${now}:T>)\n\n> **🏷️ Nome:** \`${guild.name}\`\n> **🆔 ID:** \`${guild.id}\`\n> **👑 Dono:** <@${guild.ownerId}> \`${guild.ownerId}\`\n> **👥 Membros:** \`${guild.memberCount}\``)
        .setFooter({ text: `${client.guilds.cache.size} servidores` })
        .setColor(client.settings.colors.success);

    await sendWebhookLog("LOG_WEBHOOK_GUILD_CREATE_URL", { embeds: [logEmbed] });
}

export default {
    name: "guildCreate",
    async execute(guild, client) {
        try {
            await sendGuildCreateLog(guild, client);
        } catch (error) {
            logger.error("Failed to create guild log entry.", error);
        }

        try {
            await db.guilds.get(guild);
        } catch (error) {
            logger.error("Failed to create default guild settings.", error);
        }

    },
};