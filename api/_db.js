import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

let cachedClient = null;

export async function getDb() {
  if (cachedClient) return cachedClient.db(dbName);
  const client = await MongoClient.connect(uri);
  cachedClient = client;
  return client.db(dbName);
}
