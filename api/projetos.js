import { ObjectId } from "mongodb";
import { getDb } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE" && req.method !== "PUT")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const db = await getDb();
    const colecao = db.collection("ColecaoDeProjetos");

    // corpo da requisição
    const { acao, emailUsuario, nome, membros, idProjeto, atualizacoes } = req.body || {};

    // ========== LISTAR ==========
    if (acao === "listar") {
      if (!emailUsuario) return res.status(400).json({ error: "E-mail é obrigatório." });

      const projetos = await colecao
        .find({ "membros.email": emailUsuario })
        .toArray();

      return res.json(projetos);
    }

    // ========== CRIAR ==========
    if (acao === "criar") {
      if (!nome || !membros)
        return res.status(400).json({ error: "Nome e membros são obrigatórios." });

      await colecao.insertOne({
        nome,
        membros,
        templates: [],
        criadoEm: new Date()
      });

      console.log(`📦 Projeto criado: ${nome}`);
      return res.json({ success: true, message: "Projeto criado com sucesso." });
    }

    // ========== EXCLUIR ==========
    if (acao === "excluir") {
      if (!idProjeto || !emailUsuario)
        return res.status(400).json({ error: "ID do projeto e e-mail são obrigatórios." });

      const projeto = await colecao.findOne({
        _id: new ObjectId(idProjeto),
        "membros.email": emailUsuario
      });

      if (!projeto)
        return res.status(404).json({ error: "Projeto não encontrado." });

      const membro = projeto.membros.find(m => m.email === emailUsuario);
      if (membro.permissao !== "editor")
        return res.status(403).json({ error: "Apenas editores podem excluir o projeto." });

      await colecao.deleteOne({ _id: new ObjectId(idProjeto) });
      console.log(`🗑️ Projeto excluído: ${projeto.nome} (${idProjeto}) por ${emailUsuario}`);

      return res.json({ success: true, message: "Projeto excluído com sucesso." });
    }

    // ========== EDITAR ==========
    if (acao === "editar") {
      if (!idProjeto || !emailUsuario || !atualizacoes)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await colecao.findOne({
        _id: new ObjectId(idProjeto),
        "membros.email": emailUsuario
      });

      if (!projeto)
        return res.status(404).json({ error: "Projeto não encontrado." });

      const membro = projeto.membros.find(m => m.email === emailUsuario);
      if (membro.permissao !== "editor")
        return res.status(403).json({ error: "Apenas editores podem editar o projeto." });

      await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        { $set: { ...atualizacoes, atualizadoEm: new Date() } }
      );

      console.log(`✏️ Projeto atualizado: ${idProjeto} por ${emailUsuario}`);
      return res.json({ success: true, message: "Projeto atualizado com sucesso." });
    }

    // nenhuma ação reconhecida
    return res.status(400).json({ error: "Ação inválida." });

  } catch (err) {
    console.error("Erro em /api/projetos:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
