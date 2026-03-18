import { EmbedBuilder } from "discord.js";
import { db } from "../../functions/index.js";
import { createLogger } from "../../utils/logger.js";
import { sendWebhookLog } from "../../utils/webhookLogger.js";

const logger = createLogger("event:guild-delete");

async function sendGuildDeleteLog(guild, client) {
    const now = Math.floor(Date.now() / 1000);
    const logEmbed = new EmbedBuilder()
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTitle("🔴 Removido de um Servidor")
        .setDescription(`<t:${now}:D> (<t:${now}:T>)\n\n> **🏷️ Nome:** \`${guild.name}\`\n> **🆔 ID:** \`${guild.id}\`\n> **👑 Dono:** \`${guild.ownerId}\`\n> **👥 Membros:** \`${guild.memberCount}\``)
        .setFooter({ text: `${client.guilds.cache.size} servidores` })
        .setColor(client.settings.colors.danger);

    await sendWebhookLog("LOG_WEBHOOK_GUILD_DELETE_URL", { embeds: [logEmbed] });
}

export default {
    name: "guildDelete",
    async execute(guild, client) {
        try {
            await sendGuildDeleteLog(guild, client);
        } catch (error) {
            logger.error("Failed to create guild deletion log entry.", error);
        }

        try {
            await db.guilds.delete(guild); 
        } catch (error) {
            logger.error("Failed to delete guild settings.", error);
        }
    },
};