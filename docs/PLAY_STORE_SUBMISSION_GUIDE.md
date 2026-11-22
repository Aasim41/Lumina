# 🚀 Google Play Store Submission Guide & Assets — Lumina Smart Expense

This document contains everything needed to complete your Google Play Console submission smoothly and pass app review on the first try.

---

## 1. 📱 Store Listing Metadata

### App Details
* **App Name** (max 30 characters):  
  `Lumina: Smart Expense Tracker`
* **Short Description** (max 80 characters):  
  `Private, offline-first expense tracker with automatic bank SMS & budget insights.`

### Full Description (max 4,000 characters)
```text
Take complete control of your personal finances with Lumina — the private, offline-first smart expense tracker built for modern spending.

Unlike traditional budgeting apps that upload your sensitive bank statements to cloud servers, Lumina operates on a strict Zero-Knowledge Architecture: all your financial accounts, bank SMS alerts, transactions, and budgets remain 100% on your device.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ KEY HIGHLIGHTS & CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ AUTOMATIC BANK SMS EXPENSE TRACKING
• Instantly categorizes debit & credit alerts from SBI, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda, and major Indian banks.
• Automatically logs UPI merchant spends from Google Pay, PhonePe, and Paytm.
• Advanced on-device filtering rejects non-transactional messages, spam, and OTPs.

📊 SMART DAILY BUDGETING & RUNWAY
• Dynamic daily allowance automatically recalculates based on remaining days in your billing cycle.
• Visual progress rings and spending breakdowns keep you on track without manual math.
• Real-time remaining budget glance right from your Android home screen widget.

🔄 SMART RECURRING SUBSCRIPTION DETECTION
• Intelligently identifies recurring monthly bills (Netflix, Spotify, Gym, Broadband, EMIs).
• 1-tap approval adds detected services to active subscriptions with renewal alerts.

👥 SPLIT BILLS WITH FRIENDS
• Seamlessly calculate equal or custom percentage splits for group dinners and trips.
• Send itemized WhatsApp payment reminders in one tap.

📸 AI RECEIPT & STATEMENT SCANNER
• Scan paper receipts and bills with on-device camera OCR.
• Import historical Indian bank statement CSVs with automatic column mapping.

📑 EXECUTIVE PDF STATEMENTS
• Generate branded monthly financial statements with KPI cards, category breakdown shares, and itemized debit/credit ledgers for tax filing.

🔒 PRIVACY-FIRST & ZERO-KNOWLEDGE
• No cloud account required to track expenses.
• Zero telemetry, zero analytics tracking, and zero ads.
• Automated secure local backups with 1-tap restore.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ PERMISSION DISCLOSURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lumina requests READ_SMS and RECEIVE_SMS permissions solely to detect transactional banking debits/credits locally on your device. Your SMS messages are never uploaded, collected, or shared with third parties.

Track smarter, save faster, and protect your privacy with Lumina!
```

---

## 2. 🛡️ Google Play SMS Permissions Declaration Form

Because Lumina requests `READ_SMS` and `RECEIVE_SMS`, Google Play requires filling out the **SMS and Call Log Permissions Declaration Form** in the Play Console:

1. **Select Core Feature Category**:
   * Choose: **Financial transaction / SMS expense tracker**
2. **Prominent In-App Disclosure**:
   * Lumina includes a built-in prominent disclosure screen (`SMSDisclosureModal`) that informs users before requesting runtime permission.
3. **Demo Video URL (Mandatory)**:
   * Google Play requires an unlisted YouTube video (30–60 seconds).
   * **Recording Checklist**:
     1. Open Lumina on an Android phone or emulator.
     2. Show the in-app disclosure dialog: *"Automatic Expense Tracking — 100% On-Device"*.
     3. Tap *"Allow & Enable Auto-Tracking"*, then tap **Allow** on the Android system permission prompt.
     4. Send a simulated test bank SMS (e.g. from another phone or Android emulator: *"Dear SBI User, your A/c ending 1234 debited by Rs 350.00 on 22Nov26 to Swiggy"*).
     5. Show Lumina immediately displaying the new expense card in the transaction ledger.

---

## 3. 📋 Data Safety Section Answers

When answering Google Play's **Data Safety Questionnaire**, select the following answers:

* **Does your app collect or share any of the required user data types?**  
  👉 Select: **No** (all financial data and SMS records are processed and stored exclusively on-device in local IndexedDB storage).
* **Is data encrypted in transit?**  
  👉 Select: **Yes** (any optional network traffic uses HTTPS/TLS).
* **Do you provide a way for users to request that their data be deleted?**  
  👉 Select: **Yes** (users can wipe their entire database in Settings with 1 tap, or uninstall the app to erase all on-device data).
* **Does this app contain Ads?**  
  👉 Select: **No, my app does not contain ads**.

---

## 4. 🎨 Store Graphics Requirements

| Asset | Specifications |
| :--- | :--- |
| **App Icon** | 512 × 512 px, 32-bit PNG (with alpha), max 1 MB |
| **Feature Graphic Banner** | 1024 × 500 px, JPG or 24-bit PNG (no alpha), max 15 MB |
| **Phone Screenshots** | Minimum 2 (recommended 4–6), 16:9 or 9:16 aspect ratio (e.g., 1080 × 2400 px) |

Recommended Screenshots:
1. **Home Screen**: Daily Budget Ring, Streak counter, and Recent Transactions.
2. **Transaction Ledger**: Search filters, tags, and category breakdown.
3. **Subscriptions & Splits**: Auto-detected recurring services and group bill splitting.
4. **Statements**: Executive PDF summary and spending charts.

---

## 5. 📦 Generating & Downloading the Production AAB Bundle

With the updated GitHub Actions workflow, every commit to `main` automatically compiles both:
* **`LUMINA.aab`** (Android App Bundle for Play Console upload)
* **`LUMINA.apk`** (Signed APK for immediate testing)

To download:
1. Go to your GitHub repository -> **Releases**.
2. Download **`LUMINA.aab`** from the **Latest Play Store Ready Build**.
3. Upload `LUMINA.aab` directly into **Google Play Console -> Release -> Production (or Closed Testing)**.
