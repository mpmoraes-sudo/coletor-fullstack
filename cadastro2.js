document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const emailField = document.getElementById("email");
  const mensagem = document.getElementById("mensagem");

  if (email) {
    emailField.value = email;
  } else {
    mensagem.textContent = "E-mail não informado. Retorne à etapa anterior.";
    mensagem.style.color = "red";
    return;
  }

  const form = document.getElementById("cadastroForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const dataNascimento = document.getElementById("dataNascimento").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    // validações básicas
    if (senha.length < 6 || confirmarSenha.length < 6) {
      mensagem.textContent = "A senha deve ter pelo menos 6 caracteres.";
      mensagem.style.color = "red";
      return;
    }
    if (senha !== confirmarSenha) {
      mensagem.textContent = "As senhas não coincidem.";
      mensagem.style.color = "red";
      return;
    }

    mensagem.textContent = "Finalizando cadastro...";
    mensagem.style.color = "#333";

    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "complete",
          email,
          nome,
          senha,
          dataNascimento
        })
      });


      const data = await r.json();

      if (!r.ok || !data.success) {
        mensagem.textContent = data.error || "Erro ao realizar cadastro.";
        mensagem.style.color = "red";
        return;
      }

      mensagem.textContent = "Cadastro realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "index.html";
      }, 2500);
    } catch (err) {
      console.error("Erro no cadastro:", err);
      mensagem.textContent = "Erro de conexão com o servidor.";
      mensagem.style.color = "red";
    }
  });
});
