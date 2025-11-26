// utilizarTemplates.js
// Módulo de utilização dos templates (leitura + preenchimento + cópia),
// agora com suporte a seções "escaláveis" (secao.escalavel === true).

// respostas[secaoId][ocorrencia][itemId] = valor
const respostas = {};
// ocorrenciasPorSecao[secaoId] = quantidade de vezes que a seção será repetida
const ocorrenciasPorSecao = {};

function resetEstadoFormulario() {
  for (const k in respostas) delete respostas[k];
  for (const k in ocorrenciasPorSecao) delete ocorrenciasPorSecao[k];
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
      window.location.href = "selecaoDeModulos.html";
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
      const divSecao = document.createElement("div");
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

          (item.opcoes || []).forEach((opc) => {
            const opt = document.createElement("option");
            opt.value = opc;
            opt.textContent = opc;
            select.appendChild(opt);
          });

          const valorAtual = respostasSecao[item.idItem] || "";
          select.value = valorAtual;

          select.addEventListener("change", () => {
            if (!respostas[secaoId]) respostas[secaoId] = {};
            if (!respostas[secaoId][occ]) respostas[secaoId][occ] = {};
            respostas[secaoId][occ][item.idItem] = select.value;
          });

          divItem.appendChild(label);
          divItem.appendChild(select);
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
        if (!item.obrigatorio) return;

        const resp = respostasSecao[item.idItem];
        let ok = true;

        if (item.tipo === "perguntaSubjetiva" || item.tipo === "perguntaCategorica") {
          ok = !!(resp && String(resp).trim());
        } else if (item.tipo === "perguntaMultipla") {
          ok = Array.isArray(resp) && resp.length > 0;
        } else {
          ok = true; // textoFixo não exige resposta do usuário
        }

        if (!ok) {
          faltando.push({ secao, item, ocorrencia: occ });
        }
      });
    }
  });

  return faltando;
}

// Gera e copia o conteúdo final para a área de transferência
// incluindo as repetições (#1, #2, ...) das seções escaláveis.
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

    if (!escalavel) {
      // Seção normal: título + conteúdo (como antes, sem #)
      const respostasSecao =
        (respostas[secaoId] && respostas[secaoId][1]) || {};
  
      textoFinal += `${tituloUpper}\n`;

      (secao.itens || []).forEach((item) => {
        const resp = respostasSecao[item.idItem];

        if (item.tipo === "textoFixo") {
          textoFinal += `${item.conteudo || ""}\n\n`;
        } else if (item.tipo === "perguntaSubjetiva") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n\n`;
        } else if (item.tipo === "perguntaCategorica") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n\n`;
        } else if (item.tipo === "perguntaMultipla") {
          textoFinal += `${item.pergunta || ""}\n`;
          if (Array.isArray(resp)) {
            resp.forEach((opc) => {
              textoFinal += `( x ) ${opc}\n`;
            });
          }
          textoFinal += "\n";
        }
      });
  
      return; // pula pro próximo secao
    }
  
    // Seção ESCALÁVEL
    textoFinal += `${tituloUpper}\n`;
  
    for (let occ = 1; occ <= totalOcorrencias; occ++) {
      const respostasSecao =
        (respostas[secaoId] && respostas[secaoId][occ]) || {};
  
      // Linha vazia antes das ocorrências 2, 3, 4...
      if (occ > 1) {
        textoFinal += "\n";
      }
  
      // Linha com #1, #2, #3...
      textoFinal += `#${occ}\n`;
  
      (secao.itens || []).forEach((item) => {
        const resp = respostasSecao[item.idItem];
  
        if (item.tipo === "textoFixo") {
          textoFinal += `${item.conteudo || ""}\n\n`;
        } else if (item.tipo === "perguntaSubjetiva") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n\n`;
        } else if (item.tipo === "perguntaCategorica") {
          textoFinal += `${item.pergunta || ""} ${resp || ""}\n\n`;
        } else if (item.tipo === "perguntaMultipla") {
          textoFinal += `${item.pergunta || ""}\n`;
          if (Array.isArray(resp)) {
            resp.forEach((opc) => {
              textoFinal += `( x ) ${opc}\n`;
            });
          }
          textoFinal += "\n";
        }
      });
    }
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
