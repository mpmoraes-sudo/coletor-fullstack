import { ObjectId } from "mongodb";
import { getDb } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE")
    return res.status(405).json({ error: "Método não permitido" });

  const { idProjeto, emailUsuario } = req.body || {};
  if (!idProjeto || !emailUsuario)
    return res.status(400).json({ error: "ID do projeto e e-mail são obrigatórios." });

  try {
    const db = await getDb();
    const colecao = db.collection("ColecaoDeProjetos");

    // verifica se o usuário é editor no projeto
    const projeto = await colecao.findOne({
      _id: new ObjectId(idProjeto),
      "membros.email": emailUsuario
    });

    if (!projeto)
      return res.status(404).json({ error: "Projeto não encontrado." });

    const membro = projeto.membros.find(m => m.email === emailUsuario);
    if (membro.permissao !== "editor")
      return res.status(403).json({ error: "Apenas editores podem excluir o projeto." });

    // remove o projeto
    await colecao.deleteOne({ _id: new ObjectId(idProjeto) });

    console.log(`🗑️ Projeto excluído: ${projeto.nome} (${idProjeto}) por ${emailUsuario}`);

    return res.json({ success: true, message: "Projeto excluído com sucesso." });
  } catch (err) {
    console.error("Erro em projetos/excluir:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
