import { getDb } from "./_db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");
    const sessions = db.collection("ColecaoDeSessoes");

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuário não cadastrado" });

    const ok = await bcrypt.compare(String(senha), user.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta" });

    const tokenDeSessao = crypto.randomBytes(16).toString("hex");
    const dataEHoraDeLogin = new Date();
    const dataEHoraDeExpiracao = new Date(dataEHoraDeLogin.getTime() + 16 * 60 * 60 * 1000);

    await sessions.insertOne({ tokenDeSessao, dataEHoraDeLogin, dataEHoraDeExpiracao, email });

    return res.json({ success: true, tokenDeSessao, expiraEm: dataEHoraDeExpiracao });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
}
