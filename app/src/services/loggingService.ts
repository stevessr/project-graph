type LogLevel = "info" | "warn" | "error";

/**
 * Sanitizes data by removing or obfuscating sensitive information.
 * @param data - The data object to sanitize.
 * @returns A sanitized copy of the data.
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = { ...data };

  // Recursively sanitize the object
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeData(sanitized[key]);
    } else if (typeof sanitized[key] === "string") {
      // Obfuscate keys that might contain sensitive information
      if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret")) {
        sanitized[key] = "********";
      }
    }
  }

  return sanitized;
};

/**
 * Logs a message with a specific level and data payload.
 * @param level - The log level ('info', 'warn', 'error').
 * @param message - The message to log.
 * @param data - Optional data to include with the log.
 */
const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const sanitizedPayload = data ? sanitizeData(data) : {};

  console.log(
    JSON.stringify({
      timestamp,
      level,
      message,
      payload: sanitizedPayload,
    }),
  );
};

export const loggingService = {
  log,
  sanitizeData,
};
