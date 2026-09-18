/**
 * O mesmo conteúdo de /database/schema.sql, mas embutido em TypeScript.
 *
 * Motivo: o `tsc` compila apenas arquivos .ts para a pasta /dist.
 * Um arquivo .sql solto não seria copiado e a migração quebraria depois
 * do `npm run build`. Mantendo o SQL aqui, o projeto funciona tanto com
 * `tsx` quanto com o código compilado.
 */

export const SQL_CRIAR_TABELAS = `
CREATE TABLE IF NOT EXISTS pokemons (
    id        INTEGER      PRIMARY KEY,
    nome      VARCHAR(80)  NOT NULL UNIQUE,
    altura    INTEGER      NOT NULL CHECK (altura >= 0),
    peso      INTEGER      NOT NULL CHECK (peso >= 0),
    criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pokemon_tipos (
    pokemon_id INTEGER     NOT NULL REFERENCES pokemons (id) ON DELETE CASCADE,
    tipo       VARCHAR(40) NOT NULL,
    PRIMARY KEY (pokemon_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_pokemon_tipos_tipo
    ON pokemon_tipos (tipo);
`;

export const SQL_APAGAR_TABELAS = `
DROP TABLE IF EXISTS pokemon_tipos;
DROP TABLE IF EXISTS pokemons;
`;
