document.addEventListener("DOMContentLoaded", async () => {
  const listaTemplates = document.getElementById("listaTemplates");
  const mensagem = document.getElementById("mensagemTemplates");
  const usuarioLogado = document.getElementById("usuarioLogado");
  const nomeProjetoEl = document.getElementById("nomeProjeto");
  const botaoNovoTemplate = document.getElementById("botaoNovoTemplate");
  const cardNovoTemplate = document.getElementById("cardNovoTemplate");
  const formNovoTemplate = document.getElementById("formNovoTemplate");

  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // ===== Verificar sessão =====
  const vr = await fetch("/api/session/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenDeSessao: token })
  });
  const vdata = await vr.json();

  if (!vr.ok || !vdata.success) {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
    return;
  }

  const emailUsuario = vdata.email;
  usuarioLogado.textContent = `Logado como: ${emailUsuario}`;

  // ===== Navegação =====
  document.getElementById("botaoHome").addEventListener("click", () => {
    window.location.href = "SelecaoDeModulos.html";
  });
  document.getElementById("botaoLogout").addEventListener("click", () => {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  });

  // ===== Obter ID do projeto pela URL =====
  const params = new URLSearchParams(window.location.search);
  const idProjeto = params.get("id");

  if (!idProjeto) {
    listaTemplates.innerHTML = "ID do projeto não informado.";
    return;
  }

  // ===== Carregar templates =====
  async function carregarTemplates() {
    listaTemplates.innerHTML = "Carregando...";

    try {
      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "getProjeto", idProjeto })
      });

      const projeto = await r.json();

      if (!r.ok || !projeto) {
        listaTemplates.innerHTML = "Erro ao carregar templates.";
        return;
      }

      nomeProjetoEl.textContent = `Projeto: ${projeto.nome}`;

      listaTemplates.innerHTML = "";

      if (!projeto.templates || projeto.templates.length === 0) {
        listaTemplates.textContent = "Nenhum template criado.";
        return;
      }

      projeto.templates.forEach((t) => criarCardTemplate(t));
    } catch (err) {
      listaTemplates.textContent = "Erro de conexão.";
      console.error(err);
    }
  }

  // ===== Criar card visual de cada template =====
  function criarCardTemplate(template) {
    const div = document.createElement("div");
    div.className = "template";

    const nome = document.createElement("div");
    nome.className = "template-nome";
    nome.textContent = template.nome;

    const acoes = document.createElement("div");
    acoes.className = "template-acoes";

    const btnEditar = document.createElement("button");
    btnEditar.className = "botaoPadrao";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => {
      window.location.href = `editarTemplate.html?idProjeto=${idProjeto}&idTemplate=${template._id}`;
    });

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "botaoPadrao";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", async () => {
      if (!confirm("Deseja excluir este template?")) return;

      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "excluirTemplate",
          idProjeto,
          idTemplate: template._id
        })
      });

      const data = await r.json();
      if (!r.ok || !data.success) {
        alert(data.error || "Erro ao excluir template.");
        return;
      }

      carregarTemplates();
    });

    acoes.append(btnEditar, btnExcluir);
    div.append(nome, acoes);
    listaTemplates.appendChild(div);
  }

  // ===== Mostrar/ocultar criação de template =====
  botaoNovoTemplate.addEventListener("click", () => {
    cardNovoTemplate.style.display =
      cardNovoTemplate.style.display === "none" ? "block" : "none";
  });

  // ===== Criar template =====
  formNovoTemplate.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nomeNovoTemplate").value.trim();
    if (!nome) return alert("Informe o nome do template.");

    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "criarTemplate",
        idProjeto,
        nomeTemplate: nome
      })
    });

    const data = await r.json();
    if (!r.ok || !data.success) {
      alert(data.error || "Erro ao criar template.");
      return;
    }

    formNovoTemplate.reset();
    cardNovoTemplate.style.display = "none";
    carregarTemplates();
  });

  // carregar inicialmente
  await carregarTemplates();
});
