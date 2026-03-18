import { PermissionFlagsBits } from "discord.js";
import { db } from "../../../functions/index.js";

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX;

export default {
  name: "setprefix",
  description: "Define um novo prefixo para este servidor",
  aliases: ["changeprefix"],
  devOnly: false,
  async execute(message, args) {
    const { member, guild } = message;

    const guildDb = await db.guilds.get(guild);

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({ content: "🚫 Voce nao tem permissao para usar este comando. Permissao necessaria: Gerenciar Servidor." });
        return;
    }

    const currentPrefix = guildDb?.prefix || DEFAULT_PREFIX;

    if (!args.length) {
      await message.reply({ content: "✏️ Informe um novo prefixo." });
        return;
    }

    const newPrefix = args[0].trim();

    if (!newPrefix) {
      await message.reply({ content: "⚠️ Informe um prefixo valido." });
      return;
    }

    if (newPrefix.length > 2) {
      await message.reply({ content: "📏 O prefixo deve ter no maximo 2 caracteres." });
        return;
    }

    if (newPrefix === currentPrefix) {
      await message.reply({ content: "ℹ️ O novo prefixo e igual ao prefixo atual." });
        return;
    }

    guildDb.prefix = newPrefix;
    await guildDb.save();

    await message.reply({ content: `✅ Prefixo atualizado com sucesso! Novo prefixo: \`${newPrefix}\`` });
  }
};