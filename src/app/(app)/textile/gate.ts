import { redirect } from "next/navigation";
import { can, requireUser } from "@/lib/permissions";
import { isTextileEnabled } from "@/lib/textile-flag";

// Every textile page: login + permission + textile factory enabled
export async function gate() {
  const user = await requireUser();
  if (!can(user, "textile.view")) redirect("/dashboard");
  if (!(await isTextileEnabled(user.id))) redirect("/dashboard");
  return user;
}