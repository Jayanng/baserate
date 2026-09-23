import { describe, it, expect } from 'vitest';
import {
  findComparableEpisodes,
  computeDistribution,
  type RegimeEpisodeInput,
} from '@/src/engine/base-rate';

describe('base-rate engine', () => {
  describe('computeDistribution', () => {
    it('distribution with 100 episodes sums to 100%', () => {
      // 100 episodes spanning all 5 categories
      const episodes: Array<{ pct: number; episodeDate: string }> = [
        ...Array.from({ length: 30 }, (_, i) => ({
          pct: 2.5 + i * 0.1,
          episodeDate: `2025-01-${String(i + 1).padStart(2, '0')}`,
        })), // Closed up (> 1)
        ...Array.from({ length: 25 }, (_, i) => ({
          pct: -0.5 + (i % 2) * 0.8,
          episodeDate: `2025-02-${String(i + 1).padStart(2, '0')}`,
        })), // Flat ([-1, 1])
        ...Array.from({ length: 20 }, (_, i) => ({
          pct: -2.5 - (i % 3) * 0.5,
          episodeDate: `2025-03-${String(i + 1).padStart(2, '0')}`,
        })), // Down 1-5% ((-5, -1))
        ...Array.from({ length: 15 }, (_, i) => ({
          pct: -7.0 - (i % 4) * 1.5,
          episodeDate: `2025-04-${String(i + 1).padStart(2, '0')}`,
        })), // Down >5% ((-15, -5])
        ...Array.from({ length: 10 }, (_, i) => ({
          pct: -16.0 - i * 0.5,
          episodeDate: `2025-05-${String(i + 1).padStart(2, '0')}`,
        })), // Gap thru liq (<= -15)
      ];

      expect(episodes).toHaveLength(100);

      const dist = computeDistribution(episodes);
      expect(dist).not.toBeNull();

      if (dist) {
        expect(dist.sampleSize).toBe(100);

        // Sum of category percentages must equal exactly 100
        const totalPct = dist.categories.reduce((acc, c) => acc + c.pct, 0);
        expect(totalPct).toBe(100);

        // Check category count integrity
        const totalCount = dist.categories.reduce((acc, c) => acc + c.count, 0);
        expect(totalCount).toBe(100);

        // Check worst episode
        expect(dist.worstNext5dPct).toBe(-20.5);
        expect(dist.worstEpisodeDate).toBe('2025-05-10');

        // Check median is populated
        expect(dist.medianNext5dPct).not.toBeNull();
      }
    });

    it('percentages sum to 100 with odd sample sizes (e.g. 7 episodes)', () => {
      const episodes = [
        { pct: 5.0 },
        { pct: 0.2 },
        { pct: -0.1 },
        { pct: -2.4 },
        { pct: -7.1 },
        { pct: -16.5 },
        { pct: 3.1 },
      ];

      const dist = computeDistribution(episodes);
      expect(dist).not.toBeNull();

      if (dist) {
        expect(dist.sampleSize).toBe(7);
        const totalPct = dist.categories.reduce((acc, c) => acc + c.pct, 0);
        expect(totalPct).toBe(100);
      }
    });

    it('returns null when fewer than 5 episodes (fewer than 5 episodes returns null)', () => {
      expect(computeDistribution([])).toBeNull();
      expect(computeDistribution([{ pct: 1.0 }])).toBeNull();
      expect(computeDistribution([{ pct: 1 }, { pct: -2 }, { pct: 3 }])).toBeNull();
      expect(
        computeDistribution([{ pct: 1 }, { pct: -1 }, { pct: 2 }, { pct: -2 }])
      ).toBeNull();
    });
  });

  describe('findComparableEpisodes', () => {
    const allGaps: RegimeEpisodeInput[] = [
      ...Array.from({ length: 12 }, (_, i) => ({
        pct: 2.0 + i * 0.1,
        episodeDate: `2025-01-${String(i + 1).padStart(2, '0')}`,
        regime: 'trend_up' as const,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        pct: -2.0 - i * 0.1,
        episodeDate: `2025-02-${String(i + 1).padStart(2, '0')}`,
        regime: 'trend_down' as const,
      })),
    ];

    it('regime filtering works when matches >= 10', () => {
      const fallbackGaps = [{ pct: 0, episodeDate: 'fallback' }];
      const matched = findComparableEpisodes(fallbackGaps, 'trend_up', allGaps);

      // 'trend_up' has 12 matches (>= 10)
      expect(matched).toHaveLength(12);
      expect(matched[0]?.pct).toBe(2.0);
    });

    it('falls back to all episodes when regime has < 10 matches (fallback to all when regime has < 10 matches)', () => {
      const fallbackGaps = [{ pct: 0, episodeDate: 'fallback' }];
      // 'trend_down' only has 6 matches (< 10)
      const matched = findComparableEpisodes(fallbackGaps, 'trend_down', allGaps);

      // Falls back to all 18 episodes in allGaps
      expect(matched).toHaveLength(18);
    });

    it('falls back to default gaps when allGaps is empty or undefined', () => {
      const defaultGaps = [
        { pct: 1.5, episodeDate: '2025-03-01' },
        { pct: -3.2, episodeDate: '2025-03-08' },
      ];
      const matched = findComparableEpisodes(defaultGaps, 'chop', []);
      expect(matched).toEqual(defaultGaps);
    });
  });
});
