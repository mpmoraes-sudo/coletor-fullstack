import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Método não permitido" });

  const email = req.query.email;
  if (!email)
    return res.status(400).json({ error: "E-mail é obrigatório" });

  try {
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");
    const user = await users.findOne({ email });

    if (!user)
      return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json({ success: true, nome: user.nome || "" });
  } catch (err) {
    console.error("Erro em recover/user:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
