// editarTemplate.js
// Versão adaptada para usar token + /api/session/verify + /api/projetos

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const projetoId = params.get("projetoId");
  const templateId = params.get("templateId");

  if (!projetoId || !templateId) {
    alert("Projeto ou Template não informados.");
    return;
  }

  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  //Define as variavies para tela carregando.
  const telaCarregando = document.getElementById("telaCarregando");
  const container = document.querySelector(".container");

  // garante que, ao carregar a página, a tela de loading apareça
  if (telaCarregando) telaCarregando.style.display = "flex";
  if (container) container.classList.add("escondido");


  
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
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
      return;
    }

    emailUsuario = vdata.email;

    // UI header
    const usuarioLogadoEl = document.getElementById("usuarioLogado");
    if (usuarioLogadoEl) usuarioLogadoEl.textContent = `Logado como: ${emailUsuario}`;

    document.getElementById("botaoLogout")?.addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });

    document.getElementById("botaoVoltar")?.addEventListener("click", () => {
      window.history.back();
    });

    // ---------- Helper geral para chamar /api/projetos ----------
    async function chamarApiProjetos(payload) {
      const resp = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailUsuario,
          idProjeto: projetoId,
          templateId,
          ...payload
        })
      });

      const data = await resp.json();
      if (!resp.ok || data.error || data.success === false) {
        throw new Error(data.error || "Erro na API de projetos.");
      }
      return data;
    }

    // ---------- Helpers de UI ----------

    function makeEditableSpan({ text, placeholder, className, onSave }) {
      let valorAtual = text; // valor atual guardado em closure
    
      // função que cria o span clicável
      function criarSpan() {
        const span = document.createElement("span");
        span.textContent = valorAtual || placeholder;
        span.className = className || "";
        span.style.cursor = "pointer";
    
        span.addEventListener("click", () => {
          const input = document.createElement("input");
          input.type = "text";
          input.value = valorAtual || "";
          input.className = className || "";
          input.style.width = "100%";
    
          const commit = async () => {
            const novo = input.value.trim();
            // salva apenas se mudou
            if (novo !== valorAtual) {
              await onSave(novo);
              valorAtual = novo;
            }
    
            // recria o span apenas nesse lugar, sem recarregar tudo
            const novoSpan = criarSpan();
            input.replaceWith(novoSpan);
          };
    
          input.addEventListener("blur", commit);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") input.blur();
          });
    
          span.replaceWith(input);
          setTimeout(() => input.focus(), 0);
        });
    
        return span;
      }
    
      return criarSpan();
    }


    // ---------- Banco de dados via API (/api/projetos) ----------

    async function carregarProjetoETemplate() {
      const data = await chamarApiProjetos({ acao: "obterTemplate" });
      const { projeto, template } = data;

      const tituloProjeto = document.getElementById("titulo-projeto");
      const tituloTemplate = document.getElementById("titulo-template");
      if (tituloProjeto) tituloProjeto.textContent = `Projeto: ${projeto.nome}`;
      if (tituloTemplate) tituloTemplate.textContent = `Template: ${template.nome}`;

      return { proj: projeto, template };
    }

    async function criarSecao() {
      const data = await chamarApiProjetos({ acao: "criarSecao" });
      return data.secao; // não é usado diretamente, mas já deixo coerente
    }

    async function setCampoSecao(projetoId_, templateId_, secaoId_, campo, valor) {
      await chamarApiProjetos({
        acao: "setCampoSecao",
        secaoId: secaoId_,
        campo,
        valor
      });
    }

    async function adicionarItemInicial(projetoId_, templateId_, secaoId_, tipo) {
      const data = await chamarApiProjetos({
        acao: "adicionarItemInicial",
        secaoId: secaoId_,
        tipo
      });
      return data.item;
    }

    async function setCampoItem(projetoId_, templateId_, secaoId_, itemId_, campo, valor) {
      await chamarApiProjetos({
        acao: "setCampoItem",
        secaoId: secaoId_,
        itemId: itemId_,
        campo,
        valor
      });
    }

    async function salvarOpcoes(projetoId_, templateId_, secaoId_, itemId_, arr) {
      await chamarApiProjetos({
        acao: "salvarOpcoes",
        secaoId: secaoId_,
        itemId: itemId_,
        opcoes: arr
      });
    }

    async function deletarItem(projetoId_, templateId_, secaoId_, itemId_) {
      await chamarApiProjetos({
        acao: "deletarItem",
        secaoId: secaoId_,
        itemId: itemId_
      });
    }

    async function atualizarOrdemItens(secaoId_, novaOrdem) {
      await chamarApiProjetos({
        acao: "atualizarOrdemItens",
        secaoId: secaoId_,
        itens: novaOrdem
      });
    }

    async function setObrigatorioItem(projetoId_, templateId_, secaoId_, itemId_, valor) {
      await chamarApiProjetos({
        acao: "setObrigatorioItem",
        secaoId: secaoId_,
        itemId: itemId_,
        valor: Boolean(valor)
      });
    }

    async function deletarSecao(projetoId_, templateId_, secaoId_) {
      await chamarApiProjetos({
        acao: "deletarSecao",
        secaoId: secaoId_
      });
    }

    async function atualizarOrdemSecoes(novasSecoes) {
      await chamarApiProjetos({
        acao: "atualizarOrdemSecoes",
        secoes: novasSecoes
      });
    }

    // ---------- Render ----------

    async function renderizarTudo() {
      const { template } = await carregarProjetoETemplate();
      const lista = document.getElementById("listaSecoes");
      if (!lista) return;
      lista.innerHTML = "";

      const secoes = template.secoes || [];
      if (secoes.length === 0) {
        const p = document.createElement("p");
        p.style.color = "#666";
        p.textContent = "Nenhuma seção. Use 'Criar Seção' para começar.";
        lista.appendChild(p);
        return;
      }

      secoes.forEach((secao) => {
        const sec = document.createElement("div");
        sec.className = "secao";
        sec.dataset.idSecao = secao.idSecao;

        // header da seção
        const header = document.createElement("div");
        header.className = "secao-header";

        const tituloWrap = document.createElement("div");

        // usamos o mesmo makeEditableSpan que já está funcionando nas opções ---
        const tituloSecao = makeEditableSpan({
          text: secao.titulo,
          placeholder: "Clique para renomear o titulo",
          className: "titulo-secao",
          onSave: async (novo) => {
            const novoTitulo = novo || "Clique para renomear o titulo";
        
            // atualiza o objeto em memória (só pra refletir imediatamente)
            secao.titulo = novoTitulo;
        
            // salva no backend
            await setCampoSecao(projetoId, templateId, secao.idSecao, "titulo", novoTitulo);
          }
        });
        
        // mantém o negrito como antes
        tituloSecao.style.fontWeight = "bold";
        
        tituloWrap.appendChild(tituloSecao);


        const controles = document.createElement("div");
        controles.style.display = "flex";
        controles.style.gap = "8px";

        // NOVO BOTAO PARA CONTEUDO RECORRENTE =======================================================================================================================
        const btnEscalavel = document.createElement("button");
        btnEscalavel.className = "botao-escalavel";
        btnEscalavel.innerHTML = '<span class="icone-stack">☰</span> Conteúdo escalável';
        btnEscalavel.title = "Marcar esta seção como conteúdo escalável";
      
        // se a seção já tiver sido marcada antes, mostramos como ativo
        if (secao.escalavel) {
          btnEscalavel.classList.add("ativo");
        }
        // NOVO BOTAO PARA CONTEUDO RECORRENTE =======================================================================================================================
        
        // botões para mover seção
        const btnMoverCima = document.createElement("button");
        btnMoverCima.textContent = "▲";
        btnMoverCima.className = "botaoMover";
        btnMoverCima.addEventListener("click", async () => {
          const idx = secoes.findIndex((s) => s.idSecao === secao.idSecao);
          if (idx > 0) {
            [secoes[idx], secoes[idx - 1]] = [secoes[idx - 1], secoes[idx]];
            await atualizarOrdemSecoes(secoes);
            await renderizarTudo();
          }
        });

        const btnMoverBaixo = document.createElement("button");
        btnMoverBaixo.textContent = "▼";
        btnMoverBaixo.className = "botaoMover";
        btnMoverBaixo.addEventListener("click", async () => {
          const idx = secoes.findIndex((s) => s.idSecao === secao.idSecao);
          if (idx < secoes.length - 1) {
            [secoes[idx], secoes[idx + 1]] = [secoes[idx + 1], secoes[idx]];
            await atualizarOrdemSecoes(secoes);
            await renderizarTudo();
          }
        });

        controles.appendChild(btnEscalavel);  ///////// NOVO BOTAO PARA OS CONTEUDOS ESCALAVEIS
        controles.appendChild(btnMoverCima);
        controles.appendChild(btnMoverBaixo);

        const btnRemoverSecao = document.createElement("button");
        btnRemoverSecao.className = "botaoPadrao botaoPerigo";
        btnRemoverSecao.textContent = "Excluir seção";

        //BOTAO DE + DO FIM DA SECAO
        const btnAddItem = document.createElement("button");
        btnAddItem.className = "botao-add-item-circular";
        btnAddItem.textContent = "+";
        //BOTAO DE + DO FIM DA SECAO
        
        controles.appendChild(btnAddItem);
        controles.appendChild(btnRemoverSecao);

        header.appendChild(tituloWrap);
        header.appendChild(controles);
        sec.appendChild(header);

       
        
        // lista de itens
        const listaItens = document.createElement("div");
        listaItens.className = "lista-itens";

        (secao.itens || []).forEach((item) => {
          const linha = document.createElement("div");
          linha.className = "item-row";
          linha.dataset.iditem = item.idItem;

          const info = document.createElement("div");
          info.className = "item-info";
          info.style.display = "flex";
          info.style.flexDirection = "column";
          info.style.gap = "6px";

          // seletor tipo no topo
          const seletorTipo = document.createElement("select");
          seletorTipo.className = "select-tipo";
          ["textoFixo", "perguntaSubjetiva", "perguntaCategorica", "perguntaMultipla"].forEach((valor) => {
            const opt = document.createElement("option");
            opt.value = valor;
            opt.textContent =
              valor === "textoFixo"
                ? "Texto fixo"
                : valor === "perguntaSubjetiva"
                ? "Pergunta livre"
                : valor === "perguntaCategorica"
                ? "Pergunta categórica"
                : "Pergunta múltipla";
            if (item.tipo === valor) opt.selected = true;
            seletorTipo.appendChild(opt);
          });
          info.appendChild(seletorTipo);
          
          seletorTipo.addEventListener("change", async () => {
            try {
              await setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "tipo", seletorTipo.value);
              if (["perguntaSubjetiva", "perguntaCategorica", "perguntaMultipla"].includes(seletorTipo.value)) {
                await setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "pergunta", "");
                await setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "opcoes", []);
              } else {
                await setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "conteudo", "");
              }
              await renderizarTudo();
            } catch (err) {
              console.error("Erro alterando tipo:", err);
            }
          });

          // controles do item
          const controlesItem = document.createElement("div");
          controlesItem.className = "item-controls";
          const btnObrig = document.createElement("button");
          btnObrig.className = "btn-asterisco";
          btnObrig.textContent = "✱";
          if (item.obrigatorio) btnObrig.classList.add("ativo");
          const btnDelete = document.createElement("button");
          btnDelete.className = "botaoPadrao botaoPerigo";
          btnDelete.textContent = "✕";
          controlesItem.appendChild(btnObrig);
          controlesItem.appendChild(btnDelete);

          // campos por tipo
          if (item.tipo === "textoFixo") {
            info.appendChild(
              makeEditableSpan({
                text: item.conteudo,
                placeholder: "Clique para editar texto",
                className: "input-text",
                onSave: (novo) =>
                  setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "conteudo", novo)
              })
            );
          }
          if (item.tipo === "perguntaSubjetiva") {
            info.appendChild(
              makeEditableSpan({
                text: item.pergunta,
                placeholder: "Clique para editar pergunta",
                className: "input-pergunta",
                onSave: (novo) =>
                  setCampoItem(projetoId, templateId, secao.idSecao, item.idItem, "pergunta", novo)
              })
            );
          }
        ///////////////////////////////GRANDE SUBSTITUIÇÃO FINAL -------------------------------------------------------------------------------------------------  
        // PERGUNTA CATEGÓRICA (com opções dinâmicas / seção condicional)
          if (item.tipo === "perguntaCategorica") {
            info.appendChild(
              makeEditableSpan({
                text: item.pergunta,
                placeholder: "Clique para editar pergunta",
                className: "input-pergunta",
                onSave: (novo) =>
                  setCampoItem(
                    projetoId,
                    templateId,
                    secao.idSecao,
                    item.idItem,
                    "pergunta",
                    novo
                  )
              })
            );
          
            const listaOpcoes = document.createElement("div");
            listaOpcoes.className = "lista-opcoes";
            info.appendChild(listaOpcoes);
          
            // 🔹 AQUI fazemos a conversão string → objeto
            let state = Array.isArray(item.opcoes)
              ? item.opcoes.map(function (op) {
                  if (typeof op === "string") {
                    return { texto: op, dinamico: false, condicional: null };
                  }
                  return {
                    texto: op.texto || "",
                    dinamico: !!op.dinamico,
                    condicional: op.condicional || null
                  };
                })
              : [];

          
            async function salvarEstado() {
              item.opcoes = state;
              await salvarOpcoes(
                projetoId,
                templateId,
                secao.idSecao,
                item.idItem,
                state
              );
            }
          
            function renderOpcoes() {
              listaOpcoes.innerHTML = "";
          
              state.forEach((opcao, idx) => {
                const linhaOpt = document.createElement("div");
                linhaOpt.className = "opcao-row";
          
                // mover pra cima/baixo (igual antes)
                const btnUpOpc = document.createElement("button");
                btnUpOpc.textContent = "▲";
                btnUpOpc.className = "botaoMover";
                btnUpOpc.addEventListener("click", async () => {
                  if (idx > 0) {
                    [state[idx], state[idx - 1]] = [state[idx - 1], state[idx]];
                    await salvarEstado();
                    renderOpcoes();
                  }
                });
          
                const btnDownOpc = document.createElement("button");
                btnDownOpc.textContent = "▼";
                btnDownOpc.className = "botaoMover";
                btnDownOpc.addEventListener("click", async () => {
                  if (idx < state.length - 1) {
                    [state[idx], state[idx + 1]] = [state[idx + 1], state[idx]];
                    await salvarEstado();
                    renderOpcoes();
                  }
                });
          
                linhaOpt.appendChild(btnUpOpc);
                linhaOpt.appendChild(btnDownOpc);
          
                const n = document.createElement("span");
                n.textContent = idx + 1 + ".";
                n.style.width = "18px";
                linhaOpt.appendChild(n);
          
                // texto da opção (usa makeEditableSpan, mas agora em opcao.texto)
                const spanOpt = makeEditableSpan({
                  text: opcao.texto,
                  placeholder: "Clique para editar opção",
                  className: "input-opcao",
                  onSave: async (novo) => {
                    state[idx].texto = novo;
                    await salvarEstado();
                  }
                });
                spanOpt.style.flex = "1";
                linhaOpt.appendChild(spanOpt);
          
                // 🔹 botão "dinâmico"
                const btnDinamico = document.createElement("button");
                btnDinamico.type = "button";
                btnDinamico.className = "botao-dinamico-opcao";
                btnDinamico.textContent = "dinâmico";
                if (opcao.dinamico) btnDinamico.classList.add("ativo");
          
                btnDinamico.addEventListener("click", async () => {
                const opc = state[idx];
              
                // Se já está dinâmico -> usuário quer DESATIVAR
                if (opc.dinamico) {
                  const temConteudo =
                    opc.condicional &&
                    Array.isArray(opc.condicional.itens) &&
                    opc.condicional.itens.length > 0;
              
                  if (temConteudo) {
                    const ok = confirm(
                      "Desativar o modo dinâmico desta opção irá excluir todo o conteúdo da seção condicional associada. Deseja continuar?"
                    );
                    if (!ok) {
                      return; // não muda nada
                    }
                  }
              
                  // desliga e apaga tudo que era condicional
                  opc.dinamico = false;
                  opc.condicional = null;
                } else {
                  // Se estava desligado -> usuário quer ATIVAR (começa vazio)
                  opc.dinamico = true;
                  opc.condicional = {
                    escalavel: false,
                    itens: []
                  };
                }
              
                await salvarEstado();
                renderOpcoes();
              });

          
                linhaOpt.appendChild(btnDinamico);
          
                // botão excluir opção (igual antes)
                const btnExcluirOpc = document.createElement("button");
                btnExcluirOpc.textContent = "✕";
                btnExcluirOpc.className = "botaoPadrao botaoPerigo";
                btnExcluirOpc.style.marginLeft = "4px";
                btnExcluirOpc.addEventListener("click", async (e) => {
                  e.preventDefault();
                  state.splice(idx, 1);
                  await salvarEstado();
                  renderOpcoes();
                });
          
                linhaOpt.appendChild(btnExcluirOpc);
          
                listaOpcoes.appendChild(linhaOpt);
          
                // 🔹 SEÇÃO CONDICIONAL (apenas se dinâmico = true)
                if (opcao.dinamico) {
                  const cond = opcao.condicional || { escalavel: false, itens: [] };
                  state[idx].condicional = cond; // garante consistência
          
                  const secCond = document.createElement("div");
                  secCond.className = "secao-condicional-opcao";
          
                  // header da seção condicional
                  const headerCond = document.createElement("div");
                  headerCond.className = "header-secao-condicional";
          
                  const spanLabel = document.createElement("span");
                  spanLabel.textContent = "Seção condicional para esta opção:";
                  headerCond.appendChild(spanLabel);
          
                  const btnEscalavelCond = document.createElement("button");
                  btnEscalavelCond.type = "button";
                  btnEscalavelCond.className = "botao-escalavel";
                  btnEscalavelCond.innerHTML = '<span class="icone-stack">☰</span> Conteúdo escalável';
                  if (cond.escalavel) btnEscalavelCond.classList.add("ativo");
          
                  btnEscalavelCond.addEventListener("click", async () => {
                    state[idx].condicional = state[idx].condicional || {
                      escalavel: false,
                      itens: []
                    };
                    state[idx].condicional.escalavel = !state[idx].condicional.escalavel;
                    await salvarEstado();
                    renderOpcoes();
                  });
          
                  headerCond.appendChild(btnEscalavelCond);
                  secCond.appendChild(headerCond);
          
                  // lista de itens condicionais
                  const listaCondItens = document.createElement("div");
                  listaCondItens.className = "lista-itens-condicionais";
            
                  // garante que sempre temos um array
                  cond.itens = Array.isArray(cond.itens) ? cond.itens : [];
            
                  cond.itens.forEach((cItem, cIdx) => {
                  // wrapper para agrupar linha principal + opções (quando existirem)
                  const wrapper = document.createElement("div");
                  wrapper.className = "bloco-item-condicional";
                
                  const row = document.createElement("div");
                  row.className = "item-condicional";
                
                  // grupos: esquerda (conteúdo) / direita (controles)
                  const esquerda = document.createElement("div");
                  esquerda.className = "item-condicional-esquerda";
                
                  const direita = document.createElement("div");
                  direita.className = "item-condicional-direita";
                
                  row.appendChild(esquerda);
                  row.appendChild(direita);
                
                  // === ESQUERDA: numeração + tipo + texto/pergunta ===
                
                  // numeração
                  const spanNum = document.createElement("span");
                  spanNum.textContent = (cIdx + 1) + ".";
                  spanNum.style.width = "18px";
                  esquerda.appendChild(spanNum);
                
                  // select do tipo
                  const selectTipo = document.createElement("select");
                  const tipos = [
                    { value: "textoFixo",        label: "Texto fixo" },
                    { value: "perguntaSubjetiva",label: "Pergunta livre" },
                    { value: "perguntaCategorica",label: "Pergunta categórica" },
                    { value: "perguntaMultipla", label: "Pergunta múltipla" }
                  ];
                  tipos.forEach((t) => {
                    const opt = document.createElement("option");
                    opt.value = t.value;
                    opt.textContent = t.label;
                    selectTipo.appendChild(opt);
                  });
                  selectTipo.value = cItem.tipo || "textoFixo";
                  selectTipo.style.marginRight = "6px";
                
                  selectTipo.addEventListener("change", async () => {
                    cItem.tipo = selectTipo.value;
                    // limpa / cria opcoes se trocar para/desde categ/múltipla
                    if (!["perguntaCategorica", "perguntaMultipla"].includes(selectTipo.value)) {
                      delete cItem.opcoes;
                    } else if (!Array.isArray(cItem.opcoes)) {
                      cItem.opcoes = [];
                    }
                    await salvarEstado();
                    renderOpcoes();
                  });
                
                  esquerda.appendChild(selectTipo);
                
                  // texto/pergunta (mesma lógica dos itens normais)
                  const spanTexto =
                    cItem.tipo === "textoFixo"
                      ? makeEditableSpan({
                          text: cItem.conteudo,
                          placeholder: "Clique para editar texto",
                          className: "input-pergunta",
                          onSave: async (novo) => {
                            cItem.conteudo = novo;
                            delete cItem.pergunta;
                            await salvarEstado();
                          }
                        })
                      : makeEditableSpan({
                          text: cItem.pergunta,
                          placeholder: "Clique para editar pergunta",
                          className: "input-pergunta",
                          onSave: async (novo) => {
                            cItem.pergunta = novo;
                            delete cItem.conteudo;
                            await salvarEstado();
                          }
                        });
                
                  spanTexto.style.flex = "1";
                  esquerda.appendChild(spanTexto);
                
                  // === DIREITA: asterisco, X, ▲, ▼ ===
                
                  // asterisco obrigatório como BOTÃO marcável
                  const btnObrig = document.createElement("button");
                  btnObrig.type = "button";
                  btnObrig.textContent = "✱";
                  btnObrig.className = "btn-asterisco";
                  if (cItem.obrigatorio) {
                    btnObrig.classList.add("ativo");
                  }
                  btnObrig.addEventListener("click", async () => {
                    cItem.obrigatorio = !cItem.obrigatorio;
                    btnObrig.classList.toggle("ativo");
                    await salvarEstado();
                  });
                  direita.appendChild(btnObrig);
                
                  // botão excluir item condicional (com confirmação)
                  const btnDelCond = document.createElement("button");
                  btnDelCond.type = "button";
                  btnDelCond.textContent = "✕";
                  btnDelCond.className = "botaoPadrao botaoPerigo";
                  btnDelCond.addEventListener("click", async () => {
                    const ok = confirm("Tem certeza de que deseja excluir este item?");
                    if (!ok) return;
                    cond.itens.splice(cIdx, 1);
                    await salvarEstado();
                    renderOpcoes();
                  });
                  direita.appendChild(btnDelCond);
                
                  // mover para cima
                  const btnUp = document.createElement("button");
                  btnUp.type = "button";
                  btnUp.textContent = "▲";
                  btnUp.className = "botaoMover";
                  btnUp.addEventListener("click", async () => {
                    if (cIdx > 0) {
                      const arr = cond.itens;
                      [arr[cIdx], arr[cIdx - 1]] = [arr[cIdx - 1], arr[cIdx]];
                      await salvarEstado();
                      renderOpcoes();
                    }
                  });
                  direita.appendChild(btnUp);
                
                  // mover para baixo
                  const btnDown = document.createElement("button");
                  btnDown.type = "button";
                  btnDown.textContent = "▼";
                  btnDown.className = "botaoMover";
                  btnDown.addEventListener("click", async () => {
                    const arr = cond.itens;
                    if (cIdx < arr.length - 1) {
                      [arr[cIdx], arr[cIdx + 1]] = [arr[cIdx + 1], arr[cIdx]];
                      await salvarEstado();
                      renderOpcoes();
                    }
                  });
                  direita.appendChild(btnDown);
                
                  // monta a linha no wrapper
                  wrapper.appendChild(row);
                
                  // === SE TIPO FOR CATEGÓRICA / MÚLTIPLA, OPÇÕES ABAIXO, IGUAL SEÇÃO NORMAL ===
                  if (["perguntaCategorica", "perguntaMultipla"].includes(cItem.tipo)) {
                    const listaOpcoesCond = document.createElement("div");
                    listaOpcoesCond.className = "lista-opcoes";
                    listaOpcoesCond.style.marginTop = "6px";
                    listaOpcoesCond.style.marginLeft = "40px";
                
                    let opState = Array.isArray(cItem.opcoes) ? [...cItem.opcoes] : [];
                
                    function renderOpcoesCond() {
                      listaOpcoesCond.innerHTML = "";
                
                      opState.forEach((opc, idxOp) => {
                        const linhaOpt = document.createElement("div");
                        linhaOpt.className = "opcao-row";
                
                        const btnUpOpc = document.createElement("button");
                        btnUpOpc.textContent = "▲";
                        btnUpOpc.className = "botaoMover";
                        btnUpOpc.addEventListener("click", async () => {
                          if (idxOp > 0) {
                            [opState[idxOp], opState[idxOp - 1]] =
                              [opState[idxOp - 1], opState[idxOp]];
                            cItem.opcoes = opState;
                            await salvarEstado();
                            renderOpcoes();
                          }
                        });
                
                        const btnDownOpc = document.createElement("button");
                        btnDownOpc.textContent = "▼";
                        btnDownOpc.className = "botaoMover";
                        btnDownOpc.addEventListener("click", async () => {
                          if (idxOp < opState.length - 1) {
                            [opState[idxOp], opState[idxOp + 1]] =
                              [opState[idxOp + 1], opState[idxOp]];
                            cItem.opcoes = opState;
                            await salvarEstado();
                            renderOpcoes();
                          }
                        });
                
                        linhaOpt.appendChild(btnUpOpc);
                        linhaOpt.appendChild(btnDownOpc);
                
                        const nOp = document.createElement("span");
                        nOp.textContent = (idxOp + 1) + ".";
                        nOp.style.width = "18px";
                        linhaOpt.appendChild(nOp);
                
                        const spanOpt = makeEditableSpan({
                          text: opc,
                          placeholder: "Clique para editar opção",
                          className: "input-opcao",
                          onSave: async (novo) => {
                            opState[idxOp] = novo;
                            cItem.opcoes = opState;
                            await salvarEstado();
                          }
                        });
                        spanOpt.style.flex = "1";
                        linhaOpt.appendChild(spanOpt);
                
                        const btnExcluirOpc = document.createElement("button");
                        btnExcluirOpc.textContent = "✕";
                        btnExcluirOpc.className = "botaoPadrao botaoPerigo";
                        btnExcluirOpc.style.marginLeft = "4px";
                        btnExcluirOpc.addEventListener("click", async (e) => {
                          e.preventDefault();
                          opState.splice(idxOp, 1);
                          cItem.opcoes = opState;
                          await salvarEstado();
                          renderOpcoes();
                        });
                
                        linhaOpt.appendChild(btnExcluirOpc);
                
                        listaOpcoesCond.appendChild(linhaOpt);
                      });
                
                      const addRow = document.createElement("div");
                      const btnAdd = document.createElement("button");
                      btnAdd.textContent = "Adicionar opção";
                      btnAdd.className = "botaoPadrao";
                      btnAdd.addEventListener("click", async (e) => {
                        e.preventDefault();
                        opState.push("");
                        cItem.opcoes = opState;
                        await salvarEstado();
                        renderOpcoes();
                      });
                      addRow.appendChild(btnAdd);
                      listaOpcoesCond.appendChild(addRow);
                    }
                
                    renderOpcoesCond();
                    wrapper.appendChild(listaOpcoesCond);
                  }
                
                  // por fim, adiciona o wrapper ao container de itens condicionais
                  listaCondItens.appendChild(wrapper);
                });



            
                  secCond.appendChild(listaCondItens);
            
                  // Rodapé: botão + item condicional
                  const footerCond = document.createElement("div");
                  footerCond.className = "secao-footer-condicional";
            
                  const btnAddCond = document.createElement("button");
                  btnAddCond.type = "button";
                  btnAddCond.className = "botao-add-item-circular";
                  btnAddCond.textContent = "+";
            
                  btnAddCond.addEventListener("click", async (e) => {
                    e.preventDefault();
                    cond.itens.push({
                      idItem: "ci" + Date.now(),
                      tipo: "textoFixo",
                      obrigatorio: false,
                      conteudo: "",
                      opcoes: []
                    });
                    await salvarEstado();
                    renderOpcoes();
                  });
            
                  footerCond.appendChild(btnAddCond);
                  secCond.appendChild(footerCond);
            
                  listaOpcoes.appendChild(secCond);
                }
              });
          
              const addRow = document.createElement("div");
              const btnAdd = document.createElement("button");
              btnAdd.textContent = "Adicionar opção";
              btnAdd.className = "botaoPadrao";
              btnAdd.addEventListener("click", async (e) => {
                e.preventDefault();
                state.push({ texto: "", dinamico: false, condicional: null });
                await salvarEstado();
                renderOpcoes();
              });
              addRow.appendChild(btnAdd);
              listaOpcoes.appendChild(addRow);
            }
          
            renderOpcoes();
          }
          
          // PERGUNTA MÚLTIPLA (continua com array de strings, como antes)
          if (item.tipo === "perguntaMultipla") {
            info.appendChild(
              makeEditableSpan({
                text: item.pergunta,
                placeholder: "Clique para editar pergunta",
                className: "input-pergunta",
                onSave: (novo) =>
                  setCampoItem(
                    projetoId,
                    templateId,
                    secao.idSecao,
                    item.idItem,
                    "pergunta",
                    novo
                  )
              })
            );
          
            const listaOpcoes = document.createElement("div");
            listaOpcoes.className = "lista-opcoes";
            info.appendChild(listaOpcoes);
          
            let state = Array.isArray(item.opcoes) ? [...item.opcoes] : [];  /////// ESSE SE MANTEM COMO ANTES JÁ QUE NÃO VAI SER DINAMICO E NAO VAI PRECISAR RECEBER OBJETOS DENTRO DELE.             
          
            function renderOpcoesMultipla() {
              listaOpcoes.innerHTML = "";
          
              state.forEach((opc, idx) => {
                const linhaOpt = document.createElement("div");
                linhaOpt.className = "opcao-row";
          
                const btnUpOpc = document.createElement("button");
                btnUpOpc.textContent = "▲";
                btnUpOpc.className = "botaoMover";
                btnUpOpc.addEventListener("click", async () => {
                  if (idx > 0) {
                    [state[idx], state[idx - 1]] = [state[idx - 1], state[idx]];
                    await salvarOpcoes(
                      projetoId,
                      templateId,
                      secao.idSecao,
                      item.idItem,
                      state
                    );
                    renderOpcoesMultipla();
                  }
                });
          
                const btnDownOpc = document.createElement("button");
                btnDownOpc.textContent = "▼";
                btnDownOpc.className = "botaoMover";
                btnDownOpc.addEventListener("click", async () => {
                  if (idx < state.length - 1) {
                    [state[idx], state[idx + 1]] = [state[idx + 1], state[idx]];
                    await salvarOpcoes(
                      projetoId,
                      templateId,
                      secao.idSecao,
                      item.idItem,
                      state
                    );
                    renderOpcoesMultipla();
                  }
                });
          
                linhaOpt.appendChild(btnUpOpc);
                linhaOpt.appendChild(btnDownOpc);
          
                const n = document.createElement("span");
                n.textContent = idx + 1 + ".";
                n.style.width = "18px";
                linhaOpt.appendChild(n);
          
                const spanOpt = makeEditableSpan({
                  text: opc,
                  placeholder: "Clique para editar opção",
                  className: "input-opcao",
                  onSave: async (novo) => {
                    state[idx] = novo;
                    await salvarOpcoes(
                      projetoId,
                      templateId,
                      secao.idSecao,
                      item.idItem,
                      state
                    );
                  }
                });
                spanOpt.style.flex = "1";
                linhaOpt.appendChild(spanOpt);
          
                const btnExcluirOpc = document.createElement("button");
                btnExcluirOpc.textContent = "✕";
                btnExcluirOpc.className = "botaoPadrao botaoPerigo";
                btnExcluirOpc.style.marginLeft = "4px";
                btnExcluirOpc.addEventListener("click", async (e) => {
                  e.preventDefault();
                  state.splice(idx, 1);
                  await salvarOpcoes(
                    projetoId,
                    templateId,
                    secao.idSecao,
                    item.idItem,
                    state
                  );
                  renderOpcoesMultipla();
                });
          
                linhaOpt.appendChild(btnExcluirOpc);
          
                listaOpcoes.appendChild(linhaOpt);
              });
          
              const addRow = document.createElement("div");
              const btnAdd = document.createElement("button");
              btnAdd.textContent = "Adicionar opção";
              btnAdd.className = "botaoPadrao";
              btnAdd.addEventListener("click", (e) => {
                e.preventDefault();
                state.push("");
                salvarOpcoes(
                  projetoId,
                  templateId,
                  secao.idSecao,
                  item.idItem,
                  state
                );
                renderOpcoesMultipla();
              });
              addRow.appendChild(btnAdd);
              listaOpcoes.appendChild(addRow);
            }
          
            renderOpcoesMultipla();
          }

          ///////////////////////////////GRANDE SUBSTITUIÇÃO FINAL -------------------------------------------------------------------------------------------------

          // botões de mover item
          const btnUpItem = document.createElement("button");
          btnUpItem.textContent = "▲";
          btnUpItem.className = "botaoMover";

          btnUpItem.addEventListener("click", async () => {
            const idx = secao.itens.findIndex((it) => it.idItem === item.idItem);
            if (idx > 0) {
              [secao.itens[idx], secao.itens[idx - 1]] = [secao.itens[idx - 1], secao.itens[idx]];
              await atualizarOrdemItens(secao.idSecao, secao.itens);
              await renderizarTudo();
            }
          });

          const btnDownItem = document.createElement("button");
          btnDownItem.textContent = "▼";
          btnDownItem.className = "botaoMover";

          btnDownItem.addEventListener("click", async () => {
            const idx = secao.itens.findIndex((it) => it.idItem === item.idItem);
            if (idx < secao.itens.length - 1) {
              [secao.itens[idx], secao.itens[idx + 1]] = [secao.itens[idx + 1], secao.itens[idx]];
              await atualizarOrdemItens(secao.idSecao, secao.itens);
              await renderizarTudo();
            }
          });

          controlesItem.appendChild(btnUpItem);
          controlesItem.appendChild(btnDownItem);

          linha.appendChild(info);
          linha.appendChild(controlesItem);
          listaItens.appendChild(linha);

          btnObrig.addEventListener("click", async () => {
            try {
              await setObrigatorioItem(
                projetoId,
                templateId,
                secao.idSecao,
                item.idItem,
                !item.obrigatorio
              );
              await renderizarTudo();
            } catch (e) {
              console.error("Erro obrig:", e);
            }
          });

          btnDelete.addEventListener("click", async () => {
            if (!confirm("Excluir este item?")) return;
            try {
              await deletarItem(projetoId, templateId, secao.idSecao, item.idItem);
              await renderizarTudo();
            } catch (e) {
              console.error("Erro deletar item:", e);
            }
          });
        });

        sec.appendChild(listaItens);
        
        // >>> NOVO: rodapé da seção com o botão circular +
        const secaoFooter = document.createElement("div");
        secaoFooter.className = "secao-footer";
        secaoFooter.appendChild(btnAddItem);
        sec.appendChild(secaoFooter);
        // <<< FIM BLOCO NOVO
        //////////////////////////////////////// INICIA A FUNÇÃO PARA O BOTAO DE ESCALAVEL
        btnEscalavel.addEventListener("click", async () => {
        const novoValor = !Boolean(secao.escalavel);
        secao.escalavel = novoValor;
        btnEscalavel.classList.toggle("ativo", novoValor);
        await setCampoSecao(projetoId, templateId, secao.idSecao, "escalavel", novoValor);
      });
        //////////////////////////////////////// FIM DA FUNÇÃO PARA O BOTAO DE ESCALAVEL
        
        btnAddItem.addEventListener("click", async () => {
          try {
            const novo = await adicionarItemInicial(projetoId, templateId, secao.idSecao, "textoFixo");
            await renderizarTudo();
            const select = document.querySelector(
              `[data-iditem="${novo.idItem}"] .select-tipo`
            );
            setTimeout(() => select?.focus(), 0);
          } catch (e) {
            console.error("Erro add item:", e);
          }
        });

        btnRemoverSecao.addEventListener("click", async () => {
          if (!confirm("Excluir esta seção?")) return;
          try {
            await deletarSecao(projetoId, templateId, secao.idSecao);
            await renderizarTudo();
          } catch (e) {
            console.error("Erro deletar secao:", e);
          }
        });

        

        lista.appendChild(sec);
      });
    }

    // inicialização
    document.getElementById("btnCriarSecao")?.addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      try {
        btn.disabled = true;
        btn.textContent = "Criando...";
        await criarSecao(projetoId, templateId);
        await renderizarTudo();
      } catch (err) {
        console.error("Erro ao criar seção:", err);
        alert("Não foi possível criar seção.");
      } finally {
        btn.disabled = false;
        btn.textContent = "➕ Criar Seção";
      }
    });

    //Renderizar tudo que foi definido do DOMContent
    await renderizarTudo();
    // some com a tela de loading e mostra a interface
    if (telaCarregando) telaCarregando.style.display = "none";
    if (container) container.classList.remove("escondido");
    //Tela estará pronta e apresentada, após findar o carregamento.
    
  } catch (err) {
    console.error("Erro editarTemplate:", err);
    alert("Erro ao carregar dados do template.");
    if (telaCarregando) telaCarregando.style.display = "none"; 
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  }
});
