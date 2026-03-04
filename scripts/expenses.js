// Expenses management page
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindExpensesEvents();
    loadExpensesData();
  });
});

let currentEditExpenseId = null;
let allExpenses = [];
let filteredExpenses = [];

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (expenses)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (expenses)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (expenses)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (expenses)');
        resolve();
      }, 10000);
    }
  });
}

function bindExpensesEvents() {
  // Month change event
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', updateMonthlySummary);
  }
  
  // Add expense button
  const addExpenseBtn = document.getElementById('addExpenseBtn');
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', addExpense);
  }
  
  // Filter buttons
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
  
  // Custom category handlers
  const expenseCategory = document.getElementById('expenseCategory');
  const customCategoryGroup = document.getElementById('customCategoryGroup');
  const customCategoryInput = document.getElementById('customCategoryInput');
  
  if (expenseCategory && customCategoryGroup && customCategoryInput) {
    expenseCategory.addEventListener('change', () => {
      if (expenseCategory.value === '__custom__') {
        customCategoryGroup.style.display = 'block';
        customCategoryInput.focus();
      } else {
        customCategoryGroup.style.display = 'none';
        customCategoryInput.value = '';
      }
    });
  }
  
  // Filter custom category handlers
  const filterCategory = document.getElementById('filterCategory');
  const filterCustomGroup = document.getElementById('filterCustomGroup');
  const filterCustomInput = document.getElementById('filterCustomInput');
  
  if (filterCategory && filterCustomGroup && filterCustomInput) {
    filterCategory.addEventListener('change', () => {
      if (filterCategory.value === '__custom__') {
        filterCustomGroup.style.display = 'block';
        filterCustomInput.focus();
      } else {
        filterCustomGroup.style.display = 'none';
        filterCustomInput.value = '';
      }
    });
  }
  
  // Edit modal events
  const closeEditExpenseBtn = document.getElementById('closeEditExpenseBtn');
  const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
  const saveExpenseBtn = document.getElementById('saveExpenseBtn');
  const editExpenseModal = document.getElementById('editExpenseModal');
  
  if (closeEditExpenseBtn) closeEditExpenseBtn.addEventListener('click', closeEditExpenseModal);
  if (cancelExpenseBtn) cancelExpenseBtn.addEventListener('click', closeEditExpenseModal);
  if (saveExpenseBtn) saveExpenseBtn.addEventListener('click', saveExpenseEdit);
  
  if (editExpenseModal) {
    editExpenseModal.addEventListener('click', (e) => {
      if (e.target.id === 'editExpenseModal') closeEditExpenseModal();
    });
  }
  
  // Edit modal custom category handlers
  const editExpenseCategory = document.getElementById('editExpenseCategory');
  const editCustomGroup = document.getElementById('editCustomGroup');
  const editCustomInput = document.getElementById('editCustomInput');
  
  if (editExpenseCategory && editCustomGroup && editCustomInput) {
    editExpenseCategory.addEventListener('change', () => {
      if (editExpenseCategory.value === '__custom__') {
        editCustomGroup.style.display = 'block';
        editCustomInput.focus();
      } else {
        editCustomGroup.style.display = 'none';
        editCustomInput.value = '';
      }
    });
  }
  
  // Set today's date as default
  const expenseDate = document.getElementById('expenseDate');
  if (expenseDate) {
    expenseDate.value = new Date().toISOString().split('T')[0];
  }
  
  // Print and export buttons
  const printExpensesBtn = document.getElementById('printExpensesBtn');
  const exportExpensesBtn = document.getElementById('exportExpensesBtn');
  
  if (printExpensesBtn) {
    printExpensesBtn.addEventListener('click', printExpensesReport);
  }
  
  if (exportExpensesBtn) {
    exportExpensesBtn.addEventListener('click', exportExpensesToExcel);
  }
}

async function loadExpensesData() {
  console.log('Loading expenses data...');
  
  // Check if data is available
  if (allContributors.length === 0 && allPayments.length === 0) {
    console.warn('No data available for expenses');
    if (typeof loadData === 'function') {
      console.log('Attempting to load data...');
      await loadData(true);
    }
  }
  
  // Load expenses from Firebase
  await loadExpenses();
  
  // Update monthly summary
  updateMonthlySummary();
  
  // Render expenses table
  renderExpensesTable();
  
  // Render category statistics
  renderCategoryStats();
  
  console.log('Expenses data loaded successfully');
}

async function loadExpenses() {
  try {
    if (window._demoMode) {
      // Use demo expenses
      allExpenses = [
        {
          id: 'exp_1',
          description: 'إيجار المقر',
          amount: 2000,
          date: '2026-03-01',
          category: 'إيجار',
          notes: 'إيجار شهري للمقر الرئيسي',
          month: 'مارس 2026',
          timestamp: new Date('2026-03-01')
        },
        {
          id: 'exp_2',
          description: 'كهرباء',
          amount: 500,
          date: '2026-03-05',
          category: 'كهرباء',
          notes: 'فاتورة الكهرباء الشهرية',
          month: 'مارس 2026',
          timestamp: new Date('2026-03-05')
        },
        {
          id: 'exp_3',
          description: 'مياه',
          amount: 200,
          date: '2026-03-10',
          category: 'مياه',
          notes: 'فاتورة المياه',
          month: 'مارس 2026',
          timestamp: new Date('2026-03-10')
        }
      ];
      console.log('Using demo expenses data');
    } else {
      // Load from Firebase
      const snapshot = await firebase.firestore().collection('expenses').get();
      allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Loaded ${allExpenses.length} expenses from Firebase`);
    }
    
    filteredExpenses = [...allExpenses];
  } catch (error) {
    console.error('Error loading expenses:', error);
    showToast('❌ خطأ في تحميل المصروفات', true);
    allExpenses = [];
    filteredExpenses = [];
  }
}

function updateMonthlySummary() {
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : currentMonth;
  
  // Calculate total contributions for the month
  const monthPayments = allPayments.filter(p => p.month === selectedMonth);
  const totalContributions = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Calculate total expenses for the month
  const monthExpenses = allExpenses.filter(e => e.month === selectedMonth);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  // Calculate remaining balance
  const remainingBalance = totalContributions - totalExpenses;
  
  // Update UI
  const totalContributionsEl = document.getElementById('totalContributions');
  const totalExpensesEl = document.getElementById('totalExpenses');
  const remainingBalanceEl = document.getElementById('remainingBalance');
  
  if (totalContributionsEl) {
    totalContributionsEl.textContent = totalContributions.toLocaleString('ar-EG') + ' جنيه';
  }
  if (totalExpensesEl) {
    totalExpensesEl.textContent = totalExpenses.toLocaleString('ar-EG') + ' جنيه';
  }
  if (remainingBalanceEl) {
    remainingBalanceEl.textContent = remainingBalance.toLocaleString('ar-EG') + ' جنيه';
    remainingBalanceEl.style.color = remainingBalance < 0 ? 'var(--danger)' : 'var(--success)';
  }
  
  console.log(`Monthly summary for ${selectedMonth}: Contributions: ${totalContributions}, Expenses: ${totalExpenses}, Balance: ${remainingBalance}`);
}

function renderExpensesTable() {
  const tbody = document.getElementById('expensesBody');
  if (!tbody) return;
  
  if (filteredExpenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">لا توجد مصروفات</td></tr>';
    return;
  }
  
  tbody.innerHTML = filteredExpenses.map(expense => {
    const categoryIcons = {
      'إيجار': '🏢',
      'كهرباء': '💡',
      'مياه': '💧',
      'إنترنت': '🌐',
      'صيانة': '🔧',
      'مواد': '📦',
      'أخرى': '📝'
    };
    
    const icon = categoryIcons[expense.category] || '📝';
    const formattedDate = expense.date ? new Date(expense.date).toLocaleDateString('ar-EG') : '-';
    
    return `
      <tr>
        <td>${formattedDate}</td>
        <td>${expense.description}</td>
        <td>${icon} ${expense.category}</td>
        <td>${Number(expense.amount).toLocaleString('ar-EG')} جنيه</td>
        <td>${expense.notes || '-'}</td>
        <td>
          <button class="btn btn-outline" onclick="editExpense('${expense.id}')" style="padding:6px 12px;font-size:12px;margin:2px">
            ✏️ تعديل
          </button>
          <button class="btn btn-outline" onclick="deleteExpense('${expense.id}')" style="padding:6px 12px;font-size:12px;margin:2px;border-color:var(--danger);color:var(--danger)">
            🗑️ حذف
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCategoryStats() {
  const tbody = document.getElementById('categoryStatsBody');
  if (!tbody) return;
  
  // Group expenses by category
  const categoryData = {};
  filteredExpenses.forEach(expense => {
    if (!categoryData[expense.category]) {
      categoryData[expense.category] = {
        count: 0,
        total: 0
      };
    }
    categoryData[expense.category].count++;
    categoryData[expense.category].total += Number(expense.amount) || 0;
  });
  
  // Calculate total for percentage
  const totalExpenses = Object.values(categoryData).reduce((sum, cat) => sum + cat.total, 0);
  
  // Convert to array and sort by total amount
  const categoryArray = Object.entries(categoryData)
    .map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);
  
  if (categoryArray.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">لا توجد بيانات</td></tr>';
    return;
  }
  
  const categoryIcons = {
    'إيجار': '🏢',
    'كهرباء': '💡',
    'مياه': '💧',
    'إنترنت': '🌐',
    'صيانة': '🔧',
    'مواد': '📦',
    'أخرى': '📝'
  };
  
  tbody.innerHTML = categoryArray.map(data => {
    const icon = categoryIcons[data.category] || '📝';
    return `
      <tr>
        <td>${icon} ${data.category}</td>
        <td>${data.count}</td>
        <td>${data.total.toLocaleString('ar-EG')} جنيه</td>
        <td>${data.percentage.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');
}

// Helper function to get actual category value
function getActualCategory(categorySelect, customInput) {
  if (categorySelect.value === '__custom__') {
    return customInput.value.trim() || 'غير محدد';
  }
  return categorySelect.value;
}

async function addExpense() {
  const description = document.getElementById('expenseDescription').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  const categorySelect = document.getElementById('expenseCategory');
  const customCategoryInput = document.getElementById('customCategoryInput');
  const category = getActualCategory(categorySelect, customCategoryInput);
  const notes = document.getElementById('expenseNotes').value.trim();
  
  // Validation
  if (!description) {
    showToast('❌ أدخل وصف المصروف', true);
    return;
  }
  
  if (!amount || amount <= 0) {
    showToast('❌ أدخل مبلغاً صحيحاً', true);
    return;
  }
  
  if (!date) {
    showToast('❌ اختر التاريخ', true);
    return;
  }
  
  if (!category) {
    showToast('❌ اختر نوع المصروف', true);
    return;
  }
  
  // Get month from date
  const expenseDate = new Date(date);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = `${months[expenseDate.getMonth()]} ${expenseDate.getFullYear()}`;
  
  try {
    if (window._demoMode) {
      // Add to demo data
      const newExpense = {
        id: 'exp_' + Date.now(),
        description,
        amount,
        date,
        category,
        notes,
        month,
        timestamp: expenseDate
      };
      allExpenses.push(newExpense);
      showToast('✅ تم إضافة المصروف (وضع تجريبي)');
    } else {
      // Add to Firebase
      const docRef = await firebase.firestore().collection('expenses').add({
        description,
        amount,
        date,
        category,
        notes,
        month,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update local data
      const newExpense = {
        id: docRef.id,
        description,
        amount,
        date,
        category,
        notes,
        month,
        timestamp: expenseDate
      };
      allExpenses.push(newExpense);
      
      showToast('✅ تم إضافة المصروف بنجاح');
    }
    
    // Clear form
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNotes').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseCategory').value = 'إيجار';
    document.getElementById('customCategoryGroup').style.display = 'none';
    document.getElementById('customCategoryInput').value = '';
    
    // Refresh data
    filteredExpenses = [...allExpenses];
    updateMonthlySummary();
    renderExpensesTable();
    renderCategoryStats();
    
  } catch (error) {
    console.error('Error adding expense:', error);
    showToast('❌ خطأ في إضافة المصروف: ' + error.message, true);
  }
}

function applyFilters() {
  const categorySelect = document.getElementById('filterCategory');
  const filterCustomInput = document.getElementById('filterCustomInput');
  const category = getActualCategory(categorySelect, filterCustomInput);
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  
  filteredExpenses = allExpenses.filter(expense => {
    // Category filter
    if (categorySelect.value === '__custom__') {
      // For custom categories, check if the expense category contains the search term
      if (!expense.category.toLowerCase().includes(category.toLowerCase())) return false;
    } else if (category && expense.category !== category) {
      return false;
    }
    
    // Date filters
    if (dateFrom && expense.date < dateFrom) return false;
    if (dateTo && expense.date > dateTo) return false;
    
    return true;
  });
  
  renderExpensesTable();
  renderCategoryStats();
}

function resetFilters() {
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterCustomGroup').style.display = 'none';
  document.getElementById('filterCustomInput').value = '';
  
  filteredExpenses = [...allExpenses];
  renderExpensesTable();
  renderCategoryStats();
}

function editExpense(expenseId) {
  const expense = allExpenses.find(e => e.id === expenseId);
  if (!expense) return;
  
  currentEditExpenseId = expenseId;
  
  // Populate modal fields
  document.getElementById('editExpenseDescription').value = expense.description;
  document.getElementById('editExpenseAmount').value = expense.amount;
  document.getElementById('editExpenseDate').value = expense.date;
  document.getElementById('editExpenseNotes').value = expense.notes || '';
  
  // Handle category selection
  const editCategorySelect = document.getElementById('editExpenseCategory');
  const editCustomGroup = document.getElementById('editCustomGroup');
  const editCustomInput = document.getElementById('editCustomInput');
  
  // Check if expense category matches any predefined category
  const predefinedCategories = ['إيجار', 'كهرباء', 'مياه', 'إنترنت', 'صيانة', 'مواد', 'أخرى'];
  
  if (predefinedCategories.includes(expense.category)) {
    // Use predefined category
    editCategorySelect.value = expense.category;
    editCustomGroup.style.display = 'none';
    editCustomInput.value = '';
  } else {
    // Use custom category
    editCategorySelect.value = '__custom__';
    editCustomGroup.style.display = 'block';
    editCustomInput.value = expense.category;
  }
  
  // Show modal
  document.getElementById('editExpenseModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditExpenseModal() {
  document.getElementById('editExpenseModal').classList.remove('open');
  document.body.style.overflow = '';
  currentEditExpenseId = null;
}

async function saveExpenseEdit() {
  if (!currentEditExpenseId) return;
  
  const description = document.getElementById('editExpenseDescription').value.trim();
  const amount = parseFloat(document.getElementById('editExpenseAmount').value);
  const date = document.getElementById('editExpenseDate').value;
  const categorySelect = document.getElementById('editExpenseCategory');
  const customCategoryInput = document.getElementById('editCustomInput');
  const category = getActualCategory(categorySelect, customCategoryInput);
  const notes = document.getElementById('editExpenseNotes').value.trim();
  
  // Validation
  if (!description) {
    showToast('❌ أدخل وصف المصروف', true);
    return;
  }
  
  if (!amount || amount <= 0) {
    showToast('❌ أدخل مبلغاً صحيحاً', true);
    return;
  }
  
  if (!date) {
    showToast('❌ اختر التاريخ', true);
    return;
  }
  
  if (!category) {
    showToast('❌ اختر نوع المصروف', true);
    return;
  }
  
  // Get month from date
  const expenseDate = new Date(date);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = `${months[expenseDate.getMonth()]} ${expenseDate.getFullYear()}`;
  
  try {
    if (window._demoMode) {
      // Update demo data
      const index = allExpenses.findIndex(e => e.id === currentEditExpenseId);
      if (index !== -1) {
        allExpenses[index] = {
          ...allExpenses[index],
          description,
          amount,
          date,
          category,
          notes,
          month,
          timestamp: expenseDate
        };
      }
      showToast('✅ تم تعديل المصروف (وضع تجريبي)');
    } else {
      // Update Firebase
      await firebase.firestore().collection('expenses').doc(currentEditExpenseId).update({
        description,
        amount,
        date,
        category,
        notes,
        month,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update local data
      const index = allExpenses.findIndex(e => e.id === currentEditExpenseId);
      if (index !== -1) {
        allExpenses[index] = {
          ...allExpenses[index],
          description,
          amount,
          date,
          category,
          notes,
          month,
          timestamp: expenseDate
        };
      }
      
      showToast('✅ تم تعديل المصروف بنجاح');
    }
    
    closeEditExpenseModal();
    
    // Refresh data
    filteredExpenses = [...allExpenses];
    updateMonthlySummary();
    renderExpensesTable();
    renderCategoryStats();
    
  } catch (error) {
    console.error('Error updating expense:', error);
    showToast('❌ خطأ في تعديل المصروف: ' + error.message, true);
  }
}

async function deleteExpense(expenseId) {
  const expense = allExpenses.find(e => e.id === expenseId);
  if (!expense) return;
  
  const confirmMessage = `هل أنت متأكد من حذف هذا المصروف؟\n\nالوصف: ${expense.description}\nالمبلغ: ${expense.amount} جنيه\nالتاريخ: ${expense.date}`;
  
  if (!confirm(confirmMessage)) return;
  
  if (!confirm('🚨 تحذير أخير: هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
  
  try {
    if (window._demoMode) {
      // Remove from demo data
      allExpenses = allExpenses.filter(e => e.id !== expenseId);
      showToast('✅ تم حذف المصروف (وضع تجريبي)');
    } else {
      // Delete from Firebase
      await firebase.firestore().collection('expenses').doc(expenseId).delete();
      
      // Update local data
      allExpenses = allExpenses.filter(e => e.id !== expenseId);
      
      showToast('✅ تم حذف المصروف بنجاح');
    }
    
    // Refresh data
    filteredExpenses = [...allExpenses];
    updateMonthlySummary();
    renderExpensesTable();
    renderCategoryStats();
    
  } catch (error) {
    console.error('Error deleting expense:', error);
    showToast('❌ خطأ في حذف المصروف: ' + error.message, true);
  }
}

// Make functions globally accessible
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;

// Print expenses report
function printExpensesReport() {
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : currentMonth;
  
  // Calculate totals for the selected month
  const monthPayments = allPayments.filter(p => p.month === selectedMonth);
  const totalContributions = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const monthExpenses = allExpenses.filter(e => e.month === selectedMonth);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBalance = totalContributions - totalExpenses;
  
  // Group expenses by category
  const categoryData = {};
  monthExpenses.forEach(expense => {
    if (!categoryData[expense.category]) {
      categoryData[expense.category] = {
        count: 0,
        total: 0
      };
    }
    categoryData[expense.category].count++;
    categoryData[expense.category].total += Number(expense.amount) || 0;
  });
  
  // Sort categories by total amount
  const categoryArray = Object.entries(categoryData)
    .map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);
  
  // Create print window
  const printWindow = window.open('', '_blank');
  const categoryIcons = {
    'إيجار': '🏢',
    'كهرباء': '💡',
    'مياه': '💧',
    'إنترنت': '🌐',
    'صيانة': '🔧',
    'مواد': '📦',
    'أخرى': '📝'
  };
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير المصروفات - ${selectedMonth}</title>
      <style>
        body {
          font-family: 'Cairo', 'Tajawal', sans-serif;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #3498db;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #2c3e50;
          margin: 0;
          font-size: 24px;
        }
        .header .date {
          color: #7f8c8d;
          font-size: 14px;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #dee2e6;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item .label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
        }
        .summary-item .value {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
        }
        .summary-item .value.positive {
          color: #27ae60;
        }
        .summary-item .value.negative {
          color: #e74c3c;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td {
          padding: 12px;
          text-align: right;
          border: 1px solid #dee2e6;
        }
        th {
          background: #3498db;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6c757d;
          font-size: 12px;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
        }
        @media print {
          body { padding: 10px; }
          .summary { 
            flex-direction: column;
            gap: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💸 تقرير المصروفات الشهرية</h1>
        <div class="date">الشهر: ${selectedMonth} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
      </div>
      
      <div class="summary">
        <div class="summary-item">
          <div class="label">💰 إجمالي المساهمات</div>
          <div class="value">${totalContributions.toLocaleString('ar-EG')} جنيه</div>
        </div>
        <div class="summary-item">
          <div class="label">💸 إجمالي المصروفات</div>
          <div class="value">${totalExpenses.toLocaleString('ar-EG')} جنيه</div>
        </div>
        <div class="summary-item">
          <div class="label">🔢 الرصيد المتبقي</div>
          <div class="value ${remainingBalance >= 0 ? 'positive' : 'negative'}">
            ${remainingBalance.toLocaleString('ar-EG')} جنيه
          </div>
        </div>
      </div>
      
      <h2 style="color: #2c3e50; margin-bottom: 15px;">📊 تفاصيل المصروفات حسب النوع</h2>
      <table>
        <thead>
          <tr>
            <th>النوع</th>
            <th>عدد المصروفات</th>
            <th>إجمالي المبلغ</th>
            <th>نسبة من الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${categoryArray.map(data => {
            const icon = categoryIcons[data.category] || '📝';
            return `
              <tr>
                <td>${icon} ${data.category}</td>
                <td>${data.count}</td>
                <td>${data.total.toLocaleString('ar-EG')} جنيه</td>
                <td>${data.percentage.toFixed(1)}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${categoryArray.length === 0 ? '<p style="text-align: center; color: #6c757d;">لا توجد مصروفات لهذا الشهر</p>' : ''}
      
      <div class="footer">
        <p>تم إنشاء هذا التقرير بواسطة نظام مساهمات</p>
        <p>🔒 البيانات محفوظة على Firebase Firestore</p>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// Export expenses to Excel
function exportExpensesToExcel() {
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : currentMonth;
  
  // Get expenses for selected month
  const monthExpenses = allExpenses.filter(e => e.month === selectedMonth);
  
  if (monthExpenses.length === 0) {
    showToast('❌ لا توجد مصروفات لهذا الشهر للتصدير', true);
    return;
  }
  
  // Create CSV content
  const headers = ['التاريخ', 'الوصف', 'النوع', 'المبلغ', 'ملاحظات'];
  const rows = monthExpenses.map(expense => [
    expense.date || '',
    expense.description || '',
    expense.category || '',
    Number(expense.amount) || 0,
    expense.notes || ''
  ]);
  
  // Convert to CSV
  const csvContent = [
    [`تقرير المصروفات - ${selectedMonth}`],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `المصروفات_${selectedMonth.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('✅ تم تصدير المصروفات بنجاح');
}
