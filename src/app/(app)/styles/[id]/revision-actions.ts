"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { styleService } from "@/services/style.service";
export async function proposeStyleRevisionAction(formData:FormData){
 const styleId=String(formData.get("styleId")??""); const reason=String(formData.get("reason")??"").trim(); const name=String(formData.get("name")??"").trim(); const description=String(formData.get("description")??"").trim(); const fabricType=String(formData.get("fabricType")??"").trim(); const composition=String(formData.get("composition")??"").trim(); const gsmRaw=String(formData.get("gsm")??"").trim(); const attachmentUrl=String(formData.get("attachmentUrl")??"").trim();
 const changes:Record<string,unknown>={}; if(name)changes.name=name; if(description)changes.description=description; if(fabricType)changes.fabricType=fabricType; if(composition)changes.composition=composition; if(gsmRaw){const gsm=Number(gsmRaw);if(!Number.isInteger(gsm)||gsm<=0)throw new Error("GSM must be a positive whole number.");changes.gsm=gsm;}
 if(Object.keys(changes).length===0)throw new Error("Provide at least one field to change.");
 await styleService.proposeRevision({styleId,reason,changes,...(attachmentUrl?{attachmentUrl}:{})}); revalidatePath(`/styles/${styleId}`); redirect(`/styles/${styleId}?tab=revisions&revisionSaved=1`);
}
export async function approveStyleRevisionAction(formData:FormData){const styleId=String(formData.get("styleId")??"");const revisionId=String(formData.get("revisionId")??"");await styleService.approveRevision(revisionId);revalidatePath(`/styles/${styleId}`);redirect(`/styles/${styleId}?tab=revisions&revisionApproved=1`);}
