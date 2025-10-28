import { getDb } from "./_db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { signupToken, nome, senha, dataNascimento } = req.body || {};
    if (!signupToken || !nome || !senha || !dataNascimento) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    const jwtSecret = process.env.JWT_SECRET || "dev-secret";
    let decoded;
    try {
      decoded = jwt.verify(signupToken, jwtSecret);
    } catch {
      return res.status(401).json({ error: "Token inválido/expirado" });
    }
    if (decoded.type !== "signup") return res.status(401).json({ error: "Token inválido" });
    const email = decoded.email;

    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");

    const exists = await users.findOne({ email });
    if (exists) return res.status(409).json({ error: "E-mail já cadastrado" });

    if (String(senha).length < 6) return res.status(400).json({ error: "Senha muito curta" });

    const hash = await bcrypt.hash(String(senha), 10);
    await users.insertOne({ email, nome, senha: hash, dataNascimento });

    return res.json({ success: true });
  } catch (e) {
    console.error("signup/complete error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
}
