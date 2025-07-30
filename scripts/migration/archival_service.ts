// Service for archiving non-migrated historical data

class ArchivalService {
  private archiveDB: any; // Connection to the archival database

  constructor(archiveDB: any) {
    this.archiveDB = archiveDB;
  }

  async archive(tableName: string, data: any[]) {
    const archiveTable = `archive_${tableName}`;
    await this.archiveDB.query(`CREATE TABLE IF NOT EXISTS ${archiveTable} (data JSON)`);
    for (const item of data) {
      await this.archiveDB.query(`INSERT INTO ${archiveTable} (data) VALUES (?)`, [JSON.stringify(item)]);
    }
  }

  async search(tableName: string, query: string): Promise<any[]> {
    const archiveTable = `archive_${tableName}`;
    const results = await this.archiveDB.query(`SELECT data FROM ${archiveTable} WHERE data LIKE ?`, [`%${query}%`]);
    return results.map((row: any) => JSON.parse(row.data));
  }
}

