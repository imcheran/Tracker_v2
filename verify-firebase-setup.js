#!/usr/bin/env node

/**
 * Firebase Configuration Validator
 * Helps diagnose Firebase login issues
 * 
 * Usage: node verify-firebase-setup.js
 */

const firebaseConfig = {
  apiKey: "AIzaSyBliJyouiIZ0opeozDFvjUkcFBzVruOBzI",
  authDomain: "tracker-8fefe.firebaseapp.com",
  projectId: "tracker-8fefe",
  storageBucket: "tracker-8fefe.firebasestorage.app",
  messagingSenderId: "965709257556",
  appId: "1:965709257556:web:956f5086d934ad2ed946c1",
  measurementId: "G-131FE9F98E"
};

const capAuthConfig = {
  clientId: '965709257556-i7958klip6ut3mb5fgaffh2p55q3attn.apps.googleusercontent.com',
};

console.log('🔍 Firebase Configuration Validator\n');
console.log('=====================================\n');

// Validate Firebase Config
console.log('📋 Firebase Config Check:\n');

const checks = [
  {
    name: 'API Key present',
    condition: firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSyB'),
    value: firebaseConfig.apiKey,
    fix: 'Get from Firebase Console → Project Settings → Service Accounts → Web API Key'
  },
  {
    name: 'Auth Domain correct',
    condition: firebaseConfig.authDomain === 'tracker-8fefe.firebaseapp.com',
    value: firebaseConfig.authDomain,
    fix: 'Should be in format: <project-id>.firebaseapp.com'
  },
  {
    name: 'Project ID correct',
    condition: firebaseConfig.projectId === 'tracker-8fefe',
    value: firebaseConfig.projectId,
    fix: 'Get from Firebase Console → Project Settings'
  },
  {
    name: 'Storage Bucket present',
    condition: firebaseConfig.storageBucket && firebaseConfig.storageBucket.includes('firebasestorage'),
    value: firebaseConfig.storageBucket,
    fix: 'Get from Firebase Console → Project Settings'
  },
  {
    name: 'App ID present',
    condition: firebaseConfig.appId && firebaseConfig.appId.includes('web'),
    value: firebaseConfig.appId,
    fix: 'Get from Firebase Console → Project Settings'
  },
  {
    name: 'Messaging Sender ID present',
    condition: firebaseConfig.messagingSenderId && firebaseConfig.messagingSenderId.length > 0,
    value: firebaseConfig.messagingSenderId,
    fix: 'Get from Firebase Console → Project Settings'
  }
];

let allConfigValid = true;
checks.forEach(check => {
  const status = check.condition ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  console.log(`   Value: ${check.value}`);
  if (!check.condition) {
    console.log(`   🔧 Fix: ${check.fix}`);
    allConfigValid = false;
  }
  console.log();
});

// Validate Capacitor Config
console.log('📱 Capacitor Google Auth Check:\n');

const capChecks = [
  {
    name: 'Capacitor Client ID present',
    condition: capAuthConfig.clientId && capAuthConfig.clientId.includes('apps.googleusercontent.com'),
    value: capAuthConfig.clientId,
    fix: 'Get from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (Android)'
  }
];

capChecks.forEach(check => {
  const status = check.condition ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  console.log(`   Value: ${check.value}`);
  if (!check.condition) {
    console.log(`   🔧 Fix: ${check.fix}`);
  }
  console.log();
});

// Common Issues
console.log('\n⚠️  Common Firebase Login Issues:\n');
console.log('1. ❌ "Unauthorized domain" error');
console.log('   → Add your domain to Firebase Console → Authentication → Settings → Authorized Domains\n');

console.log('2. ❌ "CORS error" or "API error" error');
console.log('   → Go to Firebase Console → Project Settings → API Keys');
console.log('   → Add "Identity Toolkit API" to API restrictions\n');

console.log('3. ❌ "User cancelled" error');
console.log('   → You clicked Cancel in the Google login popup - just try again\n');

console.log('4. ❌ "Popup blocked" error');
console.log('   → Allow popups for this website in your browser settings\n');

console.log('5. ❌ "Network request failed" error');
console.log('   → Check your internet connection');
console.log('   → Verify network/firewall doesn\'t block googleapis.com\n');

// Summary
console.log('\n📊 Summary:\n');
if (allConfigValid) {
  console.log('✅ Configuration appears valid!');
  console.log('\nIf login still fails:');
  console.log('1. Check browser console (F12) for detailed error');
  console.log('2. Verify your domain is in Authorized Domains');
  console.log('3. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('4. Hard refresh (Ctrl+F5)');
  console.log('5. Try in incognito window');
} else {
  console.log('⚠️  Some configuration issues found above');
  console.log('\nFix the issues above and retry login');
}

console.log('\n=====================================');
console.log('📖 For more help, see:');
console.log('   - FIREBASE_LOGIN_QUICK_FIX.md');
console.log('   - FIREBASE_LOGIN_TROUBLESHOOTING.md');
console.log('   - Firebase Console: https://console.firebase.google.com/project/tracker-8fefe');
console.log('=====================================\n');
