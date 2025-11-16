// gerenciarTemplates.js
// Usa a mesma arquitetura de sessão e API do gerenciarProjetos.js.
// Endpoints esperados em /api/projetos:
//   - acao: "listar"          { emailUsuario }
//   - acao: "criarTemplate"   { idProjeto, emailUsuario, nome }
//   - acao: "excluirTemplate" { idProjeto, emailUsuario, templateId }

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#tabelaProjetos tbody");
  const usuarioLogado = document.getElementById("usuarioLogado");
  const botaoLogout = document.getElementById("botaoLogout");
  const botaoHome = document.getElementById("botaoHome");
  const container = document.querySelector(".container");

  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    window.location.href = "./index.html";
    return;
  }

  // ===== Validação de sessão via API =====
  let emailUsuario;
  try {
    const vr = await fetch("/api/session/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenDeSessao: token })
    });
    const vdata = await vr.json();
    if (!vr.ok || !vdata.success) {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "./index.html";
      return;
    }
    emailUsuario = vdata.email;
  } catch (err) {
    console.error("Erro ao validar sessão:", err);
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "./index.html";
    return;
  }

  // Atualiza header e mostra conteúdo
  usuarioLogado.textContent = `Logado como: ${emailUsuario}`;
  if (container) {
    container.classList.remove("escondido");
  }

  // ===== Navegação =====
  botaoLogout?.addEventListener("click", () => {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "./index.html";
  });

  botaoHome?.addEventListener("click", () => {
    // Mesma rota usada em gerenciarProjetos2.js
    window.location.href = "SelecaoDeModulos.html";
  });

  // ===== Lista de projetos em que o usuário é editor =====
  let projetos = [];

  async function carregarProjetos() {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="3">Carregando projetos...</td></tr>`;

    try {
      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "listar", emailUsuario })
      });
      const data = await r.json();

      if (!r.ok) {
        console.error("Resposta inválida ao listar projetos:", data);
        tbody.innerHTML = `<tr><td colspan="3">Erro ao carregar seus projetos.</td></tr>`;
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">Nenhum projeto encontrado.</td></tr>`;
        return;
      }

      // Apenas projetos onde o usuário é editor (e conviteAceito !== false)
      projetos = data.filter((p) => {
        const meu = (p.membros || []).find((m) => m.email === emailUsuario);
        return meu && meu.permissao === "editor" && meu.conviteAceito !== false;
      });

      if (projetos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">Você ainda não é editor de nenhum projeto.</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      projetos.forEach((p) => adicionarLinhaProjeto(p));
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
      tbody.innerHTML = `<tr><td colspan="3">Erro ao carregar seus projetos.</td></tr>`;
    }
  }

  function adicionarLinhaProjeto(projeto) {
    const tr = document.createElement("tr");
    tr.classList.add("linha-projeto");
    tr.innerHTML = `
      <td class="icone-expandir" style="width:28px;text-align:center;">▶</td>
      <td class="celula-nome-projeto">${projeto.nome}</td>
    `;
    tbody.appendChild(tr);
  
    const icone = tr.querySelector(".icone-expandir");
  
    // Função que faz o abre/fecha (mesma lógica que você já tinha)
    async function toggleExpandir() {
      const jaTemSub =
        tr.nextElementSibling &&
        tr.nextElementSibling.classList.contains("linha-templates");
  
      // se já existe a sublinha, só alterna mostrar/esconder
      if (jaTemSub) {
        const sub = tr.nextElementSibling;
        const mostrando = sub.style.display !== "none";
        sub.style.display = mostrando ? "none" : "table-row";
        icone.textContent = mostrando ? "▶" : "▼";
        return;
      }
  
      // cria a sublinha
      const trTemplates = document.createElement("tr");
      trTemplates.classList.add("linha-templates");
      const td = document.createElement("td");
      td.colSpan = 2; // temos 2 colunas: seta + nome do projeto
      td.innerHTML = `<div style="padding:8px 4px;">Carregando templates...</div>`;
      trTemplates.appendChild(td);
      tr.insertAdjacentElement("afterend", trTemplates);
      icone.textContent = "▼";
  
      await renderSublistaTemplates(td, projeto);
    }
  
    // Clicar na SETA: expande/colapsa sem propagar pra linha
    icone.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleExpandir();
    });
  
    // Clicar em qualquer lugar da linha do projeto: também expande/colapsa
    tr.addEventListener("click", (e) => {
      // Se no futuro tiver link/botão dentro da linha principal, não queremos
      // quebrar o comportamento desses elementos
      if (e.target.closest("a, button")) return;
      toggleExpandir();
    });
  }


  // ===== Chamada de API para criar template =====
  async function criarTemplate(projeto, nome) {
    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "criarTemplate",
        idProjeto: projeto._id,
        emailUsuario,
        nome
      })
    });
    const data = await r.json();
    if (!r.ok || !data.success) {
      throw new Error(data.error || "Erro ao criar template.");
    }

    // Atualiza localmente a lista de templates
    const novoTemplate =
      data.template ||
      {
        _id: data.idTemplate || data.insertedId || String(Date.now()),
        nome
      };

    if (!Array.isArray(projeto.templates)) {
      projeto.templates = [];
    }
    projeto.templates.push(novoTemplate);
  }

  // ===== Chamada de API para excluir template =====
  async function deletarTemplate(projeto, templateId) {
    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "excluirTemplate",
        idProjeto: projeto._id,
        emailUsuario,
        templateId
      })
    });
    const data = await r.json();
    if (!r.ok || !data.success) {
      throw new Error(data.error || "Erro ao excluir template.");
    }

    projeto.templates = (projeto.templates || []).filter(
      (t) => String(t._id) !== String(templateId)
    );
  }

  // ===== Renderização da sublista de templates de um projeto =====
  async function renderSublistaTemplates(containerTd, projeto) {
    let templates = Array.isArray(projeto.templates) ? projeto.templates : [];

    function renderLista(target, lista) {
      if (!lista || lista.length === 0) {
        target.innerHTML = `<div style="padding:4px 0;">Nenhum template encontrado.</div>`;
        return;
      }

      target.innerHTML = `
        <ul class="lista-templates" style="padding-left:18px; list-style:none; margin:0;">
          ${lista
            .map(
              (t) => `
            <li data-tid="${t._id}" style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 0;">
              <span style="flex:1;">${t.nome}</span>

              <span style="display:flex; gap:8px; align-items:center;">
                <!-- Link Editar: vai para editarTemplate.html com projetoId e templateId -->
                <a href="editarTemplate.html?projetoId=${encodeURIComponent(
                  String(projeto._id)
                )}&templateId=${encodeURIComponent(String(t._id))}"
                   class="link-editar" title="Editar template" style="text-decoration:none;">✎</a>

                <!-- Link Excluir: ação via JS -->
                <a href="#" class="link-excluir" data-tid="${encodeURIComponent(
                  String(t._id)
                )}" title="Excluir template" style="color:red; text-decoration:none;">🗑️</a>
              </span>
            </li>
          `
            )
            .join("")}
        </ul>
      `;

      // Eventos de exclusão
      target.querySelectorAll(".link-excluir").forEach((link) => {
        link.addEventListener("click", async (e) => {
          e.preventDefault();
          const tid = decodeURIComponent(link.dataset.tid);
          if (!confirm("Tem certeza que deseja excluir este template?")) return;

          try {
            await deletarTemplate(projeto, tid);
            templates = projeto.templates || [];
            renderLista(target, templates);
          } catch (err) {
            console.error("Erro ao excluir template:", err);
            alert("Não foi possível excluir o template.");
          }
        });
      });
    }

    // Monta HTML da área de templates + formulário de criação
    containerTd.innerHTML = `
      <div class="area-templates" style="padding:8px 4px; display:flex; flex-direction:column; gap:10px;">
        <div class="bloco-lista"></div>

        <div class="novo-template" style="display:flex; gap:8px; align-items:center;">
          <input type="text" class="input-novo-template" placeholder="Nome do template"
                 style="flex:1; padding:8px; border:1px solid #c8e6c9; border-radius:6px;">
          <button class="btn-criar-template botaoPadrao">+ Criar template</button>
        </div>
      </div>
    `;

    const blocoLista = containerTd.querySelector(".bloco-lista");
    const btn = containerTd.querySelector(".btn-criar-template");
    const input = containerTd.querySelector(".input-novo-template");

    // Render inicial
    renderLista(blocoLista, templates);

    // Criação de novo template
    btn.addEventListener("click", async () => {
      const nome = input.value.trim();
      if (!nome) {
        alert("Informe um nome para o template.");
        input.focus();
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "Criando...";
        await criarTemplate(projeto, nome);
        input.value = "";
        templates = projeto.templates || [];
        renderLista(blocoLista, templates);
      } catch (err) {
        console.error("Erro ao criar template:", err);
        alert("Não foi possível criar o template.");
      } finally {
        btn.disabled = false;
        btn.textContent = "+ Criar template";
      }
    });
  }

  // Inicializa listagem
  await carregarProjetos();
});
