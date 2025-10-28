import fetch from "node-fetch";

export async function enviarEmail(destinatario, assunto, mensagemHTML) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.SENDER_EMAIL || "no-reply@example.com";

  if (!apiKey) {
    console.log("[EMAIL MOCK] Enviaria para", destinatario, assunto);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: { email: sender, name: "Ferramenta para Gestão de Templates Digitais" },
        to: [{ email: destinatario }],
        subject: assunto,
        htmlContent: mensagemHTML
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Erro Brevo:", errorText);
      return { success: false, error: errorText };
    }

    console.log("📧 E-mail enviado via Brevo para", destinatario);
    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return { success: false, error: error.message };
  }
}
