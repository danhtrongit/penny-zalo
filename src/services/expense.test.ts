import test from 'node:test';
import assert from 'node:assert/strict';

import * as expenseService from './expense.js';

test('should not flag duplicate when same amount but different descriptions', () => {
  const shouldFlagDuplicate = (expenseService as any).shouldFlagDuplicateExpense;

  assert.equal(typeof shouldFlagDuplicate, 'function');
  assert.equal(
    shouldFlagDuplicate(
      {
        amount: 50_000,
        description: 'uống nước',
        category: 'Ăn uống',
      },
      [
        {
          amount: 50_000,
          description: 'ăn cơm',
          category: 'Ăn uống',
        },
      ],
    ),
    false,
  );
});

test('should flag duplicate when same amount and same description', () => {
  const shouldFlagDuplicate = (expenseService as any).shouldFlagDuplicateExpense;

  assert.equal(typeof shouldFlagDuplicate, 'function');
  assert.equal(
    shouldFlagDuplicate(
      {
        amount: 50_000,
        description: 'ăn cơm',
        category: 'Ăn uống',
      },
      [
        {
          amount: 50_000,
          description: 'Ăn cơm',
          category: 'Ăn uống',
        },
      ],
    ),
    true,
  );
});

test('should flag duplicate when one description contains the other', () => {
  const shouldFlagDuplicate = (expenseService as any).shouldFlagDuplicateExpense;

  assert.equal(typeof shouldFlagDuplicate, 'function');
  assert.equal(
    shouldFlagDuplicate(
      {
        amount: 50_000,
        description: 'ăn cơm trưa',
        category: 'Ăn uống',
      },
      [
        {
          amount: 50_000,
          description: 'ăn cơm',
          category: 'Ăn uống',
        },
      ],
    ),
    true,
  );
});
