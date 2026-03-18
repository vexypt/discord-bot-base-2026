import { db } from "../../functions/index.js";
import { ensureNotBlacklisted } from "../../utils/blacklist.js";

export default {
    name: "messageCreate",
    async execute(message) {
        const { client, content, author, guild } = message;

        if (author.bot) return;
        if (!guild || !client.user) return;

        const isBotMention = content === `<@${client.user.id}>` || content === `<@!${client.user.id}>`;
        if (!isBotMention) return;

        const blacklistCheck = await ensureNotBlacklisted(client, message);
        if (blacklistCheck.blocked) return;

        const guildData = await db.guilds.get(guild);
        const prefix = guildData?.prefix || process.env.DEFAULT_PREFIX;

        await message.channel.send({
            content: `👋 Ola! Meu prefixo neste servidor e \`${prefix}\`.\n📚 Use \`${prefix}help\` para ver todos os comandos!`,
        });
    }
};