import { readFile } from "node:fs/promises";
import { fecharConexao } from "./connection.js";
import { PokemonRepository } from "../repositories/PokemonRepository.js";
import type { PokemonResumo } from "../models/Pokemon.js";

/**
 * Migração de dados: lê o antigo pc_box.json e grava o conteúdo
 * no PostgreSQL. Serve para não perder o catálogo da versão anterior.
 *
 * Uso: npm run db:seed
 *
 * O script é idempotente: rodar duas vezes não duplica nada,
 * porque a inserção usa ON CONFLICT DO NOTHING.
 */

const CAMINHO_JSON = "pc_box.json";

/**
 * Valida, em tempo de execução, se o objeto lido do JSON tem o formato
 * esperado. O TypeScript não consegue garantir isso sozinho, porque o
 * conteúdo do arquivo só é conhecido durante a execução.
 */
function ehPokemonValido(valor: unknown): valor is PokemonResumo {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const objeto = valor as Record<string, unknown>;

  return (
    typeof objeto["id"] === "number" &&
    typeof objeto["nome"] === "string" &&
    typeof objeto["altura"] === "number" &&
    typeof objeto["peso"] === "number" &&
    Array.isArray(objeto["tipos"]) &&
    objeto["tipos"].every((tipo) => typeof tipo === "string")
  );
}

async function importar(): Promise<void> {
  const repositorio = new PokemonRepository();

  try {
    const conteudo = await readFile(CAMINHO_JSON, "utf-8");
    const dados: unknown = JSON.parse(conteudo);

    if (!Array.isArray(dados)) {
      console.error("[ERRO] O arquivo pc_box.json não contém uma lista.");
      process.exitCode = 1;
      return;
    }

    let importados = 0;
    let ignorados = 0;
    let invalidos = 0;

    for (const item of dados) {
      if (!ehPokemonValido(item)) {
        invalidos = invalidos + 1;
        continue;
      }

      const foiInserido = await repositorio.inserir(item);

      if (foiInserido) {
        importados = importados + 1;
        console.log(`[OK] ${item.nome} importado.`);
      } else {
        ignorados = ignorados + 1;
        console.log(`[AVISO] ${item.nome} já existia no banco.`);
      }
    }

    console.log(
      `\n[OK] Importação finalizada. Importados: ${importados} | Já existiam: ${ignorados} | Inválidos: ${invalidos}`,
    );
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error(`[ERRO] Falha ao importar o pc_box.json: ${detalhe}`);
    process.exitCode = 1;
  } finally {
    await fecharConexao();
  }
}

importar();
