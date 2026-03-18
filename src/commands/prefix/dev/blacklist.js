import { inlineCode, EmbedBuilder } from "discord.js";
import { db } from "../../../functions/index.js";
import { sendWebhookLog } from "../../../utils/webhookLogger.js";

export default {
    name: "blacklist",
    description: "Emoji module",
    devOnly: true,
    async execute(message, args) {
        const { guild, client } = message;

        const guildPrefix = (await db.guilds.get(guild))?.prefix || process.env.DEFAULT_PREFIX;
        const usage = `Use: \`${guildPrefix}blacklist <add/remove> <userId|@usuario> [motivo]\``;

        if (!args || args.length < 2) {
            await message.reply({ content: usage });
            return;
        }

        const subcommand = args[0].toLowerCase();
        const rawTarget = args[1]?.replace(/[<@!>]/g, "");

        if (subcommand !== "add" && subcommand !== "remove") {
            await message.reply({ content: usage });
            return;
        }

        if (!rawTarget || !/^\d{17,20}$/.test(rawTarget)) {
            await message.reply({ content: usage });
            return;
        }

        let target;
        try {
            target = message.mentions.users.first() || await client.users.fetch(rawTarget);
        } catch (error) {
            await message.reply({ content: "❌ Não consegui encontrar esse usuário. Verifique o ID ou a menção." });
            return;
        }

        const userData = await db.users.get(target);

        switch (subcommand) {
            case "add": {
                let reason = args.slice(2).join(" ");
                if (!reason) reason = "Sem motivo informado.";

                if (userData?.blacklist?.isBanned) {
                    await message.reply({
                        content: "❌ Este usuário já está na blacklist."
                    });
                    return;
                }

                userData.blacklist = {
                    isBanned: true,
                    since: new Date(),
                    reason,
                };
                await userData.save();

                let dmSent = false;
                try {
                    await target.send({
                        content: `🚫 Você foi adicionado à blacklist do bot.\n📋 **Motivo:** ${reason}\n\nCaso acredite que isso foi um engano, entre em contato com o suporte.`
                    });
                    dmSent = true;
                } catch (error) {
                    // DMs may be disabled — silently ignore
                }

                const addEmbed = new EmbedBuilder()
                    .setTitle("🚫 Usuário adicionado à blacklist")
                    .setColor("Red")
                    .addFields(
                        { name: "👤 Usuário", value: `${target.tag} (${inlineCode(target.id)})`, inline: true },
                        { name: "🛡️ Moderador", value: `${message.author.tag} (${inlineCode(message.author.id)})`, inline: true },
                        { name: "📋 Motivo", value: reason, inline: false },
                        { name: "📬 DM enviada", value: dmSent ? "✅ Sim" : "❌ Não (DMs fechadas)", inline: true }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await sendWebhookLog("LOG_WEBHOOK_BLACKLIST_URL", { embeds: [addEmbed] });

                await message.reply({
                    content: `✅ **${target}** ${inlineCode("(" + target.id + ")")} foi adicionado à blacklist.\n📋 **Motivo:** ${reason}\n📬 DM: ${dmSent ? "enviada com sucesso" : "não foi possível enviar (DMs fechadas)"}`
                });

                return;
            }

            case "remove": {
                if (!userData?.blacklist?.isBanned) {
                    await message.reply({
                        content: "❌ Este usuário não está na blacklist."
                    });
                    return;
                }

                userData.blacklist = {
                    isBanned: false,
                    since: null,
                    reason: null,
                };
                await userData.save();

                let dmSent = false;
                try {
                    await target.send({
                        content: `✅ Você foi removido da blacklist do Bot e pode utilizá-lo normalmente novamente.`
                    });
                    dmSent = true;
                } catch (error) {
                    // DMs may be disabled — silently ignore
                }

                const removeEmbed = new EmbedBuilder()
                    .setTitle("✅ Usuário removido da blacklist")
                    .setColor("Green")
                    .addFields(
                        { name: "👤 Usuário", value: `${target.tag} (${inlineCode(target.id)})`, inline: true },
                        { name: "🛡️ Moderador", value: `${message.author.tag} (${inlineCode(message.author.id)})`, inline: true },
                        { name: "📬 DM enviada", value: dmSent ? "✅ Sim" : "❌ Não (DMs fechadas)", inline: true }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await sendWebhookLog("LOG_WEBHOOK_BLACKLIST_URL", { embeds: [removeEmbed] });

                await message.reply({
                    content: `✅ **${target}** ${inlineCode("(" + target.id + ")")} foi removido da blacklist.\n📬 DM: ${dmSent ? "enviada com sucesso" : "não foi possível enviar (DMs fechadas)"}`
                });

                return;
            }
        }
    }
}