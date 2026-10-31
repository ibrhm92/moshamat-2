// Read-only filtering/search helpers shared by the contribution form and tests.
(function (root) {
  'use strict';
  function normalize(value) {
    return String(value || '').normalize('NFD')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[ىيئ]/g, 'ي')
      .replace(/ؤ/g, 'و').replace(/ة/g, 'ه')
      .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0))
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function score(item, query) {
    if (item.value === '__new__') return normalize(query) ? 0 : 0.5;
    if (!item.value) return 0;
    const search = normalize(query);
    if (!search) return 1;
    const name = normalize(item.text);
    const phone = normalize(item.phone).replace(/[\s()+-]/g, '');
    const fields = `${name} ${phone}`.replace(/\s/g, '');
    if (!search.split(' ').every(token => fields.includes(token))) return 0;
    if (name === search || phone === search) return 4;
    if (name.startsWith(search)) return 3;
    if (name.includes(search)) return 2;
    return 1;
  }
  function eligible(contributors, payments, month, owner = '') {
    const paid = new Set(payments.filter(p => p.month === month).map(p => p.contributorId));
    return contributors.filter(c => c.archived !== true && !paid.has(c.id)
      && (!owner || (owner === '__none__' ? !c.referredById : c.referredById === owner)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }
  function ownerPhone(owner) {
    let phone = normalize(owner?.phone).replace(/[\s()+-]/g, '');
    if (/^00201\d{9}$/.test(phone)) phone = phone.slice(2);
    if (/^201\d{9}$/.test(phone)) phone = '0' + phone.slice(2);
    return /^01\d{9}$/.test(phone) ? phone : '';
  }
  const api = { normalize, score, eligible, ownerPhone };
  root.ContributionSearch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
