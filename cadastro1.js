document.getElementById("formCadastro1").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("emailCadastro").value.trim();
  const resposta = document.getElementById("respostaAoUsuario");

  if (!email.includes("@")) {
    resposta.textContent = "Por favor, insira um e-mail válido.";
    resposta.style.color = "red";
    return;
  }

  try {
    const resp = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "start", email })
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      resposta.textContent = data.error || "Erro ao enviar o código.";
      resposta.style.color = "red";
      return;
    }

    resposta.textContent = "Código enviado com sucesso! Verifique seu e-mail.";
    resposta.style.color = "green";

    // Redireciona para a segunda etapa, enviando o e-mail na URL
    setTimeout(() => {
      window.location.href = `cadastro2.html?email=${encodeURIComponent(email)}`;
    }, 1500);

  } catch (err) {
    console.error("Erro ao enviar o código:", err);
    resposta.textContent = "Erro de conexão com o servidor.";
    resposta.style.color = "red";
  }
});
