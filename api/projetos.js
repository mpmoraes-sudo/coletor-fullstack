import { ObjectId } from "mongodb";
import { getDb } from "./_db.js";
//novo finaleira
import { enviarEmail } from "./_email.js";


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
    templateId,          // identificador do template
    secaoId,
    itemId,
    campo,
    valor,
    opcoes,
    itens,
    secoes,
    tipo
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
      // nome: string, membros: array
      if (!nome || !Array.isArray(membros)) {
        return res
          .status(400)
          .json({ error: "Nome e membros são obrigatórios." });
      }

      await colecao.insertOne({
        nome,
        membros,              // [{ email, permissao, conviteAceito }]
        templates: [],
        criadoEm: new Date()
      });

      return res.json({
        success: true,
        message: "Projeto criado com sucesso."
      });
    }
    // NOVOOOOOOOOOO FINALEIRA

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
    //AQUI COMÇEA O COLADO
    // ========== OBTER TEMPLATE (para edição) ==========
    if (acao === "obterTemplate") {
      if (!idProjeto || !templateId || !emailUsuario) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem editar templates." });
      }

      const template = (projeto.templates || []).find(
        t => String(t._id) === String(templateId)
      );
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado neste projeto." });
      }

      return res.json({
        success: true,
        projeto: { _id: projeto._id, nome: projeto.nome },
        template
      });
    }

    // ========== CRIAR SEÇÃO ==========
    if (acao === "criarSecao") {
      if (!idProjeto || !templateId || !emailUsuario) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem criar seções." });
      }

      const novaSecao = {
        idSecao: "s" + Date.now(),
        titulo: "Clique para renomear o titulo",
        itens: []
      };

      const result = await colecao.updateOne(
        { _id: projeto._id, "templates._id": new ObjectId(templateId) },
        {
          $push: { "templates.$.secoes": novaSecao },
          $set: { atualizadoEm: new Date() }
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao adicionar seção." });
      }

      return res.json({ success: true, secao: novaSecao });
    }

    // ========== SET CAMPO DA SEÇÃO (ex.: título) ==========
    if (acao === "setCampoSecao") {
      if (!idProjeto || !templateId || !secaoId || !campo) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem editar seções." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $set: {
            [`templates.$[t].secoes.$[s].${campo}`]: valor,
            atualizadoEm: new Date()
          }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId }
          ]
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao atualizar seção." });
      }

      return res.json({ success: true });
    }

    // ========== ADICIONAR ITEM INICIAL ==========
    if (acao === "adicionarItemInicial") {
      if (!idProjeto || !templateId || !secaoId || !tipo) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem adicionar itens." });
      }

      const novoItem = { idItem: "i" + Date.now(), tipo, obrigatorio: false };
      if (tipo === "textoFixo") novoItem.conteudo = "";
      else if (tipo === "perguntaSubjetiva") novoItem.pergunta = "";
      else {
        novoItem.pergunta = "";
        novoItem.opcoes = [];
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $push: { "templates.$[t].secoes.$[s].itens": novoItem },
          $set: { atualizadoEm: new Date() }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId }
          ]
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao adicionar item." });
      }

      return res.json({ success: true, item: novoItem });
    }

    // ========== SET CAMPO DO ITEM ==========
    if (acao === "setCampoItem") {
      if (!idProjeto || !templateId || !secaoId || !itemId || !campo) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem editar itens." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $set: {
            [`templates.$[t].secoes.$[s].itens.$[i].${campo}`]: valor,
            atualizadoEm: new Date()
          }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId },
            { "i.idItem": itemId }
          ]
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao atualizar item." });
      }

      return res.json({ success: true });
    }

    // ========== SALVAR OPÇÕES (itens categóricos/múltiplos) ==========
    if (acao === "salvarOpcoes") {
      if (!idProjeto || !templateId || !secaoId || !itemId) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }
    
      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });
    
      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem editar opções." });
      }
    
      // 🚫 não limpamos mais as opções vazias automaticamente
      const novasOpcoes = Array.isArray(opcoes) ? opcoes : [];
    
      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $set: {
            "templates.$[t].secoes.$[s].itens.$[i].opcoes": novasOpcoes,
            atualizadoEm: new Date()
          }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId },
            { "i.idItem": itemId }
          ]
        }
      );
    
      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao salvar opções." });
      }
    
      return res.json({ success: true });
    }

  
    // ========== DELETAR ITEM ==========
    if (acao === "deletarItem") {
      if (!idProjeto || !templateId || !secaoId || !itemId || !emailUsuario) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }
    
      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });
    
      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem remover itens." });
      }
    
      // acha o template dentro do projeto
      const idxTemplate = (projeto.templates || []).findIndex(
        t => String(t._id) === String(templateId)
      );
      if (idxTemplate === -1) {
        return res.status(404).json({ error: "Template não encontrado neste projeto." });
      }
    
      const template = projeto.templates[idxTemplate];
    
      // acha a seção dentro do template
      const idxSecao = (template.secoes || []).findIndex(
        s => s.idSecao === secaoId
      );
      if (idxSecao === -1) {
        return res.status(404).json({ error: "Seção não encontrada." });
      }
    
      const secao = template.secoes[idxSecao];
      const antes = (secao.itens || []).length;
    
      secao.itens = (secao.itens || []).filter(
        it => String(it.idItem) !== String(itemId)
      );
    
      if (secao.itens.length === antes) {
        return res.status(404).json({ error: "Item não encontrado." });
      }
    
      // salva de volta no array de templates
      template.secoes[idxSecao] = secao;
      projeto.templates[idxTemplate] = template;
    
      const result = await colecao.updateOne(
        { _id: projeto._id },
        {
          $set: {
            templates: projeto.templates,
            atualizadoEm: new Date()
          }
        }
      );
    
      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao remover item." });
      }
    
      return res.json({ success: true, message: "Item removido com sucesso." });
    }


    // ========== ATUALIZAR ORDEM DOS ITENS DE UMA SEÇÃO ==========
    if (acao === "atualizarOrdemItens") {
      if (!idProjeto || !templateId || !secaoId || !Array.isArray(itens)) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem reordenar itens." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $set: {
            "templates.$[t].secoes.$[s].itens": itens,
            atualizadoEm: new Date()
          }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId }
          ]
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao reordenar itens." });
      }

      return res.json({ success: true });
    }

    // ========== SET OBRIGATORIEDADE DO ITEM ==========
    if (acao === "setObrigatorioItem") {
      if (!idProjeto || !templateId || !secaoId || !itemId) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem alterar obrigatoriedade." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto) },
        {
          $set: {
            "templates.$[t].secoes.$[s].itens.$[i].obrigatorio": Boolean(valor),
            atualizadoEm: new Date()
          }
        },
        {
          arrayFilters: [
            { "t._id": new ObjectId(templateId) },
            { "s.idSecao": secaoId },
            { "i.idItem": itemId }
          ]
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao atualizar obrigatoriedade." });
      }

      return res.json({ success: true });
    }

    // ========== DELETAR SEÇÃO ==========
    if (acao === "deletarSecao") {
      if (!idProjeto || !templateId || !secaoId) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem remover seções." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto), "templates._id": new ObjectId(templateId) },
        {
          $pull: { "templates.$.secoes": { idSecao: secaoId } },
          $set: { atualizadoEm: new Date() }
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao remover seção." });
      }

      return res.json({ success: true });
    }

    // ========== ATUALIZAR ORDEM DAS SEÇÕES ==========
    if (acao === "atualizarOrdemSecoes") {
      if (!idProjeto || !templateId || !Array.isArray(secoes)) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos." });
      }

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem reordenar seções." });
      }

      const result = await colecao.updateOne(
        { _id: new ObjectId(idProjeto), "templates._id": new ObjectId(templateId) },
        {
          $set: {
            "templates.$.secoes": secoes,
            atualizadoEm: new Date()
          }
        }
      );

      if (!result.acknowledged || result.matchedCount === 0) {
        return res.status(500).json({ error: "Falha ao reordenar seções." });
      }

      return res.json({ success: true });
    }
// AQUI TERMINA O COLADO ---------------------------------------------------------------------
    

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
      //finaleira

            // após atualizar o projeto com sucesso, envia e-mail de convite
      const permissaoLabel =
        novoMembro.permissao === "editor"
          ? "Editor(a)"
          : novoMembro.permissao === "leitor"
          ? "Leitor(a)"
          : novoMembro.permissao;

      const assunto = `Convite para participar do projeto "${projeto.nome}"`;

      const mensagemHTML = `
        <p>Olá,</p>
        <p>Você está sendo convidado(a) para participar do projeto
        <strong>${projeto.nome}</strong> na Ferramenta para Gestão de Templates Digitais.</p>
        <p>Permissão sugerida: <strong>${permissaoLabel}</strong>.</p>
        <p>Se você ainda não possui cadastro, poderá criá-lo ao acessar a ferramenta.</p>
        <p>Atenciosamente,<br/>Ferramenta para Gestão de Templates Digitais</p>
      `;

      enviarEmail(novoMembro.email, assunto, mensagemHTML, emailUsuario).catch((err) => {
        console.error("Erro ao enviar e-mail de convite (convidar):", err);
      });

      return res.json({ success: true, message: "Convite registrado." });

      //finaleira
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

    // ========== CRIAR TEMPLATE ==========
    if (acao === "criarTemplate") {
      if (!idProjeto || !emailUsuario || !nome)
        return res.status(400).json({ error: "idProjeto, emailUsuario e nome são obrigatórios." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem criar templates." });
      }

      const agora = new Date();
      const novoTemplate = {
        _id: new ObjectId(),
        nome,
        criadoEm: agora,
        atualizadoEm: agora
      };

      if (!Array.isArray(projeto.templates)) {
        projeto.templates = [];
      }
      projeto.templates.push(novoTemplate);

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { templates: projeto.templates, atualizadoEm: new Date() } }
      );

      return res.json({
        success: true,
        message: "Template criado com sucesso.",
        template: novoTemplate
      });
    }

    // ========== EXCLUIR TEMPLATE ==========
    if (acao === "excluirTemplate") {
      if (!idProjeto || !emailUsuario || !templateId)
        return res.status(400).json({ error: "idProjeto, emailUsuario e templateId são obrigatórios." });

      const projeto = await getProjetoById(db, idProjeto);
      if (!projeto) return res.status(404).json({ error: "Projeto não encontrado." });

      const meu = projeto.membros.find(m => m.email === emailUsuario);
      if (!meu || meu.permissao !== "editor" || meu.conviteAceito !== true) {
        return res.status(403).json({ error: "Apenas editores podem excluir templates." });
      }

      const antes = Array.isArray(projeto.templates) ? projeto.templates.length : 0;
      projeto.templates = (projeto.templates || []).filter(
        t => String(t._id) !== String(templateId)
      );

      if (projeto.templates.length === antes) {
        return res.status(404).json({ error: "Template não encontrado." });
      }

      await colecao.updateOne(
        { _id: projeto._id },
        { $set: { templates: projeto.templates, atualizadoEm: new Date() } }
      );

      return res.json({ success: true, message: "Template excluído com sucesso." });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (err) {
    console.error("Erro em /api/projetos:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
