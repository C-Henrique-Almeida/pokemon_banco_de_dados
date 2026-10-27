import { CatalogoPokemon } from "./services/BoxService.js";
import { TerminalController } from "./controllers/TerminalController.js";
import { testarConexao, fecharConexao } from "./database/connection.js";
import { DatabaseError } from "./models/CustomErrors.js";

async function main(): Promise<void> {
  try {
    await testarConexao();
    console.log("[OK] Conectado ao PostgreSQL.\n");
  } catch (erro) {
    if (erro instanceof DatabaseError) {
      console.error(`[ERRO] ${erro.message}`);
    } else {
      console.error("[ERRO] Falha inesperada ao conectar ao banco.");
    }

    await fecharConexao().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  const catalogo = new CatalogoPokemon();
  const controller = new TerminalController(catalogo);

  await controller.iniciar();

  // Fecha o pool para que o processo Node consiga encerrar.
  await fecharConexao();
  console.log("Até a próxima!");
}

main();
