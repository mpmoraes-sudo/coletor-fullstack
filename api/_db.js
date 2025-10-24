import { MongoClient } from "mongodb";

let client;
let clientPromise;

export async function getDb() {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI");
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  const conn = await clientPromise;
  const dbName = process.env.DB_NAME || "BancoDeDados";
  return conn.db(dbName);
}
