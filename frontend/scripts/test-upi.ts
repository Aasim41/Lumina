import { parseUpiUri, buildUpiUri, launchUpiPayment, validateVpa } from '../src/lib/upi.ts';

console.log('\n========================================================');
console.log('🚀 RUNNING LUMINA UPI ENGINE & BHARATQR TEST MATRIX');
console.log('========================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// 1. Standard UPI URI
const parsed1 = parseUpiUri('upi://pay?pa=swiggy@icici&pn=Swiggy%20India&am=349.50&mc=5812&tr=TXN123456');
assert(parsed1 !== null && parsed1.pa === 'swiggy@icici', 'Parse standard upi://pay URI');
assert(parsed1?.pn === 'Swiggy India', 'Decode %20 spaces in Payee Name');
assert(parsed1?.am === 349.5, 'Parse numeric amount correctly');
assert(parsed1?.mc === '5812', 'Preserve Merchant Category Code (mc)');
assert(parsed1?.extraParams?.tr === 'TXN123456', 'Preserve transaction reference (tr)');

// 2. URI Builder NPCI Compliant Output
const built1 = buildUpiUri({
  pa: 'swiggy@icici',
  pn: 'Swiggy India',
  am: 350.00,
  tn: 'Food Order Dinner',
  extraParams: { mc: '5812', tr: 'TXN123456' }
});

assert(!built1.includes('+'), 'URI builder does NOT use plus signs for spaces (uses %20)');
assert(built1.includes('am=350&') || built1.endsWith('am=350'), 'Strips unnecessary trailing zeroes (350, not 350.00)');
assert(built1.includes('mc=5812'), 'Forwards merchant category code');
assert(built1.includes('tr=TXN123456'), 'Forwards transaction ref');
assert(!built1.includes('mode=00'), 'Does NOT inject artificial mode=00 on generic payments (avoids bank limit rejection)');

const builtWithMode = buildUpiUri({
  pa: 'merchant@upi',
  am: 100,
  extraParams: { mode: '02' }
});
assert(builtWithMode.includes('mode=02'), 'Forwards mode parameter when present in extraParams');

// 3. Raw VPA String
const parsedRaw = parseUpiUri('rahul@okaxis');
assert(parsedRaw !== null && parsedRaw.pa === 'rahul@okaxis', 'Parse raw VPA text input directly');

// 4. Custom App Schemes (tez://, phonepe://, paytmmp://)
const parsedTez = parseUpiUri('tez://upi/pay?pa=starbucks@hdfcbank&pn=Starbucks&am=250');
assert(parsedTez !== null && parsedTez.pa === 'starbucks@hdfcbank', 'Normalize and parse Google Pay tez:// scheme');

const parsedPhonePe = parseUpiUri('phonepe://pay?pa=chai@ybl&pn=Chai%20Point&am=50');
assert(parsedPhonePe !== null && parsedPhonePe.pa === 'chai@ybl', 'Normalize and parse PhonePe custom scheme');

// 5. BharatQR / EMVCo Merchant Standee
const emvQr = '00020101021226390011in.npci.upi0120supermarket@hdfcbank520454115406120.005802IN5914Super Mart BLR6304ABCD';
const parsedBharat = parseUpiUri(emvQr);
assert(parsedBharat !== null && parsedBharat.pa === 'supermarket@hdfcbank', 'Parse BharatQR / EMVCo tag 26 NPCI UPI VPA');
assert(parsedBharat?.pn === 'Super Mart BLR', 'Parse BharatQR merchant name tag 59');
assert(parsedBharat?.am === 120, 'Parse BharatQR amount tag 54');
assert(parsedBharat?.mc === '5411', 'Parse BharatQR MCC tag 52');

// 6. Launch UPI Payment URI Builder & Merchant Standee Preservation
const launchStandeeNoAm = await launchUpiPayment({
  pa: 'shop@paytm',
  pn: 'Chai Wala',
  am: 45,
  rawQrUri: 'upi://pay?pa=shop@paytm&pn=Chai%20Wala&mc=5499&tr=PTM98765'
});
assert(launchStandeeNoAm.success, 'Launch UPI payment succeeds');
assert(launchStandeeNoAm.uri.includes('mc=5499'), 'Preserves merchant MCC in scanned standee URI');
assert(launchStandeeNoAm.uri.includes('tr=PTM98765'), 'Preserves merchant transaction reference in standee URI');
assert(launchStandeeNoAm.uri.includes('am=45'), 'Injects entered amount into standee URI');
assert(!launchStandeeNoAm.uri.includes('mode=00'), 'Does NOT inject artificial mode=00 into standee URI');

const launchStandeeWithAm = await launchUpiPayment({
  pa: 'store@upi',
  pn: 'Book Store',
  am: 350,
  rawQrUri: 'upi://pay?pa=store@upi&pn=Book%20Store&am=100&cu=INR&mc=5942'
});
assert(launchStandeeWithAm.uri.includes('am=350'), 'Replaces original standee amount with updated amount');
assert(!launchStandeeWithAm.uri.includes('am=100'), 'Removes old standee amount completely');
assert(launchStandeeWithAm.uri.includes('mc=5942'), 'Preserves store MCC');

console.log('\n========================================================');
console.log(`🏁 UPI ENGINE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================\n');

if (failed > 0) process.exit(1);
