// ABOUTME: RuleTester coverage for the schoolpilot/no-numeric-id ESLint rule.
// ABOUTME: Proves every contract-scan numeric-id pattern is flagged and numeric non-ids are not.

import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { parser } from 'typescript-eslint';
import rule from '../no-numeric-id.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser,
  },
});

/** An expected error plus its "keep it as a string" suggestion. */
function error(name, method, suggestionOutput) {
  return {
    messageId: 'numericIdCoercion',
    data: { name, method },
    suggestions: [{ desc: `Keep '${name}' as a string`, output: suggestionOutput }],
  };
}

ruleTester.run('no-numeric-id', rule, {
  valid: [
    {
      name: 'numeric amount is not an id',
      code: `const amount = Number(values.amount);`,
    },
    {
      name: 'numeric total parsed from a non-id field',
      code: `const total = parseInt(values.total, 10);`,
    },
    {
      name: 'id kept as a string',
      code: `const studentId = row.student_id;`,
    },
    {
      name: 'string id passed to an id setter',
      code: `setStudentId(row.student_id);`,
    },
    {
      name: 'non-id setter reads the input value',
      code: `setSearchTerm(e.target.value);`,
    },
    {
      name: 'unrelated unary plus',
      code: `const delta = +values.delta;`,
    },
  ],

  invalid: [
    {
      name: 'Number() on a snake_case id operand',
      code: `const value = Number(student_id);`,
      errors: [error('student_id', 'Number', `const value = student_id;`)],
    },
    {
      name: 'parseInt() on a camelCase id operand',
      code: `const value = parseInt(row.studentId, 10);`,
      errors: [error('studentId', 'parseInt', `const value = row.studentId;`)],
    },
    {
      name: 'object property ending in _id assigned Number()',
      code: `const record = { student_id: Number(row.student_id) };`,
      errors: [error('student_id', 'Number', `const record = { student_id: row.student_id };`)],
    },
    {
      name: 'object property ending in _id assigned parseInt() through a ternary',
      code: `const record = { role_id: values.role_id ? parseInt(values.role_id, 10) : undefined };`,
      errors: [
        error(
          'role_id',
          'parseInt',
          `const record = { role_id: values.role_id ? values.role_id : undefined };`,
        ),
      ],
    },
    {
      name: 'derived id declared from Number()',
      code: `const studentId = Number(row.student_id);`,
      errors: [error('studentId', 'Number', `const studentId = row.student_id;`)],
    },
    {
      name: 'derived id assigned parseInt() from an input value',
      code: `const selectedId = parseInt(e.target.value, 10);`,
      errors: [error('selectedId', 'parseInt', `const selectedId = e.target.value;`)],
    },
    {
      name: 'id setter called with Number() of the input value',
      code: `setStudentId(Number(e.target.value));`,
      errors: [error('setStudentId', 'Number', `setStudentId(e.target.value);`)],
    },
    {
      name: 'id setter called with parseInt() through a ternary',
      code: `setSelectedStudentId(e.target.value ? parseInt(e.target.value, 10) : null);`,
      errors: [
        error(
          'setSelectedStudentId',
          'parseInt',
          `setSelectedStudentId(e.target.value ? e.target.value : null);`,
        ),
      ],
    },
    {
      name: 'assignment to an id-like variable',
      code: `studentId = Number(row.student_id);`,
      errors: [error('studentId', 'Number', `studentId = row.student_id;`)],
    },
    {
      name: 'unary plus on an id operand',
      code: `const value = +student_id;`,
      errors: [error('student_id', '+', `const value = student_id;`)],
    },
    {
      name: 'unary plus on an input value assigned to an id setter',
      code: `setClassId(+e.target.value);`,
      errors: [error('setClassId', '+', `setClassId(e.target.value);`)],
    },
  ],
});
