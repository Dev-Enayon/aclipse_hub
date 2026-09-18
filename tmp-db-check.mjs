import "dotenv/config";
import { prisma } from "@/lib/prisma";
for (let i = 0; i < 30; i++) { try { await prisma.$queryRaw`SELECT 1`; break; } catch { await new Promise(r => setTimeout(r, 4000)); } }
const subs = await prisma.user.findMany({
  where: { role: "SUB_ADMIN" },
  select: { id: true, email: true, name: true, admin: { select: { status: true } } },
  orderBy: { createdAt: "asc" },
});
console.log("SUB_ADMIN users:", JSON.stringify(subs, null, 1));
console.log("active count:", subs.filter(s => s.admin?.status === "ACTIVE").length);
const allUsers = await prisma.user.count();
console.log("total users:", allUsers);
await prisma.$disconnect();
