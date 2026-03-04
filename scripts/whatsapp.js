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
    tbody.innerHTML = '<tr><td colspan="3" class="empty">جميع المساهمين دفعوا لهذا الشهر 🎉</td></tr>';
    return;
  }
  
  tbody.innerHTML = unpaidContributors.map(contributor => {
    const hasPhone = contributor.phone && contributor.phone.trim() !== '';
    const statusIcon = hasPhone ? '📱' : '❌';
    const statusText = hasPhone ? 'لديه هاتف' : 'لا يوجد هاتف';
    
    return `
      <tr>
        <td>${contributor.name}</td>
        <td>${hasPhone ? contributor.phone : '-'}</td>
        <td>${statusIcon} ${statusText}</td>
      </tr>
    `;
  }).join('');
}

function updateMessageTemplate() {
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
  
  const contributorsWithPhone = unpaidContributors.filter(c => c.phone && c.phone.trim() !== '');
  
  if (contributorsWithPhone.length === 0) {
    showToast('❌ لا يوجد مساهمون لديهم أرقام هواتف', true);
    return;
  }
  
  // Update preview content
  document.getElementById('previewText').textContent = messageText;
  document.getElementById('previewStats').innerHTML = `
    <div>📱 سيتم إرسال ${contributorsWithPhone.length} رسالة خاصة (private)</div>
    <div>👥 إجمالي غير الدافعين: ${unpaidContributors.length} مساهم</div>
    <div>❌ بدون هاتف: ${unpaidContributors.length - contributorsWithPhone.length} مساهم</div>
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

function confirmSend() {
  const messageText = document.getElementById('messageText').value.trim();
  const contributorsWithPhone = unpaidContributors.filter(c => c.phone && c.phone.trim() !== '');
  
  if (contributorsWithPhone.length === 0) {
    showToast('❌ لا يوجد مساهمون لديهم أرقام هواتف', true);
    return;
  }
  
  // Send individual private messages
  let successCount = 0;
  let failCount = 0;
  
  contributorsWithPhone.forEach((contributor, index) => {
    try {
      const encodedMessage = encodeURIComponent(messageText);
      const phoneNumber = contributor.phone.trim();
      
      // Create individual WhatsApp URL for private message
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      
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
    showToast(`✅ تم فتح ${successCount} رسالة واتس خاصة (private)`);
  }
  
  if (failCount > 0) {
    showToast(`❌ فشل في إرسال ${failCount} رسالة`, true);
  }
  
  // Log the action
  console.log(`Sent ${successCount} private WhatsApp messages to individual contributors for ${currentMonth}`);
}

// Make functions globally accessible
window.loadUnpaidContributors = loadUnpaidContributors;
window.showPreview = showPreview;
window.closePreview = closePreview;
window.confirmSend = confirmSend;
