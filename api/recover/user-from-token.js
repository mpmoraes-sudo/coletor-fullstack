import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Método não permitido" });

  const tokenRecuperacao = req.query.token;
  if (!tokenRecuperacao)
    return res.status(400).json({ error: "Token é obrigatório" });

  try {
    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");
    const users = db.collection("ColecaoDeUsuarios");

    const token = await tokens.findOne({ tokenRecuperacao });
    if (!token)
      return res.status(404).json({ error: "Token inválido" });

    const user = await users.findOne({ email: token.email });
    if (!user)
      return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json({
      success: true,
      email: token.email,
      nome: user.nome || ""
    });
  } catch (err) {
    console.error("Erro em recover/user-from-token:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
