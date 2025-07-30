// Verification queries for data migration

async function verifyDataIntegrity(db: any, legacyDB: any) {
  const legacyStudentCount = await legacyDB.query('SELECT COUNT(*) as count FROM students');
  const newStudentCount = await db.students.count().exec();

  if (legacyStudentCount[0].count !== newStudentCount) {
    console.error('Student count mismatch!');
  }

  // Add more verification queries here
}

