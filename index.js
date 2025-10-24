document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const emailRecebido = document.getElementById("emailRecebido").value.trim();
  const senhaRecebida = document.getElementById("senhaRecebida").value;
  const resposta = document.getElementById("respostaAoUsuario");
  const container = document.getElementById("respostaAoUsuarioLogado");

  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRecebido, senha: senhaRecebida })
    });
    const data = await r.json();
    if (!r.ok) {
      resposta.textContent = data.error || "Erro ao autenticar.";
      return;
    }
    localStorage.setItem("tokenDeSessao", data.tokenDeSessao);
    container.textContent = "Login realizado com sucesso!";
    setTimeout(() => (window.location.href = "cadastro1.html"), 1500);
  } catch (err) {
    console.error(err);
    resposta.textContent = "Erro de conexão. Tente novamente.";
  }
});