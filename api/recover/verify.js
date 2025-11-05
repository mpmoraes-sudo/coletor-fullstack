import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { email, codigo } = req.body || {};
  if (!email || !codigo)
    return res.status(400).json({ error: "E-mail e código são obrigatórios" });

  try {
    const db = await getDb();
    const tokens = db.collection("ColecaoDeTokensTemporarios");

    const token = await tokens.findOne({
      email,
      codigoDoCliente: parseInt(codigo)
    });

    if (!token)
      return res.status(400).json({ error: "Código inválido" });
    if (token.tokenUsado)
      return res.status(400).json({ error: "Código já utilizado" });
    if (new Date(token.DataEHoraExpiracao) < new Date())
      return res.status(400).json({ error: "Código expirado" });

    await tokens.updateOne({ _id: token._id }, { $set: { tokenUsado: true } });

    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em recover/verify:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
