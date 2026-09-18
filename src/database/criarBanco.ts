import "dotenv/config";
import pg from "pg";

const { Client } = pg;

/**
 * Cria o banco de dados da aplicação, caso ele ainda não exista.
 *
 * Uso: npm run db:create
 *
 * Por que este script tem a sua própria conexão, em vez de usar o pool de
 * connection.ts: o pool já se conecta ao banco "pokedex" — que é justamente
 * o que ainda não existe. Por isso aqui a conexão é feita ao banco de
 * manutenção "postgres", que existe em qualquer instalação do PostgreSQL.
 */

function env(nome: string, padrao: string): string {
  const valor = process.env[nome];
  return valor === undefined || valor.trim() === "" ? padrao : valor;
}

const NOME_BANCO = env("DB_NAME", "pokedex");

async function criarBanco(): Promise<void> {
  const client = new Client({
    host: env("DB_HOST", "localhost"),
    port: Number(env("DB_PORT", "5432")),
    user: env("DB_USER", "postgres"),
    password: env("DB_PASSWORD", "postgres"),
    database: "postgres",
  });

  try {
    await client.connect();

    const existente = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [NOME_BANCO],
    );

    if ((existente.rowCount ?? 0) > 0) {
      console.log(`[AVISO] O banco "${NOME_BANCO}" já existe. Nada a fazer.`);
      return;
    }

    // CREATE DATABASE não aceita parâmetros ($1), então o nome precisa ser
    // interpolado. Por isso ele é validado antes, para não abrir espaço
    // para injeção de SQL.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(NOME_BANCO)) {
      console.error(`[ERRO] Nome de banco inválido: "${NOME_BANCO}".`);
      process.exitCode = 1;
      return;
    }

    await client.query(`CREATE DATABASE "${NOME_BANCO}"`);
    console.log(`[OK] Banco "${NOME_BANCO}" criado com sucesso.`);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error(`[ERRO] Não foi possível criar o banco: ${detalhe}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

criarBanco();
