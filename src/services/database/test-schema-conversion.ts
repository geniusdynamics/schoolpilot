// Test file to verify hardened RxDB schema conversion
import { convertRxDBSchema } from './ProviderSelector';

// Test cases for different schema formats
const testCases = [
  {
    name: 'Schema wrapped in object',
    input: {
      schema: {
        version: 0,
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 200 },
          age: { type: 'number', minimum: 0 }
        },
        required: ['id', 'name'],
        indexes: ['name', 'age']
      }
    }
  },
  {
    name: 'Raw schema object',
    input: {
      version: 1,
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        email: { type: 'string', format: 'email' },
        active: { type: 'boolean', default: true }
      },
      required: ['id', 'email'],
      indexes: [
        'email',
        ['email', 'active'],
        { fields: ['id'], unique: true }
      ]
    }
  },
  {
    name: 'Schema with missing optional fields',
    input: {
      properties: {
        id: { type: 'string' },
        data: { type: 'object' }
      }
    }
  },
  {
    name: 'Schema with complex index definitions',
    input: {
      schema: {
        properties: {
          userId: { type: 'string' },
          timestamp: { type: 'number' },
          category: { type: 'string' }
        },
        required: ['userId', 'timestamp'],
        indexes: [
          'userId',
          ['userId', 'timestamp'],
          {
            name: 'category_index',
            fields: ['category'],
            unique: false,
            sparse: true
          }
        ]
      }
    }
  }
];

// Run tests
console.log('🧪 Testing RxDB Schema Conversion...\n');

for (const testCase of testCases) {
  console.log(`\n📝 Test: ${testCase.name}`);
  console.log('Input:', JSON.stringify(testCase.input, null, 2));
  
  try {
    const result = convertRxDBSchema(testCase.input);
    console.log('✅ Conversion successful!');
    console.log('Output:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  }
}

// Test error cases
console.log('\n\n🧪 Testing Error Cases...\n');

const errorCases = [
  {
    name: 'Null input',
    input: null
  },
  {
    name: 'Undefined input',
    input: undefined
  },
  {
    name: 'String input',
    input: 'not an object'
  },
  {
    name: 'Number input',
    input: 42
  },
  {
    name: 'Wrapper with null schema',
    input: { schema: null }
  }
];

for (const errorCase of errorCases) {
  console.log(`\n📝 Error Test: ${errorCase.name}`);
  console.log('Input:', errorCase.input);
  
  try {
    const result = convertRxDBSchema(errorCase.input);
    console.error('❌ Should have thrown an error but succeeded');
  } catch (error) {
    console.log('✅ Correctly threw error:', error.message);
  }
}

console.log('\n\n✨ Schema conversion tests complete!');
