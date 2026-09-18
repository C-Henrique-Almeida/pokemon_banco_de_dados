import { pool } from "../database/connection.js";
import { DatabaseError } from "../models/CustomErrors.js";
import type { PokemonResumo, PokemonRow } from "../models/Pokemon.js";

/**
 * Consulta base reutilizada pelos métodos de leitura.
 *
 * O LEFT JOIN + ARRAY_AGG remonta o array "tipos" que antes vinha pronto
 * do JSON. O FILTER evita que um Pokémon sem tipos volte como [null].
 */
const SELECT_BASE = `
    SELECT
        p.id,
        p.nome,
        p.altura,
        p.peso,
        COALESCE(
            ARRAY_AGG(t.tipo ORDER BY t.tipo) FILTER (WHERE t.tipo IS NOT NULL),
            '{}'
        ) AS tipos
    FROM pokemons p
    LEFT JOIN pokemon_tipos t ON t.pokemon_id = p.id
`;

/**
 * Converte o erro cru do driver pg em um erro da aplicação.
 */
function traduzirErro(contexto: string, erro: unknown): DatabaseError {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    return new DatabaseError(`${contexto} Detalhe: ${detalhe}`);
}

/**
 * Camada de acesso a dados.
 *
 * Toda instrução SQL do projeto fica concentrada aqui. As demais camadas
 * (service e controller) não sabem que o banco é PostgreSQL.
 */
export class PokemonRepository {
    /**
     * Retorna todos os Pokémon do catálogo, em ordem de ID.
     */
    async listarTodos(): Promise<PokemonResumo[]> {
        try {
            const resultado = await pool.query<PokemonRow>(
                `${SELECT_BASE}
                 GROUP BY p.id
                 ORDER BY p.id`,
            );

            return resultado.rows.map((linha) => ({
                id: linha.id,
                nome: linha.nome,
                tipos: linha.tipos,
                altura: linha.altura,
                peso: linha.peso,
            }));
        } catch (erro) {
            throw traduzirErro("Não foi possível listar os Pokémon.", erro);
        }
    }

    /**
     * Busca um Pokémon específico pelo ID. Retorna null quando não existe.
     */
    async buscarPorId(id: number): Promise<PokemonResumo | null> {
        try {
            const resultado = await pool.query<PokemonRow>(
                `${SELECT_BASE}
                 WHERE p.id = $1
                 GROUP BY p.id`,
                [id],
            );

            const linha = resultado.rows[0];

            if (linha === undefined) {
                return null;
            }

            return {
                id: linha.id,
                nome: linha.nome,
                tipos: linha.tipos,
                altura: linha.altura,
                peso: linha.peso,
            };
        } catch (erro) {
            throw traduzirErro("Não foi possível buscar o Pokémon.", erro);
        }
    }

    /**
     * Verifica se o Pokémon já está cadastrado.
     */
    async existe(id: number): Promise<boolean> {
        try {
            const resultado = await pool.query(
                "SELECT 1 FROM pokemons WHERE id = $1",
                [id],
            );

            return (resultado.rowCount ?? 0) > 0;
        } catch (erro) {
            throw traduzirErro("Não foi possível verificar o Pokémon.", erro);
        }
    }

    /**
     * Insere o Pokémon e seus tipos dentro de uma única transação.
     *
     * Retorna:
     *  - true  quando o Pokémon foi inserido;
     *  - false quando o ID já existia (ON CONFLICT DO NOTHING).
     *
     * A transação garante que nunca exista um Pokémon gravado sem os
     * seus tipos: ou as duas tabelas são atualizadas, ou nenhuma é.
     */
    async inserir(pokemon: PokemonResumo): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const insercao = await client.query(
                `INSERT INTO pokemons (id, nome, altura, peso)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO NOTHING`,
                [pokemon.id, pokemon.nome, pokemon.altura, pokemon.peso],
            );

            const foiInserido = (insercao.rowCount ?? 0) > 0;

            if (!foiInserido) {
                await client.query("ROLLBACK");
                return false;
            }

            // UNNEST transforma o array de tipos em linhas, permitindo
            // inserir todos os tipos com um único comando SQL.
            if (pokemon.tipos.length > 0) {
                await client.query(
                    `INSERT INTO pokemon_tipos (pokemon_id, tipo)
                     SELECT $1, UNNEST($2::text[])
                     ON CONFLICT DO NOTHING`,
                    [pokemon.id, pokemon.tipos],
                );
            }

            await client.query("COMMIT");
            return true;
        } catch (erro) {
            await client.query("ROLLBACK").catch(() => undefined);
            throw traduzirErro("Não foi possível salvar o Pokémon.", erro);
        } finally {
            // Devolve a conexão ao pool. Esquecer o release() esgota o pool.
            client.release();
        }
    }

    /**
     * Remove o Pokémon pelo ID.
     *
     * Os tipos são apagados automaticamente pelo ON DELETE CASCADE
     * definido na chave estrangeira.
     *
     * Retorna true quando alguma linha foi realmente removida.
     */
    async remover(id: number): Promise<boolean> {
        try {
            const resultado = await pool.query(
                "DELETE FROM pokemons WHERE id = $1",
                [id],
            );

            return (resultado.rowCount ?? 0) > 0;
        } catch (erro) {
            throw traduzirErro("Não foi possível remover o Pokémon.", erro);
        }
    }

    /**
     * Conta quantos Pokémon existem no catálogo.
     */
    async contar(): Promise<number> {
        try {
            const resultado = await pool.query<{ total: string }>(
                "SELECT COUNT(*) AS total FROM pokemons",
            );

            const linha = resultado.rows[0];

            return linha === undefined ? 0 : Number(linha.total);
        } catch (erro) {
            throw traduzirErro("Não foi possível contar os Pokémon.", erro);
        }
    }
}
