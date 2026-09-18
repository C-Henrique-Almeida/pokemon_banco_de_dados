import { pool, fecharConexao } from "./connection.js";
import { SQL_CRIAR_TABELAS, SQL_APAGAR_TABELAS } from "./schema.js";

/**
 * Cria as tabelas do projeto.
 *
 * Uso:
 *   npm run db:migrate          -> cria as tabelas (se não existirem)
 *   npm run db:reset            -> apaga tudo e cria de novo
 */
async function migrar(): Promise<void> {
  const deveResetar = process.argv.includes("--reset");

  try {
    if (deveResetar) {
      console.log("[INFO] Apagando tabelas existentes...");
      await pool.query(SQL_APAGAR_TABELAS);
    }

    console.log("[INFO] Criando tabelas...");
    await pool.query(SQL_CRIAR_TABELAS);

    console.log("[OK] Migração concluída com sucesso.");
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error(`[ERRO] Falha na migração: ${detalhe}`);
    process.exitCode = 1;
  } finally {
    await fecharConexao();
  }
}

migrar();
