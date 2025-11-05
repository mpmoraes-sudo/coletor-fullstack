import bcrypt from "bcryptjs";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { tokenRecuperacao, senha } = req.body || {};
  if (!tokenRecuperacao || !senha)
    return res.status(400).json({ error: "Token e senha são obrigatórios." });

  try {
    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");
    const users = db.collection("ColecaoDeUsuarios");

    // 1️⃣ busca o token de recuperação
    const token = await tokens.findOne({ tokenRecuperacao });

    if (!token)
      return res.status(400).json({ error: "Token inválido." });
    if (token.tokenUsado)
      return res.status(400).json({ error: "Token já utilizado." });
    if (new Date(token.DataEHoraExpiracao) < new Date())
      return res.status(400).json({ error: "Token expirado." });

    const email = token.email;

    // 2️⃣ criptografa a nova senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // 3️⃣ atualiza a senha do usuário correto
    const result = await users.updateOne(
      { email },
      { $set: { senha: senhaCriptografada, atualizadoEm: new Date() } }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Usuário não encontrado." });

    // 4️⃣ invalida o token de recuperação
    await tokens.updateOne({ _id: token._id }, { $set: { tokenUsado: true } });

    console.log("🔐 Senha redefinida para:", email);
    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em recover/complete:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
