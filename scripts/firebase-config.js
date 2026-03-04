// Firebase Configuration - إعدادات مشروعك الحقيقية
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCOvVUeTDvR67vUtMX4Eh01naOBYvIpyUI",
  authDomain: "mosahmat-f59fa.firebaseapp.com",
  projectId: "mosahmat-f59fa",
  storageBucket: "mosahmat-f59fa.firebasestorage.app",
  messagingSenderId: "872225608471",
  appId: "1:872225608471:web:718beb193f41011d30dd52",
  measurementId: "G-F8JE8CHMGR"
};

// Global variables
let app, db;
let allContributors = [];
let allPayments = [];
let currentMonth = '';

// Utility functions
function showToast(message, isError = false) {
  const toast = document.getElementById('toast') || createToast();
  toast.textContent = message;
  toast.className = isError ? 'show error' : 'show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function createToast() {
  const toast = document.createElement('div');
  toast.id = 'toast';
  document.body.appendChild(toast);
  return toast;
}

function setCurrentMonth() {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
  
  // Set current month in selects
  const monthSelects = document.querySelectorAll('#monthSelect');
  monthSelects.forEach(select => {
    if (select) select.value = currentMonth;
  });
}

// Firebase initialization
function initFirebase() {
  try {
    console.log('Initializing Firebase with config:', FIREBASE_CONFIG.projectId);
    
    // Initialize Firebase (will be loaded from CDN)
    if (typeof firebase !== 'undefined') {
      app = firebase.initializeApp(FIREBASE_CONFIG);
      // Use correct Firestore initialization for compat mode
      db = firebase.firestore();
      console.log('Firebase initialized successfully');
      loadData();
    } else {
      console.error('Firebase SDK not loaded, waiting...');
      // Wait for Firebase to load
      setTimeout(() => {
        if (typeof firebase !== 'undefined') {
          app = firebase.initializeApp(FIREBASE_CONFIG);
          db = firebase.firestore();
          console.log('Firebase initialized successfully (delayed)');
          loadData();
        } else {
          console.error('Firebase SDK failed to load');
          useDemoMode();
        }
      }, 2000);
    }
  } catch (e) {
    console.error('Firebase initialization error:', e);
    showToast('خطأ في الاتصال بـ Firebase: ' + e.message, true);
    useDemoMode();
  }
}

// Demo mode - فقط في حالة فشل حقيقي في Firebase
function useDemoMode() {
  console.warn('⚠️ Falling back to demo mode - Firebase connection failed');
  allContributors = [
    { id: '1', name: 'أحمد محمد', phone: '01234567890' },
    { id: '2', name: 'محمود علي', phone: '01234567891' },
    { id: '3', name: 'سارة أحمد', phone: '01234567892' },
    { id: '4', name: 'خالد إبراهيم', phone: '01234567893' },
    { id: '5', name: 'فاطمة حسن', phone: '01234567894' },
  ];
  allPayments = [
    { id: 'p1', contributorId: '1', month: 'مارس 2026', amount: 500, phone: '01234567890', timestamp: new Date() },
    { id: 'p2', contributorId: '2', month: 'مارس 2026', amount: 500, phone: '01234567891', timestamp: new Date() },
    { id: 'p3', contributorId: '1', month: 'فبراير 2026', amount: 500, phone: '01234567890', timestamp: new Date() },
    { id: 'p4', contributorId: '3', month: 'فبراير 2026', amount: 500, phone: '01234567892', timestamp: new Date() },
  ];
  window._demoMode = true;
  updateStats();
  populateNameDropdown();
  showToast('⚠️ وضع التجريب - البيانات مؤقتة ومثال فقط (فشل الاتصال بـ Firebase)');
}

// Load data from Firebase
async function loadData(force = false) {
  if (window._demoMode) {
    console.log('Skipping loadData - in demo mode');
    return;
  }
  
  console.log('Loading data from Firebase...');
  
  try {
    // Test Firebase connection first
    console.log('Testing Firebase connection...');
    const testDoc = await firebase.firestore().collection('contributors').limit(1).get();
    console.log('Firebase connection test passed');
    
    // Load contributors
    console.log('Loading contributors...');
    const contributorsSnapshot = await firebase.firestore().collection('contributors').get();
    allContributors = contributorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Loaded ${allContributors.length} contributors`);
    
    // Load payments
    console.log('Loading payments...');
    const paymentsSnapshot = await firebase.firestore().collection('payments').get();
    allPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Loaded ${allPayments.length} payments`);
    
    updateStats();
    populateNameDropdown();
    console.log('✅ Data loaded successfully from Firebase');
    
    if (force) {
      showToast('✅ تم تحديث البيانات');
    }
  } catch (e) {
    console.error('Error loading data from Firebase:', e);
    console.error('Full error details:', {
      code: e.code,
      message: e.message,
      stack: e.stack
    });
    
    // Check for specific Firebase errors
    if (e.code === 'permission-denied') {
      showToast('❌ خطأ في صلاحيات الوصول إلى Firebase - تحقق من قواعد الأمان', true);
      console.error('Permission denied - check Firestore security rules');
    } else if (e.code === 'unavailable' || e.code === 'deadline-exceeded') {
      showToast('❌ مشكلة في الاتصال بالإنترنت - تحقق من اتصالك', true);
      console.error('Network connection issue');
    } else if (e.code === 'not-found') {
      console.log('No data found in collections - this is normal for new projects');
      showToast('✅ تم الاتصال بقاعدة البيانات (لا توجد بيانات بعد)');
    } else {
      showToast('❌ خطأ في تحميل البيانات: ' + e.message, true);
    }
    
    // Don't fall back to demo mode for connection issues - let user see the real error
    console.log('Firebase connection failed but staying in production mode');
  }
}

// Update statistics
function updateStats() {
  const monthPayments = allPayments.filter(p => p.month === currentMonth);
  const totalAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const paidIds = new Set(monthPayments.map(p => p.contributorId));
  const unpaidCount = allContributors.length - paidIds.size;
  
  // Update UI elements
  const totalEl = document.getElementById('totalAmount');
  const unpaidEl = document.getElementById('unpaidCount');
  
  if (totalEl) totalEl.textContent = totalAmount.toLocaleString('ar-EG');
  if (unpaidEl) unpaidEl.textContent = unpaidCount;
}

// Populate name dropdown
function populateNameDropdown() {
  const selects = document.querySelectorAll('#nameSelect');
  selects.forEach(select => {
    if (!select) return;
    
    // Get current month from select or use default
    const monthSelect = document.getElementById('monthSelect');
    const selectedMonth = monthSelect ? monthSelect.value : currentMonth;
    
    // Find contributors who haven't paid for the selected month
    const paidContributors = new Set(
      allPayments
        .filter(p => p.month === selectedMonth)
        .map(p => p.contributorId)
    );
    
    const unpaidContributors = allContributors
      .filter(contributor => !paidContributors.has(contributor.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')); // Sort alphabetically in Arabic
    
    // Clear existing options except the first two
    while (select.options.length > 2) select.remove(2);
    
    // Add unpaid contributors only
    unpaidContributors.forEach(contributor => {
      const option = document.createElement('option');
      option.value = contributor.id;
      option.textContent = contributor.name;
      select.appendChild(option);
    });
    
    console.log(`Loaded ${unpaidContributors.length} unpaid contributors for ${selectedMonth}`);
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setCurrentMonth();
  
  // Load Firebase SDK
  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js';
  script.onload = () => {
    const firestoreScript = document.createElement('script');
    firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js';
    firestoreScript.onload = () => {
      console.log('Firebase SDK loaded, initializing...');
      initFirebase();
      
      // Verify Firebase is working after 5 seconds
      setTimeout(() => {
        if (!window._demoMode && (!db || !app)) {
          console.warn('❌ Firebase not properly initialized after 5 seconds, checking network...');
          // Check if it's a network issue or configuration issue
          if (navigator.onLine) {
            console.log('Network is available, trying to initialize Firebase again...');
            initFirebase();
          } else {
            console.warn('Network is offline, using demo mode');
            useDemoMode();
          }
        } else if (!window._demoMode) {
          console.log('✅ Firebase is working correctly! Production mode active.');
          // Clear any demo mode flag that might have been set
          delete window._demoMode;
        } else {
          console.log('Demo mode is active (Firebase connection failed)');
        }
      }, 5000);
    };
    document.head.appendChild(firestoreScript);
  };
  script.onerror = () => {
    console.error('Failed to load Firebase SDK');
    useDemoMode();
  };
  document.head.appendChild(script);
});
