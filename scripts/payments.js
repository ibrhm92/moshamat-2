// Payments management page
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindPaymentsEvents();
    loadPaymentsData();
  });
});

let currentEditPaymentId = null;
let allPaymentsData = [];
let filteredPaymentsData = [];

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (payments)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (payments)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (payments)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (payments)');
        resolve();
      }, 10000);
    }
  });
}

function bindPaymentsEvents() {
  // Filter buttons
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
  
  // Search input
  const searchInput = document.getElementById('searchPayments');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  
  // Edit modal events
  const closeEditPaymentBtn = document.getElementById('closeEditPaymentBtn');
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  const savePaymentBtn = document.getElementById('savePaymentBtn');
  const editPaymentModal = document.getElementById('editPaymentModal');
  
  if (closeEditPaymentBtn) closeEditPaymentBtn.addEventListener('click', closeEditPaymentModal);
  if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closeEditPaymentModal);
  if (savePaymentBtn) savePaymentBtn.addEventListener('click', savePaymentEdit);
  
  if (editPaymentModal) {
    editPaymentModal.addEventListener('click', (e) => {
      if (e.target.id === 'editPaymentModal') closeEditPaymentModal();
    });
  }
}

async function loadPaymentsData() {
  console.log('Loading payments data...');
  
  // Check if data is available
  if (allContributors.length === 0 && allPayments.length === 0) {
    console.warn('No data available for payments');
    if (typeof loadData === 'function') {
      console.log('Attempting to load data...');
      await loadData(true);
    }
  }
  
  // Populate filters
  populateFilters();
  
  // Render payments
  renderPaymentsTable();
  updateSummaryCards();
  
  console.log('Payments data loaded successfully');
}

function populateFilters() {
  // Populate month filter
  const monthFilter = document.getElementById('filterMonth');
  if (monthFilter) {
    const months = [...new Set(allPayments.map(p => p.month))].sort();
    monthFilter.innerHTML = '<option value="">جميع الأشهر</option>';
    months.forEach(month => {
      const option = document.createElement('option');
      option.value = month;
      option.textContent = month;
      monthFilter.appendChild(option);
    });
  }
  
  // Populate contributor filter
  const contributorFilter = document.getElementById('filterContributor');
  if (contributorFilter) {
    contributorFilter.innerHTML = '<option value="">جميع المساهمين</option>';
    allContributors.forEach(contributor => {
      const option = document.createElement('option');
      option.value = contributor.id;
      option.textContent = contributor.name;
      contributorFilter.appendChild(option);
    });
  }
}

function renderPaymentsTable() {
  const tbody = document.getElementById('paymentsBody');
  if (!tbody) return;
  
  if (filteredPaymentsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">لا توجد مساهمات</td></tr>';
    return;
  }
  
  tbody.innerHTML = filteredPaymentsData.map(payment => {
    const contributor = allContributors.find(c => c.id === payment.contributorId);
    const contributorName = contributor ? contributor.name : 'غير معروف';
    const contributorPhone = contributor ? contributor.phone : '-';
    const date = payment.timestamp ? new Date(payment.timestamp).toLocaleDateString('ar-EG') : '-';
    
    return `
      <tr>
        <td>${contributorName}</td>
        <td>${contributorPhone}</td>
        <td>${payment.month}</td>
        <td>${Number(payment.amount).toLocaleString('ar-EG')} جنيه</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-outline" onclick="editPayment('${payment.id}')" style="padding:6px 12px;font-size:12px;margin:2px">
            ✏️ تعديل
          </button>
          <button class="btn btn-outline" onclick="deletePayment('${payment.id}')" style="padding:6px 12px;font-size:12px;margin:2px;border-color:var(--danger);color:var(--danger)">
            🗑️ حذف
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateSummaryCards() {
  const totalPayments = document.getElementById('totalPayments');
  const totalAmount = document.getElementById('totalAmount');
  const averageAmount = document.getElementById('averageAmount');
  
  const count = filteredPaymentsData.length;
  const total = filteredPaymentsData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const average = count > 0 ? total / count : 0;
  
  if (totalPayments) totalPayments.textContent = count;
  if (totalAmount) totalAmount.textContent = total.toLocaleString('ar-EG') + ' جنيه';
  if (averageAmount) averageAmount.textContent = average.toLocaleString('ar-EG') + ' جنيه';
}

function applyFilters() {
  const monthFilter = document.getElementById('filterMonth').value;
  const contributorFilter = document.getElementById('filterContributor').value;
  const searchTerm = document.getElementById('searchPayments').value.toLowerCase();
  
  filteredPaymentsData = allPayments.filter(payment => {
    // Month filter
    if (monthFilter && payment.month !== monthFilter) return false;
    
    // Contributor filter
    if (contributorFilter && payment.contributorId !== contributorFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const contributor = allContributors.find(c => c.id === payment.contributorId);
      const contributorName = contributor ? contributor.name : '';
      const contributorPhone = contributor ? contributor.phone : '';
      
      if (!contributorName.toLowerCase().includes(searchTerm) &&
          !contributorPhone.toLowerCase().includes(searchTerm) &&
          !payment.month.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
  
  renderPaymentsTable();
  updateSummaryCards();
}

function resetFilters() {
  document.getElementById('filterMonth').value = '';
  document.getElementById('filterContributor').value = '';
  document.getElementById('searchPayments').value = '';
  
  filteredPaymentsData = [...allPayments];
  renderPaymentsTable();
  updateSummaryCards();
}

function editPayment(paymentId) {
  const payment = allPayments.find(p => p.id === paymentId);
  if (!payment) return;
  
  const contributor = allContributors.find(c => c.id === payment.contributorId);
  if (!contributor) return;
  
  currentEditPaymentId = paymentId;
  
  // Populate modal fields
  document.getElementById('editContributorName').value = contributor.name;
  document.getElementById('editMonth').value = payment.month;
  document.getElementById('editAmount').value = payment.amount;
  
  // Show modal
  document.getElementById('editPaymentModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditPaymentModal() {
  document.getElementById('editPaymentModal').classList.remove('open');
  document.body.style.overflow = '';
  currentEditPaymentId = null;
}

async function savePaymentEdit() {
  if (!currentEditPaymentId) return;
  
  const amount = parseFloat(document.getElementById('editAmount').value);
  
  if (isNaN(amount) || amount <= 0) {
    showToast('❌ المبلغ غير صحيح', true);
    return;
  }
  
  try {
    if (window._demoMode) {
      // Update demo data
      const index = allPayments.findIndex(p => p.id === currentEditPaymentId);
      if (index !== -1) {
        allPayments[index].amount = amount;
      }
      showToast('✅ تم تعديل المساهمة (وضع تجريبي)');
    } else {
      // Update Firebase
      await firebase.firestore().collection('payments').doc(currentEditPaymentId).update({
        amount: amount
      });
      
      // Update local data
      const index = allPayments.findIndex(p => p.id === currentEditPaymentId);
      if (index !== -1) {
        allPayments[index].amount = amount;
      }
      
      showToast('✅ تم تعديل المساهمة بنجاح');
    }
    
    closeEditPaymentModal();
    loadPaymentsData();
    
  } catch (error) {
    console.error('Error updating payment:', error);
    showToast('❌ خطأ في تعديل المساهمة: ' + error.message, true);
  }
}

async function deletePayment(paymentId) {
  const payment = allPayments.find(p => p.id === paymentId);
  if (!payment) return;
  
  const contributor = allContributors.find(c => c.id === payment.contributorId);
  if (!contributor) return;
  
  const confirmMessage = `هل أنت متأكد من حذف هذه المساهمة؟\n\nالمساهم: ${contributor.name}\nالشهر: ${payment.month}\nالمبلغ: ${payment.amount} جنيه`;
  
  if (!confirm(confirmMessage)) return;
  
  if (!confirm('🚨 تحذير أخير: هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
  
  try {
    if (window._demoMode) {
      // Remove from demo data
      allPayments = allPayments.filter(p => p.id !== paymentId);
      showToast('✅ تم حذف المساهمة (وضع تجريبي)');
    } else {
      // Delete from Firebase
      await firebase.firestore().collection('payments').doc(paymentId).delete();
      
      // Update local data
      allPayments = allPayments.filter(p => p.id !== paymentId);
      
      showToast('✅ تم حذف المساهمة بنجاح');
    }
    
    loadPaymentsData();
    
  } catch (error) {
    console.error('Error deleting payment:', error);
    showToast('❌ خطأ في حذف المساهمة: ' + error.message, true);
  }
}

// Make functions globally accessible
window.editPayment = editPayment;
window.deletePayment = deletePayment;
