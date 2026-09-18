import type { PokemonResumo } from "../models/Pokemon.js";
import { PokemonRepository } from "../repositories/PokemonRepository.js";
import { formatarNome } from "../utils/textFormatters.js";

/**
 * Regras de negócio do catálogo.
 *
 * Antes esta classe guardava os Pokémon em um array em memória e
 * sincronizava tudo com o arquivo pc_box.json. Agora ela não guarda
 * estado nenhum: o banco de dados é a única fonte da verdade, e o
 * acesso acontece através do PokemonRepository.
 */
export class CatalogoPokemon {
  constructor(
    private readonly repositorio: PokemonRepository = new PokemonRepository(),
  ) {}

  /**
   * Adiciona um Pokémon ao catálogo, ignorando duplicados.
   *
   * A verificação de duplicidade é feita pelo próprio banco
   * (PRIMARY KEY + ON CONFLICT DO NOTHING), o que evita condições de
   * corrida que o antigo `array.some()` não conseguia evitar.
   */
  async adicionar(pokemon: PokemonResumo): Promise<void> {
    const foiInserido = await this.repositorio.inserir(pokemon);

    if (foiInserido) {
      console.log(`[OK] ${formatarNome(pokemon.nome)} adicionado ao catálogo.`);
      return;
    }

    console.log(`[AVISO] ${formatarNome(pokemon.nome)} já está no catálogo.`);
  }

  /**
   * Exibe no terminal todos os Pokémon cadastrados.
   */
  async listar(): Promise<void> {
    const pokemons = await this.repositorio.listarTodos();

    if (pokemons.length === 0) {
      console.log("[AVISO] Catálogo vazio.");
      return;
    }

    pokemons.forEach((pokemon) => {
      console.log(
        `ID: ${pokemon.id}, Nome: ${formatarNome(pokemon.nome)}, Tipos: ${pokemon.tipos.join(", ")}, Altura: ${pokemon.altura}, Peso: ${pokemon.peso}`,
      );
    });

    console.log(`\nTotal: ${pokemons.length} Pokémon no catálogo.`);
  }

  /**
   * Remove um Pokémon pelo ID.
   */
  async remover(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      console.log("[AVISO] Informe um ID numérico válido.");
      return;
    }

    const foiRemovido = await this.repositorio.remover(id);

    if (!foiRemovido) {
      console.log("[AVISO] Nenhum Pokémon encontrado com esse ID.");
      return;
    }

    console.log("[OK] Pokémon removido do catálogo.");
  }

  /**
   * Busca um Pokémon já cadastrado, sem consultar a PokeAPI.
   */
  async buscarNoCatalogo(id: number): Promise<PokemonResumo | null> {
    return this.repositorio.buscarPorId(id);
  }
}
