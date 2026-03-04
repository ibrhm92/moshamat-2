# مساهمات - نظام إدارة المدفوعات الجماعية

## 🚀 كيفية إنهاء الوضع التجريبي وتفعيل النظام

### 1. إنشاء مشروع Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. سجل الدخول بحساب Google
3. اضغط على "إضافة مشروع"
4. أدخل اسم المشروع (مثال: "moshamat-app")
5. اختر تفعيل Google Analytics (اختياري)
6. اضغط "إنشاء مشروع"

### 2. إعداد Firestore Database
1. في مشروعك، اذهب إلى "Firestore Database"
2. اضغط "إنشاء قاعدة بيانات"
3. اختر "ابدأ في وضع الإنتاج"
4. اختر موقع قاعدة البيانات (الأقرب لمستخدميك)
5. اضغط "تفعيل"

### 3. الحصول على إعدادات Firebase
1. في إعدادات المشروع، اذهب إلى "General"
2. اسحب لأسفل إلى "Your apps" section
3. إذا لم يكن هناك تطبيق ويب، اضغط "</> Web"
4. أدخل اسم التطبيق (مثال: "moshamat-web")
5. اضغط "تسجيل التطبيق"
6. انسخ إعدادات Firebase

### 4. تحديث ملف الإعدادات
1. افتح ملف `scripts/firebase-config.js`
2. استبدل القيم النائبة بإعدادات Firebase الحقيقية:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBhK8m9X7Z2wQ1rT3yV6uN8pL5oI2sE4fG",
  authDomain: "moshamat-app.firebaseapp.com",
  projectId: "moshamat-app",
  storageBucket: "moshamat-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};
```

### 5. إعداد قواعد الأمان (اختياري)
1. في Firebase Console، اذهب إلى "Firestore Database"
2. اضغط على "Rules" tab
3. يمكنك استخدام القواعد الموجودة في ملف `firestore.rules`

### 6. تشغيل التطبيق
1. افتح الملف الرئيسي `index.html` في المتصفح
2. أو استخدم خادم محلي:
```bash
python -m http.server 8000
```
3. افتح `http://localhost:8000`

## ✅ التحقق من النجاح

بعد تحديث إعدادات Firebase، ستجد:
- شريط أخضر في الأعلى يعرض "وضع الإنتاج (Firebase)" في صفحة الإعدادات
- البيانات تحفظ تلقائياً على Firebase
- لا تظهر رسالة "وضع التجريب"

## 🛠️ المميزات

- 📱 إدارة المساهمات الجماعية
- 📊 إحصائيات وتقارير مفصلة
- 📥 استيراد البيانات من Excel/CSV
- 📲 إرسال رسائل WhatsApp تلقائياً
- 🔄 مزامنة البيانات في الوقت الفعلي
- 📛 دعم كامل للغة العربية RTL

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من إعدادات Firebase
2. تأكد من اتصال الإنترنت
3. تحقق من console المتصفح للأخطاء
