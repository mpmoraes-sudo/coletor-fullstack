import { ObjectId } from "mongodb";
import { getDb } from "./_db.js";

async function getProjetoById(db, idProjeto) {
  return db.collection("ColecaoDeProjetos").findOne({ _id: new ObjectId(idProjeto) });
}

function contaEditoresAtivos(membros) {
  return membros.filter(m => m.permissao === "editor" && m.conviteAceito === true).length;
}

export default async function handler(req, res) {
  // vamos usar sempre POST para reduzir funções na Vercel
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const db = await getDb();
  const colecao = db.collection("ColecaoDeProjetos");
  const {
    acao,
    emailUsuario,
    nome,
    membros,
    idProjeto,
    atualizacoes,
    novoMembro,          // { email, permissao }
    alterarMembro,       // { email, permissao }
  } = req.body || {};

  try {
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
      if (!nome || !Array.isArray(membros))
        return res.status(400).json({ error: "Nome e membros são obrigatórios." });

      await colecao.insertOne({
        nome,
        membros,              // espere objetos { email, permissao, conviteAceito: true/false }
        templates: [],
        criadoEm: new Date()
      });

      return res.json({ success: true, message: "Projeto criado com sucesso." });
    }

    // ========== EXCLUIR ==========
    if (acao === "excluir") {
      if (!idProjeto || !emailUsuario)
        return res.status(400).json({ error: "ID do projeto e e-mail são obrigatórios." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu) return res.status(403).json({ error: "Você não é membro deste projeto." });
      if (meu.permissao !== "editor" || meu.conviteAceito !== true)
        return res.status(403).json({ error: "Apenas editores podem excluir o projeto." });

      await colecao.deleteOne({ _id: new ObjectId(idProjeto) });
      return res.json({ success: true, message: "Projeto excluído com sucesso." });
    }

    // ========== CONVIDAR NOVO MEMBRO ==========
    if (acao === "convidar") {
      if (!idProjeto || !emailUsuario || !novoMembro?.email || !novoMembro?.permissao)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true)
        return res.status(403).json({ error: "Apenas editores podem convidar." });

      if (projeto.membros.some(m => m.email === novoMembro.email))
        return res.status(400).json({ error: "Este e-mail já está no projeto (convite ou membro)." });

      projeto.membros.push({
        email: novoMembro.email,
        permissao: novoMembro.permissao, // "editor" ou "leitor"
        conviteAceito: false              // mostrado como "convidado como X"
      });

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Convite registrado." });
    }

    // ========== ACEITAR CONVITE ==========
    if (acao === "aceitarConvite") {
      if (!idProjeto || !emailUsuario)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const idx = projeto.membros.findIndex(m => m.email === emailUsuario);
      if (idx === -1) return res.status(404).json({ error: "Convite não encontrado." });

      if (projeto.membros[idx].conviteAceito === true)
        return res.status(400).json({ error: "Convite já aceito." });

      projeto.membros[idx].conviteAceito = true;

      // garantir que, ao aceitar como editor, o projeto tenha ao menos 1 editor (ok)
      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Convite aceito." });
    }

    // ========== RECUSAR CONVITE ==========
    if (acao === "recusarConvite") {
      if (!idProjeto || !emailUsuario)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const antes = projeto.membros.length;
      projeto.membros = projeto.membros.filter(m =>
        !(m.email === emailUsuario && m.conviteAceito === false)
      );

      if (projeto.membros.length === antes)
        return res.status(404).json({ error: "Convite não localizado." });

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Convite recusado." });
    }

    // ========== AUTO-REMOVER-SE DO PROJETO ==========
    if (acao === "autoRemover") {
      if (!idProjeto || !emailUsuario)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu) return res.status(404).json({ error: "Você não é membro deste projeto." });

      // se eu for o ÚNICO editor ativo, não posso sair
      if (meu.permissao === "editor" && meu.conviteAceito === true) {
        const editores = contaEditoresAtivos(projeto.membros);
        if (editores <= 1) {
          return res.status(403).json({
            error: "Você é o único editor. Nomeie outro editor ou exclua o projeto."
          });
        }
      }

      projeto.membros = projeto.membros.filter(m => m.email !== emailUsuario);

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Você saiu do projeto." });
    }

    // ========== ALTERAR PERMISSÃO DE UM MEMBRO ==========
    if (acao === "alterarPermissao") {
      if (!idProjeto || !emailUsuario || !alterarMembro?.email || !alterarMembro?.permissao)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true)
        return res.status(403).json({ error: "Apenas editores podem alterar permissões." });

      const target = projeto.membros.find(m => m.email === alterarMembro.email);
      if (!target) return res.status(404).json({ error: "Membro não encontrado." });

      // não permitir alterar alguém que ainda não aceitou
      if (target.conviteAceito === false)
        return res.status(400).json({ error: "Este membro ainda não aceitou o convite." });

      const permissaoAnterior = target.permissao;
      target.permissao = alterarMembro.permissao;

      // trava: não pode resultar em 0 editores ativos
      if (contaEditoresAtivos(projeto.membros) === 0) {
        // reverte
        target.permissao = permissaoAnterior;
        return res.status(403).json({ error: "O projeto deve ter pelo menos um editor." });
      }

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Permissão atualizada." });
    }

    // ========== REMOVER MEMBRO (por editor) ==========
    if (acao === "removerMembro") {
      if (!idProjeto || !emailUsuario || !alterarMembro?.email)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true)
        return res.status(403).json({ error: "Apenas editores podem remover membros." });

      const alvo = projeto.membros.find(m => m.email === alterarMembro.email);
      if (!alvo) return res.status(404).json({ error: "Membro não encontrado." });

      // trava: não remover o último editor ativo
      if (alvo.permissao === "editor" && alvo.conviteAceito === true) {
        const editores = contaEditoresAtivos(projeto.membros);
        if (editores <= 1) {
          return res.status(403).json({ error: "Não é possível remover o único editor." });
        }
      }

      projeto.membros = projeto.membros.filter(m => m.email !== alterarMembro.email);

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { membros: projeto.membros, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Membro removido." });
    }

    // ========== EDITAR CAMPOS GERAIS (nome etc.) ==========
    if (acao === "editar") {
      if (!idProjeto || !emailUsuario || !atualizacoes)
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true)
        return res.status(403).json({ error: "Apenas editores podem editar o projeto." });

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { ...atualizacoes, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Projeto atualizado." });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("Erro em /api/projetos:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
