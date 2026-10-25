// Thin async wrapper around Cloudflare D1 that keeps the get/all/run shape
// the route handlers were originally written against (better-sqlite3).
type Param = string | number | null | undefined;

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export class Statement {
  private readonly stmt: D1PreparedStatement;

  constructor(stmt: D1PreparedStatement) {
    this.stmt = stmt;
  }

  private bound(params: Param[]) {
    return this.stmt.bind(...params.map((p) => (p === undefined ? null : p)));
  }

  async get<T = any>(...params: Param[]): Promise<T | undefined> {
    return (await this.bound(params).first<T>()) ?? undefined;
  }

  async all<T = any>(...params: Param[]): Promise<T[]> {
    const { results } = await this.bound(params).all<T>();
    return results;
  }

  async run(...params: Param[]): Promise<RunResult> {
    const { meta } = await this.bound(params).run();
    return { changes: meta.changes, lastInsertRowid: meta.last_row_id };
  }
}

export class Db {
  private readonly d1: D1Database;

  constructor(d1: D1Database) {
    this.d1 = d1;
  }

  prepare(sql: string) {
    return new Statement(this.d1.prepare(sql));
  }
}
