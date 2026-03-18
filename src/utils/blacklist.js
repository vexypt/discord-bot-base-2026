import { MessageFlags } from "discord.js";
import { db } from "../functions/db.js";

function buildBlacklistedMessage(client, userData) {
  const supportServer = client.settings?.links?.supportServer || "Não configurado";
  const reason = userData.blacklist?.reason || "Motivo não informado";
  const since = userData.blacklist?.since instanceof Date ? `<t:${Math.floor(userData.blacklist.since.getTime() / 1000)}:R>` : "Desconhecido";

  return `⛔ Você está na blacklist deste bot.\n📝 Motivo: ${reason}\n🕒 Desde: ${since}\n🛟 Suporte: ${supportServer}`;
}

async function replyToBlacklistedTarget(client, target, userData) {
  const content = buildBlacklistedMessage(client, userData);

  if (typeof target?.isAutocomplete === "function" && target.isAutocomplete()) {
    await target.respond([]);
    return;
  }

  if (typeof target?.reply === "function" && target.author) {
    await target.reply({ content });
    return;
  }

  if (typeof target?.reply !== "function") {
    return;
  }

  if (target.deferred || target.replied) {
    await target.followUp({
      content,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await target.reply({
    content,
    flags: MessageFlags.Ephemeral,
  });
}

async function ensureNotBlacklisted(client, target) {
  const user = target?.user || target?.author;

  if (!user) {
    return { blocked: false, userData: null };
  }

  const userData = await db.users.get(user);

  if (!userData.blacklist?.isBanned) {
    return { blocked: false, userData };
  }

  await replyToBlacklistedTarget(client, target, userData);

  return { blocked: true, userData };
}

export {
  buildBlacklistedMessage,
  ensureNotBlacklisted,
};