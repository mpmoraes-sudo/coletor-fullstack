import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const { tokenDeSessao } = req.body || {};
  if (!tokenDeSessao)
    return res.status(400).json({ error: "Token ausente." });

  try {
    const db = await getDb();
    const sessoes = db.collection("ColecaoDeSessoes");

    const sessao = await sessoes.findOne({ tokenDeSessao });
    if (!sessao)
      return res.status(401).json({ error: "Sessão não encontrada." });

    const agora = new Date();
    if (new Date(sessao.dataEHoraDeExpiracao) < agora) {
      await sessoes.deleteOne({ _id: sessao._id });
      return res.status(401).json({ error: "Sessão expirada." });
    }

    return res.json({ success: true, email: sessao.email });
  } catch (err) {
    console.error("Erro em session/verify:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
