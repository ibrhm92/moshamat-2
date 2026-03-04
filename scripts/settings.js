// Settings page specific functionality
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindSettingsEvents();
    loadSavedGroupLink();
    updateAppMode();
  });
});

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (settings)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (settings)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (settings)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (settings)');
        resolve();
      }, 10000);
    }
  });
}

function bindSettingsEvents() {
  // Save group link button
  const saveGroupLinkBtn = document.getElementById('saveGroupLinkBtn');
  if (saveGroupLinkBtn) {
    saveGroupLinkBtn.addEventListener('click', saveGroupLink);
  }
  
  // Export all data button
  const exportAllBtn = document.getElementById('exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', exportAllData);
  }
  
  // Clear data button
  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', clearAllData);
  }
}

function loadSavedGroupLink() {
  const savedLink = localStorage.getItem('wa_group_link');
  const input = document.getElementById('waGroupLink');
  
  if (input && savedLink) {
    input.value = savedLink;
  }
}

function saveGroupLink() {
  const input = document.getElementById('waGroupLink');
  const status = document.getElementById('groupLinkStatus');
  
  if (!input) return;
  
  const link = input.value.trim();
  
  if (!link) {
    localStorage.removeItem('wa_group_link');
    showStatus('تم حذف رابط الجروب', 'success');
    return;
  }
  
  // Basic validation for WhatsApp link
  if (!link.includes('chat.whatsapp.com')) {
    showStatus('يرجى إدخال رابط واتساب صحيح', 'error');
    return;
  }
  
  localStorage.setItem('wa_group_link', link);
  showStatus('تم حفظ رابط الجروب بنجاح', 'success');
}

function showStatus(message, type) {
  const status = document.getElementById('groupLinkStatus');
  if (!status) return;
  
  status.style.display = 'block';
  status.className = type === 'success' ? 'badge badge-green' : 'badge badge-red';
  status.textContent = message;
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

function exportAllData() {
  // Create comprehensive CSV export
  const headers = ['الاسم', 'الهاتف', 'الشهر', 'المبلغ', 'التاريخ'];
  const rows = allPayments.map(payment => {
    const contributor = allContributors.find(c => c.id === payment.contributorId);
    return [
      contributor?.name || 'غير معروف',
      contributor?.phone || '',
      payment.month,
      payment.amount,
      new Date(payment.timestamp).toLocaleDateString('ar-EG')
    ];
  });
  
  // Add contributors summary
  rows.push([]);
  rows.push(['ملخص المساهمين']);
  rows.push(['الاسم', 'الهاتف', 'إجمالي المدفوعات', 'عدد المساهمات']);
  
  const contributorStats = {};
  allContributors.forEach(contributor => {
    contributorStats[contributor.id] = {
      name: contributor.name,
      phone: contributor.phone,
      total: 0,
      count: 0
    };
  });
  
  allPayments.forEach(payment => {
    if (contributorStats[payment.contributorId]) {
      contributorStats[payment.contributorId].total += Number(payment.amount) || 0;
      contributorStats[payment.contributorId].count++;
    }
  });
  
  Object.values(contributorStats).forEach(stat => {
    if (stat.count > 0) {
      rows.push([
        stat.name,
        stat.phone,
        stat.total.toLocaleString('ar-EG'),
        stat.count
      ]);
    }
  });
  
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `كافة_البيانات_${new Date().toLocaleDateString('ar-EG')}.csv`;
  link.click();
  
  showToast('✅ تم تصدير كل البيانات بنجاح');
}

async function clearAllData() {
  if (!confirm('⚠️ هل أنت متأكد من حذف كل البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
    return;
  }
  
  if (!confirm('🚨 تحذير أخير: سيتم حذف جميع المساهمات والمساهمين بشكل نهائي. هل تريد المتابعة؟')) {
    return;
  }
  
  try {
    if (window._demoMode) {
      // Clear demo data
      allContributors = [];
      allPayments = [];
      showToast('✅ تم حذف البيانات (وضع تجريبي)');
    } else {
      // Clear Firebase data
      const contributorsRef = firebase.firestore().collection('contributors');
      const paymentsRef = firebase.firestore().collection('payments');
      
      const contributorsSnapshot = await contributorsRef.get();
      const paymentsSnapshot = await paymentsRef.get();
      
      // Delete all contributors
      const contributorPromises = contributorsSnapshot.docs.map(doc => 
        firebase.firestore().collection('contributors').doc(doc.id).delete()
      );
      
      // Delete all payments
      const paymentPromises = paymentsSnapshot.docs.map(doc => 
        firebase.firestore().collection('payments').doc(doc.id).delete()
      );
      
      await Promise.all([...contributorPromises, ...paymentPromises]);
      
      allContributors = [];
      allPayments = [];
      
      showToast('✅ تم حذف كل البيانات من Firebase');
    }
    
    // Reload page to reflect changes
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    showToast('❌ فشل حذف البيانات: ' + error.message, true);
  }
}

function updateAppMode() {
  const appMode = document.getElementById('appMode');
  if (!appMode) return;
  
  if (window._demoMode) {
    appMode.textContent = 'وضع التجريب المحلي';
    appMode.style.color = 'var(--accent)';
  } else {
    appMode.textContent = 'وضع الإنتاج (Firebase)';
    appMode.style.color = 'var(--primary-light)';
  }
}
