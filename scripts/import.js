// Import page specific functionality
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready before binding events
  waitForFirebase().then(() => {
    bindImportEvents();
  });
});

function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase already loaded (import)');
      resolve();
    } else {
      console.log('Waiting for Firebase to load (import)...');
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          console.log('Firebase loaded successfully (import)');
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkFirebase);
        console.warn('Firebase loading timeout - proceeding anyway (import)');
        resolve();
      }, 10000);
    }
  });
}

function bindImportEvents() {
  // Download template button
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', downloadTemplate);
  }
  
  // Choose file button
  const chooseFileBtn = document.getElementById('chooseFileBtn');
  const excelFile = document.getElementById('excelFile');
  
  if (chooseFileBtn && excelFile) {
    chooseFileBtn.addEventListener('click', () => excelFile.click());
    excelFile.addEventListener('change', handleFileSelect);
  }
  
  // Upload area drag events
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => excelFile && excelFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
  }
  
  // Import month filter
  const importMonthFilter = document.getElementById('importMonthFilter');
  if (importMonthFilter) {
    importMonthFilter.addEventListener('change', applyMonthFilter);
  }
  
  // Confirm/Cancel import buttons
  const confirmImportBtn = document.getElementById('confirmImportBtn');
  const cancelImportBtn = document.getElementById('cancelImportBtn');
  
  if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', confirmImport);
  }
  
  if (cancelImportBtn) {
    cancelImportBtn.addEventListener('click', resetImport);
  }
}

function downloadTemplate() {
  const rows = [
    ['الاسم', 'الشهر', 'المبلغ'],
    ['أحمد محمد', 'مارس 2026', '500'],
    ['فاطمة علي', 'مارس 2026', '500'],
    ['خالد إبراهيم', 'فبراير 2026', '500'],
  ];
  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'نموذج_مساهمات.csv';
  a.click();
}

let importRows = [];
let allValidRows = [];

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processExcelFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processExcelFile(file);
}

function applyMonthFilter() {
  const filter = document.getElementById('importMonthFilter').value;
  if (filter === 'all') {
    importRows = [...allValidRows];
    if (document.getElementById('importMonthBadge')) {
      document.getElementById('importMonthBadge').style.display = 'none';
    }
  } else {
    importRows = allValidRows.filter(row => row.month === filter);
    if (document.getElementById('importMonthBadge')) {
      document.getElementById('importMonthBadge').style.display = 'inline-block';
    }
  }
  renderPreview(importRows, []);
}

// Helper function to get first day of month
function getFirstDayOfMonth(monthString) {
  const monthNames = {
    'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
    'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
    'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12'
  };
  
  // Extract month and year from string like "مارس 2026"
  const parts = monthString.trim().split(' ');
  if (parts.length !== 2) return '';
  
  const month = parts[0];
  const year = parts[1];
  
  const monthNum = monthNames[month];
  if (!monthNum) return '';
  
  return `${year}-${monthNum}-01`;
}

async function processExcelFile(file) {
  const uploadArea = document.getElementById('uploadArea');
  const fileName = document.getElementById('fileName');
  const fileStatus = document.getElementById('fileStatus');
  
  try {
    // Show loading state
    if (uploadArea) {
      uploadArea.innerHTML = `
      <div class="upload-icon">📂</div>
      <div class="upload-text">جاري قراءة الملف...</div>
      <div class="upload-sub">${file.name}</div>
    `;
    }
    
    // Check file extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      throw new Error('نوع الملف غير مدعوم. الرجاء استخدام xlsx, xls, أو csv');
    }
    
    // Load SheetJS if needed
    await loadSheetJS();
    
    let data = [];
    
    if (ext === 'csv') {
      // Handle CSV
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      
      // Skip header if present
      const startIndex = rows[0].includes('الاسم') ? 1 : 0;
      
      for (let i = startIndex; i < rows.length; i++) {
        const cols = rows[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 3 && cols[0]) {
          data.push([cols[0], cols[1], cols[2]]);
        }
      }
    } else {
      // Handle Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      data = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Skip header if present
      const startIndex = data.length > 0 && data[0][0] && data[0][0].toString().includes('الاسم') ? 1 : 0;
      data = data.slice(startIndex);
    }
    
    // Validate and process data
    const valid = [];
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3 || !row[0]) continue;
      
      const name = row[0].toString().trim();
      const month = row[1] ? row[1].toString().trim() : '';
      const amount = row[2] ? parseFloat(row[2].toString().replace(/[^0-9.]/g, '')) : 0;
      
      if (!name) {
        errors.push(`صف ${i+1}: الاسم مطلوب`);
        continue;
      }
      
      if (!month) {
        errors.push(`صف ${i+1}: الشهر مطلوب`);
        continue;
      }
      
      if (!amount || amount <= 0) {
        errors.push(`صف ${i+1}: المبلغ غير صحيح`);
        continue;
      }
      
      // Add default date
      const defaultDate = getFirstDayOfMonth(month);
      valid.push({ name, month, amount, date: defaultDate });
    }
    
    // Update UI
    if (uploadArea) {
      uploadArea.innerHTML = `
      <div class="upload-icon">✅</div>
      <div class="upload-text">تم قراءة الملف بنجاح</div>
      <div class="upload-sub">${file.name}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
        📊 تم العثور على ${valid.length} سجل صحيح
        ${errors.length > 0 ? `| ⚠️ ${errors.length} خطأ` : ''}
        ${valid.length > 0 ? `| 📅 تم تعيين تاريخ افتراضي (أول يوم في الشهر)` : ''}
      </div>
      <button class="btn btn-outline" onclick="document.getElementById('excelFile') && document.getElementById('excelFile').click()" style="margin-top:14px;font-size:13px;padding:9px 20px">
        📁 اختيار ملف آخر
      </button>`;
    }
    
    if (fileName) fileName.textContent = file.name;
    if (fileStatus) {
      fileStatus.textContent = `✅ تم القراءة (${valid.length} صحيح${errors.length > 0 ? `, ${errors.length} خطأ` : ''})`;
      fileStatus.className = 'badge badge-green';
    }
    
    // Populate month filter
    const months = [...new Set(valid.map(r => r.month))];
    const monthFilter = document.getElementById('importMonthFilter');
    if (monthFilter) {
      monthFilter.innerHTML = '<option value="all">جميع الأشهر</option>';
      months.forEach(month => {
        monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
      });
    }
    
    // Store data
    allValidRows = valid;
    importRows = [...valid];
    
    // Show preview
    renderPreview(valid, errors);
    
    showToast(`✅ تم قراءة ${valid.length} سجل صحيح${errors.length > 0 ? ` (${errors.length} أخطاء)` : ''}`);
    
  } catch (e) {
    console.error('Error processing file:', e);
    if (uploadArea) {
      uploadArea.innerHTML = `
      <div class="upload-icon">❌</div>
      <div class="upload-text">فشل قراءة الملف</div>
      <div class="upload-sub">${file.name}</div>
      <div style="font-size:11px;color:#e74c3c;margin-top:8px">
        ⚠️ ${e.message}
      </div>
      <button class="btn btn-outline" onclick="document.getElementById('excelFile') && document.getElementById('excelFile').click()" style="margin-top:14px;font-size:13px;padding:9px 20px">
        📁 اختيار ملف
      </button>`;
    }
    showToast('❌ ' + e.message, true);
  }
}

async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  return new Promise((res, rej) => {
    const existing = document.querySelector('script[src*="xlsx"]');
    if (existing) {
      const wait = setInterval(() => {
        if (window.XLSX) { clearInterval(wait); res(window.XLSX); }
      }, 100);
      setTimeout(() => { clearInterval(wait); rej(new Error('انتهت مهلة تحميل مكتبة Excel')); }, 10000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => { if (window.XLSX) res(window.XLSX); else rej(new Error('فشل تهيئة المكتبة')); };
    s.onerror = () => rej(new Error('فشل تحميل مكتبة Excel - تحقق من الاتصال'));
    document.head.appendChild(s);
  });
}

function renderPreview(valid, errors) {
  const previewSection = document.getElementById('previewSection');
  const previewBody = document.getElementById('previewBody');
  const countEl = document.getElementById('previewCount');
  const errEl = document.getElementById('importErrors');

  if (!previewSection || !previewBody) return;

  previewSection.style.display = 'block';
  
  countEl.textContent = `${valid.length} سجل صحيح`;
  countEl.className = valid.length ? 'badge badge-green' : 'badge badge-red';

  previewBody.innerHTML = valid.slice(0, 10).map((r, i) => `
  <tr>
    <td>${r.name}</td>
    <td>${r.month}</td>
    <td>${r.amount} جنيه</td>
    <td>${r.date}</td>
  </tr>
  `).join('');

  if (valid.length > 10) {
    previewBody.innerHTML += `
    <tr>
      <td colspan="4" style="text-align:center;color:var(--text-muted);font-size:12px">
        ... و ${valid.length - 10} سجل آخر
      </td>
    </tr>
    `;
  }

  if (errors.length > 0) {
    errEl.style.display = 'block';
    errEl.innerHTML = '<strong>أخطاء:</strong><br>' + errors.slice(0, 5).join('<br>');
    if (errors.length > 5) {
      errEl.innerHTML += `<br>... و ${errors.length - 5} خطأ آخر`;
    }
  } else {
    errEl.style.display = 'none';
  }
}

async function confirmImport() {
  if (importRows.length === 0) {
    showToast('❌ لا توجد بيانات للاستيراد', true);
    return;
  }

  const btn = document.getElementById('confirmImportBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> جاري الاستيراد...';
  btn.disabled = true;

  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  if (progressWrap) progressWrap.style.display = 'block';

  try {
    let done = 0, skipped = 0, failed = 0;
    const total = importRows.length;

    for (const row of importRows) {
      try {
        // Check for duplicate payment
        const exists = allPayments.some(p => {
          const contributor = allContributors.find(c => c.id === p.contributorId);
          const contributorName = contributor ? contributor.name.toLowerCase().trim() : '';
          return contributorName === row.name.toLowerCase().trim() && 
                 p.month === row.month && 
                 Math.abs(Number(p.amount) - row.amount) < 0.01;
        });

        if (exists) {
          skipped++;
        } else {
          // Check if contributor exists by name
          let contributorId = null;
          const existingContributor = allContributors.find(c => 
            c.name.toLowerCase().trim() === row.name.toLowerCase().trim()
          );
          
          if (existingContributor) {
            // Use existing contributor
            contributorId = existingContributor.id;
            console.log(`Found existing contributor: ${row.name} (${contributorId})`);
          } else {
            // Create new contributor
            console.log(`Creating new contributor: ${row.name}`);
            if (window._demoMode) {
              contributorId = 'demo_' + Date.now() + '_' + done;
              allContributors.push({
                id: contributorId,
                name: row.name.trim(),
                phone: ''
              });
              console.log(`Created new contributor (demo): ${row.name} (${contributorId})`);
            } else {
              const contributorRef = await firebase.firestore().collection('contributors').add({
                name: row.name.trim(),
                phone: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              contributorId = contributorRef.id;
              
              // Update local contributors list
              allContributors.push({
                id: contributorId,
                name: row.name.trim(),
                phone: ''
              });
              
              console.log(`Created new contributor: ${row.name} (${contributorId})`);
            }
          }
          
          // Add payment with correct contributorId
          if (window._demoMode) {
            allPayments.push({ 
              id: 'p_' + Date.now() + '_' + done, 
              contributorId: contributorId, 
              month: row.month, 
              amount: row.amount, 
              date: row.date || getFirstDayOfMonth(row.month),
              timestamp: new Date() 
            });
          } else {
            await firebase.firestore().collection('payments').add({
              contributorId: contributorId,
              month: row.month,
              amount: row.amount,
              date: row.date || getFirstDayOfMonth(row.month),
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            allPayments.push({ 
              id: 'tmp', 
              contributorId: contributorId, 
              month: row.month, 
              amount: row.amount,
              date: row.date || getFirstDayOfMonth(row.month),
              timestamp: new Date() 
            });
          }
          done++;
        }
      } catch (e) { 
        failed++; 
      }

      // Update progress
      const pct = Math.round(((done + skipped + failed) / total) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = `جاري الاستيراد... ${done + skipped + failed} / ${total}`;
      await new Promise(r => setTimeout(r, 50));
    }

    if (progressWrap) progressWrap.style.display = 'none';

    // Show result
    const resultEl = document.getElementById('importResult');
    if (resultEl) {
      // Count new contributors created
      const newContributorsCount = importRows.filter(row => {
        return !allContributors.some(c => 
          c.name.toLowerCase().trim() === row.name.toLowerCase().trim()
        );
      }).length;
      
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
      <div class="result-card ${failed > 0 && done === 0 ? 'error' : ''}">
        <div style="font-size:32px;margin-bottom:8px">${done > 0 ? '🎉' : '⚠️'}</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px">اكتمل الاستيراد</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:2">
          ✅ تم استيراد: <strong style="color:var(--primary-light)">${done}</strong> مساهمة<br>
          👥 تم إنشاء: <strong style="color:var(--accent)">${newContributorsCount}</strong> مساهم جديد<br>
          ⏭️ تم تخطي (مكرر): <strong style="color:var(--warning)">${skipped}</strong> مساهمة<br>
          ${failed ? `❌ فشل: <strong style="color:#e74c3c">${failed}</strong> مساهمة<br>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
          💡 تم ربط المساهمات بالمساهمين الموجودين تلقائياً
        </div>
      </div>
    `;

    // Refresh data
    if (!window._demoMode) await loadData(true);
    else updateStats();

    showToast(`✅ استُورد ${done} سجل بنجاح`);
  } catch (error) {
    console.error('Import error:', error);
    showToast('❌ فشل الاستيراد: ' + error.message, true);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function resetImport() {
  importRows = [];
  allValidRows = [];
  
  const previewSection = document.getElementById('previewSection');
  const uploadArea = document.getElementById('uploadArea');
  const excelFile = document.getElementById('excelFile');
  
  if (previewSection) previewSection.style.display = 'none';
  if (uploadArea) {
    uploadArea.innerHTML = `
    <div class="upload-icon">📂</div>
    <div class="upload-text">اضغط لاختيار ملف أو اسحب وأفلت هنا</div>
    <div class="upload-sub">xlsx / xls / csv</div>
    `;
  }
  if (excelFile) excelFile.value = '';
}
