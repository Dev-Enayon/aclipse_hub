// Password hashing via Web Crypto PBKDF2 — works in both Node and Edge runtimes.
// Stored format: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveBits(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );
  return toHex(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  const hash = await deriveBits(password, salt);
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const expectedHash = parts[3];
  const candidateHash = await deriveBits(password, parts[2]);
  if (candidateHash.length !== expectedHash.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
