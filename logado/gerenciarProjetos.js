document.addEventListener("DOMContentLoaded", async () => {
  const listaProjetos = document.getElementById("listaProjetos");
  const mensagem = document.getElementById("mensagem");
  const usuarioLogado = document.getElementById("usuarioLogado");
  const token = localStorage.getItem("tokenDeSessao");

  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // 🔍 Valida sessão
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

  // === Função para carregar os projetos ===
  async function carregarProjetos() {
    listaProjetos.innerHTML = "Carregando...";
    try {
      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "listar", emailUsuario })
      });

      const projetos = await r.json();
      listaProjetos.innerHTML = "";

      if (!r.ok || !Array.isArray(projetos) || projetos.length === 0) {
        listaProjetos.textContent = "Nenhum projeto encontrado.";
        return;
      }

      projetos.forEach((p) => {
        const membroAtual = p.membros.find(m => m.email === emailUsuario);
        const permissaoAtual = membroAtual?.permissao || "leitor";

        // container do projeto
        const divProjeto = document.createElement("div");
        divProjeto.className = "projeto";

        const cabecalho = document.createElement("div");
        cabecalho.className = "cabecalho-projeto";
        cabecalho.innerHTML = `
          <span class="toggle-projeto">▼</span>
          <span class="nome-projeto">${p.nome}</span>
          <span class="papel">(${permissaoAtual})</span>
        `;
        divProjeto.appendChild(cabecalho);

        const divMembros = document.createElement("div");
        divMembros.className = "membros";
        divMembros.style.display = "none";
        divProjeto.appendChild(divMembros);

        // Toggle
        cabecalho.addEventListener("click", () => {
          divMembros.style.display =
            divMembros.style.display === "none" ? "block" : "none";
        });

        // Renderizar membros
        renderizarMembros(p, divMembros, permissaoAtual);

        listaProjetos.appendChild(divProjeto);
      });
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
      listaProjetos.textContent = "Erro ao carregar projetos.";
    }
  }

  // === Função para renderizar membros de um projeto ===
  function renderizarMembros(projeto, container, permissaoUsuario) {
    container.innerHTML = "";
    const tabela = document.createElement("table");
    tabela.innerHTML = `
      <thead>
        <tr><th>E-mail</th><th>Permissão</th>${permissaoUsuario === "editor" ? "<th>Ações</th>" : ""}</tr>
      </thead>
      <tbody></tbody>
    `;

    const corpo = tabela.querySelector("tbody");

    projeto.membros.forEach((membro) => {
      const tr = document.createElement("tr");

      const tdEmail = document.createElement("td");
      tdEmail.textContent = membro.email;
      tr.appendChild(tdEmail);

      const tdPerm = document.createElement("td");
      if (permissaoUsuario === "editor" && membro.email !== usuarioLogado.textContent.split(": ")[1]) {
        const select = document.createElement("select");
        select.innerHTML = `
          <option value="editor" ${membro.permissao === "editor" ? "selected" : ""}>Editor</option>
          <option value="leitor" ${membro.permissao === "leitor" ? "selected" : ""}>Leitor</option>
        `;
        select.addEventListener("change", async () => {
          membro.permissao = select.value;
          await atualizarMembros(projeto._id, projeto.membros);
        });
        tdPerm.appendChild(select);
      } else {
        tdPerm.textContent = membro.permissao;
      }
      tr.appendChild(tdPerm);

      if (permissaoUsuario === "editor") {
        const tdAcoes = document.createElement("td");
        if (membro.email !== usuarioLogado.textContent.split(": ")[1]) {
          const btnRemover = document.createElement("button");
          btnRemover.textContent = "Remover";
          btnRemover.addEventListener("click", async () => {
            if (confirm(`Remover ${membro.email} do projeto?`)) {
              projeto.membros = projeto.membros.filter(m => m.email !== membro.email);
              await atualizarMembros(projeto._id, projeto.membros);
              renderizarMembros(projeto, container, permissaoUsuario);
            }
          });
          tdAcoes.appendChild(btnRemover);
        }
        tr.appendChild(tdAcoes);
      }

      corpo.appendChild(tr);
    });

    // linha para adicionar novo membro (somente editor)
    if (permissaoUsuario === "editor") {
      const trAdd = document.createElement("tr");
      const tdEmail = document.createElement("td");
      const inputEmail = document.createElement("input");
      inputEmail.type = "email";
      inputEmail.placeholder = "Novo e-mail";
      tdEmail.appendChild(inputEmail);

      const tdPerm = document.createElement("td");
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="editor">Editor</option>
        <option value="leitor" selected>Leitor</option>
      `;
      tdPerm.appendChild(select);

      const tdAdd = document.createElement("td");
      const btnAdd = document.createElement("button");
      btnAdd.textContent = "Adicionar";
      btnAdd.addEventListener("click", async () => {
        const novoEmail = inputEmail.value.trim();
        if (!novoEmail) return alert("Informe um e-mail válido.");
        if (projeto.membros.some(m => m.email === novoEmail)) return alert("Usuário já é membro.");
        projeto.membros.push({
          email: novoEmail,
          permissao: select.value,
          conviteAceito: true
        });
        await atualizarMembros(projeto._id, projeto.membros);
        renderizarMembros(projeto, container, permissaoUsuario);
      });

      tdAdd.appendChild(btnAdd);
      trAdd.appendChild(tdEmail);
      trAdd.appendChild(tdPerm);
      trAdd.appendChild(tdAdd);
      corpo.appendChild(trAdd);
    }

    container.appendChild(tabela);
  }

  // === Função de atualização dos membros ===
  async function atualizarMembros(idProjeto, membros) {
    try {
      const r = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "editar",
          idProjeto,
          emailUsuario: usuarioLogado.textContent.split(": ")[1],
          atualizacoes: { membros }
        })
      });

      const data = await r.json();
      if (!r.ok || !data.success) {
        alert(data.error || "Erro ao atualizar projeto.");
      }
    } catch (err) {
      console.error("Erro ao atualizar projeto:", err);
    }
  }

  await carregarProjetos();
});
