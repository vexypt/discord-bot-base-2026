import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLogger } from "./logger.js";

const components = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.join(__dirname, "../components");
const logger = createLogger("component-loader");

function isValidComponent(component) {
    return (
        component &&
        (typeof component.customId === 'string' || component.customId instanceof RegExp) &&
        typeof component.componentType !== 'undefined' &&
        typeof component.handleInteraction === 'function'
    );
}

async function loadComponentFile(filePath) {
    try {
        const importedModule = await import(pathToFileURL(filePath).href);
        const component = importedModule.default ?? importedModule;

        if (!isValidComponent(component)) {
            logger.warn(`Skipping invalid component at ${filePath}`);
            return;
        }

        components.push(component);
    } catch (error) {
        logger.error(`Failed to load component at ${filePath}`, error);
    }
}

async function loadComponents(dir) {
    if (!fs.existsSync(dir)) {
        logger.warn(`Components directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            await loadComponents(filePath);
        } else if (file.endsWith(".js")) {
            await loadComponentFile(filePath);
        }
    }
}

function matchesComponent(component, interaction) {
    if (!interaction || typeof interaction.customId !== 'string') {
        return false;
    }

    if (interaction.componentType !== component.componentType) {
        return false;
    }

    if (component.customId instanceof RegExp) {
        component.customId.lastIndex = 0;
        return component.customId.test(interaction.customId);
    }

    return interaction.customId === component.customId;
}

await loadComponents(COMPONENTS_DIR);

async function handleInteraction(interaction) {
    for (const component of components) {
        if (matchesComponent(component, interaction)) {
            try {
                await component.handleInteraction(interaction);
            } catch (error) {
                logger.error(
                    `Error while running component "${String(component.customId)}"`,
                    error
                );
            }

            return true;
        }
    }

    return false;
}

export { handleInteraction, components };