import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Get the current session user or redirect to login.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

/**
 * Get the current session user (optional — returns null if not logged in).
 */
export async function getUser() {
  const session = await auth();
  return session?.user ?? null;
}
