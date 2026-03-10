/**
 * Device Security Utilities for Orizon
 * Generates a stable hardware-locked fingerprint without using external Auth providers.
 */

export const getDeviceUUID = async (): Promise<string> => {
  // 1. Check localStorage first
  const savedID = localStorage.getItem("orizon_device_uuid");
  if (savedID) return savedID;

  // 2. Collect Fingerprint Data
  const fingerprintData = {
    ua: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    canvas: getCanvasFingerprint(),
  };

  const rawString = JSON.stringify(fingerprintData);

  // 3. Hash the data using SHA-256
  const hash = await generateSHA256(rawString);
  
  // 4. Persistence
  localStorage.setItem("orizon_device_uuid", hash);
  
  return hash;
};

/**
 * Canvas Fingerprinting: Draws a hidden shape and returns the data URL hash
 */
const getCanvasFingerprint = (): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "no-canvas";

  canvas.width = 200;
  canvas.height = 50;

  // Draw some complex text and shapes
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Orizon-Secure-ID", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("Orizon-Secure-ID", 4, 17);

  return canvas.toDataURL();
};

/**
 * Generates an SHA-256 hash of a string using the Web Crypto API
 */
const generateSHA256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};
