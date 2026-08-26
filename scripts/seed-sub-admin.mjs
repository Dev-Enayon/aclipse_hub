// Seed the initial Sub-Admin account from the SUB_ADMIN_PASSWORD env var.
// Usage: node scripts/seed-sub-admin.mjs
// The password must be set via SUB_ADMIN_PASSWORD environment variable.
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

const email = "tobihunpatin@admin.ng";
const name = "Tobi Hunpatin";
const password = process.env.SUB_ADMIN_PASSWORD;

if (!password) {
  console.error("ERROR: SUB_ADMIN_PASSWORD environment variable is required.");
  console.error("Usage: SUB_ADMIN_PASSWORD=yourpassword node scripts/seed-sub-admin.mjs");
  process.exit(1);
}

if (password.length < 8) {
  console.error("ERROR: SUB_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
try {
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Update password and ensure role is ADMIN
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: "ADMIN",
        provider: "credentials",
        name,
      },
    });
    // Ensure admin record exists
    await prisma.admin.upsert({
      where: { userId: existing.id },
      update: { permissions: JSON.stringify(["manage_students", "manage_questions", "manage_exams"]) },
      create: {
        userId: existing.id,
        permissions: JSON.stringify(["manage_students", "manage_questions", "manage_exams"]),
      },
    });
    console.log(`OK: Updated existing sub-admin ${email} (id=${existing.id})`);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "ADMIN",
        provider: "credentials",
        admin: {
          create: {
            permissions: JSON.stringify(["manage_students", "manage_questions", "manage_exams"]),
          },
        },
      },
    });
    console.log(`OK: Created sub-admin ${email} role=${user.role} id=${user.id}`);
  }
} finally {
  await prisma.$disconnect();
}
