# Passo a passo: de arquivo JSON para PostgreSQL

Este documento explica **o que mudou, por que mudou e como rodar**.

---

## Parte 1 — Como rodar o projeto

### Passo 1. Instalar o PostgreSQL na máquina

**Windows**

1. Baixe o instalador em https://www.postgresql.org/download/windows/
2. Execute e siga o assistente. Durante a instalação:
   - **anote a senha** do usuário `postgres` — ela vai no `.env`;
   - mantenha a porta `5432`;
   - deixe marcado **Command Line Tools** (é o que instala o `psql`).
3. Ao final o serviço já inicia junto com o Windows.

Se o comando `psql` não for reconhecido no terminal, adicione ao PATH a pasta
`C:\Program Files\PostgreSQL\16\bin`, ou use o atalho **SQL Shell (psql)**
que aparece no menu Iniciar.

**macOS (Homebrew)**

    brew install postgresql@16
    brew services start postgresql@16

**Linux (Ubuntu / Debian)**

    sudo apt update
    sudo apt install postgresql postgresql-contrib
    sudo systemctl enable --now postgresql

No Linux, o usuário `postgres` normalmente vem sem senha definida. Defina uma:

    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

**Conferindo se deu certo**

    psql --version

Como iniciar e parar o serviço depois:

| Sistema | Iniciar | Parar | Ver status |
|---|---|---|---|
| Windows | `net start postgresql-x64-16` | `net stop postgresql-x64-16` | Serviços (`services.msc`) |
| macOS | `brew services start postgresql@16` | `brew services stop postgresql@16` | `brew services list` |
| Linux | `sudo systemctl start postgresql` | `sudo systemctl stop postgresql` | `systemctl status postgresql` |

> O número `16` muda conforme a versão instalada.

---

### Passo 2. Instalar as dependências do projeto

```bash
npm install
```

Foram adicionadas as bibliotecas:

| Pacote      | Para que serve                                            |
|-------------|-----------------------------------------------------------|
| `pg`        | Driver oficial do PostgreSQL para Node.js                 |
| `dotenv`    | Lê as credenciais do arquivo `.env`                       |
| `@types/pg` | Tipagens do `pg` para o TypeScript (dependência de dev)   |

---

### Passo 3. Configurar o `.env`

```bash
cp .env.example .env
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Abra o `.env` e coloque a senha definida na instalação:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
DB_NAME=pokedex
```

Se estiver usando um banco em nuvem (Neon, Supabase, Railway, Render), use a
string única — ela tem prioridade sobre as variáveis acima:

```env
DATABASE_URL=postgres://usuario:senha@host:5432/pokedex
```

> O `.env` está no `.gitignore`. **Nunca** suba senha para o GitHub.

---

### Passo 4. Criar o banco de dados

```bash
npm run db:create
```

Saída esperada:

```
[OK] Banco "pokedex" criado com sucesso.
```

O script (`src/database/criarBanco.ts`) se conecta ao banco de manutenção
`postgres`, verifica em `pg_database` se o banco já existe e só então executa
o `CREATE DATABASE`.

Se preferir criar na mão:

```bash
psql -U postgres -c "CREATE DATABASE pokedex;"
```

---

### Passo 5. Criar as tabelas (migração)

```bash
npm run db:migrate
```

Saída esperada:

```
[INFO] Criando tabelas...
[OK] Migração concluída com sucesso.
```

Para apagar tudo e recriar do zero:

```bash
npm run db:reset
```

Se preferir rodar o SQL manualmente, o arquivo está em `database/schema.sql`:

```bash
psql -U postgres -d pokedex -f database/schema.sql
```

---

### Passo 5b. Importar os dados antigos do `pc_box.json` (opcional)

```bash
npm run db:seed
```

Lê o `pc_box.json` que já existia e grava cada Pokémon no PostgreSQL.
Pode ser executado mais de uma vez sem duplicar nada.

---

### Passo 6. Rodar a aplicação

```bash
npm start
```

```
[OK] Conectado ao PostgreSQL.

===== POKÉDEX =====

1 - Buscar Pokémon
2 - Listar Pokémon
3 - Remover Pokémon
0 - Sair
```

Para conferir se o TypeScript compila:

```bash
npm run build
```

---

## Parte 2 — O que mudou no código

### 2.1 Modelagem do banco

O JSON guardava `tipos` como um array dentro do objeto. Em banco relacional
isso vira **duas tabelas**:

```sql
CREATE TABLE pokemons (
    id        INTEGER      PRIMARY KEY,
    nome      VARCHAR(80)  NOT NULL UNIQUE,
    altura    INTEGER      NOT NULL CHECK (altura >= 0),
    peso      INTEGER      NOT NULL CHECK (peso >= 0),
    criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE pokemon_tipos (
    pokemon_id INTEGER     NOT NULL REFERENCES pokemons (id) ON DELETE CASCADE,
    tipo       VARCHAR(40) NOT NULL,
    PRIMARY KEY (pokemon_id, tipo)
);
```

Decisões e o motivo de cada uma:

- **`id INTEGER PRIMARY KEY` sem `SERIAL`** — o ID é o da PokeAPI, não pode ser
  gerado pelo banco. A PRIMARY KEY também passa a ser quem garante que não
  existam Pokémon duplicados (antes isso era feito na mão com `array.some()`).
- **`pokemon_tipos` como tabela separada** — um Pokémon tem N tipos.
  Essa é a forma normalizada de representar a relação 1:N.
- **`ON DELETE CASCADE`** — ao apagar o Pokémon, os tipos são apagados
  automaticamente pelo banco. Não é preciso lembrar disso no código.
- **`CHECK (altura >= 0)`** — o banco também valida os dados, não só a aplicação.
- **Índice em `tipo`** — permite futuras buscas do tipo "todos os `fire`"
  sem varrer a tabela inteira.

---

### 2.2 Nova estrutura de pastas

```
src/
├── controllers/
│   └── TerminalController.ts     (atualizado)
├── database/                     ← NOVO
│   ├── connection.ts             Pool de conexões
│   ├── schema.ts                 SQL de criação das tabelas
│   ├── criarBanco.ts             Cria o banco pokedex
│   ├── migrate.ts                Script de migração
│   └── importarJson.ts           Importa o pc_box.json antigo
├── models/
│   ├── CustomErrors.ts           (atualizado: DatabaseError)
│   └── Pokemon.ts                (atualizado: PokemonRow)
├── repositories/                 ← NOVO
│   └── PokemonRepository.ts      Todo o SQL do projeto
├── services/
│   ├── BoxService.ts             (reescrito)
│   └── PokeApiService.ts         (inalterado)
├── utils/
│   └── textFormatters.ts         (inalterado)
└── main.ts                       (atualizado)
```

Foi criada uma camada nova, a de **repositório**. O motivo: manter todo o SQL
em um único lugar. O `BoxService` continua cuidando das regras de negócio e
não precisa saber que o banco é PostgreSQL — se amanhã virar MySQL, só o
repositório muda.

---

### 2.3 Conexão: pool em vez de `readFile`

Antes, cada operação abria e reescrevia o arquivo inteiro. Agora existe um
**pool de conexões** (`src/database/connection.ts`), que mantém conexões
abertas e as reaproveita entre as consultas.

Pontos importantes do arquivo:

- `pool.on("error", ...)` — sem esse listener, um erro em conexão ociosa
  derruba o processo Node inteiro.
- `testarConexao()` — roda um `SELECT NOW()` na inicialização, para a
  aplicação falhar cedo e com mensagem clara se o banco estiver fora do ar.
- `fecharConexao()` — chamado ao sair. Sem isso o processo fica pendurado.

---

### 2.4 O antes e o depois de cada operação

**Carregar o catálogo**

```ts
// ANTES — BoxService.ts
const dados = await readFile("pc_box.json", "utf-8");
this.pokemons = JSON.parse(dados) as PokemonResumo[];
```

```sql
-- DEPOIS — PokemonRepository.listarTodos()
SELECT p.id, p.nome, p.altura, p.peso,
       COALESCE(
           ARRAY_AGG(t.tipo ORDER BY t.tipo) FILTER (WHERE t.tipo IS NOT NULL),
           '{}'
       ) AS tipos
FROM pokemons p
LEFT JOIN pokemon_tipos t ON t.pokemon_id = p.id
GROUP BY p.id
ORDER BY p.id;
```

O `ARRAY_AGG` remonta o array `tipos` que antes vinha pronto do JSON.
O `FILTER` evita que um Pokémon sem tipos volte como `[null]`.

---

**Adicionar**

```ts
// ANTES
const jaExiste = this.pokemons.some((item) => item.id === pokemon.id);
if (!jaExiste) {
  this.pokemons.push(pokemon);
  await this.salvar();   // reescrevia o arquivo inteiro
}
```

```ts
// DEPOIS — PokemonRepository.inserir(), dentro de uma transação
await client.query("BEGIN");

INSERT INTO pokemons (id, nome, altura, peso)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pokemon_tipos (pokemon_id, tipo)
SELECT $1, UNNEST($2::text[])
ON CONFLICT DO NOTHING;

await client.query("COMMIT");
```

Três coisas ganhas aqui:

1. **`ON CONFLICT DO NOTHING`** — a duplicidade passa a ser garantida pelo
   banco. O `rowCount` diz se a linha foi inserida ou ignorada.
2. **Transação (`BEGIN`/`COMMIT`/`ROLLBACK`)** — ou as duas tabelas são
   gravadas, ou nenhuma é. Nunca sobra um Pokémon sem tipos.
3. **`UNNEST`** — insere todos os tipos com um único comando, em vez de um
   `INSERT` por tipo.

---

**Remover**

```ts
// ANTES
this.pokemons = this.pokemons.filter((p) => p.id !== id);
await this.salvar();
```

```sql
-- DEPOIS
DELETE FROM pokemons WHERE id = $1;
```

Os tipos somem sozinhos, por causa do `ON DELETE CASCADE`.
O `rowCount` informa se algo foi realmente apagado.

---

### 2.5 Consultas parametrizadas (`$1`, `$2`)

Repare que **nenhum** valor é concatenado dentro da string SQL:

```ts
// CORRETO — o driver envia o valor separado do comando
await pool.query("DELETE FROM pokemons WHERE id = $1", [id]);

// ERRADO — abre espaço para SQL Injection
await pool.query(`DELETE FROM pokemons WHERE id = ${id}`);
```

Esse é o ponto de segurança mais importante da migração.

---

### 2.6 Métodos que viraram assíncronos

O `listar()` era síncrono porque lia de um array em memória.
Agora ele consulta o banco, então virou `async`:

```ts
// ANTES — TerminalController
this.catalogo.listar();

// DEPOIS
await this.catalogo.listar();
```

O `CatalogoPokemon` também deixou de guardar o array `private pokemons`.
O banco passou a ser a única fonte da verdade — não há mais o risco de a
memória e o arquivo ficarem dessincronizados.

---

### 2.7 Bug corrigido de quebra

Na versão anterior o construtor chamava um método `async` sem `await`:

```ts
constructor() {
  this.carregar();   // Promise solta: se der erro, vira unhandled rejection
}
```

Além de nunca ser capturado pelo `try/catch` do controller, isso fazia a
aplicação começar a rodar antes de os dados terminarem de carregar. Na versão
nova não existe estado para carregar, e a verificação de conexão acontece no
`main.ts`, com `await` e tratamento de erro.

---

### 2.8 `tsconfig.json`

Foi adicionada uma única opção:

```json
"esModuleInterop": true
```

Necessária porque o pacote `pg` é CommonJS e o projeto é ESM
(`"type": "module"`). Por isso o import é feito assim:

```ts
import pg from "pg";
const { Pool } = pg;
```

---

## Parte 3 — Conferindo os dados no banco

```bash
psql -U postgres -d pokedex
```

No Windows, abra o **SQL Shell (psql)** pelo menu Iniciar e aceite os padrões,
informando `pokedex` como database.

```sql
-- catálogo completo, já com os tipos juntos
SELECT p.id, p.nome, STRING_AGG(t.tipo, ', ') AS tipos, p.altura, p.peso
FROM pokemons p
LEFT JOIN pokemon_tipos t ON t.pokemon_id = p.id
GROUP BY p.id
ORDER BY p.id;

-- quantos Pokémon de cada tipo
SELECT tipo, COUNT(*) FROM pokemon_tipos GROUP BY tipo ORDER BY 2 DESC;
```

---

## Parte 4 — Resolvendo problemas comuns

| Mensagem | Causa provável | Solução |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Serviço do PostgreSQL parado | Inicie o serviço (tabela do Passo 1) |
| `password authentication failed` | Senha errada no `.env` | Confira `DB_PASSWORD` |
| `database "pokedex" does not exist` | Banco não criado | `npm run db:create` |
| `psql: command not found` | `psql` fora do PATH | Use o SQL Shell, ou adicione a pasta `bin` ao PATH |
| `role "postgres" does not exist` | Usuário diferente na instalação | Ajuste `DB_USER` no `.env` |
| `relation "pokemons" does not exist` | Migração não rodou | `npm run db:migrate` |
| `Cannot find module 'pg'` | Dependências faltando | `npm install` |
| O programa não encerra ao sair | Pool aberto | Já resolvido pelo `fecharConexao()` |

---

## Parte 5 — Próximos passos sugeridos

- Trocar o script de migração por uma ferramenta de versionamento de schema
  (`node-pg-migrate`, Prisma ou Drizzle), para controlar a evolução das tabelas.
- Expor o catálogo como API REST com Express, reaproveitando o repositório.
- Escrever testes usando um banco de testes separado.
- Adicionar busca por tipo, aproveitando o índice já criado.
