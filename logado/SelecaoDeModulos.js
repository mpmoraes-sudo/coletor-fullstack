document.addEventListener("DOMContentLoaded", async () => {
  const usuarioLogado = document.getElementById("usuarioLogado");
  const mensagem = document.getElementById("mensagemModulo");

  const tokenDeSessao = localStorage.getItem("tokenDeSessao");
  if (!tokenDeSessao) {
    mensagem.textContent = "Sessão inexistente. Faça login novamente.";
    setTimeout(() => (window.location.href = "../index.html"), 2000);
    return;
  }

  try {
    // ✅ valida a sessão no backend.
    const r = await fetch("/api/session/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenDeSessao })
    });

    const data = await r.json();

    if (!r.ok || !data.success) {
      mensagem.textContent = data.error || "Sessão inválida ou expirada.";
      localStorage.removeItem("tokenDeSessao");
      setTimeout(() => (window.location.href = "../index.html"), 2000);
      return;
    }

    // ✅ exibe o e-mail logado
    usuarioLogado.textContent = `Logado como ${data.email}`;

    // ===== redirecionamentos =====
    document.getElementById("btnGerenciarTemplates").addEventListener("click", () => {
      window.location.href = "gerenciarTemplates.html";
    });

    document.getElementById("btnGerenciarProjetos").addEventListener("click", () => {
      window.location.href = "gerenciarProjetos.html";
    });

    document.getElementById("btnModuloUtilizacao").addEventListener("click", () => {
      window.location.href = "utilizarTemplates.html";
    });

    // ===== logout =====
    document.getElementById("botaoLogout").addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });

  } catch (erro) {
    console.error("Erro ao validar sessão:", erro);
    mensagem.textContent = "Erro de conexão com o servidor.";
    setTimeout(() => (window.location.href = "../index.html"), 2000);
  }
});
