import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatEmoji } from "discord.js";
import { createLogger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, "../resources/configs/settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
const emojis = settings.emojis;
const logger = createLogger("emoji");

function resolveEmoji(name) {
  try {
    const [category, ...rest] = name.split('_');
    const emojiName = rest.join('_');
    if (category === 'static' && emojis.static[emojiName]) {
      return formatEmoji(emojis.static[emojiName]);
    } else if (category === 'animated' && emojis.animated[emojiName]) {
      return formatEmoji(emojis.animated[emojiName], true);
    } else if (category === 'default' && emojis.default[emojiName]) {
      return emojis.default[emojiName];
    } else if (emojis.static[name]) {
      return formatEmoji(emojis.static[name]);
    } else if (emojis.animated[name]) {
      return formatEmoji(emojis.animated[name], true);
    } else if (emojis.default[name]) {
      return emojis.default[name];
    } else {
      return `:${name}:`;
    }
  } catch (error) {
    logger.error(`Failed to resolve emoji "${name}".`, error);
    return `:x:`;
  }
}

function resolveEmojiId(name) {
  try {
    const [category, ...rest] = name.split('_');
    const emojiName = rest.join('_');
    if (category === 'static' && emojis.static[emojiName]) {
      return emojis.static[emojiName];
    } else if (category === 'animated' && emojis.animated[emojiName]) {
      return emojis.animated[emojiName];
    } else if (category === 'default' && emojis.default[emojiName]) {
      return emojis.default[emojiName];
    } else if (emojis.static[name]) {
      return emojis.static[name];
    } else if (emojis.animated[name]) {
      return emojis.animated[name];
    } else if (emojis.default[name]) {
      return emojis.default[name];
    } else {
      return `:${name}:`;
    }
  } catch (error) {
    logger.error(`Failed to resolve emoji ID for "${name}".`, error);
    return `❌`;
  }
}

const emoji = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === "string") {
      return resolveEmoji(prop);
    }
    return undefined;
  }
});

const emojiId = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === "string") {
      return resolveEmojiId(prop);
    }
    return undefined;
  }
});

export { emoji, emojiId };

/*
 * Usage examples:
 *
 * emoji.static_check    → formatted static emoji for 'check'
 * emoji.animated_check  → formatted animated emoji for 'check'
 * emoji.default_check   → raw unicode/default emoji for 'check'
 * emoji.check           → falls back: static → animated → default
 *
 * emojiId.static_check    → raw ID of the static emoji for 'check'
 * emojiId.animated_check  → raw ID of the animated emoji for 'check'
 * emojiId.default_check   → raw value of the default emoji for 'check'
 * emojiId.check           → falls back: static → animated → default
 */