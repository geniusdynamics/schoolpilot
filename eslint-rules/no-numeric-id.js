// ABOUTME: ESLint rule that forbids coercing entity ids to numbers.
// ABOUTME: Ids are opaque UUID strings, so Number(), parseInt() and unary plus on id-like names are errors.

const ID_NAME = /(^id$|_id$|Id$)/;
const SETTER_NAME = /^set[A-Za-z0-9_]*(?:Id|_id)$/;
const COERCIONS = new Set(['Number', 'parseInt']);
const TRANSPARENT_WRAPPERS = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'ChainExpression',
]);
const EXPRESSION_WRAPPERS = new Set(['ConditionalExpression', 'LogicalExpression', 'SequenceExpression']);

/** Name of an identifier, property or string-literal key; null for computed expressions. */
function referenceName(node) {
  if (!node) return null;
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      return referenceName(node.property);
    case 'ChainExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return referenceName(node.expression);
    case 'Literal':
      return typeof node.value === 'string' ? node.value : null;
    default:
      return null;
  }
}

function isIdName(name) {
  return typeof name === 'string' && ID_NAME.test(name);
}

/** Climbs wrappers such as `as const` so context checks see the real parent expression. */
function outermost(node) {
  let current = node;
  while (current.parent && TRANSPARENT_WRAPPERS.has(current.parent.type)) {
    current = current.parent;
  }
  return current;
}

/** The setXId(...) call whose argument contains `node`, looking through ternaries. */
function enclosingSetter(node) {
  let current = outermost(node);
  while (current.parent && EXPRESSION_WRAPPERS.has(current.parent.type)) {
    current = current.parent;
  }
  const parent = current.parent;
  if (
    parent?.type === 'CallExpression' &&
    parent.callee.type === 'Identifier' &&
    SETTER_NAME.test(parent.callee.name) &&
    parent.arguments.includes(current)
  ) {
    return parent.callee.name;
  }
  return null;
}

/**
 * Describes why a coercion of `operand` at `node` involves an id, or null when it does not.
 * Checked in order: object property, declaration, assignment, id setter, id-like operand.
 */
function describeCoercion(node, operand) {
  const outer = outermost(node);
  const parent = outer.parent;

  if (parent?.type === 'Property' && parent.value === outer) {
    const key = referenceName(parent.key);
    if (isIdName(key)) return { name: key, kind: 'property' };
  }

  if (parent?.type === 'VariableDeclarator' && parent.init === outer) {
    const declared = referenceName(parent.id);
    if (isIdName(declared)) return { name: declared, kind: 'declaration' };
  }

  if (parent?.type === 'AssignmentExpression' && parent.right === outer) {
    const target = referenceName(parent.left);
    if (isIdName(target)) return { name: target, kind: 'assignment' };
  }

  const setter = enclosingSetter(node);
  if (setter) return { name: setter, kind: 'setter' };

  const operandName = referenceName(operand);
  if (isIdName(operandName)) return { name: operandName, kind: 'operand' };

  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow numeric coercion of entity ids (ids are opaque UUID strings)',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      numericIdCoercion:
        "Ids are opaque UUID strings, not numbers. Do not coerce '{{name}}' with {{method}}(); keep it as a string and compare with ===.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function report(node, operand, method) {
      const info = describeCoercion(node, operand);
      if (!info) return;

      const suggestion = operand
        ? [
            {
              desc: `Keep '${info.name}' as a string`,
              fix: (fixer) => fixer.replaceText(node, sourceCode.getText(operand)),
            },
          ]
        : [];

      context.report({
        node,
        messageId: 'numericIdCoercion',
        data: { name: info.name, method },
        suggest: suggestion,
      });
    }

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !COERCIONS.has(node.callee.name)) return;
        report(node, node.arguments[0], node.callee.name);
      },

      UnaryExpression(node) {
        if (node.operator !== '+') return;
        report(node, node.argument, '+');
      },
    };
  },
};

export default rule;
