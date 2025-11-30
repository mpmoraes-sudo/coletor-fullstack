// utilizarTemplates.js
// Módulo de utilização dos templates (leitura + preenchimento + cópia),
// agora com suporte a seções "escaláveis" (secao.escalavel === true).

// respostas[secaoId][ocorrencia][itemId] = valor
const respostas = {};
// ocorrenciasPorSecao[secaoId] = quantidade de vezes que a seção será repetida
const ocorrenciasPorSecao = {};

// respostas condicionais de opções dinâmicas
// respostasCondicionais[secaoId][occSecao][itemId][condOcc][condItemId] = valor
const respostasCondicionais = {};
// número de ocorrências das seções condicionais
// ocorrenciasCondicionais[secaoId][occSecao][itemId] = N
const ocorrenciasCondicionais = {};


function resetEstadoFormulario() {
  for (const k in respostas) delete respostas[k];
  for (const k in ocorrenciasPorSecao) delete ocorrenciasPorSecao[k];
  for (const k in respostasCondicionais) delete respostasCondicionais[k];
  for (const k in ocorrenciasCondicionais) delete ocorrenciasCondicionais[k];
}

// Normaliza opcoes de perguntaCategorica (string -> objeto)
function normalizarOpcoesCateg(item) {
  return (item.opcoes || []).map((op) => {
    if (typeof op === "string") {
      return { texto: op, dinamico: false, condicional: null };
    }
    return {
      texto: op.texto || "",
      dinamico: !!op.dinamico,
      condicional: op.condicional || null
    };
  });
}

// Apaga todas respostas condicionais de uma pergunta (quando muda seleção)
function limparCondicionais(secaoId, occ, itemId) {
  if (
    respostasCondicionais[secaoId] &&
    respostasCondicionais[secaoId][occ]
  ) {
    delete respostasCondicionais[secaoId][occ][itemId];
  }
  if (
    ocorrenciasCondicionais[secaoId] &&
    ocorrenciasCondicionais[secaoId][occ]
  ) {
    delete ocorrenciasCondicionais[secaoId][occ][itemId];
  }
}

// Garante objeto de respostas para (secao, ocorrencia, item, ocorrenciaCondicional)
function getRespostasCondUso(secaoId, occ, itemId, condOcc) {
  if (!respostasCondicionais[secaoId]) respostasCondicionais[secaoId] = {};
  if (!respostasCondicionais[secaoId][occ]) respostasCondicionais[secaoId][occ] = {};
  if (!respostasCondicionais[secaoId][occ][itemId]) {
    respostasCondicionais[secaoId][occ][itemId] = {};
  }
  if (!respostasCondicionais[secaoId][occ][itemId][condOcc]) {
    respostasCondicionais[secaoId][occ][itemId][condOcc] = {};
  }
  return respostasCondicionais[secaoId][occ][itemId][condOcc];
}

// Obtém total de ocorrências da seção condicional (respeitando escalável)
function getTotalOcorrenciasCond(secaoId, occ, itemId, condEscalavel) {
  if (!condEscalavel) return 1;
  if (!ocorrenciasCondicionais[secaoId]) ocorrenciasCondicionais[secaoId] = {};
  if (!ocorrenciasCondicionais[secaoId][occ]) ocorrenciasCondicionais[secaoId][occ] = {};
  if (ocorrenciasCondicionais[secaoId][occ][itemId] == null) {
    ocorrenciasCondicionais[secaoId][occ][itemId] = 1;
  }
  return ocorrenciasCondicionais[secaoId][occ][itemId];
}

// Incrementa número de ocorrências da seção condicional
function adicionarOcorrenciaCond(secaoId, occ, itemId) {
  if (!ocorrenciasCondicionais[secaoId]) ocorrenciasCondicionais[secaoId] = {};
  if (!ocorrenciasCondicionais[secaoId][occ]) ocorrenciasCondicionais[secaoId][occ] = {};
  const atual = ocorrenciasCondicionais[secaoId][occ][itemId] || 1;
  ocorrenciasCondicionais[secaoId][occ][itemId] = atual + 1;
}



document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const projetoId = params.get("projetoId");
  const templateId = params.get("templateId");

  if (!projetoId || !templateId) {
    alert("Projeto ou Template não informados.");
    window.location.href = "SelecaoDeModulos.html";
    return;
  }

  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    alert("Sessão não encontrada. Faça login novamente.");
    window.location.href = "../index.html";
    return;
  }

  const telaCarregando = document.getElementById("telaCarregando");
  const container = document.querySelector(".container");

  if (telaCarregando) telaCarregando.style.display = "flex";
  if (container) container.classList.add("escondido");

  let emailUsuario;
  let templateCarregado = null;

  try {
    // ===== Validação da sessão =====
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

    const usuarioLogadoEl = document.getElementById("usuarioLogado");
    if (usuarioLogadoEl) {
      usuarioLogadoEl.textContent = `Logado como: ${emailUsuario}`;
    }

    document.getElementById("botaoLogout")?.addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });

    document.getElementById("botaoHome")?.addEventListener("click", () => {
      window.location.href = "SelecaoDeModulos.html";
    });

    // Carregar projeto + template
    const { projeto, template } = await carregarProjetoETemplate(
      emailUsuario,
      projetoId,
      templateId
    );
    templateCarregado = template;

    document.getElementById("nomeProjeto").textContent = `Projeto: ${projeto.nome}`;
    document.getElementById("nomeTemplate").textContent = `Template: ${template.nome}`;

    // Estado inicial do formulário
    resetEstadoFormulario();
    montarFormulario(templateCarregado);

    // Copiar resultado final
    document.getElementById("btnCopiarResultado")?.addEventListener("click", () => {
      copiarResultado(templateCarregado);
    });

    if (telaCarregando) telaCarregando.style.display = "none";
    if (container) container.classList.remove("escondido");
  } catch (err) {
    console.error("Erro ao carregar template:", err);
    alert("Erro ao carregar template.");
    if (telaCarregando) telaCarregando.style.display = "none";
    localStorage.removeItem("tokenDeSessao");
    window.location.href = "../index.html";
  }
});

// Helper para /api/projetos
async function chamarApiProjetos(payload) {
  const resp = await fetch("/api/projetos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  if (!resp.ok || data?.error || data?.success === false) {
    throw new Error(data.error || "Erro na API de projetos.");
  }
  return data;
}

// Carrega o projeto e o template via acao "listar" e filtra no front
async function carregarProjetoETemplate(emailUsuario, projetoId, templateId) {
  const projetos = await chamarApiProjetos({
    acao: "listar",
    emailUsuario
  });

  const projetosArray = Array.isArray(projetos) ? projetos : [];

  const projeto = projetosArray.find(
    (p) => String(p._id) === String(projetoId)
  );
  if (!projeto) {
    throw new Error("Projeto não encontrado ou você não tem acesso a ele.");
  }

  // Garante que o usuário é membro com convite aceito (editor ou leitor)
  const meu = (projeto.membros || []).find(
    (m) =>
      m.email === emailUsuario &&
      m.conviteAceito !== false &&
      (m.permissao === "editor" || m.permissao === "leitor")
  );
  if (!meu) {
    throw new Error("Você não tem permissão para utilizar templates deste projeto.");
  }

  const template = (projeto.templates || []).find(
    (t) => String(t._id) === String(templateId)
  );
  if (!template) {
    throw new Error("Template não encontrado neste projeto.");
  }

  return { projeto, template };
}

// Monta o formulário de utilização a partir da estrutura do template,
// respeitando seções "escaláveis" (secao.escalavel).
function montarFormulario(template) {
  const container = document.getElementById("formularioContainer");
  if (!container) return;

  container.innerHTML = "";

  (template.secoes || []).forEach((secao) => {
    const secaoId = secao.idSecao || "";

    const escalavel = !!secao.escalavel;

    // Se ainda não há registro de ocorrências desta seção, começa em 1
    if (ocorrenciasPorSecao[secaoId] == null) {
      ocorrenciasPorSecao[secaoId] = 1;
    }

    const totalOcorrencias = escalavel
      ? ocorrenciasPorSecao[secaoId]
      : 1;

    // Bloco que agrupa todas as ocorrências desta seção
    const blocoSecao = document.createElement("div");
    blocoSecao.className = escalavel ? "bloco-secao escalavel" : "bloco-secao";
    blocoSecao.style.marginBottom = "24px";

    for (let occ = 1; occ <= totalOcorrencias; occ++) {
      const divSecao = document.createElement("div");   ///////////////////////////////////////NOVO 30/11
      divSecao.classList.add("secao-uso"); 
      divSecao.style.marginBottom = "16px";

       if (escalavel) {
      // Título da seção aparece apenas UMA vez, antes da primeira ocorrência
      if (occ === 1) {
        const tituloPrincipal = document.createElement("h4");
        tituloPrincipal.textContent = (secao.titulo || "").toUpperCase();
        tituloPrincipal.className = "titulo-secao";
        blocoSecao.appendChild(tituloPrincipal);
      }
  
      // Espaçamento extra entre #1, #2, #3...
      if (occ > 1) {
        divSecao.style.marginTop = "16px";
      }
  
      // Linha com #1, #2, #3...
      const subTitulo = document.createElement("div");
      subTitulo.textContent = `#${occ}`;
      subTitulo.className = "subtitulo-ocorrencia";
      divSecao.appendChild(subTitulo);
      } else {
      // Seção NÃO escalável: título normal como antes
      const titulo = document.createElement("h4");
      titulo.textContent = (secao.titulo || "").toUpperCase();
      titulo.className = "titulo-secao";
      divSecao.appendChild(titulo);
      }
  
      const respostasSecao =
        (respostas[secaoId] && respostas[secaoId][occ]) || {};

      (secao.itens || []).forEach((item) => {
        const divItem = document.createElement("div");
        divItem.className = "item-preenchimento";

        // TEXTOS FIXOS
        if (item.tipo === "textoFixo") {
          const p = document.createElement("p");
          p.textContent = item.conteudo || "";
          divItem.appendChild(p);
        }

        // PERGUNTA SUBJETIVA
        if (item.tipo === "perguntaSubjetiva") {
          const label = document.createElement("label");
          label.textContent = item.pergunta || "—";

          if (item.obrigatorio) {
            const asterisco = document.createElement("span");
            asterisco.textContent = " *";
            asterisco.className = "asterisco-obrigatorio";
            label.appendChild(asterisco);
          }

          const input = document.createElement("input");
          input.type = "text";
          input.style.marginLeft = "6px";
          input.style.width = "60%";

          input.value = respostasSecao[item.idItem] || "";

          input.addEventListener("input", () => {
            if (!respostas[secaoId]) respostas[secaoId] = {};
            if (!respostas[secaoId][occ]) respostas[secaoId][occ] = {};
            respostas[secaoId][occ][item.idItem] = input.value;
          });

          divItem.appendChild(label);
          divItem.appendChild(input);
        }

        // PERGUNTA CATEGÓRICA (SELECT)
                // PERGUNTA CATEGÓRICA (SELECT) + SEÇÃO DINÂMICA
        if (item.tipo === "perguntaCategorica") {
          const label = document.createElement("label");
          label.textContent = item.pergunta || "—";

          if (item.obrigatorio) {
            const asterisco = document.createElement("span");
            asterisco.textContent = " *";
            asterisco.className = "asterisco-obrigatorio";
            label.appendChild(asterisco);
          }

          const select = document.createElement("select");
          select.style.marginLeft = "6px";

          const optVazio = document.createElement("option");
          optVazio.value = "";
          optVazio.textContent = "-- selecione --";
          select.appendChild(optVazio);

          const opcoesNorm = normalizarOpcoesCateg(item);
          opcoesNorm.forEach((op) => {
            const opt = document.createElement("option");
            opt.value = op.texto;
            opt.textContent = op.texto;
            select.appendChild(opt);
          });

          const valorAtual = respostasSecao[item.idItem] || "";
          select.value = valorAtual;

          // Container visual da seção dinâmica (indenta + fundo azul)
          const condContainer = document.createElement("div");
          condContainer.className = "secao-dinamica-uso";
          condContainer.style.display = "none";

          function renderCondicionalUso() {
            condContainer.innerHTML = "";

            const valorSel = select.value;
            if (!valorSel) {
              condContainer.style.display = "none";
              return;
            }

            const opDinamica = opcoesNorm.find(
              (op) =>
                op.texto === valorSel &&
                op.dinamico &&
                op.condicional &&
                Array.isArray(op.condicional.itens) &&
                op.condicional.itens.length > 0
            );

            if (!opDinamica) {
              condContainer.style.display = "none";
              return;
            }

            const cond = opDinamica.condicional;
            const condEscalavel = !!cond.escalavel;
            const itensCond = cond.itens || [];

            const totalCondOcc = getTotalOcorrenciasCond(
              secaoId,
              occ,
              item.idItem,
              condEscalavel
            );

            for (let cOcc = 1; cOcc <= totalCondOcc; cOcc++) {
              const bloco = document.createElement("div");
              bloco.className = "bloco-condicional-ocorrencia";

              if (condEscalavel) {
                if (cOcc > 1) {
                  bloco.style.marginTop = "12px";
                }
                const sub = document.createElement("div");
                sub.textContent = `#${cOcc}`;
                sub.className = "subtitulo-ocorrencia-cond";
                bloco.appendChild(sub);
              }

              const respostasCondOcc = getRespostasCondUso(
                secaoId,
                occ,
                item.idItem,
                cOcc
              );

              itensCond.forEach((cItem) => {
                const divCondItem = document.createElement("div");
                divCondItem.className = "item-preenchimento";

                // TEXTO FIXO
                if (cItem.tipo === "textoFixo") {
                  const p = document.createElement("p");
                  p.textContent = cItem.conteudo || "";
                  divCondItem.appendChild(p);
                }

                // PERGUNTA LIVRE
                if (cItem.tipo === "perguntaSubjetiva") {
                  const lbl = document.createElement("label");
                  lbl.textContent = cItem.pergunta || "—";

                  if (cItem.obrigatorio) {
                    const ast = document.createElement("span");
                    ast.textContent = " *";
                    ast.className = "asterisco-obrigatorio";
                    lbl.appendChild(ast);
                  }

                  const input = document.createElement("input");
                  input.type = "text";
                  input.style.marginLeft = "6px";
                  input.style.width = "60%";
                  input.value = respostasCondOcc[cItem.idItem] || "";

                  input.addEventListener("input", () => {
                    const r = getRespostasCondUso(
                      secaoId,
                      occ,
                      item.idItem,
                      cOcc
                    );
                    r[cItem.idItem] = input.value;
                  });

                  divCondItem.appendChild(lbl);
                  divCondItem.appendChild(input);
                }

                // PERGUNTA CATEGÓRICA DENTRO DA SEÇÃO DINÂMICA
                if (cItem.tipo === "perguntaCategorica") {
                  const lbl = document.createElement("label");
                  lbl.textContent = cItem.pergunta || "—";

                  if (cItem.obrigatorio) {
                    const ast = document.createElement("span");
                    ast.textContent = " *";
                    ast.className = "asterisco-obrigatorio";
                    lbl.appendChild(ast);
                  }

                  const sel = document.createElement("select");
                  sel.style.marginLeft = "6px";

                  const optVaz = document.createElement("option");
                  optVaz.value = "";
                  optVaz.textContent = "-- selecione --";
                  sel.appendChild(optVaz);

                  (cItem.opcoes || []).forEach((opc) => {
                    const opt = document.createElement("option");
                    opt.value = opc;
                    opt.textContent = opc;
                    sel.appendChild(opt);
                  });

                  sel.value = respostasCondOcc[cItem.idItem] || "";

                  sel.addEventListener("change", () => {
                    const r = getRespostasCondUso(
                      secaoId,
                      occ,
                      item.idItem,
                      cOcc
                    );
                    r[cItem.idItem] = sel.value;
                  });

                  divCondItem.appendChild(lbl);
                  divCondItem.appendChild(sel);
                }

                // PERGUNTA MÚLTIPLA DENTRO DA SEÇÃO DINÂMICA
                if (cItem.tipo === "perguntaMultipla") {
                  const perguntaDiv = document.createElement("div");
                  perguntaDiv.textContent = cItem.pergunta || "—";
                  perguntaDiv.className = "item-pergunta";

                  if (cItem.obrigatorio) {
                    const ast = document.createElement("span");
                    ast.textContent = " *";
                    ast.className = "asterisco-obrigatorio";
                    perguntaDiv.appendChild(ast);
                  }

                  divCondItem.appendChild(perguntaDiv);

                  const selecaoAtual = Array.isArray(
                    respostasCondOcc[cItem.idItem]
                  )
                    ? respostasCondOcc[cItem.idItem]
                    : [];

                  const checkboxes = [];

                  (cItem.opcoes || []).forEach((opc) => {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.value = opc;
                    checkbox.style.marginRight = "4px";
                    checkbox.checked = selecaoAtual.includes(opc);

                    const lblOpc = document.createElement("label");
                    lblOpc.style.display = "block";
                    lblOpc.style.marginLeft = "12px";
                    lblOpc.appendChild(checkbox);
                    lblOpc.appendChild(
                      document.createTextNode(opc)
                    );

                    checkbox.addEventListener("change", () => {
                      const selecionados = checkboxes
                        .filter((c) => c.checked)
                        .map((c) => c.value);

                      const r = getRespostasCondUso(
                        secaoId,
                        occ,
                        item.idItem,
                        cOcc
                      );
                      r[cItem.idItem] = selecionados;
                    });

                    checkboxes.push(checkbox);
                    divCondItem.appendChild(lblOpc);
                  });
                }

                bloco.appendChild(divCondItem);
              });

              condContainer.appendChild(bloco);
            }

            if (condEscalavel) {
              const controls = document.createElement("div");
              controls.style.marginTop = "4px";

              const btnAdd = document.createElement("button");
              btnAdd.textContent = "Adicionar ocorrência";
              btnAdd.className = "botaoPadrao";

              btnAdd.addEventListener("click", (e) => {
                e.preventDefault();
                adicionarOcorrenciaCond(secaoId, occ, item.idItem);
                renderCondicionalUso();
              });

              controls.appendChild(btnAdd);
              condContainer.appendChild(controls);
            }

            condContainer.style.display = "block";
            }
  
            // guarda último valor pra saber quando limpar condicionais
            let ultimoValor = select.value;
  
            select.addEventListener("change", () => {
              if (!respostas[secaoId]) respostas[secaoId] = {};
              if (!respostas[secaoId][occ]) respostas[secaoId][occ] = {};
  
              const novoValor = select.value;
  
              if (novoValor !== ultimoValor) {
                limparCondicionais(secaoId, occ, item.idItem);
                ultimoValor = novoValor;
              }
  
              respostas[secaoId][occ][item.idItem] = novoValor;
              renderCondicionalUso();
            });
  
            divItem.appendChild(label);
            divItem.appendChild(select);
            divItem.appendChild(condContainer);
  
            // render inicial (caso já exista resposta salva)
            renderCondicionalUso();
          }


        // PERGUNTA MÚLTIPLA (CHECKBOXES)
        if (item.tipo === "perguntaMultipla") {
          const pergunta = document.createElement("div");
          pergunta.textContent = item.pergunta || "—";
          pergunta.className = "item-pergunta";

          if (item.obrigatorio) {
            const asterisco = document.createElement("span");
            asterisco.textContent = " *";
            asterisco.className = "asterisco-obrigatorio";
            pergunta.appendChild(asterisco);
          }

          divItem.appendChild(pergunta);

          const selecaoAtual = Array.isArray(respostasSecao[item.idItem])
            ? respostasSecao[item.idItem]
            : [];

          const checkboxes = [];

          (item.opcoes || []).forEach((opc) => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = opc;
            checkbox.style.marginRight = "4px";
            checkbox.checked = selecaoAtual.includes(opc);

            const lbl = document.createElement("label");
            lbl.style.display = "block";
            lbl.style.marginLeft = "12px";
            lbl.appendChild(checkbox);
            lbl.appendChild(document.createTextNode(opc));

            checkbox.addEventListener("change", () => {
              const selecionados = checkboxes
                .filter((c) => c.checked)
                .map((c) => c.value);

              if (!respostas[secaoId]) respostas[secaoId] = {};
              if (!respostas[secaoId][occ]) respostas[secaoId][occ] = {};
              respostas[secaoId][occ][item.idItem] = selecionados;
            });

            checkboxes.push(checkbox);
            divItem.appendChild(lbl);
          });
        }

        divSecao.appendChild(divItem);
      });

      blocoSecao.appendChild(divSecao);
    }

    // Botão para adicionar nova ocorrência, se seção for escalável
    if (escalavel) {
      const controls = document.createElement("div");
      controls.style.marginTop = "4px";

      const btnAddOcorrencia = document.createElement("button");
      btnAddOcorrencia.textContent = "Adicionar ocorrência";
      btnAddOcorrencia.className = "botaoPadrao";

      btnAddOcorrencia.addEventListener("click", (e) => {
        e.preventDefault();
        const atual = ocorrenciasPorSecao[secaoId] || 1;
        ocorrenciasPorSecao[secaoId] = atual + 1;
        montarFormulario(template);
      });

      controls.appendChild(btnAddOcorrencia);
      blocoSecao.appendChild(controls);
    }

    container.appendChild(blocoSecao);
  });
}

// Valida campos obrigatórios antes de gerar o texto,
// levando em conta seções escaláveis (todas as ocorrências).
function validarObrigatorios(template) {
  const faltando = [];

  (template.secoes || []).forEach((secao) => {
    const secaoId = secao.idSecao || "";
    const escalavel = !!secao.escalavel;
    const totalOcorrencias = escalavel
      ? (ocorrenciasPorSecao[secaoId] || 1)
      : 1;

    for (let occ = 1; occ <= totalOcorrencias; occ++) {
      const respostasSecao =
        (respostas[secaoId] && respostas[secaoId][occ]) || {};

            (secao.itens || []).forEach((item) => {
        // 1) valida campo "normal"
        if (item.obrigatorio) {
          const resp = respostasSecao[item.idItem];
          let ok = true;

          if (
            item.tipo === "perguntaSubjetiva" ||
            item.tipo === "perguntaCategorica"
          ) {
            ok = !!(resp && String(resp).trim());
          } else if (item.tipo === "perguntaMultipla") {
            ok = Array.isArray(resp) && resp.length > 0;
          } else {
            ok = true; // textoFixo
          }

          if (!ok) {
            faltando.push({ secao, item, ocorrencia: occ });
          }
        }

        // 2) se for categórica, valida itens da seção dinâmica vinculada à opção escolhida
        if (item.tipo === "perguntaCategorica") {
          const valorSel = respostasSecao[item.idItem];
          if (!valorSel) return;

          const opcoesNorm = normalizarOpcoesCateg(item);
          const opDinamica = opcoesNorm.find(
            (op) =>
              op.texto === valorSel &&
              op.dinamico &&
              op.condicional &&
              Array.isArray(op.condicional.itens) &&
              op.condicional.itens.length > 0
          );
          if (!opDinamica) return;

          const cond = opDinamica.condicional;
          const condEscalavel = !!cond.escalavel;
          const itensCond = cond.itens || [];

          const totalCondOcc = getTotalOcorrenciasCond(
            secaoId,
            occ,
            item.idItem,
            condEscalavel
          );


          
          for (let cOcc = 1; cOcc <= totalCondOcc; cOcc++) {
            const respostasCondOcc =
              ((((respostasCondicionais[secaoId] || {})[occ] || {})[
                item.idItem
              ] || {})[cOcc]) || {};

            itensCond.forEach((cItem) => {
              if (!cItem.obrigatorio) return;

              const r = respostasCondOcc[cItem.idItem];
              let okCond = true;

              if (
                cItem.tipo === "perguntaSubjetiva" ||
                cItem.tipo === "perguntaCategorica"
              ) {
                okCond = !!(r && String(r).trim());
              } else if (cItem.tipo === "perguntaMultipla") {
                okCond = Array.isArray(r) && r.length > 0;
              } else {
                okCond = true;
              }

              if (!okCond) {
                faltando.push({
                  secao,
                  item: cItem,
                  ocorrencia: occ
                });
              }
            });
          }
        }
      });



      
    }
  });

  return faltando;
}

function gerarTextoCondicionalParaItem(secaoId, item, valorSelecionado, occ) {
  const opcoesNorm = normalizarOpcoesCateg(item);
  const opDinamica = opcoesNorm.find(
    (op) =>
      op.texto === valorSelecionado &&
      op.dinamico &&
      op.condicional &&
      Array.isArray(op.condicional.itens) &&
      op.condicional.itens.length > 0
  );
  if (!opDinamica) return "";

  const cond = opDinamica.condicional;
  const condEscalavel = !!cond.escalavel;
  const itensCond = cond.itens || [];
  if (!itensCond.length) return "";

  const totalCondOcc = getTotalOcorrenciasCond(
    secaoId,
    occ,
    item.idItem,
    condEscalavel
  );

  // só mostra #1, #2 etc se houver MAIS de uma ocorrência
  const mostrarNumero = condEscalavel && totalCondOcc > 1;

  let texto = "";
  const indent = "     "; // 5 espaços

  for (let cOcc = 1; cOcc <= totalCondOcc; cOcc++) {
    const respostasCondOcc =
      ((((respostasCondicionais[secaoId] || {})[occ] || {})[
        item.idItem
      ] || {})[cOcc]) || {};

    if (mostrarNumero) {
      texto += `${indent}#${cOcc}\n`;
    }

    itensCond.forEach((cItem) => {
      const r = respostasCondOcc[cItem.idItem];

      if (cItem.tipo === "textoFixo") {
        if (cItem.conteudo && cItem.conteudo.trim() !== "") {
          texto += `${indent}${cItem.conteudo}\n`;
        }
      } else if (
        cItem.tipo === "perguntaSubjetiva" ||
        cItem.tipo === "perguntaCategorica"
      ) {
        texto += `${indent}${cItem.pergunta || ""} ${r || ""}\n`;
      } else if (cItem.tipo === "perguntaMultipla") {
        texto += `${indent}${cItem.pergunta || ""}\n`;
        if (Array.isArray(r)) {
          r.forEach((opc) => {
            texto += `${indent}( x ) ${opc}\n`;
          });
        }
      }
    });
  }

  return texto;
}




// Gera e copia o conteúdo final para a área de transferência
// incluindo as repetições (#1, #2, ...) das seções escaláveis
// e as seções dinâmicas indentadas.
function copiarResultado(template) {
  if (!template) return;

  const faltando = validarObrigatorios(template);
  if (faltando.length > 0) {
    const primeiro = faltando[0];
    const nomeSecao = primeiro.secao.titulo || "—";
    const textoPergunta =
      primeiro.item.pergunta || primeiro.item.conteudo || "—";
    const sufixoOcc = primeiro.secao.escalavel
      ? ` (#${primeiro.ocorrencia})`
      : "";

    alert(
      "Por favor, preencha todos os campos obrigatórios antes de copiar.\n\n" +
      `Seção: ${nomeSecao}${sufixoOcc}\n` +
      `Campo: ${textoPergunta}`
    );
    return;
  }

  let textoFinal = "";

  (template.secoes || []).forEach((secao) => {
    const secaoId = secao.idSecao || "";
    const escalavel = !!secao.escalavel;
    const totalOcorrencias = escalavel
      ? (ocorrenciasPorSecao[secaoId] || 1)
      : 1;

    const tituloUpper = (secao.titulo || "").toUpperCase();

    // ================= SEÇÃO NÃO ESCALÁVEL =================
    if (!escalavel) {
      // Título da seção
      textoFinal += tituloUpper + "\n";

      // como é não escalável, sempre usamos ocorrência 1
      const respostasSecao =
        ((respostas[secaoId] || {})[1]) || {};

      (secao.itens || []).forEach((item) => {
        const resp = respostasSecao[item.idItem];

        if (item.tipo === "textoFixo") {
          if (item.conteudo && item.conteudo.trim() !== "") {
            textoFinal += (item.conteudo || "") + "\n";
          }
        } else if (item.tipo === "perguntaSubjetiva") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n`;
        } else if (item.tipo === "perguntaCategorica") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n`;
          // texto da seção dinâmica associada (indentado)
          textoFinal += gerarTextoCondicionalParaItem(
            secaoId,
            item,
            resp,
            1
          );
        } else if (item.tipo === "perguntaMultipla") {
          textoFinal += (item.pergunta || "") + "\n";
          if (Array.isArray(resp)) {
            resp.forEach((val) => {
              textoFinal += `( x ) ${val}\n`;
            });
          }
        }
      });

      // linha tracejada ao final da seção
      textoFinal += "--------------------\n";
      return; // passa para a próxima seção
    }

    // ================= SEÇÃO ESCALÁVEL =================
    textoFinal += tituloUpper + "\n";

    const mostrarNumOcorrencia = totalOcorrencias > 1;

    for (let occ = 1; occ <= totalOcorrencias; occ++) {
      const respostasSecao =
        ((respostas[secaoId] || {})[occ]) || {};

      // só mostra #1, #2... se tivermos mais de uma ocorrência
      if (mostrarNumOcorrencia) {
        textoFinal += `#${occ}\n`;
      }

      (secao.itens || []).forEach((item) => {
        const resp = respostasSecao[item.idItem];

        if (item.tipo === "textoFixo") {
          if (item.conteudo && item.conteudo.trim() !== "") {
            textoFinal += (item.conteudo || "") + "\n";
          }
        } else if (item.tipo === "perguntaSubjetiva") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n`;
        } else if (item.tipo === "perguntaCategorica") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n`;
          // texto da seção dinâmica associada (indentado),
          // respeitando a ocorrência da seção principal
          textoFinal += gerarTextoCondicionalParaItem(
            secaoId,
            item,
            resp,
            occ
          );
        } else if (item.tipo === "perguntaMultipla") {
          textoFinal += (item.pergunta || "") + "\n";
          if (Array.isArray(resp)) {
            resp.forEach((val) => {
              textoFinal += `( x ) ${val}\n`;
            });
          }
        }
      });
    }

    // linha tracejada ao final da seção
    textoFinal += "--------------------\n";
  });

  navigator.clipboard
    .writeText(textoFinal)
    .then(() => {
      const aviso = document.getElementById("avisoCopiado");
      if (aviso) {
        aviso.style.display = "block";
        setTimeout(() => (aviso.style.display = "none"), 3000);
      }
    })
    .catch((err) => {
      alert("Erro ao copiar: " + err);
    });
}

