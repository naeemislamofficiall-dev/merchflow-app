import { redirect } from "next/navigation";

// নোটিফিকেশনের লিংক /approvals/<id> আসে, তাই তালিকা পেজে পাঠানো হয়
export default function ApprovalRedirect() {
  redirect("/approvals");
}