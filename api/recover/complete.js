import bcrypt from "bcryptjs";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { tokenRecuperacao, senha, dataNascimento } = req.body || {};
  if (!tokenRecuperacao || !senha || !dataNascimento)
    return res.status(400).json({ error: "Token, senha e data de nascimento são obrigatórios." });

  try {
    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");
    const users = db.collection("ColecaoDeUsuarios");

    // 1️⃣ localiza o token ativo
    const token = await tokens.findOne({ tokenRecuperacao });
    if (!token)
      return res.status(400).json({ error: "Token inválido." });

    if (token.tokenUsado)
      return res.status(400).json({ error: "Token já utilizado." });

    if (new Date(token.DataEHoraExpiracao) < new Date())
      return res.status(400).json({ error: "Token expirado." });

    const email = token.email;

    // 2️⃣ localiza o usuário vinculado ao token
    const usuario = await users.findOne({ email });
    if (!usuario)
      return res.status(404).json({ error: "Usuário não encontrado." });

    // 3️⃣ normaliza ambas as datas e compara literalmente
    // o cadastro2.js envia no formato yyyy-mm-dd
    const dataInformada = dataNascimento.trim();
    const dataNoBanco =
      (usuario.dataNascimento || "").trim().substring(0, 10); // garante yyyy-mm-dd

    if (!dataNoBanco || dataNoBanco !== dataInformada) {
      console.warn(`Tentativa falha: ${email} informou ${dataInformada}, banco tem ${dataNoBanco}`);
      return res.status(403).json({ error: "Data de nascimento incorreta." });
    }

    // 4️⃣ criptografa a nova senha e atualiza
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    await users.updateOne(
      { email },
      { $set: { senha: senhaCriptografada, atualizadoEm: new Date() } }
    );

    // 5️⃣ invalida o token
    await tokens.updateOne(
      { _id: token._id },
      { $set: { tokenUsado: true, tokenAtivo: false } }
    );

    console.log("🔐 Senha redefinida para:", email);
    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em recover/complete:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
