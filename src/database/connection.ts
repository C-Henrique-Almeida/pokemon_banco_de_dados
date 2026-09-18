import "dotenv/config";
import pg from "pg";
import { DatabaseError } from "../models/CustomErrors.js";

const { Pool } = pg;

/**
 * Lê uma variável de ambiente, usando um valor padrão quando ela não existe.
 */
function env(nome: string, padrao: string): string {
  const valor = process.env[nome];
  return valor === undefined || valor.trim() === "" ? padrao : valor;
}

/**
 * Monta a configuração do Pool.
 *
 * Aceita duas formas de configurar (a primeira tem prioridade):
 *  1. DATABASE_URL=postgres://usuario:senha@host:porta/banco
 *  2. DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 */
function criarPool(): pg.Pool {
  const urlCompleta = process.env["DATABASE_URL"];

  if (urlCompleta !== undefined && urlCompleta.trim() !== "") {
    return new Pool({
      connectionString: urlCompleta,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return new Pool({
    host: env("DB_HOST", "localhost"),
    port: Number(env("DB_PORT", "5432")),
    user: env("DB_USER", "postgres"),
    password: env("DB_PASSWORD", "postgres"),
    database: env("DB_NAME", "pokedex"),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * Pool de conexões.
 *
 * Um pool reaproveita conexões já abertas em vez de abrir e fechar uma
 * conexão a cada consulta. É a forma recomendada de usar o PostgreSQL
 * em uma aplicação Node.js.
 */
export const pool = criarPool();

// Erros que acontecem em conexões ociosas (ex.: o banco caiu) chegam aqui.
// Sem esse listener o processo Node inteiro é derrubado.
pool.on("error", (erro: Error) => {
  console.error(`[ERRO] Falha em uma conexão ociosa do PostgreSQL: ${erro.message}`);
});

/**
 * Verifica se a aplicação realmente consegue falar com o banco.
 * Chamado na inicialização, para falhar cedo e com uma mensagem clara.
 */
export async function testarConexao(): Promise<void> {
  try {
    const resultado = await pool.query<{ agora: Date }>("SELECT NOW() AS agora");
    const linha = resultado.rows[0];

    if (linha === undefined) {
      throw new DatabaseError("O banco respondeu, mas não retornou dados.");
    }
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new DatabaseError(
      `Não foi possível conectar ao PostgreSQL. Verifique o arquivo .env e se o banco está no ar. Detalhe: ${detalhe}`,
    );
  }
}

/**
 * Fecha todas as conexões do pool.
 * Sem isso o processo Node fica "pendurado" ao sair da aplicação.
 */
export async function fecharConexao(): Promise<void> {
  await pool.end();
}
