let referralOwnerId = '';
let referralDataReady = false;
function renderReferralGroups() {
  if (!referralDataReady) return;
  const month = document.getElementById('referralMonth').value;
  const body = document.getElementById('referralGroupsBody');
  const owners = allContributors.filter(owner => allContributors.some(c => c.referredById === owner.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  body.replaceChildren();
  owners.forEach(owner => {
    const data = Referrals.report(allContributors, allPayments, owner.id, month);
    const row = document.createElement('tr');
    [owner.name + (owner.archived === true ? ' (مؤرشف)' : ''), data.rows.length, data.paid.length,
      data.unpaid.length, `${data.total.toLocaleString('ar-EG')} جنيه`].forEach(value => {
      const td = document.createElement('td'); td.textContent = value; row.appendChild(td);
    });
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-outline'; button.textContent = 'التفاصيل ورسالة واتساب';
    button.addEventListener('click', () => {
      referralOwnerId = owner.id; renderReferralPreview();
      document.getElementById('referralPreview').scrollIntoView({ behavior: 'smooth' });
    });
    action.appendChild(button); row.appendChild(action); body.appendChild(row);
  });
  if (!owners.length) body.innerHTML = '<tr><td colspan="6">لا توجد مجموعات بعد. اربط المساهمين بمسؤوليهم من صفحة المساهمين.</td></tr>';
  const unlinked = allContributors.filter(c => c.archived !== true && !c.referredById).length;
  const missing = allContributors.filter(c => c.referredById && !allContributors.some(owner => owner.id === c.referredById)).length;
  document.getElementById('referralCoverage').textContent = `المسؤولون: ${owners.length} — النشطون بدون مسؤول: ${unlinked}` + (missing ? ` — روابط تحتاج تصحيحًا: ${missing}` : '');
  document.getElementById('referralStatus').textContent = window._demoMode ? '⚠️ وضع تجريبي — بيانات مؤقتة وليست السجلات الحقيقية' : 'تم تحميل البيانات';
  renderReferralPreview();
}
function renderReferralPreview() {
  const section = document.getElementById('referralPreview');
  const owner = allContributors.find(c => c.id === referralOwnerId);
  section.hidden = !owner;
  if (!owner) return;
  const month = document.getElementById('referralMonth').value;
  const data = Referrals.report(allContributors, allPayments, owner.id, month);
  document.getElementById('referralOwnerTitle').textContent = `مجموعة ${owner.name} — ${month}`;
  const ownPayments = allPayments.filter(p => p.contributorId === owner.id && p.month === month);
  document.getElementById('referralOwnerPayment').textContent = `مساهمة المسؤول نفسه (خارج إجمالي المجموعة): ${ownPayments.length ? ownPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString('ar-EG') + ' جنيه' : 'لم يدفع'}`;
  document.getElementById('referralMembers').replaceChildren(...data.rows.map(member => {
    const li = document.createElement('li');
    li.textContent = `${member.paid ? '✅' : '❌'} ${member.name}${member.paid ? ' — ' + member.amount.toLocaleString('ar-EG') + ' جنيه' : ' — لم يدفع'}`;
    return li;
  }));
  const message = Referrals.message(owner, month, data,
    document.getElementById('referralUnpaidOnly').checked, document.getElementById('referralShowAmounts').checked);
  document.getElementById('referralMessage').value = message;
  const phone = Referrals.phone(owner.phone);
  const link = document.getElementById('referralWhatsApp');
  link.hidden = !phone;
  if (phone) link.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  else link.removeAttribute('href');
  document.getElementById('referralPhoneHint').textContent = phone
    ? `ستفتح الرسالة على رقم المسؤول: ${owner.phone}. راجعها ثم اضغط إرسال داخل واتساب.`
    : 'رقم المسؤول ناقص أو غير صحيح؛ عدّله من صفحة المساهمين، أو انسخ الرسالة.';
}
document.addEventListener('contributors-updated', () => {
  // The shared load event fires only after both contributors and payments are available.
  if (!window._referralDataLoaded) return;
  referralDataReady = true;
  initializeReferralMonths();
  renderReferralGroups();
});
function initializeReferralMonths() {
  const select = document.getElementById('referralMonth');
  const selected = select.value || currentMonth;
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const year = new Date().getFullYear();
  const values = [...new Set([...months.map(m => `${m} ${year}`), ...allPayments.map(p => p.month), currentMonth])].filter(Boolean);
  select.replaceChildren(...values.map(m => new Option(m, m)));
  select.value = selected;
}
document.addEventListener('DOMContentLoaded', () => {
  initializeReferralMonths();
  document.getElementById('referralMonth').addEventListener('change', renderReferralGroups);
  ['referralUnpaidOnly', 'referralShowAmounts'].forEach(id => document.getElementById(id).addEventListener('change', renderReferralPreview));
  document.getElementById('copyReferralMessage').addEventListener('click', async () => {
    const textarea = document.getElementById('referralMessage');
    try { await navigator.clipboard.writeText(textarea.value); showToast('✅ تم نسخ الرسالة'); }
    catch { textarea.focus(); textarea.select(); showToast('حدد النص وانسخه يدويًا', true); }
  });
  document.getElementById('refreshReferralData').addEventListener('click', async event => {
    event.target.disabled = true;
    document.getElementById('referralStatus').textContent = 'جاري تحديث البيانات...';
    window._referralDataLoaded = false;
    await loadData(true);
    if (!window._referralDataLoaded) document.getElementById('referralStatus').textContent = 'تعذر التحديث؛ البيانات المعروضة من آخر تحميل ناجح. أعد المحاولة.';
    event.target.disabled = false;
  });
});

document.addEventListener('data-load-failed', () => {
  document.getElementById('referralStatus').textContent = 'تعذر تحميل البيانات. أعد المحاولة بزر تحديث البيانات.';
  if (!referralDataReady) document.getElementById('referralGroupsBody').innerHTML = '<tr><td colspan="6">تعذر التحميل؛ لا يمكن تحديد حالة الدفع قبل تحميل البيانات.</td></tr>';
});
