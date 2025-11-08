document.addEventListener("DOMContentLoaded", async () => {
  const mensagem = document.getElementById("mensagemHome");
  const userInfo = document.getElementById("userInfo");

  // Obtém o token salvo no localStorage
  const tokenDeSessao = localStorage.getItem("tokenDeSessao");
  if (!tokenDeSessao) {
    mensagem.textContent = "Sessão inexistente. Faça login novamente.";
    setTimeout(() => (window.location.href = "../index.html"), 2000);
    return;
  }

  try {
    // Valida o token no backend
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

    // Exibe informações do usuário
    userInfo.textContent = `Bem-vindo(a), ${data.email}`;

    // Botões de navegação
    document.getElementById("gerenciamento").addEventListener("click", () => {
      window.location.href = "ModuloProjetos.html";
    });

    document.getElementById("utilizacao").addEventListener("click", () => {
      window.location.href = "ModuloUtilizacao.html";
    });

    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem("tokenDeSessao");
      window.location.href = "../index.html";
    });
  } catch (err) {
    console.error("Erro ao validar sessão:", err);
    mensagem.textContent = "Erro de conexão com o servidor.";
    setTimeout(() => (window.location.href = "../index.html"), 2000);
  }
});
