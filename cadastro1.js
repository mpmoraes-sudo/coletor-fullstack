document.addEventListener("DOMContentLoaded", () => {
  const emailForm = document.getElementById("emailForm");
  const verifyForm = document.getElementById("verifyForm");
  const msg = document.getElementById("mensagemDeRetorno");
  const verificationSection = document.getElementById("verificationSection");
  const verificationMessage = document.getElementById("verificationMessage");

  // ===== Enviar código por e-mail =====
  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();

    msg.textContent = "Enviando código...";
    msg.style.color = "#333";

    try {
      const resp = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "start", email })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        msg.textContent = data.error || "Erro ao enviar o código.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = `Código enviado para ${email}. Verifique sua caixa de entrada.`;
      msg.style.color = "green";

      // Exibe a seção de verificação
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

    verificationMessage.textContent = "Validando código...";
    verificationMessage.style.color = "#333";

    try {
      const resp = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "verify", email, codigo })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        verificationMessage.textContent = data.error || "Código inválido ou expirado.";
        verificationMessage.style.color = "red";
        return;
      }

      verificationMessage.textContent = "E-mail verificado com sucesso!";
      verificationMessage.style.color = "green";

      // Redireciona para a próxima etapa
      setTimeout(() => {
        window.location.href = `cadastro2.html?email=${encodeURIComponent(email)}`;
      }, 1000);

    } catch (err) {
      console.error("Erro ao validar código:", err);
      verificationMessage.textContent = "Erro de conexão com o servidor.";
      verificationMessage.style.color = "red";
    }
  });
});
