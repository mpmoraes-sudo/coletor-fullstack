// ModuloDeUtilizacao.js
// Lista projetos em que o usuário é editor/leitor e permite escolher um template para uso

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    alert("Sessão não encontrada. Faça login novamente.");
    window.location.href = "../index.html";
    return;
  }

  let emailUsuario;

  try {
    // ===== Validação de sessão =====
    const vr = await fetch("/api/session/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenDeSessao: token })
    });
    const vdata = await vr.json();

    if (!vr.ok || !vdata.success) {
      alert("Sessão expirada. Faça login novamente.");
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
      return;
    }

    emailUsuario = vdata.email;

    // Header
    const usuarioLogadoEl = document.getElementById("usuarioLogado");
    if (usuarioLogadoEl) {
      usuarioLogadoEl.textContent = `Logado como: ${emailUsuario}`;
    }

    document.querySelector(".container")?.classList.remove("escondido");

    document.getElementById("botaoLogout")?.addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });

    document.getElementById("botaoHome")?.addEventListener("click", () => {
      window.location.href = "selecaoDeModulos.html";
    });

    // Carrega projetos para utilização
    await carregarProjetosParaUso(emailUsuario);
  } catch (erro) {
    console.error("Erro ao inicializar módulo de utilização:", erro);
    alert("Erro ao carregar dados. Faça login novamente.");
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  }
});

// Helper geral para /api/projetos
async function chamarApiProjetos(payload) {
  const resp = await fetch("/api/projetos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  if (!resp.ok || (data && data.error) || data?.success === false) {
    throw new Error(data.error || "Erro na API de projetos.");
  }
  return data;
}

// Lista projetos onde usuário é editor ou leitor (conviteAceito != false)
async function carregarProjetosParaUso(emailUsuario) {
  const projetos = await chamarApiProjetos({
    acao: "listar",
    emailUsuario
  });

  const projetosFiltrados = (projetos || []).filter((proj) =>
    Array.isArray(proj.membros) &&
    proj.membros.some(
      (m) =>
        m.email === emailUsuario &&
        (m.permissao === "editor" || m.permissao === "leitor") &&
        m.conviteAceito !== false // igual ao { $ne: false } do código antigo
    )
  );

  preencherTabela(projetosFiltrados);
}

function preencherTabela(projetos) {
  const tbody = document.querySelector("#tabelaProjetos tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!projetos || projetos.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "Nenhum projeto disponível para utilização de templates.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  projetos.forEach((projeto) => {
    adicionarLinhaProjeto(projeto, tbody);
  });
}

function adicionarLinhaProjeto(projeto, tbody) {
  const tr = document.createElement("tr");
  tr.classList.add("linha-projeto");
  tr.innerHTML = `
    <td class="icone-expandir" style="width:28px;text-align:center;">▶</td>
    <td class="celula-nome-projeto">${projeto.nome}</td>
  `;
  tbody.appendChild(tr);

  const icone = tr.querySelector(".icone-expandir");

  async function toggleExpandir() {
    const jaTemSub =
      tr.nextElementSibling &&
      tr.nextElementSibling.classList.contains("linha-templates");

    if (jaTemSub) {
      const sub = tr.nextElementSibling;
      const mostrando = sub.style.display !== "none";
      sub.style.display = mostrando ? "none" : "table-row";
      icone.textContent = mostrando ? "▶" : "▼";
      return;
    }

    const trTemplates = document.createElement("tr");
    trTemplates.classList.add("linha-templates");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.innerHTML = `<div style="padding:8px 4px;">Carregando templates...</div>`;
    trTemplates.appendChild(td);
    tr.insertAdjacentElement("afterend", trTemplates);
    icone.textContent = "▼";

    await renderSublistaTemplates(td, projeto);
  }

  if (icone) {
    icone.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleExpandir();
    });
  }

  // Clicar na linha toda também expande/colapsa
  tr.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return; // não atrapalhar cliques em links
    toggleExpandir();
  });
}

async function renderSublistaTemplates(containerTd, projeto) {
  const templates = projeto.templates || [];

  containerTd.innerHTML =
    `<div class="area-templates" style="padding:8px 4px;"><div class="bloco-lista"></div></div>`;
  const blocoLista = containerTd.querySelector(".bloco-lista");

  if (!templates.length) {
    blocoLista.innerHTML = `<div style="padding:4px 0;">Nenhum template disponível para uso.</div>`;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "lista-templates";
  ul.style.paddingLeft = "18px";
  ul.style.listStyle = "none";
  ul.style.margin = "0";

  templates.forEach((t) => {
    const li = document.createElement("li");
    li.dataset.tid = t._id;
    li.style.padding = "6px 0";

    const a = document.createElement("a");
    a.href = `utilizarTemplates.html?projetoId=${encodeURIComponent(
      String(projeto._id)
    )}&templateId=${encodeURIComponent(String(t._id))}`;
    a.className = "link-visualizar";
    a.title = "Utilizar template";
    a.textContent = `📄 ${t.nome}`;
    a.style.textDecoration = "none";

    li.appendChild(a);
    ul.appendChild(li);
  });

  blocoLista.appendChild(ul);
}
