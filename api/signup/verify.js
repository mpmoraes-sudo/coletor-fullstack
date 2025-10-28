import { getDb } from "./_db.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: "E-mail e código são obrigatórios" });
    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");

    const reg = await tokens.findOne({ email, codigoDoCliente: parseInt(code, 10), tokenUsado: false });
    if (!reg) return res.status(400).json({ error: "Código inválido" });
    if (new Date(reg.DataEHoraExpiracao) < new Date()) return res.status(400).json({ error: "Código expirado" });

    await tokens.updateOne({ _id: reg._id }, { $set: { tokenUsado: true } });

    const jwtSecret = process.env.JWT_SECRET || "dev-secret";
    const signupToken = jwt.sign({ email, type: "signup" }, jwtSecret, { expiresIn: "10m" });

    return res.json({ success: true, signupToken });
  } catch (e) {
    console.error("signup/verify error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
}
