# Pokédex TypeScript + PostgreSQL

## Sobre o projeto

Este projeto foi desenvolvido durante o curso de Desenvolvedor Back End Node do SCTEC.

A aplicação foi feita em Node.js com TypeScript e tem como objetivo consultar informações de Pokémon através da PokeAPI e permitir o gerenciamento de um catálogo.

O projeto funciona pelo terminal e **armazena os Pokémon cadastrados em um banco de dados PostgreSQL**.

> **Versão 2.0** — A persistência em arquivo `pc_box.json` foi substituída por um banco de dados relacional.
> O detalhamento completo da migração está em [PASSO-A-PASSO.md](./PASSO-A-PASSO.md).

## Tecnologias utilizadas

- Node.js
- TypeScript
- TSX
- **PostgreSQL**
- **node-postgres (`pg`)**
- **dotenv**
- PokeAPI
- Git e GitHub

## Pré-requisitos

- Node.js
- npm
- PostgreSQL instalado na máquina (versão 12 ou superior)
- Git

## Como instalar e executar

### 1. Instalar o PostgreSQL

**Windows**

Baixe o instalador oficial em https://www.postgresql.org/download/windows/ e
execute-o. Durante a instalação:

- anote a **senha** definida para o usuário `postgres` — ela vai no `.env`;
- mantenha a porta padrão `5432`;
- deixe marcado o componente **Command Line Tools** (traz o `psql`).

Ao final, o serviço já sobe sozinho junto com o Windows.

**macOS (Homebrew)**

    brew install postgresql@16
    brew services start postgresql@16

**Linux (Ubuntu/Debian)**

    sudo apt update
    sudo apt install postgresql postgresql-contrib
    sudo systemctl enable --now postgresql

Para confirmar que está tudo no ar:

    psql --version

### 2. Clonar e instalar as dependências

    git clone https://github.com/EvandroLuiz-dev/pokedex-typescript.git
    cd pokedex-typescript
    npm install

### 3. Configurar as credenciais

    cp .env.example .env

Abra o `.env` e coloque a senha que você definiu ao instalar o PostgreSQL:

    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=sua_senha_aqui
    DB_NAME=pokedex

Também é possível usar uma única string de conexão, útil para bancos em nuvem:

    DATABASE_URL=postgres://usuario:senha@host:5432/pokedex

### 4. Criar o banco de dados

    npm run db:create

O script conecta ao banco de manutenção `postgres` e cria o banco `pokedex`.
Se preferir fazer isso na mão:

    psql -U postgres -c "CREATE DATABASE pokedex;"

### 5. Criar as tabelas

    npm run db:migrate

### 6. Importar o catálogo antigo (opcional)

    npm run db:seed

Lê o `pc_box.json` da versão anterior e grava o conteúdo no PostgreSQL.

### 7. Iniciar a aplicação

    npm start

Menu apresentado no terminal:

    ===== POKÉDEX =====

    1 - Buscar Pokémon
    2 - Listar Pokémon
    3 - Remover Pokémon
    0 - Sair

## Scripts disponíveis

| Comando              | Descrição                                        |
|----------------------|--------------------------------------------------|
| `npm start`          | Inicia a aplicação                               |
| `npm run build`      | Compila o TypeScript para `dist/`                |
| `npm run db:create`  | Cria o banco `pokedex`, se ainda não existir     |
| `npm run db:migrate` | Cria as tabelas no banco                         |
| `npm run db:reset`   | Apaga e recria as tabelas                        |
| `npm run db:seed`    | Importa o `pc_box.json` para o banco             |

## Funcionalidades

- Buscar Pokémon pelo nome ou ID na PokeAPI
- Exibir informações resumidas do Pokémon
- Adicionar Pokémon ao catálogo
- Impedir Pokémon duplicado (garantido pela PRIMARY KEY do banco)
- Listar Pokémon cadastrados
- Remover Pokémon pelo ID
- Persistir os dados em PostgreSQL
- Informar quando um Pokémon não é encontrado
- Utilizar erros personalizados
- Interagir com a aplicação através do terminal

## Modelo de dados

    pokemons                          pokemon_tipos
    ┌──────────────────┐              ┌────────────────────┐
    │ id        PK     │──────┐       │ pokemon_id  PK FK  │
    │ nome      UNIQUE │      └──────>│ tipo        PK     │
    │ altura           │   1 : N      └────────────────────┘
    │ peso             │
    │ criado_em        │
    └──────────────────┘

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

O array `tipos`, que no JSON ficava dentro do próprio objeto, foi normalizado em uma tabela filha com relacionamento 1:N e `ON DELETE CASCADE`.

O schema também está disponível em [`database/schema.sql`](./database/schema.sql) para quem preferir executá-lo manualmente no psql, pgAdmin ou DBeaver.

## Estrutura do projeto

    pokedex-typescript/
    ├── src/
    │   ├── controllers/
    │   │   └── TerminalController.ts
    │   ├── database/
    │   │   ├── connection.ts        Pool de conexões
    │   │   ├── schema.ts            SQL de criação das tabelas
    │   │   ├── criarBanco.ts        Cria o banco pokedex
    │   │   ├── migrate.ts           Script de migração
    │   │   └── importarJson.ts      Importa o pc_box.json antigo
    │   ├── models/
    │   │   ├── CustomErrors.ts
    │   │   └── Pokemon.ts
    │   ├── repositories/
    │   │   └── PokemonRepository.ts Todo o SQL do projeto
    │   ├── services/
    │   │   ├── BoxService.ts
    │   │   └── PokeApiService.ts
    │   ├── utils/
    │   │   └── textFormatters.ts
    │   └── main.ts
    │
    ├── database/
    │   └── schema.sql
    ├── .env.example
    ├── pc_box.json                  Mantido apenas para o db:seed
    ├── package.json
    ├── tsconfig.json
    ├── PASSO-A-PASSO.md
    └── README.md

## Organização em camadas

### Models

`Pokemon.ts` contém as interfaces do projeto:

- `PokemonResumo` — os dados simplificados usados pela aplicação
- `PokemonApiResponse` — os campos aproveitados da resposta da PokeAPI
- `PokemonRow` — o formato bruto de uma linha vinda do PostgreSQL

`CustomErrors.ts` contém os erros personalizados:

- `APIError` — falhas de comunicação com a PokeAPI
- `DatabaseError` — falhas de banco de dados (substitui o antigo `LocalBoxError`)

### Database

`connection.ts` cria e exporta o pool de conexões, lendo as credenciais do `.env`. Também expõe `testarConexao()` e `fecharConexao()`.

`criarBanco.ts` cria o banco `pokedex`. Ele tem a sua própria conexão, e não usa o pool: o pool já aponta para o banco `pokedex`, que é justamente o que ainda não existe. Por isso ele se conecta ao banco de manutenção `postgres`, presente em qualquer instalação.

`migrate.ts` cria as tabelas. `importarJson.ts` migra os dados da versão anterior.

### Repositories

`PokemonRepository.ts` concentra **todo o SQL do projeto**. Métodos disponíveis:

- `listarTodos()` — `SELECT` com `LEFT JOIN` e `ARRAY_AGG` para remontar os tipos
- `buscarPorId(id)`
- `existe(id)`
- `inserir(pokemon)` — `INSERT` transacional nas duas tabelas
- `remover(id)` — `DELETE` com cascade automático
- `contar()`

Nenhum valor é concatenado dentro das strings SQL: todas as consultas usam parâmetros (`$1`, `$2`), o que protege contra SQL Injection.

### Services

`PokeApiService.ts` consulta a PokeAPI com `fetch` e transforma a resposta em `PokemonResumo`.

`BoxService.ts` contém as regras de negócio do catálogo. Ele delega o acesso aos dados ao repositório e não sabe qual banco está sendo usado.

### Controller

`TerminalController.ts` apresenta o menu e trata as opções escolhidas pelo usuário.

### Main

`main.ts` testa a conexão com o banco, monta o catálogo e o controller, inicia a aplicação e fecha o pool ao final.

## Conceitos aplicados

Além dos conceitos da versão anterior (TypeScript, interfaces, classes, métodos de array, `fetch`, `async/await`, tratamento de erros, organização em camadas), esta versão acrescenta:

- modelagem relacional e normalização
- chave primária, chave estrangeira e constraints
- `ON DELETE CASCADE`
- transações (`BEGIN` / `COMMIT` / `ROLLBACK`)
- consultas parametrizadas e prevenção de SQL Injection
- pool de conexões
- `JOIN`, `GROUP BY` e funções de agregação
- variáveis de ambiente e separação de configuração do código
- padrão Repository
- migração de dados entre formatos de persistência

## Exemplos de execução

### Buscar e adicionar Pokémon

    Escolha uma opção: 1
    Digite o nome ou ID do Pokémon: pikachu

    ID: 25, Nome: pikachu, Tipos: electric, Altura: 4, Peso: 60
    [OK] Pikachu adicionado ao catálogo.

### Impedir Pokémon duplicado

    Escolha uma opção: 1
    Digite o nome ou ID do Pokémon: pikachu

    ID: 25, Nome: pikachu, Tipos: electric, Altura: 4, Peso: 60
    [AVISO] Pikachu já está no catálogo.

### Listar Pokémon

    Escolha uma opção: 2

    ID: 4, Nome: Charmander, Tipos: fire, Altura: 6, Peso: 85
    ID: 25, Nome: Pikachu, Tipos: electric, Altura: 4, Peso: 60

    Total: 2 Pokémon no catálogo.

### Remover Pokémon

    Escolha uma opção: 3
    Digite o ID do Pokémon: 25

    [OK] Pokémon removido do catálogo.

## Conferindo os dados diretamente no banco

    psql -U postgres -d pokedex

No Windows, se o `psql` não for reconhecido no terminal, use o caminho completo
ou abra o **SQL Shell (psql)** que vem junto com a instalação.

```sql
SELECT p.id, p.nome, STRING_AGG(t.tipo, ', ') AS tipos, p.altura, p.peso
FROM pokemons p
LEFT JOIN pokemon_tipos t ON t.pokemon_id = p.id
GROUP BY p.id
ORDER BY p.id;
```

## Problemas comuns

| Mensagem | Causa provável | Solução |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Serviço do PostgreSQL parado | Inicie o serviço (ver tabela no PASSO-A-PASSO.md) |
| `password authentication failed` | Senha errada no `.env` | Confira `DB_PASSWORD` |
| `database "pokedex" does not exist` | Banco não criado | `npm run db:create` |
| `relation "pokemons" does not exist` | Migração não rodou | `npm run db:migrate` |
| `Cannot find module 'pg'` | Dependências faltando | `npm install` |

## API utilizada

O projeto utiliza a PokeAPI para consultar os dados dos Pokémon, pelo nome ou pelo ID.

    https://pokeapi.co/api/v2/pokemon/pikachu
    https://pokeapi.co/api/v2/pokemon/25

Documentação: https://pokeapi.co/docs/v2

## Melhorias futuras

- usar uma ferramenta de versionamento de schema (node-pg-migrate, Prisma, Drizzle)
- expor o catálogo como API REST com Express, reaproveitando o repositório
- adicionar busca por tipo, aproveitando o índice já criado
- escrever testes automatizados com um banco de testes separado
- melhorar a apresentação das informações no terminal

## Autor

**Evandro Luiz**

Projeto desenvolvido como parte do curso de Desenvolvedor Back End Node — SCTEC.
