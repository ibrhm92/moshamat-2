const test = require('node:test');
const assert = require('node:assert/strict');
const Referrals = require('../scripts/referrals-model.js');
const people = [
  { id: 'a', name: 'أحمد' },
  { id: 'b', name: 'محمد', referredById: 'a' },
  { id: 'c', name: 'محمود', referredById: 'a' },
  { id: 'd', name: 'علي', referredById: 'b' },
  { id: 'e', name: 'مؤرشف', referredById: 'a', archived: true },
  { id: 'legacy', name: 'قديم' },
];
const payments = [
  { contributorId: 'a', month: 'أكتوبر 2026', amount: 100 },
  { contributorId: 'b', month: 'أكتوبر 2026', amount: 50 },
  { contributorId: 'b', month: 'أكتوبر 2026', amount: 25 },
  { contributorId: 'c', month: 'سبتمبر 2026', amount: 100 },
  { contributorId: 'd', month: 'أكتوبر 2026', amount: 100 },
  { contributorId: 'e', month: 'أكتوبر 2026', amount: 100 },
];
test('legacy records, direct members, archived members, month and duplicate payments', () => {
  const before = JSON.stringify({ people, payments });
  const r = Referrals.report(people, payments, 'a', 'أكتوبر 2026');
  assert.equal(r.rows.length, 2); assert.equal(r.paid.length, 1); assert.equal(r.unpaid.length, 1);
  assert.equal(r.total, 75); assert.equal(r.unpaid[0].id, 'c');
  assert.equal(Referrals.report(people, payments, 'a', 'يناير 2026').unpaid.length, 2);
  assert.equal(JSON.stringify({ people, payments }), before);
});
test('self, ancestor, bulk cycles and missing owners rejected; unlink allowed', () => {
  for (const assignments of [{ a: 'a' }, { a: 'd' }, { a: 'b', b: 'a' }, { b: 'missing' }]) {
    assert.throws(() => Referrals.validate(people, assignments));
  }
  assert.doesNotThrow(() => Referrals.validate(people, { b: null }));
  assert.doesNotThrow(() => Referrals.validate(people, { b: 'legacy', c: 'legacy' }));
});
test('WhatsApp options do not leak paid names or amounts and normalize Egyptian numbers', () => {
  const r = Referrals.report(people, payments, 'a', 'أكتوبر 2026');
  const text = Referrals.message(people[0], 'أكتوبر 2026', r, true, false);
  assert.ok(text.includes('محمود')); assert.ok(!text.includes('محمد')); assert.ok(!text.includes('جنيه'));
  assert.equal(Referrals.phone('01012345678'), '201012345678');
  assert.equal(Referrals.phone('+20 1012345678'), '201012345678');
  assert.equal(Referrals.phone('00201012345678'), '201012345678');
  assert.equal(Referrals.phone('bad'), '');
});

const vm = require('node:vm');
const fs = require('node:fs');
function persistenceHarness() {
  const records = structuredClone(people);
  const writes = [];
  const delays = [];
  const db = {
    collection(name) { return { doc(id) { return { name, id }; } }; },
    async runTransaction(callback) {
      const pending = [];
      await callback({
        async get(ref) {
          const record = records.find(c => c.id === ref.id);
          return { exists: !!record, data: () => structuredClone(record) };
        },
        update(ref, patch) { pending.push({ ref, patch }); }
      });
      pending.forEach(({ ref, patch }) => {
        writes.push({ ref, patch }); Object.assign(records.find(c => c.id === ref.id), patch);
      });
    }
  };
  const context = vm.createContext({
    window: { _demoMode: false }, Referrals, allContributors: structuredClone(people),
    setTimeout(resolve, delay) { delays.push(delay); resolve(); },
    firebase: { firestore: () => db }, document: { addEventListener() {}, dispatchEvent() {} }, Event: class {}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../scripts/referrals.js'), 'utf8'), context);
  return { context, writes, records, db, delays };
}
test('transaction updates optional owner only; bulk rejection is atomic and old fields survive', async () => {
  const h = persistenceHarness();
  const before = structuredClone(h.records);
  await assert.rejects(() => h.context.saveReferralAssignments(['b', 'a'], 'd'), /دائرية/);
  assert.equal(h.writes.length, 0); assert.deepEqual(h.records, before);
  await h.context.saveReferralAssignments(['b', 'c'], 'legacy');
  assert.equal(h.writes.length, 2);
  assert.ok(h.writes.every(w => w.ref.name === 'contributors' && Object.keys(w.patch).join() === 'referredById'));
  assert.equal(h.records.find(c => c.id === 'b').referredById, 'legacy');
  assert.equal(h.records.find(c => c.id === 'b').name, 'محمد');
  await h.context.saveReferralAssignments(['b'], null, { name: 'محمد الجديد', phone: '01012345678' });
  assert.equal(h.records.find(c => c.id === 'b').referredById, null);
});

test('429 gets bounded backoff and succeeds without duplicate contributor updates', async () => {
  const h = persistenceHarness();
  const run = h.db.runTransaction.bind(h.db);
  let attempts = 0;
  h.db.runTransaction = async callback => {
    if (++attempts < 3) throw Object.assign(new Error('Server responded with status 429'), { code: 'resource-exhausted' });
    return run(callback);
  };
  await h.context.saveReferralAssignments(['b', 'c'], 'legacy');
  assert.equal(attempts, 3); assert.deepEqual(h.delays, [1500, 3000]);
  assert.equal(h.writes.length, 2);
  assert.equal(h.records.find(c => c.id === 'b').referredById, 'legacy');
});
test('persistent rate limits stop after three attempts with no speculative local changes', async () => {
  const h = persistenceHarness(); const before = JSON.stringify(h.context.allContributors);
  let attempts = 0;
  h.db.runTransaction = async () => { attempts++; throw { status: 429 }; };
  await assert.rejects(() => h.context.saveReferralAssignments(['b'], 'legacy'));
  assert.equal(attempts, 3); assert.equal(h.writes.length, 0);
  assert.equal(JSON.stringify(h.context.allContributors), before);
  assert.match(h.context.referralSaveError({ status: 429 }), /التحديد|المحددة/);
});
test('validation and permission errors never trigger rate-limit retries', async () => {
  const h = persistenceHarness(); let attempts = 0;
  h.db.runTransaction = async () => { attempts++; throw { code: 'permission-denied' }; };
  await assert.rejects(() => h.context.saveReferralAssignments(['b'], 'legacy'));
  assert.equal(attempts, 1); assert.deepEqual(h.delays, []);
});
