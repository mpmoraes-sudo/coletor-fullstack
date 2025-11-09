import { getDb } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido." });

  const { acao, emails } = req.body || {};
  const db = await getDb();
  const usuarios = db.collection("ColecaoDeUsuarios");

  try {
    if (acao === "validarEmails") {
      if (!Array.isArray(emails) || emails.length === 0)
        return res.status(400).json({ error: "Lista de e-mails inválida." });

      const encontrados = await usuarios
        .find({ email: { $in: emails }, jaCadastrado: true })
        .project({ email: 1, _id: 0 })
        .toArray();

      return res.json({ success: true, encontrados });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("Erro em /api/usuarios:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
