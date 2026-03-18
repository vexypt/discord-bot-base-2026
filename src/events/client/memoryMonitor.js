import { createLogger } from "../../utils/logger.js";
import { sendWebhookLog } from "../../utils/webhookLogger.js";
import { EmbedBuilder } from "discord.js";

const logger = createLogger("memory-monitor");
const MEMORY_WARNING_THRESHOLD_MB = 300; // Alerta em 300MB
const MEMORY_CRITICAL_THRESHOLD_MB = 500; // Crítico em 500MB

export default {
  name: "clientReady",
  once: true,
  async execute(client) {
    // Monitorizar memória a cada 60 segundos
    setInterval(async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const rssMemoryMB = memUsage.rss / 1024 / 1024;

      if (heapUsedMB > MEMORY_CRITICAL_THRESHOLD_MB) {
        logger.warn(
          `🚨 MEMÓRIA CRÍTICA! Heap: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB, RSS: ${rssMemoryMB.toFixed(2)}MB`
        );

        const embedCritical = new EmbedBuilder()
          .setTitle("🚨 Alerta Crítico de Memória")
          .setColor("Red")
          .addFields(
            { name: "Heap Utilizado", value: `${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`, inline: true },
            { name: "RSS Memory", value: `${rssMemoryMB.toFixed(2)}MB`, inline: true },
            { name: "Status", value: "🚨 CRÍTICO", inline: false }
          )
          .setTimestamp();

        await sendWebhookLog("LOG_WEBHOOK_MEMORY_URL", { embeds: [embedCritical] });

        // Forçar garbage collection se disponível
        if (global.gc) {
          logger.info("Executando garbage collection manual...");
          global.gc();

          // Verificar após GC
          const memAfterGC = process.memoryUsage();
          const heapAfterGC = memAfterGC.heapUsed / 1024 / 1024;
          logger.info(
            `Após GC - Heap: ${heapAfterGC.toFixed(2)}MB / ${(memAfterGC.heapTotal / 1024 / 1024).toFixed(2)}MB`
          );
        }
      } else if (heapUsedMB > MEMORY_WARNING_THRESHOLD_MB) {
        logger.warn(
          `⚠️ Aviso de memória. Heap: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB, RSS: ${rssMemoryMB.toFixed(2)}MB`
        );

        const embedWarning = new EmbedBuilder()
          .setTitle("⚠️ Aviso de Memória")
          .setColor("Yellow")
          .addFields(
            { name: "Heap Utilizado", value: `${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`, inline: true },
            { name: "RSS Memory", value: `${rssMemoryMB.toFixed(2)}MB`, inline: true },
            { name: "Status", value: "⚠️ AVISO", inline: false }
          )
          .setTimestamp();

        await sendWebhookLog("LOG_WEBHOOK_MEMORY_URL", { embeds: [embedWarning] });
      } else {
        // Memória dentro dos limites normais, apenas logar para monitoramento
      }
    }, 60000); // A cada 60 segundos
  },
};
