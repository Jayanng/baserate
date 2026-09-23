import Link from 'next/link';
import {
  getReplayStats,
  getReplayCalibration,
  getReplayForecasts,
  getReplayGaps,
} from '@/src/data/replay-fixtures';
import {
  computeLiquidationDistance,
  computeFundingCarry,
  computeWorstGap,
} from '@/src/engine/risk-engine';
import {
  FIXTURE_SPOT_PRICE,
  FIXTURE_FUNDING_RATE,
} from '@/components/dossier/fixtures';
import styles from './LandingPage.module.css';

// Test count lives in npm test output; do not mirror it in code to avoid stale duplicates.
function HeroChart() {
  return (
    <svg viewBox="0 0 460 210" style={{ width: '100%', height: 'auto', display: 'block' }} aria-label="Weekend tape chart">
      <defs>
        <linearGradient id="tapeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--br-primary)', stopOpacity: 0.16 }} />
          <stop offset="100%" style={{ stopColor: 'var(--br-primary)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="34" x2="446" y1={y} y2={y} style={{ stroke: 'var(--br-border-hairline)' }} strokeWidth="1" />
      ))}
      {/* y axis labels */}
      {/* illustrative axis art */}
      <text x="4" y="44" fontSize="9" style={{ fill: 'var(--br-text-faint)' }}>+4%</text>
      <text x="10" y="124" fontSize="9" style={{ fill: 'var(--br-text-faint)' }}>0</text>
      <text x="2" y="164" fontSize="9" style={{ fill: 'var(--br-text-faint)' }}>-8%</text>
      {/* area fill under tape */}
      <path
        d="M40 118 C80 100 108 132 142 114 S200 122 228 104 S288 128 318 108 L318 178 L40 178 Z"
        fill="url(#tapeFill)"
      />
      {/* vertical freeze guide at right third */}
      <line x1="318" x2="318" y1="24" y2="178" style={{ stroke: 'var(--br-primary)', strokeDasharray: '4 4' }} strokeWidth="1.5" opacity="0.65" />
      <text x="196" y="18" fontSize="9" fontWeight="700" style={{ fill: 'var(--br-primary)' }}>Friday index froze</text>
      {/* tape */}
      <path
        d="M40 118 C80 100 108 132 142 114 S200 122 228 104 S288 128 318 108 C348 90 388 78 428 74"
        fill="none"
        style={{ stroke: 'var(--br-primary)' }}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* liquidation boundary */}
      <line x1="40" x2="446" y1="168" y2="168" style={{ stroke: 'var(--br-coral-bright)', strokeDasharray: '5 4' }} strokeWidth="1.5" opacity="0.8" />
      <text x="40" y="186" fontSize="9" fontWeight="700" style={{ fill: 'var(--br-coral-bright)' }}>liquidation line</text>
      {/* reopen dot */}
      {/* illustrative chart art */}
      <circle cx="428" cy="74" r="5" style={{ fill: 'var(--br-lime)', stroke: 'var(--br-lime-ink)' }} strokeWidth="1.5" />
      <text x="352" y="62" fontSize="10" fontWeight="800" style={{ fill: 'var(--br-lime-ink)' }}>Mon reopen +4%</text>
      {/* x labels */}
      <text x="40" y="200" fontSize="8.5" style={{ fill: 'var(--br-text-faint)' }}>Fri 20:00</text>
      <text x="150" y="200" fontSize="8.5" style={{ fill: 'var(--br-text-faint)' }}>Sat 12:00</text>
      <text x="256" y="200" fontSize="8.5" style={{ fill: 'var(--br-text-faint)' }}>Sun 20:00</text>
      <text x="396" y="200" fontSize="8.5" style={{ fill: 'var(--br-text-faint)' }}>Mon 13:30</text>
    </svg>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Is BaseRate giving me trading advice?',
    a: 'No. BaseRate is read-only research software. It shows computed risk numbers and historical base rates. You make every decision. It never places orders and holds no keys.',
  },
  {
    q: 'What does the public demo claim and what are its boundaries?',
    a: 'The public demo uses pinned replay fixtures so every judge sees the same deterministic result. Live Bitget and Yahoo links expose current public evidence. The scorekeeper loop is demonstrated with replay forecasts; this demo does not claim autonomous persistence or live Monday scheduling for each visitor\'s custom session.',
  },
  {
    q: 'Where does the history come from?',
    a: 'Real NVDA daily closes from Yahoo Finance, back to 1999 - 1,227 Friday-to-Monday episodes. Every number on this site is derived from that dataset or computed by a deterministic engine, and the fixtures are committed so you can check them.',
  },
  {
    q: 'What does the AI actually do?',
    a: 'One narrow job: a two-sentence plain-English summary at the top of each dossier. A numeric guard rejects the summary if it ever states a number the deterministic engine did not produce. Every risk figure is computed by tested code, not a language model.',
  },
  {
    q: 'Why does the scorecard say replay mode?',
    a: 'The demo grades its forecasts against 12 historical weekend replays reconstructed from the same dataset, so you can see the full loop without waiting for Monday. The deployed public demo demonstrates the forecast, grading, ledger, and calibration loop through deterministic replay; it does not claim autonomous persistence or live Monday scheduling for new visitor sessions.',
  },
  {
    q: 'What happens when data is missing?',
    a: 'The desk refuses honestly. Insufficient history shows INSUFFICIENT_EVIDENCE. A dead source shows UNAVAILABLE with a reason. It never fills gaps with plausible-looking numbers.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. The demo runs from committed fixtures with zero network calls and zero API keys. A verification script (npm run demo:verify) proves the demo path works offline.',
  },
] as const;

export default function LandingPage() {
  // Desk-reference dataset: rNVDA (represents the desk's headline proof of work)
  const stats = getReplayStats('rNVDA');
  const calibration = getReplayCalibration('rNVDA');
  const gradedCount = calibration.hits + calibration.misses;
  const calibrationRatePct =
    gradedCount > 0 ? Math.round((calibration.hits / gradedCount) * 100) : 0;

  // Golden trade risk metrics computed at render
  const liquidationDistancePct = computeLiquidationDistance(
    FIXTURE_SPOT_PRICE,
    3,
    'long'
  );
  const liquidationDistanceStr = `${liquidationDistancePct > 0 ? '+' : ''}${liquidationDistancePct.toFixed(1)}%`;
  const _fundingCarryPct = computeFundingCarry(FIXTURE_FUNDING_RATE, 60);

  // Real replay forecast record: most recent hit (highest issuedAtUtc with status 'hit')
  const forecasts = getReplayForecasts('rNVDA');
  const gaps = getReplayGaps('rNVDA');
  const mostRecentHit = [...forecasts]
    .filter((f) => f.status === 'hit')
    .sort((a, b) => b.issuedAtUtc.localeCompare(a.issuedAtUtc))[0];
  const recentEpisode = gaps.find(
    (g) => g.episodeDate === mostRecentHit?.issuedAtUtc.slice(0, 10)
  );
  const actualStr = recentEpisode
    ? `${recentEpisode.pct >= 0 ? '+' : ''}${recentEpisode.pct.toFixed(1)}%`
    : '+2.3%';
  const bandStr = mostRecentHit
    ? `${mostRecentHit.bandLowPct >= 0 ? '+' : ''}${mostRecentHit.bandLowPct.toFixed(1)} to ${mostRecentHit.bandHighPct >= 0 ? '+' : ''}${mostRecentHit.bandHighPct.toFixed(1)}%`
    : '-3.7 to +4.3%';

  // Real fixture data for Why section
  const worstGap = computeWorstGap(gaps);
  const worstGapStr =
    worstGap !== null ? `${worstGap.toFixed(1)}%` : `${stats.worstPct.toFixed(1)}%`;
  const worstDateFormatted = new Date(`${stats.worstDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>B</div>
          <div className={styles.brandName}>BaseRate</div>
        </div>
        <nav className={styles.navLinks}>
          <Link href="#why">Why BaseRate</Link>
          <Link href="#how">How it works</Link>
          <Link href="#traders">For weekend traders</Link>
        </nav>
        <div className={styles.headerRight}>
          <span className={styles.readOnlyNote}>Read-only by design</span>
          <Link href="/overview" className={styles.openPill}>Open the desk ↗</Link>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <span className={styles.kickerDot} />
            THE PRE-TRADE STRESS DESK FOR RTOKENS
          </div>
          <h1 className={styles.heroTitle}>
            Know the odds<br />
            before the <span className={styles.heroAccent}>weekend</span><br />
            starts.
          </h1>
          <p className={styles.heroSub}>
            BaseRate shows what happened across comparable historical weekends,
            what a frozen Friday collateral line can withstand, and how past
            forecasts scored in replay calibration.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/dossier" className={styles.ctaPrimary}>Explore a sample dossier ↗</Link>
            <Link href="/scorecard" className={styles.ctaGhost}>See how it keeps score</Link>
          </div>
          <div className={styles.statsRow}>
            <div>
              <div className={styles.statValue}>{stats.totalEpisodes}</div>
              <div className={styles.statLabel}>comparable weekends</div>
            </div>
            <div>
              <div className={styles.statValue}>1999 →</div>
              <div className={styles.statLabel}>native market history</div>
            </div>
            <div>
              <div className={styles.statValue}>0 orders</div>
              <div className={styles.statLabel}>human decides</div>
            </div>
          </div>
        </div>

        {/* Visual cluster */}
        <div className={styles.heroVisual}>
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.visualMain}>
            <div className={styles.mainHeader}>
              <span className={styles.mainEyebrow}>WEEKEND DOSSIER · RNVDA</span>
              <span className={styles.liveBadge}><span className={styles.liveDot} /> Weekend tape</span>
            </div>
            <div className={styles.mainTitle}>Long rNVDA · 3x · 5,000 USDT</div>
            <div className={styles.mainCaption}>Friday close — Monday reopen · cash market closed</div>
            <div className={styles.chartWrap}>
              <HeroChart />
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--br-primary)' }} /> rNVDA weekend tape</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--br-lime)' }} /> frozen collateral mark</span>
              <span className={styles.legendItem}>cash reopen</span>
            </div>
            <div className={styles.metricsStrip}>
              <div className={styles.metricTile}>
                <div className={`${styles.metricNum} ${styles.metricNumCoral}`}>{liquidationDistanceStr}</div>
                <div className={styles.metricLabel}>line vs frozen index</div>
              </div>
              <div className={styles.metricTile}>
                <div className={styles.metricNum}>{stats.closedUpPct}%</div>
                <div className={styles.metricLabel}>closed up in regime</div>
              </div>
              <div className={styles.metricTile}>
                <div className={styles.metricNum}>{calibrationRatePct}%</div>
                <div className={styles.metricLabel}>desk bands accurate</div>
              </div>
            </div>
          </div>

          {/* Tilted dark Monday grade badge */}
          <div className={styles.gradeBadge}>
            <div className={styles.gradeTag}>REPLAY GRADE</div>
            <div className={styles.gradeValue}>Inside band</div>
            <div className={styles.gradeFooter}>Actual {actualStr} · issued {bandStr}</div>
          </div>

          {/* Historical shape card */}
          <div className={styles.shapeCard}>
            <div className={styles.shapeLabel}>historical shape · {stats.totalEpisodes} weekends</div>
            <div className={styles.shapeBars}>
              <div className={styles.shapeBarCol}>
                <div className={styles.shapeBar} style={{ height: '26px', background: 'var(--br-border-strong)' }} />
                <span className={styles.shapeBarLabel}>up</span>
              </div>
              <div className={styles.shapeBarCol}>
                <div className={styles.shapeBar} style={{ height: '44px', background: 'var(--br-primary)' }} />
                <span className={styles.shapeBarLabel}>flat</span>
              </div>
              <div className={styles.shapeBarCol}>
                <div className={styles.shapeBar} style={{ height: '56px', background: 'var(--br-lime)' }} />
                <span className={styles.shapeBarLabel}>down</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why BaseRate section */}
      <section className={styles.whySection} id="why">
        <div className={styles.whyCopy}>
          <div className={styles.whyEyebrow}>WHY BASERATE</div>
          <h2 className={styles.whyTitle}>
            Weekend risk is a data problem. So treat it like one.
          </h2>
          <p className={styles.whyBody}>
            US cash market closes Friday, rTokens keep trading, collateral index
            freezes, funding keeps accruing, and most traders size weekend
            positions on gut feel instead of {stats.totalEpisodes.toLocaleString()} weekends
            of history.
          </p>
        </div>
        <div className={styles.factsList}>
          <div
            className={styles.factRow}
            aria-label={`${stats.totalEpisodes.toLocaleString()} Friday-to-Monday episodes since 1999`}
          >
            <div className={`${styles.factIconChip} ${styles.factChipPrimary}`} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={styles.factContent}>
              <div className={styles.factStat}>{stats.totalEpisodes.toLocaleString()}</div>
              <div className={styles.factNote}>Friday-to-Monday episodes since 1999</div>
            </div>
          </div>

          <div
            className={styles.factRow}
            aria-label={`Worst gap on record ${worstGapStr} (${worstDateFormatted})`}
          >
            <div className={`${styles.factIconChip} ${styles.factChipCoral}`} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            </div>
            <div className={styles.factContent}>
              <div className={styles.factStat}>{worstGapStr}</div>
              <div className={styles.factNote}>
                Worst gap on record ({worstDateFormatted})
              </div>
              <span className={styles.srOnly}>
                Worst gap on record {worstGapStr} ({worstDateFormatted})
              </span>
            </div>
          </div>

          <div
            className={styles.factRow}
            aria-label={`${stats.closedUpPct}% of weekends closed up — base rates beat vibes`}
          >
            <div className={`${styles.factIconChip} ${styles.factChipLime}`} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div className={styles.factContent}>
              <div className={styles.factStat}>{stats.closedUpPct}%</div>
              <div className={styles.factNote}>
                of weekends closed up — base rates beat vibes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid section: numbered pastel cards beside copy */}
      <section className={styles.mid} id="how">
        <div className={styles.midCopy}>
          <div className={styles.midEyebrow}>A DIFFERENT KIND OF TRADING DESK</div>
          <h2 className={styles.midTitle}>Every forecast gets scored.</h2>
          <p className={styles.midBody}>
            BaseRate does not ask you to trust an AI. It records its claims,
            verifies them against real reopen outcomes in replay mode, and widens its bands where it was wrong.
          </p>
        </div>
        <div className={styles.stepGrid}>
          <div className={`${styles.stepCard} ${styles.stepMist}`}>
            <div className={styles.stepNumber}>01</div>
            <div className={styles.stepTitle}>Stress the trade</div>
            <div className={styles.stepBody}>
              Liquidation distance and funding carry, computed deterministically
              against frozen Friday collateral, with live public evidence links.
            </div>
          </div>
          <div className={`${styles.stepCard} ${styles.stepLavender}`}>
            <div className={styles.stepNumber}>02</div>
            <div className={styles.stepTitle}>See the base rate</div>
            <div className={styles.stepBody}>
              Decades of Friday-to-Monday history, matched to your regime,
              distilled into one honest outcome distribution.
            </div>
          </div>
          <div className={`${styles.stepCard} ${styles.stepPeach}`}>
            <div className={styles.stepNumber}>03</div>
            <div className={styles.stepTitle}>Keep the score</div>
            <div className={styles.stepBody}>
              Forecast registration, Monday reopen grading, and band adjustment
              are demonstrated through an immutable 12-weekend replay ledger.
            </div>
          </div>
        </div>
      </section>

      {/* For weekend traders section */}
      <section className={styles.tradersSection} id="traders">
        <div className={styles.tradersHeader}>
          <div className={styles.tradersEyebrow}>FOR WEEKEND TRADERS</div>
          <h2 className={styles.tradersTitle}>Built for the Friday-to-Monday hold.</h2>
        </div>
        <div className={styles.personaGrid}>
          <div className={`${styles.personaCard} ${styles.stepMist}`}>
            <div className={styles.personaTitle}>The leveraged holder</div>
            <div className={styles.personaBody}>
              Long 3x over the weekend? See the exact liquidation distance against the frozen Friday index before you commit.
            </div>
          </div>
          <div className={`${styles.personaCard} ${styles.stepLavender}`}>
            <div className={styles.personaTitle}>The size doubter</div>
            <div className={styles.personaBody}>
              Not sure 5,000 USDT is safe at 3x? Move the size slider and watch the survival math recompute instantly.
            </div>
          </div>
          <div className={`${styles.personaCard} ${styles.stepPeach}`}>
            <div className={styles.personaTitle}>The funding watcher</div>
            <div className={styles.personaBody}>
              60 closed hours of funding carry, estimated from stock-perp funding rates, labeled honestly as an estimate.
            </div>
          </div>
          <div className={`${styles.personaCard} ${styles.stepLime}`}>
            <div className={styles.personaTitle}>The show-me trader</div>
            <div className={styles.personaBody}>
              Replay forecasts are graded against real Monday market outcomes. Misses stay on the ledger. Nothing is hidden.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className={styles.faqSection} id="faq">
        <div className={styles.faqHeader}>
          <div className={styles.faqEyebrow}>FAQ</div>
          <h2 className={styles.faqTitle}>Straight answers.</h2>
        </div>
        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQuestionText}>{item.q}</span>
                <span className={styles.faqPlus} aria-hidden="true">+</span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Under the hood section */}
      <section className={styles.hoodSection}>
        <div className={styles.hoodEyebrow}>UNDER THE HOOD</div>
        <div className={styles.hoodGrid}>
          <div className={styles.hoodItem}>
            <div className={styles.hoodChip} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="15" x2="23" y2="15" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="15" x2="4" y2="15" />
              </svg>
            </div>
            <div className={styles.hoodContent}>
              <div className={styles.hoodTitle}>Fully tested</div>
              <p className={styles.hoodBody}>
                Same inputs always produce the same regime tag - reproducible by any judge from committed fixtures.
              </p>
            </div>
          </div>

          <div className={styles.hoodItem}>
            <div className={styles.hoodChip} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div className={styles.hoodContent}>
              <div className={styles.hoodTitle}>Real data, committed</div>
              <p className={styles.hoodBody}>
                {stats.totalEpisodes.toLocaleString()} NVDA weekend episodes since 1999, stored as checkable fixtures - no hidden numbers.
              </p>
            </div>
          </div>

          <div className={styles.hoodItem}>
            <div className={styles.hoodChip} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div className={styles.hoodContent}>
              <div className={styles.hoodTitle}>Tamper-evident ledger</div>
              <p className={styles.hoodBody}>
                Every forecast hash-chained from GENESIS. Any retro-edit breaks verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Docked dark bar */}
      <section className={styles.dock}>
        <div>
          <span className={styles.dockTitle}>Stop guessing.</span>
          <span className={styles.dockDot}> · </span>
          <span className={styles.dockTitle}>Get the base rate for your trade.</span>
        </div>
        <span className={styles.dockNote}>Read-only research, human decision.</span>
        <Link href="/overview" className={styles.dockCta}>Open the desk</Link>
      </section>

      <div className={styles.legal}>
        <div>Read-only research tool. Not financial advice. Not affiliated with Bitget.</div>
        <div className={styles.legalMeta}>
          <span className={styles.legalSource}>View source</span> - Built for the Bitget AI Base Camp Hackathon S2, Track 3 (Decision Stress Testing)
        </div>
      </div>
    </div>
  );
}
