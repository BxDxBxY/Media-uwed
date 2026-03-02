export type MailDispatchResult = {
  sent: string[];
  failed: string[];
  provider: "resend";
};

export async function sendEmailBatch(options: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const uniqueRecipients = Array.from(new Set(options.to.map((email) => email.trim().toLowerCase()).filter(Boolean)));

  const sent: string[] = [];
  const failed: string[] = [];

  for (const recipient of uniqueRecipients) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (response.ok) {
      sent.push(recipient);
    } else {
      failed.push(recipient);
    }
  }

  return {
    sent,
    failed,
    provider: "resend",
  } as MailDispatchResult;
}
