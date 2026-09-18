import { CatalogoPokemon } from "../services/BoxService.js";
import { buscarPokemon } from "../services/PokeApiService.js";
import { DatabaseError } from "../models/CustomErrors.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export class TerminalController {
  constructor(private catalogo: CatalogoPokemon) {}

  async iniciar(): Promise<void> {
    const rl = createInterface({ input, output });

    try {
      console.log("===== POKÉDEX =====");

      let executando = true;

      while (executando) {
        console.log("\n1 - Buscar Pokémon");
        console.log("2 - Listar Pokémon");
        console.log("3 - Remover Pokémon");
        console.log("0 - Sair");

        const opcao = await rl.question("Escolha uma opção: ");

        switch (opcao.trim()) {
          case "0": {
            executando = false;
            break;
          }

          case "1": {
            const nomeOuId = await rl.question(
              "Digite o nome ou ID do Pokémon: ",
            );

            const pokemon = await buscarPokemon(nomeOuId.trim());

            if (pokemon !== null) {
              console.log(
                `ID: ${pokemon.id}, Nome: ${pokemon.nome}, Tipos: ${pokemon.tipos.join(", ")}, Altura: ${pokemon.altura}, Peso: ${pokemon.peso}`,
              );

              await this.catalogo.adicionar(pokemon);
            }

            break;
          }

          case "2": {
            await this.catalogo.listar();
            break;
          }

          case "3": {
            const id = await rl.question("Digite o ID do Pokémon: ");
            await this.catalogo.remover(Number(id.trim()));
            break;
          }

          default:
            console.log("[AVISO] Opção inválida.");
        }
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        console.error(`[ERRO] ${error.message}`);
      } else {
        console.error("[ERRO] Erro inesperado.");
      }
    } finally {
      rl.close();
    }
  }
}
