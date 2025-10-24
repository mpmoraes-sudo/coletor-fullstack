import { Resend } from "resend";

export async function sendCodeEmail({ to, code, expiresAt }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SENDER_EMAIL || "no-reply@example.com";
  const subject = "Seu código de verificação";
  const html = `<p>Seu código é <b>${code}</b>.</p><p>Ele expira às <b>${new Date(expiresAt).toLocaleTimeString("pt-BR")}</b>.</p>`;

  if (!apiKey) {
    console.log("[EMAIL MOCK] Enviaria para", to, "assunto:", subject, "html:", html);
    return { success: true, mock: true };
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw error;
  return { success: true };
}
