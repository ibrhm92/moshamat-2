// Shared selectors and persistence; this feature never writes payment documents.
function referralName(id) {
  return allContributors.find(c => c.id === id)?.name || (id ? 'مسؤول غير موجود' : 'بدون');
}
function fillReferralSelect(select, excludedId = '', selected = select?.value || '') {
  if (!select) return;
  const options = [{ value: '', text: 'بدون مسؤول' }, ...allContributors
    .filter(c => c.id !== excludedId && (c.archived !== true || c.id === selected))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    .map(c => ({ value: c.id, text: c.name + (c.archived === true ? ' (مؤرشف)' : '') }))];
  // Preserve a missing historical owner until the user explicitly changes it.
  if (selected && !options.some(o => o.value === selected)) options.push({ value: selected, text: 'مسؤول غير موجود — اختر بديلاً أو بدون' });
  if (select.tomselect) {
    select.tomselect.clear(true);
    select.tomselect.clearOptions();
    select.tomselect.addOptions(options);
    select.tomselect.setValue(selected, true);
  } else {
    select.replaceChildren(...options.map(o => new Option(o.text, o.value)));
    select.value = selected;
    if (typeof TomSelect !== 'undefined') new TomSelect(select, {
      create: false, maxItems: 1, allowEmptyOption: true,
      score(search) {
        const normalize = text => String(text).normalize('NFD').replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[ىيئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
        return item => normalize(item.text).includes(normalize(search)) ? 1 : 0;
      }
    });
  }
}
function refreshReferralSelectors() {
  document.querySelectorAll('[data-referral-select]').forEach(s => {
    if (s.id !== 'editContributorReferral') fillReferralSelect(s);
  });
}
function selectedReferral(id) { return document.getElementById(id)?.value || null; }
function resetReferral(id) {
  const select = document.getElementById(id);
  if (select?.tomselect) select.tomselect.setValue('', true);
  else if (select) select.value = '';
}
async function validateNewReferral(ownerId) {
  if (!ownerId) return;
  let owner = allContributors.find(c => c.id === ownerId);
  if (!window._demoMode) {
    const doc = await firebase.firestore().collection('contributors').doc(ownerId).get();
    owner = doc.exists ? doc.data() : null;
  }
  if (!owner || owner.archived === true) throw new Error('اختر مسؤولاً نشطاً موجوداً');
}
async function saveReferralAssignments(ids, ownerId, extra = {}) {
  ids = [...new Set(ids)];
  if (!ids.length) throw new Error('حدد مساهمًا واحدًا على الأقل');
  if (ids.length > 400) throw new Error('حدد ٤٠٠ مساهم كحد أقصى في المرة الواحدة');
  const assignments = Object.fromEntries(ids.map(id => [id, ownerId || null]));
  if (window._demoMode) {
    Referrals.validate(allContributors, assignments);
    const owner = allContributors.find(c => c.id === ownerId);
    if (owner?.archived === true && ids.some(id => allContributors.find(c => c.id === id)?.referredById !== ownerId)) throw new Error('لا يمكن تعيين مسؤول مؤرشف');
  } else {
    const db = firebase.firestore();
    // Read and validate the actual ancestor chain in the same transaction as the updates.
    await db.runTransaction(async tx => {
      const nodes = new Map();
      async function read(id) {
        if (!nodes.has(id)) {
          const doc = await tx.get(db.collection('contributors').doc(id));
          if (!doc.exists) throw new Error('أحد المساهمين أو المسؤولين لم يعد موجوداً؛ حدّث البيانات');
          nodes.set(id, { ...doc.data(), id });
        }
        return nodes.get(id);
      }
      for (const id of ids) await read(id);
      for (const id of ids) {
        const seen = new Set([id]);
        let cursor = ownerId;
        while (cursor) {
          if (seen.has(cursor)) throw new Error('لا يمكن اختيار الشخص لنفسه أو إنشاء علاقة دائرية');
          seen.add(cursor);
          const node = await read(cursor);
          cursor = Object.prototype.hasOwnProperty.call(assignments, cursor) ? assignments[cursor] : node.referredById;
        }
      }
      Referrals.validate([...nodes.values()], assignments);
      if (ownerId && nodes.get(ownerId).archived === true && ids.some(id => nodes.get(id).referredById !== ownerId)) throw new Error('لا يمكن تعيين مسؤول مؤرشف');
      ids.forEach(id => tx.update(db.collection('contributors').doc(id), { ...extra, referredById: ownerId || null }));
    });
  }
  ids.forEach(id => Object.assign(allContributors.find(c => c.id === id) || {}, extra, { referredById: ownerId || null }));
  document.dispatchEvent(new Event('contributors-updated'));
}
document.addEventListener('DOMContentLoaded', refreshReferralSelectors);
document.addEventListener('contributors-updated', refreshReferralSelectors);
function escapeReferralHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
