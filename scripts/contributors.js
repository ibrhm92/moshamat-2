// Contributors management page
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindContributorsEvents();
    loadContributorsList();
  });
});

let currentEditId = null;

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded');
      resolve();
    } else {
      console.log('Waiting for Firebase to load...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      // Fallback after 10 seconds
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway');
        resolve();
      }, 10000);
    }
  });
}

function bindContributorsEvents() {
  // Add contributor button
  const addBtn = document.getElementById('addContributorBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addNewContributor);
  }
  
  // Search functionality
  const searchInput = document.getElementById('searchContributors');
  if (searchInput) {
    searchInput.addEventListener('input', filterContributors);
  }
  
  // Edit modal events
  const closeEditBtn = document.getElementById('closeEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const editModal = document.getElementById('editModal');
  
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveContributorEdit);
  
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target.id === 'editModal') closeEditModal();
    });
  }
}

async function loadContributorsList() {
  const tbody = document.getElementById('contributorsBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="6" class="empty">جاري التحميل...</td></tr>';
  
  // Check if Firebase is available
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    console.error('Firebase not available in loadContributorsList');
    tbody.innerHTML = '<tr><td colspan="6" class="empty">❌ Firebase غير متاحر - جاري إعادة المحاولة...</td></tr>';
    
    // Retry after 2 seconds
    setTimeout(() => {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        loadContributorsList();
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">❌ فشل تحميل Firebase</td></tr>';
      }
    }, 2000);
    return;
  }
  
  try {
    if (window._demoMode) {
      // Use demo data
      console.log('Using demo mode for contributors');
      renderContributorsTable(allContributors);
    } else {
      // Load from Firebase
      console.log('Loading contributors from Firebase...');
      const snapshot = await firebase.firestore().collection('contributors').get();
      const contributors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Loaded ${contributors.length} contributors from Firebase`);
      renderContributorsTable(contributors);
    }
  } catch (error) {
    console.error('Error loading contributors:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="empty">❌ خطأ في تحميل البيانات</td></tr>';
  }
}

function renderContributorsTable(contributors) {
  const tbody = document.getElementById('contributorsBody');
  if (!tbody) return;
  
  if (contributors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">لا يوجد مساهمون</td></tr>';
    return;
  }
  
  tbody.innerHTML = contributors.map(contributor => {
    const stats = getContributorStats(contributor.id);
    
    return `
      <tr>
        <td>${contributor.name}</td>
        <td>${contributor.phone || '-'}</td>
        <td>${stats.count}</td>
        <td>${stats.total.toLocaleString('ar-EG')} جنيه</td>
        <td>${stats.count > 0 ? (stats.total / stats.count).toLocaleString('ar-EG') : 0} جنيه</td>
        <td>
          <button class="btn btn-outline" onclick="editContributor('${contributor.id}')" style="padding:6px 12px;font-size:12px;margin:2px">
            ✏️ تعديل
          </button>
          <button class="btn btn-outline" onclick="deleteContributor('${contributor.id}')" style="padding:6px 12px;font-size:12px;margin:2px;border-color:var(--danger);color:var(--danger)">
            🗑️ حذف
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getContributorStats(contributorId) {
  const contributorPayments = allPayments.filter(p => p.contributorId === contributorId);
  const total = contributorPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  return {
    count: contributorPayments.length,
    total: total
  };
}

async function addNewContributor() {
  const nameInput = document.getElementById('newContributorName');
  const phoneInput = document.getElementById('newContributorPhone');
  
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  
  if (!name) {
    showToast('❌ أدخل اسم المساهم', true);
    return;
  }
  
  if (!phone) {
    showToast('❌ أدخل رقم الهاتف', true);
    return;
  }
  
  if (!/^01[0-9]{9}$/.test(phone)) {
    showToast('❌ رقم الهاتف غير صحيح', true);
    return;
  }
  
  try {
    if (window._demoMode) {
      // Add to demo data
      const newId = 'demo_' + Date.now();
      allContributors.push({ id: newId, name, phone });
      showToast('✅ تم إضافة المساهم (وضع تجريبي)');
    } else {
      // Add to Firebase
      await firebase.firestore().collection('contributors').add({
        name,
        phone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('✅ تم إضافة المساهم بنجاح');
    }
    
    // Clear form
    nameInput.value = '';
    phoneInput.value = '';
    
    // Reload list
    loadContributorsList();
    
  } catch (error) {
    console.error('Error adding contributor:', error);
    showToast('❌ خطأ في إضافة المساهم: ' + error.message, true);
  }
}

function editContributor(contributorId) {
  const contributor = allContributors.find(c => c.id === contributorId);
  if (!contributor) return;
  
  currentEditId = contributorId;
  
  // Populate modal fields
  document.getElementById('editContributorName').value = contributor.name;
  document.getElementById('editContributorPhone').value = contributor.phone || '';
  
  // Show modal
  document.getElementById('editModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  document.body.style.overflow = '';
  currentEditId = null;
}

async function saveContributorEdit() {
  if (!currentEditId) return;
  
  const name = document.getElementById('editContributorName').value.trim();
  const phone = document.getElementById('editContributorPhone').value.trim();
  
  if (!name) {
    showToast('❌ أدخل اسم المساهم', true);
    return;
  }
  
  if (!phone) {
    showToast('❌ أدخل رقم الهاتف', true);
    return;
  }
  
  if (!/^01[0-9]{9}$/.test(phone)) {
    showToast('❌ رقم الهاتف غير صحيح', true);
    return;
  }
  
  try {
    if (window._demoMode) {
      // Update demo data
      const index = allContributors.findIndex(c => c.id === currentEditId);
      if (index !== -1) {
        allContributors[index].name = name;
        allContributors[index].phone = phone;
      }
      showToast('✅ تم تحديث البيانات (وضع تجريبي)');
    } else {
      // Update Firebase
      await firebase.firestore().collection('contributors').doc(currentEditId).update({
        name,
        phone
      });
      showToast('✅ تم تحديث البيانات بنجاح');
    }
    
    closeEditModal();
    loadContributorsList();
    
  } catch (error) {
    console.error('Error updating contributor:', error);
    showToast('❌ خطأ في تحديث البيانات: ' + error.message, true);
  }
}

async function deleteContributor(contributorId) {
  const contributor = allContributors.find(c => c.id === contributorId);
  if (!contributor) return;
  
  // Check if contributor has payments
  const hasPayments = allPayments.some(p => p.contributorId === contributorId);
  
  let confirmMessage = `هل أنت متأكد من حذف "${contributor.name}"؟`;
  if (hasPayments) {
    confirmMessage += '\n⚠️ هذا المساهم لديه مساهمات مسجلة. سيتم حذفها أيضاً.';
  }
  
  if (!confirm(confirmMessage)) return;
  
  if (!confirm('🚨 تحذير أخير: هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
  
  try {
    if (window._demoMode) {
      // Remove from demo data
      allContributors = allContributors.filter(c => c.id !== contributorId);
      allPayments = allPayments.filter(p => p.contributorId !== contributorId);
      showToast('✅ تم حذف المساهم (وضع تجريبي)');
    } else {
      // Delete from Firebase
      await firebase.firestore().collection('contributors').doc(contributorId).delete();
      
      // Also delete all payments for this contributor
      const paymentsSnapshot = await firebase.firestore()
        .collection('payments')
        .where('contributorId', '==', contributorId)
        .get();
      
      const deletePromises = paymentsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      
      showToast('✅ تم حذف المساهم وبياناته بنجاح');
    }
    
    loadContributorsList();
    
  } catch (error) {
    console.error('Error deleting contributor:', error);
    showToast('❌ خطأ في الحذف: ' + error.message, true);
  }
}

function filterContributors() {
  const searchTerm = document.getElementById('searchContributors').value.toLowerCase();
  const rows = document.querySelectorAll('#contributorsBody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Make functions globally accessible
window.editContributor = editContributor;
window.deleteContributor = deleteContributor;
