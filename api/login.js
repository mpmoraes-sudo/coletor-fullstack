import { getDb } from "./_db.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

  try {
    const db = await getDb();
    const usuarios = db.collection("ColecaoDeUsuarios");

    const usuario = await usuarios.findOne({ email });
    if (!usuario)
      return res.status(404).json({ error: "Usuário não encontrado." });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida)
      return res.status(401).json({ error: "Senha incorreta." });

    // Cria token de sessão simples (pode ser JWT futuramente)
    const tokenDeSessao = Math.random().toString(36).substring(2);
    const sessoes = db.collection("ColecaoDeSessoes");

    const dataLogin = new Date();
    const expiracao = new Date(dataLogin.getTime() + 16 * 60 * 60 * 1000); // 16h

    await sessoes.insertOne({
      email,
      tokenDeSessao,
      dataLogin,
      expiracao
    });

    console.log("✅ Login bem-sucedido para:", email);

    return res.json({ success: true, tokenDeSessao });
  } catch (err) {
    console.error("Erro ao autenticar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
