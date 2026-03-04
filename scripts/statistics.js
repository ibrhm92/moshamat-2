// Statistics page specific functionality
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindStatisticsEvents();
    loadStatistics();
  });
});

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (statistics)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (statistics)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (statistics)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (statistics)');
        resolve();
      }, 10000);
    }
  });
}

function bindStatisticsEvents() {
  // Filter month change
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', renderFilteredStats);
  }
  
  // Print button
  const printStatsBtn = document.getElementById('printStatsBtn');
  if (printStatsBtn) {
    printStatsBtn.addEventListener('click', printStats);
  }
  
  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
  }
}

function loadStatistics() {
  console.log('Loading statistics...');
  console.log('Available contributors:', allContributors.length);
  console.log('Available payments:', allPayments.length);
  
  // Check if data is available
  if (allContributors.length === 0 && allPayments.length === 0) {
    console.warn('No data available for statistics');
    // Try to load data if not available
    if (typeof loadData === 'function') {
      console.log('Attempting to load data...');
      loadData(true).then(() => {
        console.log('Data loaded, retrying statistics...');
        populateMonthFilter();
        renderFilteredStats();
        renderMonthlyStats();
        renderContributorStats();
      });
    } else {
      console.error('loadData function not available');
      showEmptyState();
    }
    return;
  }
  
  populateMonthFilter();
  renderFilteredStats();
  renderMonthlyStats();
  renderContributorStats();
  console.log('Statistics loaded successfully');
}

function showEmptyState() {
  // Show empty state for all tables
  const monthlyBody = document.getElementById('monthlyBody');
  const contributorsBody = document.getElementById('contributorsBody');
  const statTotal = document.getElementById('statTotal');
  const statContributors = document.getElementById('statContributors');
  const statPayments = document.getElementById('statPayments');
  
  if (monthlyBody) monthlyBody.innerHTML = '<tr><td colspan="4" class="empty">لا توجد بيانات</td></tr>';
  if (contributorsBody) contributorsBody.innerHTML = '<tr><td colspan="5" class="empty">لا توجد بيانات</td></tr>';
  if (statTotal) statTotal.textContent = '0';
  if (statContributors) statContributors.textContent = '0';
  if (statPayments) statPayments.textContent = '0';
}

function populateMonthFilter() {
  const filterMonth = document.getElementById('filterMonth');
  if (!filterMonth) return;
  
  // Get unique months from payments
  const months = [...new Set(allPayments.map(p => p.month))].sort();
  
  // Clear existing options except the first
  while (filterMonth.options.length > 1) filterMonth.remove(1);
  
  // Add months
  months.forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    filterMonth.appendChild(option);
  });
}

function renderFilteredStats() {
  console.log('Rendering filtered stats...');
  const filterMonth = document.getElementById('filterMonth');
  const selectedMonth = filterMonth ? filterMonth.value : '';
  
  const filteredPayments = selectedMonth 
    ? allPayments.filter(p => p.month === selectedMonth)
    : allPayments;
  
  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const contributors = new Set(filteredPayments.map(p => p.contributorId));
  
  console.log(`Filtered stats: ${filteredPayments.length} payments, ${contributors.size} contributors, total: ${totalAmount}`);
  
  // Update summary cards
  const statTotal = document.getElementById('statTotal');
  const statContributors = document.getElementById('statContributors');
  const statPayments = document.getElementById('statPayments');
  
  if (statTotal) statTotal.textContent = totalAmount.toLocaleString('ar-EG');
  if (statContributors) statContributors.textContent = contributors.size;
  if (statPayments) statPayments.textContent = filteredPayments.length;
}

function renderMonthlyStats() {
  console.log('Rendering monthly stats...');
  const tbody = document.getElementById('monthlyBody');
  if (!tbody) {
    console.error('monthlyBody element not found');
    return;
  }
  
  // Group payments by month
  const monthlyData = {};
  allPayments.forEach(payment => {
    if (!monthlyData[payment.month]) {
      monthlyData[payment.month] = {
        total: 0,
        contributors: new Set(),
        count: 0
      };
    }
    monthlyData[payment.month].total += Number(payment.amount) || 0;
    monthlyData[payment.month].contributors.add(payment.contributorId);
    monthlyData[payment.month].count++;
  });
  
  console.log('Monthly data:', Object.keys(monthlyData));
  
  // Convert to array and sort by date
  const monthlyArray = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      total: data.total,
      contributors: data.contributors.size,
      count: data.count,
      average: data.total / data.count
    }))
    .sort((a, b) => new Date(b.month) - new Date(a.month));
  
  console.log(`Monthly array: ${monthlyArray.length} months`);
  
  if (monthlyArray.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">لا توجد بيانات</td></tr>';
    return;
  }
  
  tbody.innerHTML = monthlyArray.map(data => `
    <tr>
      <td>${data.month}</td>
      <td>${data.total.toLocaleString('ar-EG')} جنيه</td>
      <td>${data.contributors}</td>
      <td>${data.average.toLocaleString('ar-EG')} جنيه</td>
    </tr>
  `).join('');
}

function renderContributorStats() {
  console.log('Rendering contributor stats...');
  const tbody = document.getElementById('contributorsBody');
  if (!tbody) {
    console.error('contributorsBody element not found');
    return;
  }
  
  // Calculate stats for each contributor
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
  
  console.log('Contributor stats calculated:', Object.keys(contributorStats).length);
  
  // Convert to array and sort by total amount
  const statsArray = Object.values(contributorStats)
    .filter(stat => stat.count > 0)
    .sort((a, b) => b.total - a.total);
  
  console.log(`Stats array: ${statsArray.length} contributors with payments`);
  
  if (statsArray.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">لا توجد بيانات</td></tr>';
    return;
  }
  
  tbody.innerHTML = statsArray.map(stat => `
    <tr>
      <td>${stat.name}</td>
      <td>${stat.phone || '-'}</td>
      <td>${stat.total.toLocaleString('ar-EG')} جنيه</td>
      <td>${stat.count}</td>
      <td>${(stat.total / stat.count).toLocaleString('ar-EG')} جنيه</td>
    </tr>
  `).join('');
}

// Payment management functions
async function editPayment(paymentId) {
  const payment = allPayments.find(p => p.id === paymentId);
  if (!payment) return;
  
  const contributor = allContributors.find(c => c.id === payment.contributorId);
  if (!contributor) return;
  
  const newAmount = prompt(`تعديل مبلغ المساهمة:\n\nالمساهم: ${contributor.name}\nالشهر: ${payment.month}\nالمبلغ الحالي: ${payment.amount} جنيه\n\nأدخل المبلغ الجديد:`, payment.amount);
  
  if (newAmount === null) return; // User cancelled
  
  const amount = parseFloat(newAmount);
  if (isNaN(amount) || amount <= 0) {
    showToast('❌ المبلغ غير صحيح', true);
    return;
  }
  
  try {
    if (window._demoMode) {
      // Update demo data
      const index = allPayments.findIndex(p => p.id === paymentId);
      if (index !== -1) {
        allPayments[index].amount = amount;
      }
      showToast('✅ تم تعديل المساهمة (وضع تجريبي)');
    } else {
      // Update Firebase
      await firebase.firestore().collection('payments').doc(paymentId).update({
        amount: amount
      });
      
      // Update local data
      const index = allPayments.findIndex(p => p.id === paymentId);
      if (index !== -1) {
        allPayments[index].amount = amount;
      }
      
      showToast('✅ تم تعديل المساهمة بنجاح');
    }
    
    // Refresh statistics
    loadStatistics();
    
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
    
    // Refresh statistics
    loadStatistics();
    
  } catch (error) {
    console.error('Error deleting payment:', error);
    showToast('❌ خطأ في حذف المساهمة: ' + error.message, true);
  }
}

// Make functions globally accessible
window.editPayment = editPayment;
window.deletePayment = deletePayment;

function printStats() {
  window.print();
}

function exportToExcel() {
  // Create CSV content
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
  
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `مساهمات_${new Date().toLocaleDateString('ar-EG')}.csv`;
  link.click();
  
  showToast('✅ تم تصدير البيانات بنجاح');
}
