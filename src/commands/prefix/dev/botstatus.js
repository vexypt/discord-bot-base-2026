import os from "node:os";
import { EmbedBuilder } from "discord.js";

const memoryBaseline = {
  capturedAt: Date.now(),
  rss: process.memoryUsage().rss,
  heapUsed: process.memoryUsage().heapUsed,
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function getCpuEstimatePercent(uptimeSeconds) {
  if (uptimeSeconds <= 0) {
    return 0;
  }

  const usage = process.cpuUsage();
  const cpuTimeMs = (usage.user + usage.system) / 1000;
  const coreCount = Math.max(os.cpus().length, 1);
  const elapsedMs = uptimeSeconds * 1000;

  return (cpuTimeMs / (elapsedMs * coreCount)) * 100;
}

function formatDeltaBytes(value) {
  if (!Number.isFinite(value) || value === 0) {
    return "0 B";
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatBytes(Math.abs(value))}`;
}

function buildStatusEmbed(client) {
  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const cpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
  const cpuEstimate = getCpuEstimatePercent(uptimeSeconds);
  const shardIds = client.shard?.ids || [0];
  const shardId = shardIds[0] ?? 0;
  const shardCount = client.shard?.count || 1;
  const rssDelta = mem.rss - memoryBaseline.rss;
  const heapDelta = mem.heapUsed - memoryBaseline.heapUsed;

  return new EmbedBuilder()
    .setTitle("📊 Bot Status")
    .setColor(client.settings?.colors?.info || "Aqua")
    .addFields(
      {
        name: "⏱️ Execucao",
        value: [
          `Tempo ativo: \`${formatUptime(uptimeSeconds)}\``,
          `Node: \`${process.version}\``,
          `PID: \`${process.pid}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🛰️ Discord",
        value: [
          `Ping gateway: \`${Math.round(client.ws.ping)} ms\``,
          `Servidores: \`${client.guilds.cache.size}\``,
          `Shard: \`${shardId + 1}/${shardCount}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "⚙️ Processo",
        value: [
          `Tempo de CPU: \`${cpuMs.toFixed(0)} ms\``,
          `CPU estimada: \`${cpuEstimate.toFixed(2)}%\``,
          `RSS: \`${formatBytes(mem.rss)}\``,
          `Delta RSS: \`${formatDeltaBytes(rssDelta)}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🧠 Memoria",
        value: [
          `Heap usado: \`${formatBytes(mem.heapUsed)}\``,
          `Heap total: \`${formatBytes(mem.heapTotal)}\``,
          `External: \`${formatBytes(mem.external)}\``,
          `Delta heap: \`${formatDeltaBytes(heapDelta)}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🖥️ Host",
        value: [
          `Nucleos CPU: \`${os.cpus().length}\``,
          `Carga media (1m): \`${os.loadavg()[0].toFixed(2)}\``,
          `RAM livre/total: \`${formatBytes(os.freemem())} / ${formatBytes(os.totalmem())}\``,
        ].join("\n"),
        inline: true,
      }
    )
    .setFooter({ text: "Bot • Telemetria em tempo real" })
    .setTimestamp();
}

export default {
  name: "botstatus",
  description: "Mostra status tecnico do bot (dev)",
  devOnly: true,
  async execute(message, args) {
    const mode = (args[0] || "").toLowerCase();
    const embed = buildStatusEmbed(message.client);

    if (mode === "show") {
      await message.reply({
        content: "📢 Exibindo status no canal.",
        embeds: [embed],
      });
      return;
    }

    try {
      await message.react("✅");
    } catch {
      // Ignore reaction failures and continue with DM delivery.
    }

    try {
      await message.author.send({
        content: "📩 Aqui esta o status atual do Bot:",
        embeds: [embed],
      });
    } catch {
      await message.reply({
        content: "⚠️ Nao consegui te enviar DM. Verifica se as DMs estao habilitadas.",
      });
    }
  },
};