import { EmbedBuilder, WebhookClient } from "discord.js";

const webhookClientCache = new Map();
const missingWebhookWarnings = new Set();
const invalidWebhookWarnings = new Set();
const webhookLastUsed = new Map();

// Limpar webhooks não utilizados a cada 30 minutos
setInterval(() => {
  const now = Date.now();
  const WEBHOOK_TIMEOUT = 30 * 60 * 1000; // 30 minutos

  for (const [url, client] of webhookClientCache.entries()) {
    const lastUsed = webhookLastUsed.get(url) || 0;
    if (now - lastUsed > WEBHOOK_TIMEOUT) {
      try {
        client.destroy?.();
      } catch {}
      webhookClientCache.delete(url);
      webhookLastUsed.delete(url);
    }
  }
}, 30 * 60 * 1000);

function truncate(value, maxLength = 1000) {
  if (typeof value !== "string") {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function serializeMeta(meta) {
  if (typeof meta === "undefined") {
    return "";
  }

  if (meta instanceof Error) {
    return truncate(`${meta.name}: ${meta.message}\n${meta.stack || ""}`.trim());
  }

  if (typeof meta === "string") {
    return truncate(meta);
  }

  try {
    return truncate(JSON.stringify(meta, null, 2));
  } catch {
    return truncate(String(meta));
  }
}

function getWebhookClientFromEnv(envVarName) {
  const webhookUrl = process.env[envVarName];

  if (!webhookUrl) {
    if (!missingWebhookWarnings.has(envVarName)) {
      console.warn(`[webhook] ${envVarName} is not configured.`);
      missingWebhookWarnings.add(envVarName);
    }
    return null;
  }

  if (webhookClientCache.has(webhookUrl)) {
    webhookLastUsed.set(webhookUrl, Date.now());
    return webhookClientCache.get(webhookUrl);
  }

  try {
    const client = new WebhookClient({ url: webhookUrl });
    webhookClientCache.set(webhookUrl, client);
    webhookLastUsed.set(webhookUrl, Date.now());
    return client;
  } catch {
    if (!invalidWebhookWarnings.has(envVarName)) {
      console.warn(`[webhook] ${envVarName} has an invalid webhook URL.`);
      invalidWebhookWarnings.add(envVarName);
    }
    return null;
  }
}

async function sendWebhookLog(envVarName, payload) {
  const webhookClient = getWebhookClientFromEnv(envVarName);
  if (!webhookClient) {
    return false;
  }

  try {
    await webhookClient.send(payload);
    return true;
  } catch (error) {
    console.error(`[webhook] Failed to send message to ${envVarName}.`, error);
    return false;
  }
}

async function sendErrorWebhook(scope, message, meta) {
  const metadataText = serializeMeta(meta);

  const embed = new EmbedBuilder()
    .setTitle("🚨 Erro da aplicacao")
    .setColor("Red")
    .addFields(
      {
        name: "📍 Escopo",
        value: `\`${scope}\``,
        inline: true,
      },
      {
        name: "📝 Mensagem",
        value: truncate(message || "Erro sem mensagem"),
        inline: false,
      }
    )
    .setTimestamp();

  if (metadataText) {
    embed.addFields({
      name: "🧩 Detalhes",
      value: `\`\`\`json\n${metadataText}\n\`\`\``,
      inline: false,
    });
  }

  await sendWebhookLog("LOG_WEBHOOK_ERRORS_URL", { embeds: [embed] });
}

export {
  sendWebhookLog,
  sendErrorWebhook,
};