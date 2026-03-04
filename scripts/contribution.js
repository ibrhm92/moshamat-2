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

function bindContributionEvents() {
  // Name select change
  const nameSelect = document.getElementById('nameSelect');
  if (nameSelect) {
    nameSelect.addEventListener('change', handleNameSelect);
  }
  
  // Month select change - update name dropdown
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      console.log('Month changed, updating name dropdown...');
      populateNameDropdown();
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

function handleNameSelect() {
  const nameSelect = document.getElementById('nameSelect');
  const newNameGroup = document.getElementById('newNameGroup');
  const phoneInput = document.getElementById('phoneInput');
  
  if (nameSelect.value === '__new__') {
    newNameGroup.classList.add('show');
    phoneInput.value = ''; // Clear phone for new contributor
  } else if (nameSelect.value) {
    newNameGroup.classList.remove('show');
    
    // Find contributor and populate phone if exists
    const contributor = allContributors.find(c => c.id === nameSelect.value);
    if (contributor && contributor.phone) {
      phoneInput.value = contributor.phone;
      console.log(`Populated phone for ${contributor.name}: ${contributor.phone}`);
    } else {
      phoneInput.value = ''; // Clear if no phone exists
    }
  } else {
    newNameGroup.classList.remove('show');
    phoneInput.value = ''; // Clear if no selection
  }
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
  const month = document.getElementById('monthSelect').value;
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

    if (window._demoMode) {
      if (nameVal === '__new__') {
        contributorId = 'demo_' + Date.now();
        allContributors.push({ id: contributorId, name: newName, phone: phone });
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
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        contributorId = docRef.id;
        contributorName = newName;
        allContributors.push({ id: contributorId, name: newName, phone: phone });
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
    document.getElementById('nameSelect').value = '';
    document.getElementById('newNameInput').value = '';
    document.getElementById('phoneInput').value = '';
    document.getElementById('amountInput').value = '';
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
  const paidIds = new Set(monthPay.map(p => p.contributorId));
  const totalMembers = allContributors.length;
  const paidCount = paidIds.size;
  const unpaidCount = totalMembers - paidCount;
  const includeUnpaid = document.getElementById('includeUnpaid').checked;
  const unpaidNames = allContributors
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
