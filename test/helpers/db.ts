import { prisma } from "@/lib/prisma";

/**
 * Neon free-tier compute scales to zero when idle and can take 30–90s to
 * resume, which surfaces as transient "Can't reach database server" errors at
 * the start of DB-backed tests. Warm it up with retries before integration
 * tests run.
 */
export async function warmDatabase(timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  throw new Error(
    `Database did not become reachable within ${timeoutMs}ms. ${lastError ? String(lastError).split("\n")[0] : ""}`
  );
}