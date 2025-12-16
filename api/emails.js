import { enviarEmail } from "./_email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido" });
  }

  const { acao } = req.body || {};

  // ========= CONVITE PARA PROJETO =========
  if (acao === "conviteProjeto") {
    const { para, cc, nomeProjeto, permissao } = req.body || {};

    if (!para || !nomeProjeto || !permissao) {
      return res
        .status(400)
        .json({ success: false, error: "Campos obrigatórios ausentes." });
    }

    const assunto = `Convite para participar do projeto "${nomeProjeto}"`;

    const permissaoLabel =
      permissao === "editor"
        ? "Editor(a)"
        : permissao === "leitor"
        ? "Leitor(a)"
        : permissao;

    // HTML bem simples (pode refiná-lo depois)
    const mensagemHTML = `
      <p>Olá,</p>
      <p>Você está sendo convidado(a) para participar do projeto
      <strong>${nomeProjeto}</strong> na Ferramenta para Gestão de Templates Digitais.</p>
      <p>Permissão sugerida: <strong>${permissaoLabel}</strong>.</p>
      <p>Se você ainda não possui cadastro, poderá criá-lo ao acessar a ferramenta.</p>
      <p>Atenciosamente,<br/>Ferramenta para Gestão de Templates Digitais</p>
    `;

    const resultado = await enviarEmail(para, assunto, mensagemHTML, cc);

    if (!resultado.success) {
      return res
        .status(500)
        .json({ success: false, error: resultado.error || "Falha ao enviar e-mail." });
    }

    return res.status(200).json({ success: true });
  }

  // ========= AÇÕES FUTURAS =========
  // aqui você pode acrescentar outras ações de e-mail (ex: lembretes, etc)
  return res.status(400).json({ success: false, error: "Ação inválida." });
}
