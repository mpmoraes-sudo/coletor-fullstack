document.addEventListener("DOMContentLoaded", () => {
  const emailForm = document.getElementById("emailForm");
  const verifyForm = document.getElementById("verifyForm");
  const msg = document.getElementById("mensagemDeRetorno");
  const verificationSection = document.getElementById("verificationSection");
  const mensagemVerificacao = document.getElementById("MensagemDeVerificacao");

  // ===== Enviar código por e-mail =====
  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();

    msg.textContent = "Enviando código...";
    msg.style.color = "#333";

    try {
      const r = await fetch("/api/recover/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await r.json();

      if (!r.ok) {
        msg.textContent = data.error || "Erro ao enviar o código.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = `Código enviado para ${email}. Verifique sua caixa de entrada.`;
      msg.style.color = "green";
      verificationSection.style.display = "block";
    } catch (err) {
      console.error("Erro ao enviar o código:", err);
      msg.textContent = "Erro de conexão com o servidor.";
      msg.style.color = "red";
    }
  });

  // ===== Verificar código =====
  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const codigo = document.getElementById("campoParaInserirOCodigo").value.trim();

    mensagemVerificacao.textContent = "Validando código...";
    mensagemVerificacao.style.color = "#333";

    try {
      const r = await fetch("/api/recover/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo })
      });

      const data = await r.json();

      if (!r.ok || !data.success) {
        mensagemVerificacao.textContent = data.error || "Código inválido ou expirado.";
        mensagemVerificacao.style.color = "red";
        return;
      }

      // Redireciona para etapa 2 de redefinição se tudo certo com token
      if (data.success && data.tokenRecuperacao) {
        window.location.href = `RecuperaSenha2.html?token=${data.tokenRecuperacao}`;
      }
    } catch (err) {
      console.error("Erro ao validar código:", err);
      mensagemVerificacao.textContent = "Erro ao validar o código.";
      mensagemVerificacao.style.color = "red";
    }
  });
});
