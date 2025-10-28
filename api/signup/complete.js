import bcrypt from "bcryptjs";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { email, nome, senha, dataNascimento } = req.body;
  if (!email || !nome || !senha || !dataNascimento)
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });

  try {
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");

    const existe = await users.findOne({ email });
    if (existe)
      return res.status(409).json({ error: "Usuário já cadastrado" });

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await users.insertOne({
      email,
      nome,
      senha: senhaCriptografada,
      dataNascimento,
      criadoEm: new Date()
    });

    return res.json({ success: true, message: "Usuário cadastrado com sucesso" });
  } catch (err) {
    console.error("Erro em signup/complete:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
