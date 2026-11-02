// Resend REST API (package lage na). Env: RESEND_API_KEY, MAIL_FROM.
export type MailAttachment = { filename: string; content: Uint8Array | string };

export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("Email is not configured (set RESEND_API_KEY and MAIL_FROM)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: (opts.attachments ?? []).map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string"
            ? Buffer.from(a.content, "utf8").toString("base64")
            : Buffer.from(a.content).toString("base64"),
      })),
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
}