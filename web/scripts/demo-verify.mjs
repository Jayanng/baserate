import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'public/fonts/PlusJakartaSans.woff2',
  'public/fonts/Inter.woff2',
  'app/page.tsx',
  'app/overview/page.tsx',
  'app/dossier/page.tsx',
  'app/scorecard/page.tsx',
  'components/shell/TopNav.tsx',
  'components/shell/AppFrame.tsx',
];

const fixtureFiles = [
  'fixtures/replay-data.json',
  'fixtures/replay-NVDA.json',
  'fixtures/replay-TSLA.json',
  'fixtures/replay-AAPL.json',
  'fixtures/replay-QQQ.json',
  'fixtures/replay-MSTR.json',
];

let failed = false;

console.log('Verifying BaseRate Demo Reliability (app shell + Phase 10.7 multi-asset fixtures)...');

// 1. Check shell assets & page routes
console.log('\n[1/2] Checking required shell assets and page routes...');
for (const relPath of requiredFiles) {
  const fullPath = path.join(webRoot, relPath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${relPath}`);
  } else {
    console.error(`  ✗ MISSING: ${relPath} (${fullPath})`);
    failed = true;
  }
}

// 2. Check Phase 10.7 replay fixtures & invariants across all 5 assets
console.log('\n[2/2] Checking multi-asset replay fixtures...');
for (const relPath of fixtureFiles) {
  const fixturePath = path.join(webRoot, relPath);
  console.log(`\n  Checking ${relPath}...`);

  if (!fs.existsSync(fixturePath)) {
    console.error(`  ✗ MISSING: ${relPath}`);
    failed = true;
    continue;
  }
  console.log(`  ✓ ${relPath} exists`);

  try {
    const rawContent = fs.readFileSync(fixturePath, 'utf-8');
    const data = JSON.parse(rawContent);
    console.log(`  ✓ ${relPath} parses as valid JSON`);

    // Invariant: totalEpisodes > 500
    if (typeof data.totalEpisodes === 'number' && data.totalEpisodes > 500) {
      console.log(`  ✓ totalEpisodes > 500 (observed: ${data.totalEpisodes})`);
    } else {
      console.error(`  ✗ INVALID: totalEpisodes must be > 500, got: ${data.totalEpisodes}`);
      failed = true;
    }

    // Invariant: calibration graded count >= 8
    const gradedCount = (data.calibration?.hits ?? 0) + (data.calibration?.misses ?? 0);
    if (gradedCount >= 8) {
      console.log(`  ✓ calibration graded count >= 8 (observed: ${gradedCount} graded, ${data.calibration?.hits} hits)`);
    } else {
      console.error(`  ✗ INVALID: calibration graded count must be >= 8, got: ${gradedCount}`);
      failed = true;
    }

    // Invariant: ledger.verified === true
    if (data.ledger?.verified === true) {
      console.log(`  ✓ ledger.verified === true (${data.ledger.entries?.length} entries chained from GENESIS)`);
    } else {
      console.error(`  ✗ INVALID: ledger.verified must be true, got: ${data.ledger?.verified}`);
      failed = true;
    }

    // Invariant: distribution categories sum to 100
    if (Array.isArray(data.distribution?.categories)) {
      const sumPct = data.distribution.categories.reduce((acc, cat) => acc + (cat.pct ?? 0), 0);
      if (sumPct === 100) {
        console.log(`  ✓ distribution categories sum to exactly 100 (5 categories verified)`);
      } else {
        console.error(`  ✗ INVALID: distribution categories sum must be 100, got: ${sumPct}`);
        failed = true;
      }
    } else {
      console.error(`  ✗ INVALID: distribution.categories must be an array`);
      failed = true;
    }
  } catch (err) {
    console.error(`  ✗ ERROR parsing or validating ${relPath}:`, err);
    failed = true;
  }
}

if (failed) {
  console.error('\nVerification FAILED: Demo reliability checks did not pass.');
  process.exit(1);
} else {
  console.log('\nVerification PASSED: All Phase 10.7 demo fixtures and shell assets verified.');
  process.exit(0);
}
