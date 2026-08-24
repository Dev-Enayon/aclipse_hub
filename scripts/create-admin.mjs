// One-off utility: create or update an admin user with a credentials password.
// Usage: node scripts/create-admin.mjs <email> <password> [name]
// The PBKDF2 format MUST match src/lib/password.ts ("pbkdf2:iterations:saltHex:hashHex").
const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;

function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  const saltBytes = new Uint8Array(salt.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );
  return `pbkdf2:${ITERATIONS}:${salt}:${toHex(new Uint8Array(bits))}`;
}

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [name]");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
try {
  const data = {
    role: "ADMIN",
    provider: "credentials",
    name: name || null,
    passwordHash: await hashPassword(password),
  };
  const user = await prisma.user.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });
  console.log(`OK: ${user.email} role=${user.role} id=${user.id}`);
} finally {
  await prisma.$disconnect();
}
