import { enviarEmail } from "../_email.js";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const { email } = req.body || {};
    if (!email)
      return res.status(400).json({ error: "E-mail é obrigatório" });

    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");
    const users = db.collection("ColecaoDeUsuarios");

    // Verifica se já existe usuário
    const existe = await users.findOne({ email });
    if (existe)
      return res.status(409).json({ error: "E-mail já cadastrado" });

    // Gera código e expiração
    const codigoCadastro = Math.floor(10000 + Math.random() * 90000);
    const expiracao = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await tokens.insertOne({
      email,
      codigoDoCliente: codigoCadastro,
      DataEHoraExpiracao: expiracao,
      tokenUsado: false
    });

    // Corpo do e-mail
    const mensagemHTML = `
      <p>Seu código de confirmação de e-mail é:</p>
      <h2 style="color:#2b6cb0">${codigoCadastro}</h2>
      <p>Este código expira em 10 minutos.</p>
      <br>
      <p><em>Ferramenta para Gestão de Templates Digitais</em></p>
    `;

    const envio = await enviarEmail(
      email,
      "Código de verificação - Ferramenta de Templates",
      mensagemHTML
    );

    if (!envio.success)
      return res.status(500).json({ error: "Erro ao enviar e-mail" });

    console.log("✅ E-mail de verificação enviado para", email);
    return res.json({ success: true, message: "Código enviado com sucesso" });
  } catch (err) {
    console.error("Erro geral em signup/start:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
