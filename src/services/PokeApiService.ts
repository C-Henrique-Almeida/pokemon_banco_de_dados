import type { PokemonApiResponse, PokemonResumo } from "../models/Pokemon.js";
import { APIError } from "../models/CustomErrors.js";

export async function buscarPokemon(
    nomeOuId: string
): Promise<PokemonResumo | null> {

    const url = `https://pokeapi.co/api/v2/pokemon/${nomeOuId}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new APIError(`Pokémon não encontrado: ${nomeOuId}`);
        }

        const dados: PokemonApiResponse = await response.json();

        const tipos = dados.types.map((item) => item.type.name);

        const pokemon: PokemonResumo = {
            id: dados.id,
            nome: dados.name,
            tipos: tipos,
            altura: dados.height,
            peso: dados.weight
        };

        return pokemon;

    } catch (error) {
        if (error instanceof APIError) {
            console.error(`[ERRO] ${error.message}`);
            return null;
        }

        console.error("[ERRO] Falha na comunicação com a PokeAPI.");
        return null;
    }
}