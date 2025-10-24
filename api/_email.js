import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function enviarEmail(destinatario, assunto, mensagem) {
  try {
    const msg = {
      to: destinatario,
      from: process.env.SENDER_EMAIL,
      subject: assunto,
      text: mensagem,
    };
    await sgMail.send(msg);
    console.log("Email enviado com sucesso para", destinatario);
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err.response?.body || err);
  }
}
