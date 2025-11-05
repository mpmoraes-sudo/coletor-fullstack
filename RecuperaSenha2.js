document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");

  const nomeInput = document.getElementById("nome");
  const emailInput = document.getElementById("email");
  const form = document.getElementById("recuperaForm");
  const mensagem = document.getElementById("mensagem");
  const container = document.getElementById("containerComTudo");

  // Se não houver e-mail na URL, redireciona
  if (!email) {
    container.textContent = "Acesso inválido. Tente novamente.";
    setTimeout(() => (window.location.href = "index.html"), 3000);
    return;
  }

  // Preenche o campo de e-mail
  emailInput.value = email;

  try {
    // Tenta puxar nome do usuário (opcional)
    const r = await fetch(`/api/recover/user?email=${encodeURIComponent(email)}`);
    const data = await r.json();
    if (r.ok && data.nome) nomeInput.value = data.nome;
  } catch (err) {
    console.warn("Não foi possível obter o nome do usuário:", err);
  }

  // ====== Submit para redefinir senha ======
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const dataNascimento = document.getElementById("dataNascimento").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

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

    mensagem.textContent = "Atualizando senha...";
    mensagem.style.color = "#333";

    try {
      const r = await fetch("/api/recover/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, dataNascimento, senha })
      });

      const data = await r.json();

      if (!r.ok || !data.success) {
        mensagem.textContent = data.error || "Erro ao redefinir senha.";
        mensagem.style.color = "red";
        return;
      }

      mensagem.textContent = "Senha atualizada com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => (window.location.href = "index.html"), 2500);
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      mensagem.textContent = "Erro de conexão com o servidor.";
      mensagem.style.color = "red";
    }
  });
});
