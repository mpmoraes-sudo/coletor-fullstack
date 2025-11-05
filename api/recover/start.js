import { enviarEmail } from "../_email.js";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { email } = req.body || {};
  if (!email)
    return res.status(400).json({ error: "E-mail é obrigatório" });

  try {
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");
    const tokens = db.collection("ColecaoDeTokensTemporarios");

    const user = await users.findOne({ email });
    if (!user)
      return res.status(404).json({ error: "Usuário não encontrado" });

    const codigo = Math.floor(10000 + Math.random() * 90000);
    const expiracao = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const tokenRecuperacao = Math.random().toString(36).substring(2, 15);
    await tokens.insertOne({
      email,
      codigoDoCliente: codigo,
      DataEHoraExpiracao: expiracao,
      tokenUsado: false,
      tokenRecuperacao
    });

    const mensagemHTML = `
      <p>Seu código para redefinir a senha é:</p>
      <h2 style="color:#2b6cb0">${codigo}</h2>
      <p>Este código expira em 10 minutos.</p>
      <br>
      <p><em>Ferramenta para Gestão de Templates Digitais</em></p>
    `;

    const envio = await enviarEmail(email, "Recuperação de Senha", mensagemHTML);
    if (!envio.success)
      return res.status(500).json({ error: "Erro ao enviar e-mail" });

    console.log("✅ Código de recuperação enviado para", email);
    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em recover/start:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
