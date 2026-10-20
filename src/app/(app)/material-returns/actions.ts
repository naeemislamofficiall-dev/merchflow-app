"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { materialIssueService } from "@/services/material-issue.service";
export async function createMaterialReturnAction(formData:FormData){
 const issueId=String(formData.get("issueId")??""); const issueLineId=String(formData.get("issueLineId")??""); const quantity=Number(formData.get("quantity")); const reason=String(formData.get("reason")??"").trim(); const remarks=String(formData.get("remarks")??"").trim();
 if(!issueId||!issueLineId||!Number.isFinite(quantity)||quantity<=0||reason.length<3) throw new Error("Issue, line, positive quantity and reason are required.");
 await materialIssueService.returnToStore({issueId,reason,...(remarks?{remarks}:{}),lines:[{issueLineId,quantity}]});
 revalidatePath("/material-returns"); revalidatePath("/inventory"); redirect("/material-returns?saved=1");
}
