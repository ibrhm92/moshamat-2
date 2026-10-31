// Contribution page specific functionality
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindContributionEvents();
  });
});

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (contribution)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (contribution)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (contribution)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (contribution)');
        resolve();
      }, 10000);
    }
  });
}

let previousContributionSelection = '';
let manualContributorPhone = '';
function bindContributionEvents() {
  document.getElementById('newNameReferral').addEventListener('change', syncOwnerPhone);
  document.getElementById('useOwnerPhone').addEventListener('change', event => {
    const input = document.getElementById('phoneInput');
    if (event.target.checked) manualContributorPhone = input.value;
    else input.value = manualContributorPhone;
    syncOwnerPhone();
  });
  const ownerFilter = document.getElementById('contributionOwnerFilter');
  ownerFilter.addEventListener('change', () => populateNameDropdown(true));
  document.getElementById('clearOwnerFilter').addEventListener('click', () => {
    if (ownerFilter.tomselect) ownerFilter.tomselect.setValue('');
    else { ownerFilter.value = ''; populateNameDropdown(true); }
  });
  document.getElementById('addNewContributorShortcut').addEventListener('click', () => {
    const select = document.getElementById('nameSelect');
    if (select.tomselect) select.tomselect.setValue('__new__');
    else { select.value = '__new__'; handleNameSelect(); }
    document.getElementById('newNameInput').focus();
  });
  refreshContributionOwnerFilter();

  // Name select change
  const nameSelect = document.getElementById('nameSelect');
  if (nameSelect) {
    nameSelect.addEventListener('change', handleNameSelect);
    initNameSearch(nameSelect);
  }
  
  // Month select change - update name dropdown
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      console.log('Month changed, updating name dropdown...');
      populateNameDropdown(true);
    });
  }
  
  // Submit button
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitAndSend);
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => window.location.href = 'home.html');
  }
  
  // Stats button
  const statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => window.location.href = 'statistics.html');
  }
  
  // Unpaid toggle
  const includeUnpaid = document.getElementById('includeUnpaid');
  const manualUnpaidSection = document.getElementById('manualUnpaidSection');
  
  if (includeUnpaid && manualUnpaidSection) {
    includeUnpaid.addEventListener('change', () => {
      manualUnpaidSection.style.display = includeUnpaid.checked ? 'block' : 'none';
    });
  }
}

function initNameSearch(nameSelect) {
  if (typeof TomSelect === 'undefined' || nameSelect.tomselect) return;
  // Read extra metadata even when data arrived before Tom Select was initialized.
  const options = [...nameSelect.options].map(o => ({ value: o.value, text: o.text,
    phone: o.dataset.phone || '', owner: o.dataset.owner || '' }));
  new TomSelect(nameSelect, {
    options, allowEmptyOption: false, create: false, maxItems: 1, maxOptions: null,
    placeholder: 'ابحث بالاسم أو رقم الهاتف...',
    searchField: ['text', 'phone'], sortField: [{ field: '$score', direction: 'desc' }, { field: 'text', direction: 'asc' }],
    score(search) { return item => ContributionSearch.score(item, search); },
    render: {
      option(item, escape) {
        if (item.value === '__new__') return '<div class="contribution-option-new">＋ إضافة مساهم جديد</div>';
        return `<div class="contribution-option"><span class="contribution-option-name">${escape(item.text)}</span><span class="contribution-option-meta"><bdi>${escape(item.phone || 'بدون هاتف')}</bdi> · ${escape(item.owner || 'بدون مسؤول')}</span></div>`;
      },
      no_results() { return '<div class="no-results">لا توجد نتائج. جرّب جزءًا آخر من الاسم أو الهاتف، وراجع الشهر وفلتر المسؤول.</div>'; }
    }
  });
}

function refreshContributionOwnerFilter() {
  const select = document.getElementById('contributionOwnerFilter');
  if (!select) return;
  const selected = select.value;
  const owners = allContributors.filter(owner => allContributors.some(c => c.archived !== true && c.referredById === owner.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const options = [{ value: '', text: 'كل المسؤولين' }, { value: '__none__', text: 'بدون مسؤول' },
    ...owners.map(owner => ({ value: owner.id, text: owner.name + (owner.archived === true ? ' (مؤرشف)' : '') }))];
  const next = options.some(o => o.value === selected) ? selected : '';
  if (select.tomselect) {
    select.tomselect.clear(true); select.tomselect.clearOptions(); select.tomselect.addOptions(options);
    select.tomselect.setValue(next, true);
  } else {
    select.replaceChildren(...options.map(o => new Option(o.text, o.value))); select.value = next;
    if (typeof TomSelect !== 'undefined') new TomSelect(select, {
      allowEmptyOption: true, create: false, maxItems: 1, maxOptions: null,
      score(search) { const q = ContributionSearch.normalize(search); return item => ContributionSearch.normalize(item.text).includes(q) ? 1 : 0; }
    });
  }
  // A removed owner must not leave the names list filtered by an obsolete ID.
  if (selected !== next) populateNameDropdown(true);
}
document.addEventListener('contributors-updated', refreshContributionOwnerFilter);

function syncOwnerPhone() {
  const checkbox = document.getElementById('useOwnerPhone');
  const input = document.getElementById('phoneInput');
  const owner = allContributors.find(c => c.id === selectedReferral('newNameReferral'));
  const phone = ContributionSearch.ownerPhone(owner);
  const isNew = document.getElementById('nameSelect').value === '__new__';
  input.readOnly = isNew && checkbox.checked;
  if (input.readOnly) input.value = phone;
  document.getElementById('ownerPhoneHint').textContent = !owner
    ? 'اختر المسؤول أولًا لاستخدام رقمه، أو ألغِ الخيار وأدخل رقمًا مستقلًا.'
    : !phone ? 'المسؤول ليس لديه رقم موبايل مصري صحيح. عدّل رقمه أو أدخل رقمًا مستقلًا للمساهم.'
    : checkbox.checked && isNew ? `سيُحفظ رقم ${owner.name} (${phone}) لهذا المساهم. يمكنك تغييره لاحقًا من بيانات المساهم.`
    : `رقم المسؤول ${owner.name}: ${phone}`;
}
document.addEventListener('contributors-updated', syncOwnerPhone);

function handleNameSelect() {
  const nameSelect = document.getElementById('nameSelect');
  const newNameGroup = document.getElementById('newNameGroup');
  const phoneInput = document.getElementById('phoneInput');
  const checkbox = document.getElementById('useOwnerPhone');
  if (nameSelect.value === '__new__') {
    newNameGroup.classList.add('show');
    if (previousContributionSelection !== '__new__') {
      checkbox.checked = false; manualContributorPhone = ''; phoneInput.value = '';
    }
  } else {
    newNameGroup.classList.remove('show');
    checkbox.checked = false; manualContributorPhone = '';
    phoneInput.value = allContributors.find(c => c.id === nameSelect.value)?.phone || '';
  }
  previousContributionSelection = nameSelect.value;
  syncOwnerPhone();
}

async function submitAndSend() {
  const btn = document.getElementById('submitBtn');
  const originalText = btn.innerHTML;
  
  btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';
  btn.disabled = true;
  
  try {
    const saved = await submitPayment();
    
    if (saved) {
      await sendWhatsApp(saved);
      // Redirect to home page after successful submission
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 2000);
    }
  } catch (error) {
    showToast('❌ ' + error.message, true);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function submitPayment() {
  const nameVal = document.getElementById('nameSelect').value;
  const newName = document.getElementById('newNameInput').value.trim();
  const referredById = selectedReferral('newNameReferral');
  const month = document.getElementById('monthSelect').value;
  if (nameVal === '__new__' && document.getElementById('useOwnerPhone').checked) {
    syncOwnerPhone();
    if (!referredById || !document.getElementById('phoneInput').value) throw new Error('اختر مسؤولًا برقم موبايل صحيح أو ألغِ استخدام رقم المسؤول');
  }
  const phone = document.getElementById('phoneInput').value.trim();
  const amount = parseFloat(document.getElementById('amountInput').value);

  if (!nameVal) { 
    throw new Error('اختر اسم المساهم'); 
  }
  if (nameVal === '__new__' && !newName) { 
    throw new Error('أدخل الاسم الجديد'); 
  }
  if (!phone) { 
    throw new Error('أدخل رقم الهاتف'); 
  }
  if (!/^01[0-9]{9}$/.test(phone)) { 
    throw new Error('رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)'); 
  }
  if (!amount || amount <= 0) { 
    throw new Error('أدخل مبلغاً صحيحاً'); 
  }

  // Check if this contributor already paid for this month
  const existingPayment = allPayments.find(p => 
    p.contributorId === nameVal && p.month === month
  );
  
  if (existingPayment) {
    const contributor = allContributors.find(c => c.id === nameVal);
    const contributorName = contributor ? contributor.name : 'غير معروف';
    throw new Error(`المساهم ${contributorName} قد دفع بالفعل لشهر ${month} (مبلغ: ${existingPayment.amount} جنيه)`);
  }

  try {
    let contributorId = nameVal;
    let contributorName = '';

    if (nameVal === '__new__') await validateNewReferral(referredById);
    if (window._demoMode) {
      if (nameVal === '__new__') {
        contributorId = 'demo_' + Date.now();
        allContributors.push({ id: contributorId, name: newName, phone: phone, archived: false, referredById });
        contributorName = newName;
      } else {
        contributorName = allContributors.find(c => c.id === nameVal)?.name || '';
        // Update phone number for existing contributor
        const contributorIndex = allContributors.findIndex(c => c.id === nameVal);
        if (contributorIndex !== -1) {
          allContributors[contributorIndex].phone = phone;
        }
      }
      allPayments.push({ id: 'p_' + Date.now(), contributorId, month, amount, phone, timestamp: new Date() });
      showToast('✅ تم حفظ المساهمة (وضع تجريبي)');
    } else {
      if (nameVal === '__new__') {
        const docRef = await firebase.firestore().collection('contributors').add({
          name: newName,
          phone: phone,
          referredById,
          archived: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        contributorId = docRef.id;
        contributorName = newName;
        allContributors.push({ id: contributorId, name: newName, phone: phone, archived: false, referredById });
      } else {
        contributorName = allContributors.find(c => c.id === nameVal)?.name || '';
        // Update phone number for existing contributor
        const contributorIndex = allContributors.findIndex(c => c.id === nameVal);
        if (contributorIndex !== -1) {
          allContributors[contributorIndex].phone = phone;
          // Update in Firebase as well
          const contributorRef = firebase.firestore().collection('contributors').doc(nameVal);
          await contributorRef.update({ phone: phone });
        }
      }
      await firebase.firestore().collection('payments').add({
        contributorId,
        month,
        amount,
        phone,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      allPayments.push({ id: 'tmp', contributorId, month, amount, phone, timestamp: new Date() });
      showToast('✅ تم حفظ المساهمة بنجاح');
    }

    const savedData = { name: contributorName, month, amount, phone };

    // Reset form
    const nameSelect = document.getElementById('nameSelect');
    if (nameSelect.tomselect) {
      nameSelect.tomselect.clear(true);
    } else {
      nameSelect.value = '';
    }
    document.getElementById('newNameInput').value = '';
    document.getElementById('useOwnerPhone').checked = false;
    manualContributorPhone = ''; previousContributionSelection = '';
    document.getElementById('phoneInput').readOnly = false;
    resetReferral('newNameReferral');
    syncOwnerPhone();
    document.getElementById('phoneInput').value = '';
    document.getElementById('amountInput').value = '100';
    document.getElementById('newNameGroup').classList.remove('show');

    // Update stats
    if (window._demoMode) {
      updateStats();
    } else {
      await loadData(true);
    }

    return savedData;

  } catch (e) {
    throw new Error('خطأ: ' + e.message);
  }
}

async function sendWhatsApp(saved) {
  const { name, month, amount, phone } = saved;

  const monthPay = allPayments.filter(p => p.month === month);
  const totalMonth = monthPay.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const activeContributors = getActiveContributors();
  const activeIds = new Set(activeContributors.map(c => c.id));
  const paidIds = new Set(
    monthPay
      .filter(p => activeIds.has(p.contributorId))
      .map(p => p.contributorId)
  );
  const totalMembers = activeContributors.length;
  const paidCount = paidIds.size;
  const unpaidCount = totalMembers - paidCount;
  const includeUnpaid = document.getElementById('includeUnpaid').checked;
  const unpaidNames = activeContributors
    .filter(c => !paidIds.has(c.id))
    .map(c => `• ${c.name}`)
    .join('\n');

  // Get manual unpaid names
  const manualUnpaidInput = document.getElementById('manualUnpaidNames');
  const manualUnpaidText = manualUnpaidInput ? manualUnpaidInput.value.trim() : '';
  const manualUnpaidNames = manualUnpaidText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => `• ${name}`)
    .join('\n');

  let unpaidSection = '';
  if (includeUnpaid) {
    const allUnpaidNames = [];
    if (unpaidCount > 0) allUnpaidNames.push(unpaidNames);
    if (manualUnpaidNames) allUnpaidNames.push(manualUnpaidNames);
    
    if (allUnpaidNames.length > 0) {
      unpaidSection = `\n\n*من لم يدفع:*\n${allUnpaidNames.join('\n')}`;
    }
  }

  const msg = `💰 *تسجيل مساهمة جديدة*
━━━━━━━━━━━━━━━
👤 الاسم: ${name}
 الشهر: ${month}
💵 المبلغ: ${Number(amount).toLocaleString('ar-EG')} جنيه
━━━━━━━━━━━━━━━
📊 إجمالي ${month}: ${totalMonth.toLocaleString('ar-EG')} جنيه
👥 عدد المشتركين: ${totalMembers}
✅ دفعوا: ${paidCount}
❌ لم يدفعوا بعد: ${unpaidCount}${unpaidSection}`;

  const encoded = encodeURIComponent(msg);
  const groupLink = localStorage.getItem('wa_group_link');
  
  if (groupLink) {
    window.open(`${groupLink}&text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}
