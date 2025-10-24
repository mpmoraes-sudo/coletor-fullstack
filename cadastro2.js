document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const signupToken = urlParams.get("signupToken");
  const msg = document.getElementById("mensagem");
  const container = document.getElementById("containerComTudo");

  if (!signupToken) {
    container.textContent = "Token ausente ou inválido. Recomece o cadastro.";
    return;
  }

  document.getElementById("cadastroForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("nome").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;
    const dataNascimento = document.getElementById("dataNascimento").value;

    if (senha.length < 6 || confirmarSenha.length < 6) {
      msg.textContent = "A senha precisa ter no mínimo 6 caracteres";
      return;
    }
    if (senha !== confirmarSenha) {
      msg.textContent = "As senhas não coincidem.";
      return;
    }

    try {
      const r = await fetch("/api/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, nome, senha, dataNascimento })
      });
      const data = await r.json();
      if (!r.ok) { msg.textContent = data.error || "Erro ao finalizar cadastro"; return; }
      container.textContent = "Cadastro realizado com sucesso!";
      setTimeout(() => window.location.href = "index.html", 1500);
    } catch (e) {
      console.error(e);
      msg.textContent = "Erro ao realizar cadastro. Tente novamente.";
    }
  });
});