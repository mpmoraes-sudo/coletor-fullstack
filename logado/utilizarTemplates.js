// utilizarTemplates.js
// Módulo de utilização dos templates (somente leitura + preenchimento e cópia)

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const projetoId = params.get("projetoId");
  const templateId = params.get("templateId");

  if (!projetoId || !templateId) {
    alert("Projeto ou Template não informados.");
    window.location.href = "selecaoDeModulos.html";
    return;
  }

  const token = localStorage.getItem("tokenDeSessao");
  if (!token) {
    alert("Sessão não encontrada. Faça login novamente.");
    window.location.href = "../index.html";
    return;
  }

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

    document.querySelector(".container")?.classList.remove("escondido");

    document.getElementById("botaoLogout")?.addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });

    document.getElementById("botaoHome")?.addEventListener("click", () => {
      window.location.href = "selecaoDeModulos.html";
    });

    // Carregar projeto + template
    const { projeto, template } = await carregarProjetoETemplate(emailUsuario, projetoId, templateId);
    templateCarregado = template;

    document.getElementById("nomeProjeto").textContent = `Projeto: ${projeto.nome}`;
    document.getElementById("nomeTemplate").textContent = `Template: ${template.nome}`;

    montarFormulario(template);

    // Copiar resultado final
    document.getElementById("btnCopiarResultado")?.addEventListener("click", () => {
      copiarResultado(templateCarregado);
    });

  } catch (err) {
    console.error("Erro ao carregar template:", err);
    alert("Erro ao carregar template.");
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

// Armazenará as respostas do usuário em memória
const respostas = {};

// Monta o formulário de utilização a partir da estrutura do template
function montarFormulario(template) {
  const container = document.getElementById("formularioContainer");
  if (!container) return;

  container.innerHTML = "";
  Object.keys(respostas).forEach((k) => delete respostas[k]); // limpa estado anterior

  (template.secoes || []).forEach((secao) => {
    const divSecao = document.createElement("div");
    divSecao.style.marginBottom = "20px";

    const titulo = document.createElement("h4");
    titulo.textContent = (secao.titulo || "").toUpperCase();
    titulo.className = "titulo-secao";
    divSecao.appendChild(titulo);

    (secao.itens || []).forEach((item) => {
      const divItem = document.createElement("div");
      divItem.className = "item-preenchimento";

      // Texto fixo: o usuário não edita nada
      if (item.tipo === "textoFixo") {
        const p = document.createElement("p");
        p.textContent = item.conteudo || "";
        divItem.appendChild(p);
      }

      // Pergunta subjetiva: texto livre
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

        input.addEventListener("input", () => {
          respostas[item.idItem] = input.value;
        });

        divItem.appendChild(label);
        divItem.appendChild(input);
      }

      // Pergunta categórica: select (uma opção)
      if (item.tipo === "perguntaCategorica") {
        const label = document.createElement("label");
        label.textContent = item.pergunta || "—";

        if (item.obrigatorio) {
          const asterisco = document.createElement("span");
          asterisco.textContent = " *";
          asterisco.className = "asterisco-obrigatorio";
          label.appendChild(asterisco);
        }

        divItem.appendChild(label);

        const select = document.createElement("select");
        select.style.marginLeft = "6px";

        // opção vazia para forçar escolha explícita
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

        select.addEventListener("change", () => {
          respostas[item.idItem] = select.value;
        });

        divItem.appendChild(select);
      }

      // Pergunta múltipla: checkboxes
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

        const selecoes = [];

        (item.opcoes || []).forEach((opc) => {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = opc;
          checkbox.style.marginRight = "4px";

          const lbl = document.createElement("label");
          lbl.style.display = "block";
          lbl.style.marginLeft = "12px";
          lbl.appendChild(checkbox);
          lbl.appendChild(document.createTextNode(opc));

          checkbox.addEventListener("change", () => {
            const selecionados = selecoes
              .filter((c) => c.checked)
              .map((c) => c.value);
            respostas[item.idItem] = selecionados;
          });

          selecoes.push(checkbox);
          divItem.appendChild(lbl);
        });
      }

      divSecao.appendChild(divItem);
    });

    container.appendChild(divSecao);
  });
}

// Valida campos obrigatórios antes de gerar o texto
function validarObrigatorios(template) {
  const faltando = [];

  (template.secoes || []).forEach((secao) => {
    (secao.itens || []).forEach((item) => {
      if (!item.obrigatorio) return;

      const resp = respostas[item.idItem];
      let ok = true;

      if (item.tipo === "perguntaSubjetiva") {
        ok = !!(resp && String(resp).trim());
      } else if (item.tipo === "perguntaCategorica") {
        ok = !!(resp && String(resp).trim());
      } else if (item.tipo === "perguntaMultipla") {
        ok = Array.isArray(resp) && resp.length > 0;
      } else {
        // textoFixo não exige resposta do usuário
        ok = true;
      }

      if (!ok) {
        faltando.push({ secao, item });
      }
    });
  });

  return faltando;
}

// Gera e copia o conteúdo final para a área de transferência
function copiarResultado(template) {
  if (!template) return;

  const faltando = validarObrigatorios(template);
  if (faltando.length > 0) {
    const primeiro = faltando[0];
    const nomeSecao = primeiro.secao.titulo || "—";
    const textoPergunta =
      primeiro.item.pergunta || primeiro.item.conteudo || "—";

    alert(
      "Por favor, preencha todos os campos obrigatórios antes de copiar.\n\n" +
      `Seção: ${nomeSecao}\n` +
      `Campo: ${textoPergunta}`
    );
    return;
  }

  let textoFinal = "";

  (template.secoes || []).forEach((secao) => {
    textoFinal += `${(secao.titulo || "").toUpperCase()}\n`;

    (secao.itens || []).forEach((item) => {
      const resposta = respostas[item.idItem];

      if (item.tipo === "textoFixo") {
        textoFinal += `${item.conteudo || ""}\n\n`;
      } else if (item.tipo === "perguntaSubjetiva") {
        textoFinal += `${item.pergunta || ""} ${resposta || ""}\n\n`;
      } else if (item.tipo === "perguntaCategorica") {
        textoFinal += `${item.pergunta || ""} ${resposta || ""}\n\n`;
      } else if (item.tipo === "perguntaMultipla") {
        textoFinal += `${item.pergunta || ""}\n`;
        if (Array.isArray(resposta)) {
          resposta.forEach((opc) => {
            textoFinal += `( x ) ${opc}\n`;
          });
        }
        textoFinal += "\n";
      }
    });
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
