import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loggingService } from "../../src/services/loggingService";

describe("loggingService", () => {
  describe("sanitizeData", () => {
    it("should return non-object data as is", () => {
      expect(loggingService.sanitizeData("string")).toBe("string");
      expect(loggingService.sanitizeData(123)).toBe(123);
      expect(loggingService.sanitizeData(null)).toBe(null);
      expect(loggingService.sanitizeData(undefined)).toBe(undefined);
    });

    it("should obfuscate sensitive keys", () => {
      const data = { apiKey: "12345", client_secret: "secret-value", other: "normal" };
      const sanitized = loggingService.sanitizeData(data);
      expect(sanitized.apiKey).toBe("********");
      expect(sanitized.client_secret).toBe("********");
      expect(sanitized.other).toBe("normal");
    });

    it("should handle nested objects", () => {
      const data = {
        credentials: {
          apiKey: "12345",
          apiSecret: "super-secret",
        },
        config: {
          url: "https://example.com",
        },
      };
      const sanitized = loggingService.sanitizeData(data);
      expect(sanitized.credentials.apiKey).toBe("********");
      expect(sanitized.credentials.apiSecret).toBe("********");
      expect(sanitized.config.url).toBe("https://example.com");
    });
  });

  describe("log", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log a message with the correct structure", () => {
      loggingService.log("info", "Test message", { data: "test" });
      expect(consoleSpy).toHaveBeenCalled();
      const logObject = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logObject).toHaveProperty("timestamp");
      expect(logObject.level).toBe("info");
      expect(logObject.message).toBe("Test message");
      expect(logObject.payload).toEqual({ data: "test" });
    });

    it("should sanitize data before logging", () => {
      const sensitiveData = { apiKey: "sensitive-key" };
      loggingService.log("warn", "Sensitive data log", sensitiveData);
      expect(consoleSpy).toHaveBeenCalled();
      const logObject = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logObject.payload.apiKey).toBe("********");
    });
  });
});
