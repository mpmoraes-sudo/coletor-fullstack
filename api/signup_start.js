import { enviarEmail } from "./_email.js";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório" });
  }

  try {
    // Conecta ao banco
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const colecaoCodigos = db.collection("CodigosDeCadastro");

    // Gera código e define validade (10 minutos)
    const codigoCadastro = Math.floor(10000 + Math.random() * 90000).toString();
    const expiracao = new Date(Date.now() + 10 * 60 * 1000);

    // Salva código temporário
    await colecaoCodigos.insertOne({
      email,
      codigo: codigoCadastro,
      expiracao,
      jaCadastrado: false
    });

    // Monta mensagem HTML
    const mensagemHTML = `
      <p>Seu código de confirmação de e-mail é:</p>
      <h2 style="color:#2b6cb0">${codigoCadastro}</h2>
      <p>Este código expira em 10 minutos.</p>
      <br>
      <p><em>Ferramenta para Gestão de Templates Digitais</em></p>
    `;

    // Envia e-mail via SendGrid
    const envio = await enviarEmail(
      email,
      "Código de verificação - Ferramenta de Templates",
      mensagemHTML
    );

    await client.close();

    if (!envio.success) {
      console.error("Erro ao enviar o e-mail:", envio.error);
      return res.status(500).json({ error: "Erro ao enviar e-mail" });
    }

    console.log("✅ E-mail de verificação enviado com sucesso para", email);
    return res.status(200).json({ success: true, email });
  } catch (erro) {
    console.error("Erro geral em signup_start:", erro);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
