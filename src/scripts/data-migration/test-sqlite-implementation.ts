#!/usr/bin/env node

// ABOUTME: Simple test script to verify SQLite implementation with basic data

import { SQLiteOPFSService } from '../../services/sqlite/SQLiteOPFSService';

async function testSQLiteImplementation() {
  console.log('Testing SQLite implementation with basic data...');

  try {
    // Initialize SQLite service
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('test_database.db');
    console.log('✅ SQLite service initialized');

    // Create a simple test collection schema
    const testSchema = {
      version: 0,
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        age: { type: 'integer' },
        email: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      },
      required: ['id', 'name'],
      indexes: [
        { name: 'idx_name', fields: ['name'] },
        { name: 'idx_email', fields: ['email'] }
      ],
      primaryKey: 'id'
    };

    // Create collection
    const testCollection = await sqliteService.createCollection('test_users', testSchema);
    console.log('✅ Test collection created');

    // Insert some test data
    const testData = [
      { id: '1', name: 'John Doe', age: 30, email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', age: 25, email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', age: 35, email: 'bob@example.com' }
    ];

    console.log('Inserting test data...');
    const insertResults = await testCollection.insertMany(testData);
    console.log(`✅ Inserted ${insertResults.docs.length} records`);

    // Query the data
    console.log('Querying data...');
    const allUsers = await testCollection.find();
    console.log(`✅ Found ${allUsers.length} users`);

    // Test specific queries
    const john = await testCollection.findOne({ selector: { name: 'John Doe' } });
    console.log('✅ Found user by name:', john?.name);

    const youngUsers = await testCollection.find({ 
      selector: { age: { $lt: 30 } },
      sort: [{ age: 'asc' }]
    });
    console.log(`✅ Found ${youngUsers.length} users under 30`);

    // Test updates
    if (john && john.id) {
      const updateResult = await testCollection.update(john.id, { age: 31 });
      console.log('✅ Updated user age:', updateResult.doc?.age);
    }

    // Test deletion
    const bob = await testCollection.findOne({ selector: { name: 'Bob Johnson' } });
    if (bob && bob.id) {
      const deleteResult = await testCollection.remove(bob.id);
      console.log('✅ Deleted user:', deleteResult.ok);
    }

    // Count remaining records
    const count = await testCollection.count();
    console.log(`✅ Final count: ${count} users`);

    // Test backup
    const backup = await sqliteService.backup();
    console.log('✅ Backup created, size:', backup.length, 'characters');

    console.log('✅ SQLite implementation test completed successfully');

  } catch (error) {
    console.error('❌ SQLite implementation test failed:', error);
    throw error;
  }
}

// Run the test
testSQLiteImplementation().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});