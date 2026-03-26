#!/usr/bin/env node

/**
 * Verification script for partner linking implementation
 * Run: node verify-implementation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying partner linking implementation...\n');

const checks = [
  {
    name: 'firebaseService.ts exports',
    file: 'services/firebaseService.ts',
    tests: [
      { pattern: /export const generateInviteCode/, desc: 'generateInviteCode function' },
      { pattern: /export const linkPartnerByCode/, desc: 'linkPartnerByCode function' },
      { pattern: /export const subscribeToCoupleData/, desc: 'subscribeToCoupleData function' },
      { pattern: /export const unlinkPartner/, desc: 'unlinkPartner function' },
    ]
  },
  {
    name: 'CouplesView.tsx implementation',
    file: 'components/CouplesView.tsx',
    tests: [
      { pattern: /onLink: \(inviteCode: string\)/, desc: 'inviteCode parameter' },
      { pattern: /const PartnerLinkingModal/, desc: 'PartnerLinkingModal component' },
      { pattern: /mode === 'enter'/, desc: 'Code entry mode' },
    ]
  },
  {
    name: 'App.tsx listener setup',
    file: 'App.tsx',
    tests: [
      { pattern: /subscribeToCoupleData/, desc: 'Real-time couple listener subscription' },
      { pattern: /partnerSubscriptionRef\.current/, desc: 'Subscription ref tracking' },
      { pattern: /data\.isCoupled && data\.coupleId/, desc: 'Couple data check' },
    ]
  },
  {
    name: 'SettingsView.tsx code generation',
    file: 'components/SettingsView.tsx',
    tests: [
      { pattern: /handleGenerateInvite/, desc: 'Generate invite handler' },
      { pattern: /generateInviteCode\(user\.uid\)/, desc: 'Call to generateInviteCode' },
      { pattern: /myInviteCode/, desc: 'Invite code state' },
    ]
  },
  {
    name: 'Firestore Security Rules',
    file: 'firestore.rules',
    tests: [
      { pattern: /function isCouplesMember/, desc: 'Member check function' },
      { pattern: /request\.auth\.uid in coupleMembers/, desc: 'Array membership check' },
      { pattern: /match \/couples\/{coupleId\}/, desc: 'Couple collection rules' },
      { pattern: /allow read, write: if isAuth\(\) && isCouplesMember/, desc: 'Access control' },
    ]
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const filePath = path.join(__dirname, check.file);
  
  console.log(`\n📄 ${check.name}`);
  console.log(`   File: ${check.file}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  check.tests.forEach(test => {
    if (test.pattern.test(content)) {
      console.log(`   ✅ ${test.desc}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.desc}`);
      failed++;
    }
  });
});

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0) {
  console.log('🎉 All implementation checks passed!');
  console.log('\nNext steps:');
  console.log('1. Deploy Firestore Security Rules:');
  console.log('   firebase deploy --only firestore:rules');
  console.log('\n2. Test the flow:');
  console.log('   - Generate invite code in Settings');
  console.log('   - Enter code in Couples view on another account');
  console.log('   - Verify real-time sync');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Review the implementation.');
  process.exit(1);
}
