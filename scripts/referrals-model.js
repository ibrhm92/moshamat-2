// Optional contributor-to-contributor links. Missing referredById means no owner.
(function (root) {
  'use strict';
  const active = c => c.archived !== true;
  function validate(contributors, assignments) {
    const byId = new Map(contributors.map(c => [c.id, c]));
    for (const [id, ownerId] of Object.entries(assignments)) {
      if (!byId.has(id)) throw new Error('المساهم غير موجود؛ حدّث البيانات');
      if (ownerId && !byId.has(ownerId)) throw new Error('المسؤول غير موجود');
      const seen = new Set([id]);
      let cursor = ownerId;
      while (cursor) {
        if (seen.has(cursor)) throw new Error('لا يمكن اختيار الشخص لنفسه أو إنشاء علاقة دائرية');
        seen.add(cursor);
        const node = byId.get(cursor);
        if (!node) throw new Error('يوجد مسؤول غير موجود في سلسلة الربط؛ صحح الربط أولاً');
        cursor = Object.prototype.hasOwnProperty.call(assignments, cursor)
          ? assignments[cursor] : node.referredById;
      }
    }
  }
  function report(contributors, payments, ownerId, month) {
    if (!month) throw new Error('اختر شهراً للمتابعة');
    const members = contributors.filter(c => active(c) && c.referredById === ownerId && c.id !== ownerId)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const monthly = payments.filter(p => p.month === month);
    const rows = members.map(c => {
      const own = monthly.filter(p => p.contributorId === c.id);
      return { ...c, paid: own.length > 0, amount: own.reduce((s, p) => s + (Number(p.amount) || 0), 0) };
    });
    return { rows, paid: rows.filter(c => c.paid), unpaid: rows.filter(c => !c.paid),
      total: rows.reduce((s, c) => s + c.amount, 0) };
  }
  function message(owner, month, summary, unpaidOnly, showAmounts) {
    const lines = [`السلام عليكم يا ${owner.name}`, `متابعة مساهمات شهر ${month} للمجموعة المسؤول عنها:`, ''];
    if (!unpaidOnly) {
      lines.push('✅ دفعوا:');
      lines.push(...(summary.paid.length ? summary.paid.map(c => `• ${c.name}${showAmounts ? ` — ${c.amount.toLocaleString('ar-EG')} جنيه` : ''}`) : ['لا يوجد']));
      lines.push('');
    }
    lines.push('❌ لم يدفعوا:', ...(summary.unpaid.length ? summary.unpaid.map(c => `• ${c.name}`) : ['لا يوجد']), '',
      `عدد المجموعة: ${summary.rows.length}`, `دفعوا: ${summary.paid.length} — لم يدفعوا: ${summary.unpaid.length}`);
    if (showAmounts) lines.push(`إجمالي المحصل: ${summary.total.toLocaleString('ar-EG')} جنيه`);
    lines.push('برجاء متابعة المتبقي، وجزاك الله خيرًا.');
    return lines.join('\n');
  }
  function phone(value) {
    let number = String(value || '').replace(/[\s()+-]/g, '');
    if (/^01\d{9}$/.test(number)) number = '20' + number.slice(1);
    if (/^00201\d{9}$/.test(number)) number = number.slice(2);
    return /^201\d{9}$/.test(number) ? number : '';
  }
  const api = { validate, report, message, phone };
  root.Referrals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
