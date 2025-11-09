document.addEventListener("DOMContentLoaded", async () => {
  const mensagem = document.getElementById("mensagem");
  const usuarioLogado = document.getElementById("usuarioLogado");
  const token = localStorage.getItem("tokenDeSessao");

  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // 🔍 valida sessão e obtém e-mail do usuário
  const r = await fetch("/api/session/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenDeSessao: token })
  });

  const data = await r.json();
  if (!r.ok || !data.success) {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
    return;
  }

  const emailUsuario = data.email;
  usuarioLogado.textContent = `Logado como: ${emailUsuario}`;

  document.getElementById("botaoLogout").addEventListener("click", () => {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  });

  document.getElementById("botaoHome").addEventListener("click", () => {
    window.location.href = "SelecaoDeModulos.html";
  });

  // ==== carregar projetos do usuário ====
  async function carregarProjetos() {
    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "listar", emailUsuario })
    });
    
    const lista = await r.json();
    const tbody = document.querySelector("#tabelaProjetos tbody");
    tbody.innerHTML = "";

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="3">Nenhum projeto encontrado.</td></tr>`;
      return;
    }

    lista.forEach((p) => {
      const me = p.membros.find(m => m.email === emailUsuario);
      const permissao = me?.permissao || "desconhecida";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${permissao}</td>
        <td>
          <button class="btn-editar" data-id="${p._id}">🖉</button>
          <button class="btn-excluir" data-id="${p._id}">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  await carregarProjetos();

  // ==== criação de novo projeto ====
  const membrosTemporarios = new Map();
  const tabela = document.querySelector("#tabelaMembros tbody");
  const inputMembro = document.getElementById("inputNovoMembro");

  inputMembro.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const email = inputMembro.value.trim();
      if (!email || membrosTemporarios.has(email)) return;

      membrosTemporarios.set(email, "editor");
      const tr = document.createElement("tr");
      tr.dataset.email = email;
      tr.innerHTML = `
        <td>${email}</td>
        <td>
          <select class="seletor-permissao">
            <option value="editor" selected>Editor</option>
            <option value="leitor">Leitor</option>
          </select>
        </td>
        <td><button class="btn-remover">Remover</button></td>`;
      tabela.appendChild(tr);
      inputMembro.value = "";
    }
  });

  tabela.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remover")) {
      const tr = e.target.closest("tr");
      membrosTemporarios.delete(tr.dataset.email);
      tr.remove();
    }
  });

  tabela.addEventListener("change", (e) => {
    if (e.target.classList.contains("seletor-permissao")) {
      const email = e.target.closest("tr").dataset.email;
      membrosTemporarios.set(email, e.target.value);
    }
  });

  document.getElementById("formNovoProjeto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nomeNovoProjeto").value.trim();
    if (!nome) {
      mensagem.textContent = "Nome do projeto é obrigatório.";
      mensagem.style.color = "red";
      return;
    }

    const membrosArray = Array.from(membrosTemporarios.entries()).map(([email, permissao]) => ({
      email,
      permissao,
      conviteAceito: false
    }));

    membrosArray.push({
      email: emailUsuario,
      permissao: "editor",
      conviteAceito: true
    });

    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "criar", nome, membros: membrosArray })
    });

    const result = await r.json();
    if (r.ok && result.success) {
      mensagem.textContent = "Projeto criado com sucesso!";
      mensagem.style.color = "green";
      await carregarProjetos();
      e.target.reset();
      tabela.innerHTML = "";
      membrosTemporarios.clear();
    } else {
      mensagem.textContent = result.error || "Erro ao criar projeto.";
      mensagem.style.color = "red";
    }
  });
});

// ==== exclusão de projetos ====
document.querySelector("#tabelaProjetos").addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-excluir")) {
    const idProjeto = e.target.dataset.id;
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return;

    try {
      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "excluir", idProjeto, emailUsuario })
      });

      const data = await r.json();

      if (!r.ok || !data.success) {
        alert(data.error || "Erro ao excluir projeto.");
        return;
      }

      alert("Projeto excluído com sucesso!");
      await carregarProjetos();
    } catch (err) {
      console.error("Erro ao excluir projeto:", err);
      alert("Erro de conexão com o servidor.");
    }
  }
});

