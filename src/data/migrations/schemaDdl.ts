// ABOUTME: Reads a module's declared DDL as the objects it creates, and derives the statements
// ABOUTME: that drop those objects again, so a schema migration reverses what its module created.

/** The kinds of object a module's DDL creates. */
export type SchemaObjectKind = 'table' | 'index' | 'trigger';

/** One object a DDL statement creates. */
export interface SchemaObject {
  readonly kind: SchemaObjectKind;
  readonly name: string;
}

/**
 * The head of a CREATE statement: the object it creates and the name it gives it.
 *
 * The modules declare their DDL as plain text, and every statement starts with one of these
 * three shapes. A statement that does not match is refused when the registry is built, not
 * silently left behind by a rollback.
 */
const CREATE_OBJECT =
  /^\s*CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/i;

function kindOf(keyword: string): SchemaObjectKind {
  switch (keyword.toUpperCase()) {
    case 'TABLE':
      return 'table';
    case 'INDEX':
      return 'index';
    default:
      return 'trigger';
  }
}

/**
 * The objects a list of DDL statements creates, in the order it creates them.
 *
 * This is the reading a schema migration is built on: the migration's `up` is the module's own
 * DDL, and its `down` is this list reversed.
 */
export function schemaObjectsOf(statements: readonly string[]): SchemaObject[] {
  return statements.map((statement) => {
    const match = CREATE_OBJECT.exec(statement);
    const name = match?.[2] ?? match?.[3];
    if (!match || !name) {
      throw new Error(
        `A schema migration only understands CREATE TABLE, CREATE INDEX and CREATE TRIGGER statements, and this one is none of them: ${statement.slice(0, 120)}`
      );
    }
    return { kind: kindOf(match[1]), name };
  });
}

/** The statement that drops one object. */
export function dropStatementFor(object: SchemaObject): string {
  const keyword =
    object.kind === 'table' ? 'TABLE' : object.kind === 'index' ? 'INDEX' : 'TRIGGER';
  return `DROP ${keyword} IF EXISTS "${object.name}"`;
}

/**
 * The statements that undo a list of DDL statements.
 *
 * They run in reverse: the indexes and triggers go before the tables they belong to, and a
 * table that another one references goes before its parent. Every statement is `IF EXISTS`,
 * so a rollback over a database whose objects were already removed still finishes.
 */
export function dropStatementsFor(statements: readonly string[]): string[] {
  return schemaObjectsOf(statements)
    .reverse()
    .map(dropStatementFor);
}
