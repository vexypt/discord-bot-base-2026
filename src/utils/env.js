import dotenv from "dotenv";

function resolveEnvPath() {
  return process.env.NODE_ENV === "development" ? ".env.development" : ".env";
}

function loadEnvironment(options = {}) {
  const { envPath = resolveEnvPath(), skipIfLoaded = true } = options;

  if (skipIfLoaded && process.env.__ENV_LOADED === "1") {
    return { skipped: true, loaded: 0, envPath };
  }

  const beforeKeys = new Set(Object.keys(process.env));
  const result = dotenv.config({ path: envPath, quiet: true });

  if (result.error) {
    throw result.error;
  }

  let loaded = 0;

  if (result.parsed) {
    for (const key of Object.keys(result.parsed)) {
      if (!beforeKeys.has(key)) {
        loaded += 1;
      }
    }
  }

  process.env.__ENV_LOADED = "1";

  console.log(`[dotenv] injecting env (${loaded}) from ${envPath}`);

  return { skipped: false, loaded, envPath, parsed: result.parsed || {} };
}

export {
  loadEnvironment,
  resolveEnvPath,
};
