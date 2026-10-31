const test = require('node:test');
const assert = require('node:assert/strict');
const search = require('../scripts/contribution-search.js');
const people = [
  { id: 'a', name: 'أحمد', referredById: null },
  { id: 'b', name: 'محمد أحمد علي', referredById: 'a' },
  { id: 'c', name: 'محمود', referredById: 'a' },
  { id: 'd', name: 'قديم' },
  { id: 'e', name: 'مؤرشف', referredById: 'a', archived: true },
];
const payments = [{ contributorId: 'b', month: 'أكتوبر 2026', amount: 50 }];
test('owner and month filters combine without changing old records', () => {
  const before = JSON.stringify({ people, payments });
  assert.deepEqual(search.eligible(people, payments, 'أكتوبر 2026', 'a').map(c => c.id), ['c']);
  assert.equal(search.eligible(people, payments, 'نوفمبر 2026', 'a').length, 2);
  assert.deepEqual(new Set(search.eligible(people, payments, 'أكتوبر 2026', '__none__').map(c => c.id)), new Set(['a', 'd']));
  assert.equal(search.eligible(people, payments, 'أكتوبر 2026').length, 3);
  assert.equal(search.eligible(people, payments, 'أكتوبر 2026', 'missing').length, 0);
  assert.equal(JSON.stringify({ people, payments }), before);
});
test('search handles Arabic variants, non-adjacent/reversed words, joined names and phone digits', () => {
  const item = { value: 'b', text: 'مُحَمَّد أحمد علي عبد الله', phone: '01012345678' };
  for (const query of ['محمد علي', 'علي محمد', 'احمد', 'عبدالله', '٠١٠١٢', '۰۱۰۱۲', 'محمد 45678']) assert.ok(search.score(item, query) > 0, query);
  assert.equal(search.score(item, 'محمد حسن'), 0);
  assert.equal(search.score({ value: '__new__', text: 'إضافة اسم جديد' }, 'محمد'), 0);
  assert.equal(search.score({ value: '', text: '-- اختر اسم --' }, ''), 0);
});
test('exact name then prefix rank before scattered matches', () => {
  const score = name => search.score({ value: 'x', text: name }, 'محمد علي');
  assert.ok(score('محمد علي') > score('محمد علي حسن'));
  assert.ok(score('محمد علي حسن') > score('محمد أحمد علي'));
});
