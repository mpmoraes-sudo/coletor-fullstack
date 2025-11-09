import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { nome, membros } = req.body || {};
  if (!nome || !membros)
    return res.status(400).json({ error: "Nome e membros são obrigatórios." });

  try {
    const db = await getDb();
    await db.collection("ColecaoDeProjetos").insertOne({
      nome,
      membros,
      templates: [],
      criadoEm: new Date()
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Erro em projetos/criar:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
