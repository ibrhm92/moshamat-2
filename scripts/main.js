// Home page specific functionality
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before loading data
  waitForFirebase().then(() => {
    loadHomeData();
  });
});

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (home)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (home)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (home)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (home)');
        resolve();
      }, 10000);
    }
  });
}

async function loadHomeData() {
  console.log('Loading home page data...');
  
  // Check if data is available
  if (allContributors.length === 0 && allPayments.length === 0) {
    console.warn('No data available for home page');
    if (typeof loadData === 'function') {
      console.log('Attempting to load data...');
      await loadData(true);
    }
  }
  
  // Load recent contributions
  loadRecentContributions();
  
  // Update statistics manually (in case updateStats is not working)
  updateHomeStats();
  
  // Also try the global updateStats function if available
  if (typeof updateStats === 'function') {
    updateStats();
  }
  
  console.log('Home page data loaded successfully');
}

function updateHomeStats() {
  console.log('Updating home page statistics...');
  
  const totalAmountEl = document.getElementById('totalAmount');
  const unpaidCountEl = document.getElementById('unpaidCount');
  
  if (!totalAmountEl || !unpaidCountEl) {
    console.error('Stats elements not found');
    return;
  }
  
  // Get current month
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
  
  console.log(`Current month: ${currentMonth}`);
  console.log(`Available payments: ${allPayments.length}`);
  console.log(`Available contributors: ${allContributors.length}`);
  
  // Calculate total amount for current month
  const monthPayments = allPayments.filter(p => p.month === currentMonth);
  const totalAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Calculate unpaid count
  const paidIds = new Set(monthPayments.map(p => p.contributorId));
  const unpaidCount = allContributors.length - paidIds.size;
  
  // Update UI
  totalAmountEl.textContent = totalAmount.toLocaleString('ar-EG');
  unpaidCountEl.textContent = unpaidCount;
  
  console.log(`Stats updated - Total: ${totalAmount}, Unpaid: ${unpaidCount}`);
}

function loadRecentContributions() {
  const tbody = document.getElementById('recentBody');
  if (!tbody) {
    console.error('recentBody element not found');
    return;
  }
  
  console.log('Loading recent contributions...');
  console.log(`Available payments: ${allPayments.length}`);
  console.log(`Available contributors: ${allContributors.length}`);
  
  // Get recent payments (last 10)
  const recentPayments = allPayments
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
  
  if (recentPayments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">لا توجد مساهمات بعد</td></tr>';
    console.log('No recent payments to display');
    return;
  }
  
  console.log(`Displaying ${recentPayments.length} recent payments`);
  
  tbody.innerHTML = recentPayments.map(payment => {
    const contributor = allContributors.find(c => c.id === payment.contributorId);
    const date = payment.timestamp ? new Date(payment.timestamp).toLocaleDateString('ar-EG') : '-';
    
    return `
      <tr>
        <td>${contributor?.name || 'غير معروف'}</td>
        <td>${contributor?.phone || '-'}</td>
        <td>${payment.month}</td>
        <td>${Number(payment.amount).toLocaleString('ar-EG')} جنيه</td>
        <td>${date}</td>
      </tr>
    `;
  }).join('');
}

// Refresh data
window.refreshData = function() {
  console.log('Refreshing home page data...');
  if (window._demoMode) {
    updateHomeStats();
    loadRecentContributions();
    if (typeof updateStats === 'function') updateStats();
    showToast('✅ تم تحديث البيانات');
  } else {
    loadData(true).then(() => {
      updateHomeStats();
      loadRecentContributions();
      if (typeof updateStats === 'function') updateStats();
      showToast('✅ تم تحديث البيانات');
    });
  }
};
