// WhatsApp messages page
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindWhatsAppEvents();
  });
});

let unpaidContributors = [];

// Make sure loadData is available globally
if (typeof loadData !== 'function') {
  console.warn('loadData function not available, creating fallback');
  window.loadData = async function(force = false) {
    console.log('Fallback loadData called');
    // This will be overridden by firebase-config.js if it loads properly
    return Promise.resolve();
  };
}

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (whatsapp)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (whatsapp)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (whatsapp)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (whatsapp)');
        resolve();
      }, 10000);
    }
  });
}

function bindWhatsAppEvents() {
  // Load unpaid button
  const loadUnpaidBtn = document.getElementById('loadUnpaidBtn');
  if (loadUnpaidBtn) {
    loadUnpaidBtn.addEventListener('click', loadUnpaidContributors);
  }
  
  // Manual data loading button
  const loadDataBtn = document.getElementById('loadDataBtn');
  if (loadDataBtn) {
    loadDataBtn.addEventListener('click', async () => {
      const btn = loadDataBtn;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> جاري التحميل...';
      btn.disabled = true;
      
      try {
        showToast('⏳ جاري تحميل البيانات...');
        
        if (typeof loadData === 'function') {
          await loadData(true);
          showToast('✅ تم تحميل البيانات بنجاح');
        } else {
          showToast('❌ دالة التحميل غير متوفرة', true);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('❌ خطأ في تحميل البيانات: ' + error.message, true);
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }
  
  // Preview modal events
  const previewBtn = document.getElementById('previewBtn');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');
  const confirmSendBtn = document.getElementById('confirmSendBtn');
  const previewModal = document.getElementById('previewModal');
  
  if (previewBtn) previewBtn.addEventListener('click', showPreview);
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', closePreview);
  if (cancelPreviewBtn) cancelPreviewBtn.addEventListener('click', closePreview);
  if (confirmSendBtn) confirmSendBtn.addEventListener('click', confirmSend);
  
  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      if (e.target.id === 'previewModal') closePreview();
    });
  }
  
  // Send all button
  const sendAllBtn = document.getElementById('sendAllBtn');
  if (sendAllBtn) {
    sendAllBtn.addEventListener('click', showPreview);
  }
  
  // Set default message
  const messageText = document.getElementById('messageText');
  if (messageText) {
    const monthSelect = document.getElementById('monthSelect');
    const selectedMonth = monthSelect ? monthSelect.value : 'مارس 2026';
    messageText.value = `مرحباً يا إخواني،

تذكير بخصوص مساهمة شهر ${selectedMonth}

من فضلك قم بتسديد مساهمتك في أقرب وقت ممكن.

شكراً لتفهمكم وتعاونكم.`;
  }
}

async function loadUnpaidContributors() {
  const monthSelect = document.getElementById('monthSelect');
  currentMonth = monthSelect ? monthSelect.value : 'مارس 2026';
  
  console.log('Loading unpaid contributors for:', currentMonth);
  console.log('Available contributors:', allContributors.length);
  console.log('Available payments:', allPayments.length);
  
  // Show loading state
  const tbody = document.getElementById('unpaidBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">جاري البحث عن غير الدافعين...</td></tr>';
  }
  
  // Check if data is available
  if (allContributors.length === 0 && allPayments.length === 0) {
    console.warn('No data available for whatsapp');
    showToast('⏳ جاري تحميل البيانات...');
    
    try {
      // Try to load data
      if (typeof loadData === 'function') {
        console.log('Attempting to load data...');
        await loadData(true);
        console.log('Data loaded successfully');
      } else {
        console.error('loadData function not available');
        showToast('❌ خطأ في تحميل البيانات', true);
        return;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('❌ خطأ في تحميل البيانات: ' + error.message, true);
      return;
    }
  }
  
  // Double check data availability
  if (allContributors.length === 0) {
    console.error('No contributors found after loading');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty">لا يوجد مساهمون في النظام</td></tr>';
    }
    return;
  }
  
  console.log('Processing data...');
  console.log('Contributors:', allContributors.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
  console.log('Payments:', allPayments.map(p => ({ contributorId: p.contributorId, month: p.month, amount: p.amount })));
  
  // Find contributors who haven't paid for the selected month
  const monthPayments = allPayments.filter(p => p.month === currentMonth);
  console.log('Month payments for', currentMonth, ':', monthPayments);
  
  const paidContributorIds = new Set(monthPayments.map(p => p.contributorId));
  console.log('Paid contributor IDs:', Array.from(paidContributorIds));
  
  unpaidContributors = allContributors.filter(contributor => 
    !paidContributorIds.has(contributor.id)
  );
  
  console.log('Unpaid contributors:', unpaidContributors);
  
  // Update statistics
  updateUnpaidStats();
  
  // Render unpaid table
  renderUnpaidTable();
  
  // Show sections
  const unpaidSection = document.getElementById('unpaidSection');
  const messageSection = document.getElementById('messageSection');
  
  if (unpaidSection) unpaidSection.style.display = 'block';
  if (messageSection) messageSection.style.display = 'block';
  
  // Update message template
  updateMessageTemplate();
  
  // Show success message
  if (unpaidContributors.length === 0) {
    showToast('🎉 جميع المساهمين دفعوا لهذا الشهر');
  } else {
    showToast(`✅ تم العثور على ${unpaidContributors.length} غير دافعين`);
  }
  
  console.log(`Found ${unpaidContributors.length} unpaid contributors for ${currentMonth}`);
}

function updateUnpaidStats() {
  const totalContributorsEl = document.getElementById('totalContributors');
  const unpaidCountEl = document.getElementById('unpaidCount');
  const phoneCountEl = document.getElementById('phoneCount');
  
  const totalContributors = allContributors.length;
  const unpaidCount = unpaidContributors.length;
  const phoneCount = unpaidContributors.filter(c => c.phone && c.phone.trim() !== '').length;
  
  if (totalContributorsEl) totalContributorsEl.textContent = totalContributors;
  if (unpaidCountEl) unpaidCountEl.textContent = unpaidCount;
  if (phoneCountEl) phoneCountEl.textContent = phoneCount;
}

function renderUnpaidTable() {
  const tbody = document.getElementById('unpaidBody');
  if (!tbody) return;
  
  if (unpaidContributors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">جميع المساهمين دفعوا لهذا الشهر 🎉</td></tr>';
    return;
  }
  
  tbody.innerHTML = unpaidContributors.map((contributor, index) => {
    const hasPhone = contributor.phone && contributor.phone.trim() !== '';
    const statusIcon = hasPhone ? '📱' : '❌';
    const statusText = hasPhone ? 'لديه هاتف' : 'لا يوجد هاتف';
    const checkboxDisabled = !hasPhone ? 'disabled title="لا يوجد رقم هاتف"' : '';
    
    return `
      <tr id="row-${index}" style="${!hasPhone ? 'opacity:0.5;' : ''}">
        <td style="text-align:center;">
          <input type="checkbox" 
            class="contributor-checkbox" 
            data-index="${index}" 
            ${hasPhone ? 'checked' : checkboxDisabled}
            style="cursor:${hasPhone ? 'pointer' : 'not-allowed'};width:16px;height:16px;"
            onchange="updateSelectedCount()">
        </td>
        <td>${contributor.name}</td>
        <td>${hasPhone ? contributor.phone : '-'}</td>
        <td>${statusIcon} ${statusText}</td>
      </tr>
    `;
  }).join('');
  
  // ربط checkbox الكل
  const selectAllCb = document.getElementById('selectAllCheckbox');
  if (selectAllCb) {
    selectAllCb.checked = true;
    selectAllCb.onchange = function() {
      if (this.checked) selectAllWithPhone();
      else deselectAll();
    };
  }
  
  updateSelectedCount();
}

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.contributor-checkbox:not([disabled])');
  const checked = document.querySelectorAll('.contributor-checkbox:not([disabled]):checked');
  const countEl = document.getElementById('selectedCount');
  if (countEl) countEl.textContent = checked.length;
  
  // تحديث حالة checkbox الكل
  const selectAllCb = document.getElementById('selectAllCheckbox');
  if (selectAllCb) {
    selectAllCb.checked = checked.length === checkboxes.length && checkboxes.length > 0;
    selectAllCb.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
}

function selectAllWithPhone() {
  document.querySelectorAll('.contributor-checkbox:not([disabled])').forEach(cb => cb.checked = true);
  updateSelectedCount();
}

function selectAll() {
  document.querySelectorAll('.contributor-checkbox:not([disabled])').forEach(cb => cb.checked = true);
  updateSelectedCount();
}

function deselectAll() {
  document.querySelectorAll('.contributor-checkbox').forEach(cb => { if (!cb.disabled) cb.checked = false; });
  updateSelectedCount();
}

function getSelectedContributors() {
  const selected = [];
  document.querySelectorAll('.contributor-checkbox:not([disabled]):checked').forEach(cb => {
    const index = parseInt(cb.dataset.index);
    if (unpaidContributors[index]) selected.push(unpaidContributors[index]);
  });
  return selected;
}


  const messageText = document.getElementById('messageText');
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : 'مارس 2026';
  
  if (messageText) {
    messageText.value = `مرحباً يا إخواني،

تذكير بخصوص مساهمة شهر ${selectedMonth}

من فضلك قم بتسديد مساهمتك في أقرب وقت ممكن.

شكراً لتفهمكم وتعاونكم.`;
  }
}

function showPreview() {
  const messageText = document.getElementById('messageText').value.trim();
  
  if (!messageText) {
    showToast('❌ اكتب نص الرسالة أولاً', true);
    return;
  }
  
  if (unpaidContributors.length === 0) {
    showToast('❌ لا يوجد مساهمون غير دافعين', true);
    return;
  }
  
  const selectedContributors = getSelectedContributors();
  
  if (selectedContributors.length === 0) {
    showToast('❌ لم تحدد أي مساهم لإرسال الرسالة إليه', true);
    return;
  }
  
  // Update preview content
  document.getElementById('previewText').textContent = messageText;
  
  const listHtml = selectedContributors.map(c => 
    `<div style="padding:4px 0;border-bottom:1px solid #eee;">📱 ${c.name} — ${c.phone}</div>`
  ).join('');
  
  document.getElementById('previewStats').innerHTML = `
    <div style="margin-bottom:10px;">📤 سيتم إرسال <strong>${selectedContributors.length}</strong> رسالة خاصة للمساهمين التاليين:</div>
    <div style="max-height:180px;overflow-y:auto;font-size:13px;border:1px solid #eee;border-radius:8px;padding:8px;">
      ${listHtml}
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
      💡 كل رسالة ستُرسل بشكل خاص للمساهم المنفرد
    </div>
  `;
  
  // Show modal
  document.getElementById('previewModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  document.getElementById('previewModal').classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * تنسيق رقم الهاتف ليكون متوافقاً مع wa.me
 * يدعم الأرقام المصرية والدولية
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // إزالة كل حاجة مش رقم أو + في الأول
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // لو بيبدأ بـ + شيل الـ +
  cleaned = cleaned.replace(/^\+/, '');
  
  // لو فاضي بعد التنظيف
  if (!cleaned) return null;
  
  // لو بيبدأ بـ 00 (بعض الناس بيكتب 0020...)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // أرقام مصرية: لو بدأت بـ 0 وطولها 11 → ابعت كود مصر 20
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '20' + cleaned.substring(1);
  }
  
  // لو الرقم 10 أرقام فقط (بدون أي كود) → افترض مصري
  if (cleaned.length === 10 && !cleaned.startsWith('20')) {
    cleaned = '20' + cleaned;
  }
  
  // تحقق أن الرقم النهائي معقول (بين 10 و15 رقم)
  if (cleaned.length < 10 || cleaned.length > 15) {
    console.warn('رقم غير صالح بعد التنسيق:', cleaned);
    return null;
  }
  
  return cleaned;
}

function confirmSend() {
  const messageText = document.getElementById('messageText').value.trim();
  const selectedContributors = getSelectedContributors();
  
  if (selectedContributors.length === 0) {
    showToast('❌ لم تحدد أي مساهم', true);
    return;
  }
  
  // Send individual private messages
  let successCount = 0;
  let failCount = 0;
  
  selectedContributors.forEach((contributor, index) => {
    try {
      const encodedMessage = encodeURIComponent(messageText);
      const phoneNumber = formatPhoneNumber(contributor.phone.trim());
      
      if (!phoneNumber) {
        console.warn('Invalid phone number for:', contributor.name, contributor.phone);
        failCount++;
        return;
      }
      
      // Create individual WhatsApp URL for private message
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      
      // Open WhatsApp in new tab with slight delay to avoid overwhelming the browser
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, index * 200); // 200ms delay between each message
      
      successCount++;
    } catch (error) {
      console.error('Error sending to', contributor.name, error);
      failCount++;
    }
  });
  
  closePreview();
  
  // Show result
  if (successCount > 0) {
    showToast(`✅ تم فتح ${successCount} رسالة واتس خاصة`);
  }
  
  if (failCount > 0) {
    showToast(`❌ فشل في إرسال ${failCount} رسالة`, true);
  }
  
  console.log(`Sent ${successCount} private WhatsApp messages for ${currentMonth}`);
}

// Make functions globally accessible
window.loadUnpaidContributors = loadUnpaidContributors;
window.showPreview = showPreview;
window.closePreview = closePreview;
window.confirmSend = confirmSend;
window.selectAll = selectAll;
window.selectAllWithPhone = selectAllWithPhone;
window.deselectAll = deselectAll;
window.updateSelectedCount = updateSelectedCount;
window.getSelectedContributors = getSelectedContributors;
