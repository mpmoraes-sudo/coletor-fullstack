import { getDb } from "./_db.js";
import { sendCodeEmail } from "./_email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório" });
    const db = await getDb();
    const users = db.collection("ColecaoDeUsuarios");
    const tokens = db.collection("ColecaoDeTokensTemporarios");

    const exists = await users.findOne({ email });
    if (exists) return res.status(409).json({ error: "Este e-mail já está cadastrado" });

    const code = Math.floor(10000 + Math.random() * 90000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await tokens.insertOne({ email, codigoDoCliente: code, DataEHoraExpiracao: expiresAt, tokenUsado: false });

    await sendCodeEmail({ to: email, code, expiresAt });

    return res.json({ success: true, message: "Código enviado" });
  } catch (e) {
    console.error("signup/start error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
}
