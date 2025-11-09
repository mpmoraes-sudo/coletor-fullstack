import bcrypt from "bcryptjs";
import { getDb } from "./_db.js";
import { enviarEmail } from "./_email.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido." });

  const { acao } = req.body || {};
  const db = await getDb();
  const usuarios = db.collection("ColecaoDeUsuarios");
  const tokens = db.collection("ColecaoDeTokensTemporarios");

  try {
    // ========== 1️⃣ INÍCIO DO CADASTRO (envio de código) ==========
    if (acao === "start") {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });

      const codigo = Math.floor(10000 + Math.random() * 90000);
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);

      await tokens.insertOne({
        email,
        codigoDoCliente: codigo,
        DataEHoraExpiracao: expiracao,
        tokenUsado: false
      });

      const html = `
        <p>Seu código de verificação é:</p>
        <h2 style="color:#2e6eb5">${codigo}</h2>
        <p>Válido por 10 minutos.</p>
        <br><em>Ferramenta para Gestão de Templates Digitais</em>
      `;

      const envio = await enviarEmail(email, "Código de Verificação", html);
      if (!envio.success) return res.status(500).json({ error: "Erro ao enviar e-mail." });

      return res.json({ success: true, message: "Código enviado com sucesso." });
    }

    // ========== 2️⃣ VERIFICAÇÃO DO CÓDIGO ==========
    if (acao === "verify") {
      const { email, codigo } = req.body;
      if (!email || !codigo)
        return res.status(400).json({ error: "E-mail e código são obrigatórios." });

      const token = await tokens.findOne({
        email,
        codigoDoCliente: parseInt(codigo)
      });

      if (!token) return res.status(400).json({ error: "Código inválido." });
      if (token.tokenUsado) return res.status(400).json({ error: "Código já utilizado." });
      if (new Date(token.DataEHoraExpiracao) < new Date())
        return res.status(400).json({ error: "Código expirado." });

      await tokens.updateOne({ _id: token._id }, { $set: { tokenUsado: true } });
      return res.json({ success: true, email });
    }

    // ========== 3️⃣ CONCLUSÃO DO CADASTRO ==========
    if (acao === "complete") {
      const { email, nome, senha, dataNascimento } = req.body;
      if (!email || !nome || !senha || !dataNascimento)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const existente = await usuarios.findOne({ email });
      if (existente)
        return res.status(400).json({ error: "E-mail já cadastrado." });

      const senhaCriptografada = await bcrypt.hash(senha, 10);
      await usuarios.insertOne({
        email,
        nome,
        senha: senhaCriptografada,
        dataNascimento,
        jaCadastrado: true,
        criadoEm: new Date()
      });

      console.log(`🧾 Novo usuário cadastrado: ${email}`);
      return res.json({ success: true, message: "Cadastro concluído com sucesso." });
    }

    // ========== AÇÃO INVÁLIDA ==========
    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("Erro em /api/signup:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
