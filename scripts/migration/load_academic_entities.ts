// Data loading script for SchoolPilot3 RxDB collections

import { getDB } from './rxdb'; // Assuming you have an RxDB setup file

async function loadData(collectionName: string, data: any[]) {
  const db = await getDB();
  const collection = db[collectionName];
  await collection.bulkInsert(data);
}

async function main() {
  // Placeholder for transformed data
  const transformedSubjects: any[] = [];
  const transformedExamSessions: any[] = [];
  const transformedStudentExamResults: any[] = [];

  await loadData('subjects', transformedSubjects);
  await loadData('exam_sessions', transformedExamSessions);
  await loadData('student_exam_results', transformedStudentExamResults);
}

main();

