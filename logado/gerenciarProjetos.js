document.addEventListener("DOMContentLoaded", async () => {
  const listaProjetos = document.getElementById("listaProjetos");
  const mensagem = document.getElementById("mensagem");
  const usuarioLogado = document.getElementById("usuarioLogado");
  const token = localStorage.getItem("tokenDeSessao");

  // elementos da criação de projeto
  const listaConvites = document.getElementById("listaConvites");
  const inputNovoMembro = document.getElementById("inputNovoMembro");
  const selectPermissao = document.getElementById("permissaoNovoMembro");
  const membrosPendentes = [];

  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // Validação de sessão
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
  document.getElementById("botaoLogout").addEventListener("click", () => {
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  });
  document.getElementById("botaoHome").addEventListener("click", () => {
    window.location.href = "SelecaoDeModulos.html";
  });

  // ===== Mostrar / esconder formulário de novo projeto =====
  const botaoNovoProjeto = document.getElementById("botaoNovoProjeto");
  const cardNovoProjeto = document.getElementById("cardNovoProjeto");

  botaoNovoProjeto.addEventListener("click", () => {
    cardNovoProjeto.style.display =
      cardNovoProjeto.style.display === "none" ? "block" : "none";
  });

  // ======= LISTAGEM DE PROJETOS =======
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

      if (!Array.isArray(projetos) || projetos.length === 0) {
        listaProjetos.textContent = "Nenhum projeto encontrado.";
        return;
      }

      projetos.forEach((p) => renderProjeto(p));
    } catch (err) {
      console.error(err);
      listaProjetos.textContent = "Erro ao carregar projetos.";
    }
  }

  // Renderiza cada projeto
  function renderProjeto(p) {
    const meu = p.membros.find(m => m.email === emailUsuario);
    const minhaPerm = meu?.permissao || "leitor";
    const minhaAceitacao = meu?.conviteAceito === true;

    const wrap = document.createElement("div");
    wrap.className = "projeto";

    const cab = document.createElement("div");
    cab.className = "cabecalho-projeto";
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";
    const toggle = document.createElement("span");
    toggle.className = "toggle-projeto";
    toggle.textContent = "▸";
    const nome = document.createElement("span");
    nome.className = "nome-projeto";
    nome.textContent = p.nome;
    const papel = document.createElement("span");
    papel.className = "papel";
    papel.textContent = `(${minhaPerm}${minhaAceitacao ? "" : " - convite pendente"})`;
    left.append(toggle, nome, papel);

    const acoesProjeto = document.createElement("div");
    acoesProjeto.className = "acoes-projeto";
    if (minhaPerm === "editor" && minhaAceitacao) {
      const btnExcluir = document.createElement("button");
      btnExcluir.className = "btn-perigo";
      btnExcluir.textContent = "Excluir projeto";
      btnExcluir.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir este projeto?")) return;
        const rr = await fetch("/api/projetos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "excluir", idProjeto: p._id, emailUsuario })
        });
        const data = await rr.json();
        if (!rr.ok || !data.success) {
          alert(data.error || "Erro ao excluir projeto.");
          return;
        }
        await carregarProjetos();
      });
      acoesProjeto.appendChild(btnExcluir);
    }

    cab.append(left, acoesProjeto);
    wrap.appendChild(cab);

    const divMembros = document.createElement("div");
    divMembros.className = "membros";
    divMembros.style.display = "none";
    wrap.appendChild(divMembros);

    // Toggle dropdown
    cab.addEventListener("click", () => {
      const aberto = divMembros.style.display !== "none";
      divMembros.style.display = aberto ? "none" : "block";
      toggle.textContent = aberto ? "▸" : "▾";
    });

    renderMembros(p, divMembros, minhaPerm, minhaAceitacao);
    listaProjetos.appendChild(wrap);
  }

  // Renderiza os membros
  function renderMembros(projeto, container, minhaPerm, minhaAceitacao) {
    container.innerHTML = "";
    const tabela = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>
      <th>E-mail</th>
      <th>Permissão</th>
      <th>Status</th>
      <th style="width:220px;">Ações</th>
    </tr>`;
    const tbody = document.createElement("tbody");

    projeto.membros.forEach((m) => {
      const tr = document.createElement("tr");

      const tdEmail = document.createElement("td");
      tdEmail.textContent = m.email;

      const tdPerm = document.createElement("td");
      const tdStatus = document.createElement("td");
      const tdAcoes = document.createElement("td");

      tdStatus.innerHTML = m.conviteAceito
        ? "membro"
        : `<span class="tag-convite">convidado como ${m.permissao}</span>`;

      const euMesmo = m.email === emailUsuario;

      if (minhaPerm === "editor" && minhaAceitacao && m.conviteAceito && !euMesmo) {
        const sel = document.createElement("select");
        sel.innerHTML = `
          <option value="editor" ${m.permissao === "editor" ? "selected" : ""}>Editor</option>
          <option value="leitor" ${m.permissao === "leitor" ? "selected" : ""}>Leitor</option>`;
        sel.addEventListener("change", async () => {
          const rr = await fetch("/api/projetos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              acao: "alterarPermissao",
              idProjeto: projeto._id,
              emailUsuario,
              alterarMembro: { email: m.email, permissao: sel.value }
            })
          });
          const data = await rr.json();
          if (!rr.ok || !data.success) {
            alert(data.error || "Erro ao alterar permissão.");
            sel.value = m.permissao;
            return;
          }
          m.permissao = sel.value;
        });
        tdPerm.appendChild(sel);
      } else {
        tdPerm.textContent = m.permissao;
      }

      // Ações
      if (euMesmo && !m.conviteAceito) {
        const bAceitar = document.createElement("button");
        bAceitar.textContent = "Aceitar";
        bAceitar.addEventListener("click", () => aceitarOuRecusar(projeto._id, "aceitarConvite"));
        const bRecusar = document.createElement("button");
        bRecusar.className = "btn-neutro";
        bRecusar.textContent = "Recusar";
        bRecusar.addEventListener("click", () => aceitarOuRecusar(projeto._id, "recusarConvite"));
        tdAcoes.append(bAceitar, bRecusar);
      }

      if (euMesmo && m.conviteAceito) {
        const bSair = document.createElement("button");
        bSair.className = "btn-neutro";
        bSair.textContent = "Sair do projeto";
        bSair.addEventListener("click", async () => {
          if (!confirm("Tem certeza que deseja sair deste projeto?")) return;
          const rr = await fetch("/api/projetos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "autoRemover", idProjeto: projeto._id, emailUsuario })
          });
          const data = await rr.json();
          if (!rr.ok || !data.success) {
            alert(data.error || "Não foi possível sair.");
            return;
          }
          projeto.membros = projeto.membros.filter(x => x.email !== emailUsuario);
          renderMembros(projeto, container, minhaPerm, minhaAceitacao);
        });
        tdAcoes.appendChild(bSair);
      }

      if (minhaPerm === "editor" && minhaAceitacao && !euMesmo) {
        const bRemover = document.createElement("button");
        bRemover.className = "btn-perigo";
        bRemover.textContent = m.conviteAceito ? "Remover" : "Cancelar convite";
        bRemover.addEventListener("click", async () => {
          if (!confirm(`Remover ${m.email}?`)) return;
          const rr = await fetch("/api/projetos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              acao: "removerMembro",
              idProjeto: projeto._id,
              emailUsuario,
              alterarMembro: { email: m.email }
            })
          });
          const data = await rr.json();
          if (!rr.ok || !data.success) {
            alert(data.error || "Erro ao remover.");
            return;
          }
          projeto.membros = projeto.membros.filter(x => x.email !== m.email);
          renderMembros(projeto, container, minhaPerm, minhaAceitacao);
        });
        tdAcoes.appendChild(bRemover);
      }

      tr.append(tdEmail, tdPerm, tdStatus, tdAcoes);
      tbody.appendChild(tr);
    });

    if (minhaPerm === "editor" && minhaAceitacao) {
      const trAdd = document.createElement("tr");
      const tdEmail = document.createElement("td");
      const inpEmail = document.createElement("input");
      inpEmail.type = "email";
      inpEmail.placeholder = "E-mail para convidar";
      tdEmail.appendChild(inpEmail);
      const tdPerm = document.createElement("td");
      const selPerm = document.createElement("select");
      selPerm.innerHTML = `<option value="editor">Editor</option><option value="leitor" selected>Leitor</option>`;
      tdPerm.appendChild(selPerm);
      const tdStatus = document.createElement("td");
      tdStatus.textContent = "—";
      const tdAdd = document.createElement("td");
      const bAdd = document.createElement("button");
      bAdd.textContent = "Convidar";
      bAdd.addEventListener("click", async () => {
        const novo = (inpEmail.value || "").trim();
        if (!novo.includes("@")) return alert("E-mail inválido.");
        // valida usuário antes de convidar
        const rv = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "validarEmails", emails: [novo] })
        });
        const dv = await rv.json();
        if (!dv.success || dv.encontrados.length === 0) {
          alert("Usuário não encontrado no sistema.");
          return;
        }
        const rr = await fetch("/api/projetos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "convidar",
            idProjeto: projeto._id,
            emailUsuario,
            novoMembro: { email: novo, permissao: selPerm.value }
          })
        });
        const data = await rr.json();
        if (!rr.ok || !data.success) {
          alert(data.error || "Erro ao convidar.");
          return;
        }
        projeto.membros.push({
          email: novo,
          permissao: selPerm.value,
          conviteAceito: false
        });
        renderMembros(projeto, container, minhaPerm, minhaAceitacao);
        inpEmail.value = "";
      });
      tdAdd.appendChild(bAdd);
      trAdd.append(tdEmail, tdPerm, tdStatus, tdAdd);
      tbody.appendChild(trAdd);
    }

    tabela.append(thead, tbody);
    container.appendChild(tabela);
  }

  async function aceitarOuRecusar(idProjeto, acao) {
    const rr = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao, idProjeto, emailUsuario })
    });
    const data = await rr.json();
    if (!rr.ok || !data.success) {
      alert(data.error || "Erro na ação.");
      return;
    }
    await carregarProjetos();
  }

  // ======== ADICIONAR MEMBROS ANTES DA CRIAÇÃO DO PROJETO ========
  inputNovoMembro.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const email = inputNovoMembro.value.trim();
      const permissao = selectPermissao.value;

      if (email === emailUsuario) {
      alert("Você já será adicionado automaticamente como editor do projeto.");
      inputNovoMembro.value = "";
      return;
      }
      
      if (!email.includes("@") || membrosPendentes.some(m => m.email === email)) {
        alert("E-mail inválido ou já adicionado.");
        return;
      }

      // checa se usuário existe no banco
      const r = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "validarEmails", emails: [email] })
      });
      const data = await r.json();
      if (!data.success || data.encontrados.length === 0) {
        alert("Este e-mail não está cadastrado como usuário válido.");
        return;
      }

      membrosPendentes.push({ email, permissao });
      atualizarListaConvites();
      inputNovoMembro.value = "";
    }
  });

  function atualizarListaConvites() {
    listaConvites.innerHTML = "";
    membrosPendentes.forEach((m, idx) => {
      const li = document.createElement("li");
      li.textContent = `${m.email} (${m.permissao})`;
      const bX = document.createElement("button");
      bX.textContent = "✕";
      bX.className = "btn-neutro";
      bX.style.marginLeft = "6px";
      bX.addEventListener("click", () => {
        membrosPendentes.splice(idx, 1);
        atualizarListaConvites();
      });
      li.appendChild(bX);
      listaConvites.appendChild(li);
    });
  }

  // ======== CRIAR PROJETO ========
  document.getElementById("formNovoProjeto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nomeNovoProjeto").value.trim();
    if (!nome) return alert("Informe o nome do projeto.");

    const membros = [
      { email: emailUsuario, permissao: "editor", conviteAceito: true },
      ...membrosPendentes.map(m => ({ ...m, conviteAceito: false }))
    ];
    membrosPendentes.length = 0;
    atualizarListaConvites();

    const r = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "criar", nome, membros })
    });
    const data = await r.json();
    if (!r.ok || !data.success) {
      alert(data.error || "Erro ao criar projeto.");
      return;
    }
    e.target.reset();
    await carregarProjetos();
  });

  await carregarProjetos();
});
