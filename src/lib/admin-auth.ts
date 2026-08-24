import { auth } from "@/lib/auth";

export async function isAdminRequest(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
