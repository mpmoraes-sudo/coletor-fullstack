import bcrypt from "bcryptjs";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { email, senha, dataNascimento } = req.body || {};
  if (!email || !senha || !dataNascimento)
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });

  try {
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");

    const user = await users.findOne({ email });
    if (!user)
      return res.status(404).json({ error: "Usuário não encontrado" });

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await users.updateOne(
      { email },
      { $set: { senha: senhaCriptografada, atualizadoEm: new Date() } }
    );

    console.log("🔐 Senha redefinida para:", email);
    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em recover/complete:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
