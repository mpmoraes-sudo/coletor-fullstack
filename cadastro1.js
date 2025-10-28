document.getElementById("emailForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("mensagemDeRetorno");
  if (!email) { msg.textContent = "Por favor, insira um e-mail válido."; return; }
  try {
    const r = await fetch("/api/signup_start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await r.json();
    if (!r.ok) {
      msg.textContent = data.error || "Erro ao enviar o código.";
      return;
    }
    msg.textContent = `Código enviado para ${email}. Verifique seu e-mail.`;
    document.getElementById("verificationSection").style.display = "block";
  } catch (e) {
    console.error(e);
    msg.textContent = "Erro ao enviar o código. Tente novamente.";
  }
});

document.getElementById("email").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#emailForm button[type='submit']").click();
  }
});

document.getElementById("campoParaInserirOCodigo").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("verificarCodigo").click();
  }
});

document.getElementById("verificarCodigo").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const code = document.getElementById("campoParaInserirOCodigo").value.trim();
  const out = document.getElementById("verificationMessage");
  try {
    const r = await fetch("/api/signup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const data = await r.json();
    if (!r.ok) { out.textContent = data.error || "Código inválido."; return; }
    const token = encodeURIComponent(data.signupToken);
    window.location.href = `cadastro2.html?signupToken=${token}`;
  } catch (e) {
    console.error(e);
    out.textContent = "Erro ao validar código.";
  }
});
