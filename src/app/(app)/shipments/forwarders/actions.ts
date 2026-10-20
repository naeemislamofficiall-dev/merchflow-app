"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { shipmentService } from "@/services/shipment.service";
export async function saveForwarderAction(formData:FormData){
 const code=String(formData.get("code")??"").trim();const name=String(formData.get("name")??"").trim();const contactName=String(formData.get("contactName")??"").trim();const phone=String(formData.get("phone")??"").trim();const email=String(formData.get("email")??"").trim();
 if(!code||!name)throw new Error("Forwarder code and name are required.");
 await shipmentService.saveForwarder({code,name,isActive:true,...(contactName?{contactName}:{}),...(phone?{phone}:{}),...(email?{email}:{})});revalidatePath("/shipments/forwarders");redirect("/shipments/forwarders?saved=1");
}
