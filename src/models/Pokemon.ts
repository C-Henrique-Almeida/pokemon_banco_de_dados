/**
 * Representação simplificada do Pokémon usada dentro da aplicação.
 */
export interface PokemonResumo {
    id: number;
    nome: string;
    tipos: string[];
    altura: number;
    peso: number;
}

/**
 * Campos que a aplicação aproveita da resposta da PokeAPI.
 */
export interface PokemonApiResponse {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: {
        type: {
            name: string;
        };
    }[];
}

/**
 * Formato bruto de uma linha vinda do PostgreSQL.
 *
 * É um "type" e não uma "interface" de propósito: o método pool.query<T>()
 * do pacote pg exige um tipo compatível com índice de string, e apenas
 * type aliases recebem essa assinatura implicitamente no TypeScript.
 */
export type PokemonRow = {
    id: number;
    nome: string;
    altura: number;
    peso: number;
    tipos: string[];
};
