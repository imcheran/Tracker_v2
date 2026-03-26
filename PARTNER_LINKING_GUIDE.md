# Partner Linking Implementation Guide

## Architecture Overview

Your app now uses the **correct couples-only habit tracker model** based on atomic transactions and permanent partner linking:

### User Journey
1. **User A** generates an invite code in Settings → gets a temporary code (24hr expiry)
2. **User A** shares the code with User B
3. **User B** goes to Couples view → enters the code
4. **System** validates code and creates permanent couple link using Firestore transaction
5. **Both users** now see:
   - Each other's status, timezone, and availability
   - Shared couple habits and challenges
   - One couple space with real-time sync

### Data Structure

```
users/{uid}
├── displayName, email, photoURL
├── timezone, settings
├── isCoupled: boolean
├── partnerUid: string (partner's UID)
└── coupleId: string (couple_uid1_uid2 format)

partnerInvites/{code}
├── senderUid, used, createdAt, expiresAt
└── (24-hour expiry, auto-cleanup recommended)

couples/{coupleId}
├── user1, user2, members: [uid1, uid2]
├── createdAt, status: "active" or "inactive"
│
├── habits/{habitId}
│   └── shared couple habit documents
│
├── activity/{activityId}
│   └── nudges, check-ins, reactions, notes
│
└── photos/{photoId}
    └── shared photo moments
```

## Implementation Checklist

### ✅ Completed

- [x] **firebaseService.ts**: Updated with:
  - `generateInviteCode()` - Creates temporary codes
  - `linkPartnerByCode()` - Atomic transaction linking
  - `subscribeToCoupleData()` - Real-time couple data listener
  - `unlinkPartner()` - Transaction-safe unlinking

- [x] **CouplesView.tsx**: Updated with:
  - `PartnerLinkingModal` - Changed from UID to invite code input
  - Proper code validation UI (showing mode toggle)
  - Copy/share functionality for invite codes

- [x] **App.tsx**: Updated with:
  - Real-time couple data listener setup
  - Automatic unsubscription on logout
  - Couple data sync into local state

- [x] **SettingsView.tsx**: Already has:
  - `generateInviteCode` button with nice UI
  - Code display with copy-to-clipboard
  - 24-hour expiry timer
  - Partner status display

### ⚠️ Still Needed

1. **Deploy Firestore Security Rules**
   - Rules file created: `firestore.rules`
   - Deploy via Firebase CLI or Console

2. **Test the complete flow**
   - Generate invite code
   - Link partner with code
   - Verify couple data syncs
   - Test real-time updates

3. **Add Cloud Function (Optional but Recommended)**
   - Auto-cleanup expired invite codes
   - Send push notifications on linking
   - Validate couple data consistency

## Deploying Firestore Security Rules

### Option 1: Firebase Console (Web)

1. Go to Firebase Console → Your Project
2. **Firestore Database** → **Rules** tab
3. Copy-paste content from `firestore.rules`
4. Click **Publish**

### Option 2: Firebase CLI (Recommended)

```bash
# Install Firebase CLI if not already
npm install -g firebase-tools

# Navigate to your project
cd c:\Users\kutti\NEW_TRACKER\The-tracker

# Initialize Firebase (runs once)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Rules Explained

```firestore
// Personal data - only you can access
match /users/{uid} {
  allow read, write: if request.auth.uid == uid;
}

// Invite codes - anyone can read to verify
match /partnerInvites/{code} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if used == true; // Only mark as used
}

// Couple space - only members can access
match /couples/{coupleId} {
  allow read, write: if request.auth.uid in resource.data.members;
  match /{subcollection}/{doc=**} {
    allow read, write: if request.auth.uid in get(/couples/{coupleId}).data.members;
  }
}
```

## Testing the Complete Flow

### Manual Test Steps

1. **Two browsers/devices**:
   - Browser 1: User A (signed in)
   - Browser 2: User B (signed in)

2. **Generate Invite Code (User A)**:
   - Open Settings
   - Tap "Generate Invite Code"
   - Copy the code (e.g., `ABC1D2E3F4G5`)

3. **Link Partner (User B)**:
   - Go to Couples view
   - Tap "Link partner" button
   - Select "I have a code"
   - Paste the code
   - Tap "Link Partner"

4. **Verify Linking**:
   - Both should see couple data synced
   - Check partner status/timezone visible
   - Create shared habit and verify on both sides
   - Real-time updates should work instantly

### Test Checklist

- [ ] Invite code generates successfully (24-hour expiry)
- [ ] Invalid code shows error
- [ ] Already-used code shows error
- [ ] Successful linking creates couple document in Firestore
- [ ] Partner profile appears immediately after linking
- [ ] Edit sharedChallenges and see instant sync on partner
- [ ] Unauthorized user cannot access couple/{coupleId}
- [ ] Couple data is read-only to other users
- [ ] Photo uploads sync to partner in real-time
- [ ] Journal entries appear in real-time

## Common Issues & Solutions

### Issue: "Firestore not initialized"
**Solution**: Check firebaseService.ts - ensure `initializeFirebase()` runs at module load

### Issue: Linking creates couple document but UI doesn't update
**Solution**: 
- Check that `subscribeToCoupleData` listener is registered in App.tsx
- Verify `partnerSubscriptionRef.current` is being set
- Check browser console for listener errors

### Issue: Security rule rejected the write
**Solution**: 
- Check user is authenticated
- For couple docs, verify `members: [uid1, uid2]` array exists
- Test with small batch writes first

### Issue: Invite codes not expiring
**Solution**: 
- Set up a Cloud Function to delete `partnerInvites` docs after 24 hours
- Or manually clean via Firebase Console

## Next Steps

### Phase 1: Core Linking ✅
- [x] Atomic transaction-based linking
- [x] Invite code generation/validation
- [x] Real-time couple data sync

### Phase 2: Couple Features 🔄
- [ ] Shared habits → sync back to personal habits
- [ ] Couple challenges → track both partners' progress
- [ ] Real-time nudges with push notifications
- [ ] Status updates for availability

### Phase 3: Data Integrity
- [ ] Backup couple data regularly
- [ ] Archive old couple documents on unlink
- [ ] Validate data consistency with scheduled functions

### Phase 4: Performance
- [ ] Implement lazy loading for couple subcollections
- [ ] Cache couple data locally with service workers
- [ ] Paginate large photo/journal collections

## Key Files Modified

1. **services/firebaseService.ts** - Core transaction logic
2. **components/CouplesView.tsx** - UI for code-based linking
3. **components/SettingsView.tsx** - Invite code generation
4. **App.tsx** - Real-time listener setup
5. **firestore.rules** - Security rules (NEW)

## References

- [Firebase Transactions](https://firebase.google.com/docs/firestore/transactions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Real-time Listeners](https://firebase.google.com/docs/firestore/query-data/listen)
