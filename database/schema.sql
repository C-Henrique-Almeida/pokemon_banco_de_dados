-- =====================================================================
-- Pokédex TypeScript - Schema PostgreSQL
-- Pode ser executado manualmente (psql, DBeaver, pgAdmin)
-- ou automaticamente com: npm run db:migrate
-- =====================================================================

-- Tabela principal: um registro por Pokémon salvo no catálogo.
-- O "id" é o próprio ID da PokeAPI (por isso não usamos SERIAL aqui).
CREATE TABLE IF NOT EXISTS pokemons (
    id        INTEGER      PRIMARY KEY,
    nome      VARCHAR(80)  NOT NULL UNIQUE,
    altura    INTEGER      NOT NULL CHECK (altura >= 0),
    peso      INTEGER      NOT NULL CHECK (peso >= 0),
    criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Tabela filha: normaliza o antigo array "tipos" do JSON.
-- Relacionamento 1:N com "pokemons".
-- ON DELETE CASCADE: ao remover o Pokémon, os tipos somem junto.
CREATE TABLE IF NOT EXISTS pokemon_tipos (
    pokemon_id INTEGER     NOT NULL REFERENCES pokemons (id) ON DELETE CASCADE,
    tipo       VARCHAR(40) NOT NULL,
    PRIMARY KEY (pokemon_id, tipo)
);

-- Índice para permitir buscas rápidas por tipo (ex.: "todos os fire").
CREATE INDEX IF NOT EXISTS idx_pokemon_tipos_tipo
    ON pokemon_tipos (tipo);
