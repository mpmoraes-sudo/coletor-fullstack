import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
const sender = process.env.SENDER_EMAIL;

if (!apiKey) {
  console.error("❌ SENDGRID_API_KEY não configurada na Vercel!");
}
sgMail.setApiKey(apiKey);

export async function enviarEmail(destinatario, assunto, mensagemHTML) {
  try {
    const msg = {
      to: destinatario,
      from: {
        email: sender,
        name: "Ferramenta para Gestão de Templates Digitais"
      },
      subject: assunto,
      html: mensagemHTML
    };

    await sgMail.send(msg);
    console.log("📧 E-mail enviado para:", destinatario);
    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error.response?.body || error);
    return { success: false, error };
  }
}
