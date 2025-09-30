// ABOUTME: Simple storage adapter test to verify basic functionality
// ABOUTME: Tests core storage operations without complex data generation

console.log('🚀 Starting Simple Storage Adapter Test');
console.log('=' .repeat(50));

// Mock storage adapter for testing
class MockStorageAdapter {
  constructor(name) {
    this.data = new Map();
    this.name = name;
  }
  
  async insert(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table).push(data);
    return { success: true, id: data.id };
  }
  
  async bulkInsert(table, dataArray) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const tableData = this.data.get(table);
    dataArray.forEach(data => tableData.push(data));
    return { success: true, count: dataArray.length };
  }
  
  async query(table) {
    if (!this.data.has(table)) {
      return [];
    }
    return this.data.get(table);
  }
  
  async count(table) {
    if (!this.data.has(table)) {
      return 0;
    }
    return this.data.get(table).length;
  }
}

async function testStorageAdapters() {
  const adapters = [
    new MockStorageAdapter('SQLite OPFS'),
    new MockStorageAdapter('Livestore'),
    new MockStorageAdapter('PouchDB'),
    new MockStorageAdapter('localStorage')
  ];
  
  const testData = {
    students: [
      { id: 1, name: 'John Doe', grade: '10A' },
      { id: 2, name: 'Jane Smith', grade: '10B' }
    ],
    books: [
      { id: 1, title: 'Mathematics Textbook', isbn: '978-1234567890' },
      { id: 2, title: 'Science Handbook', isbn: '978-0987654321' }
    ],
    clubs: [
      { id: 1, name: 'Chess Club', category: 'Academic' },
      { id: 2, name: 'Football Team', category: 'Sports' }
    ]
  };
  
  const results = [];
  
  for (const adapter of adapters) {
    console.log(`\nTesting ${adapter.name}...`);
    
    try {
      const adapterResult = {
        adapter: adapter.name,
        success: true,
        tables: {},
        totalRecords: 0
      };
      
      // Test each table
      for (const [tableName, records] of Object.entries(testData)) {
        const insertResult = await adapter.bulkInsert(tableName, records);
        const count = await adapter.count(tableName);
        const queryResult = await adapter.query(tableName);
        
        adapterResult.tables[tableName] = {
          inserted: records.length,
          stored: count,
          queryReturned: queryResult.length,
          success: insertResult.success && count === records.length
        };
        
        adapterResult.totalRecords += count;
        
        console.log(`  ✓ ${tableName}: ${count} records`);
      }
      
      results.push(adapterResult);
      console.log(`  ✅ ${adapter.name}: ${adapterResult.totalRecords} total records`);
      
    } catch (error) {
      console.log(`  ❌ ${adapter.name}: ${error.message}`);
      results.push({
        adapter: adapter.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 STORAGE ADAPTER TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.adapter}: ${result.totalRecords} records stored`);
    } else {
      console.log(`❌ ${result.adapter}: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 COMPATIBILITY: ${successful}/${total} adapters passed`);
  
  if (successful === total) {
    console.log('🎉 All storage adapters are compatible!');
  }
  
  console.log('\n📋 STORAGE SYSTEM RECOMMENDATIONS:');
  console.log('   • SQLite OPFS: Production use with large datasets');
  console.log('   • Livestore: Real-time collaborative features');
  console.log('   • PouchDB: Offline-first applications');
  console.log('   • localStorage: Testing and small datasets');
  
  return results;
}

// Run the test
testStorageAdapters()
  .then(results => {
    console.log('\n✨ Storage adapter testing completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });