document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const resposta = document.getElementById("respostaAoUsuario");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    resposta.textContent = "Verificando credenciais...";

    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });

      const data = await r.json();

      if (!r.ok) {
        resposta.textContent = data.error || "Erro ao autenticar.";
        resposta.style.color = "red";
        return;
      }

      if (data.success) {
        resposta.textContent = "Login realizado com sucesso!";
        resposta.style.color = "green";

        // guarda token e redireciona
        localStorage.setItem("tokenDeSessao", data.tokenDeSessao);
        setTimeout(() => {
          window.location.href = "logado/SelecaoDeModulos.html";
        }, 1500);
      } else {
        resposta.textContent = data.error || "Credenciais inválidas.";
        resposta.style.color = "red";
      }
    } catch (erro) {
      console.error("Erro ao fazer login:", erro);
      resposta.textContent = "Erro de conexão com o servidor.";
      resposta.style.color = "red";
    }
  });
});
