import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { emailUsuario } = req.body || {};
  if (!emailUsuario)
    return res.status(400).json({ error: "E-mail é obrigatório." });

  try {
    const db = await getDb();
    const projetos = await db
      .collection("ColecaoDeProjetos")
      .find({ "membros.email": emailUsuario })
      .toArray();

    return res.json(projetos);
  } catch (err) {
    console.error("Erro em projetos/listar:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
