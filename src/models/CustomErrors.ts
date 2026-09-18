/**
 * Erro relacionado à comunicação com a PokeAPI.
 */
export class APIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "APIError";
    }
}

/**
 * Erro relacionado ao banco de dados PostgreSQL.
 *
 * Substitui o antigo LocalBoxError, que representava falhas de leitura
 * e escrita do arquivo pc_box.json.
 */
export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseError";
    }
}

/**
 * Mantido apenas por compatibilidade com a versão anterior do projeto,
 * que salvava os dados em arquivo. Não é mais utilizado.
 *
 * @deprecated Use DatabaseError.
 */
export class LocalBoxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LocalBoxError";
    }
}
