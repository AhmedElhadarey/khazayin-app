import { decideSuggestion } from '../db/helpers/suggestion';

const NOW = 1747000000000; // arbitrary fixed UTC ms
const DAY_MS = 24 * 60 * 60 * 1000;

describe('decideSuggestion', () => {
  it('returns insufficient_history when fewer than 14 active days', () => {
    const decision = decideSuggestion({
      recentActivePages: [20, 25, 30],
      currentTarget: 10,
      lastSuggestionAtMs: null,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(false);
    expect(decision.reason).toBe('insufficient_history');
  });

  it('returns cooldown when a suggestion was shown < 14 days ago', () => {
    const decision = decideSuggestion({
      recentActivePages: Array(14).fill(30),
      currentTarget: 10,
      lastSuggestionAtMs: NOW - 5 * DAY_MS,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(false);
    expect(decision.reason).toBe('cooldown');
  });

  it('returns below_threshold when median < 1.5× target', () => {
    const decision = decideSuggestion({
      recentActivePages: Array(14).fill(12), // 12 < 1.5*10
      currentTarget: 10,
      lastSuggestionAtMs: null,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(false);
    expect(decision.reason).toBe('below_threshold');
  });

  it('returns eligible with target rounded UP to nearest 5 when median ≥ 1.5×', () => {
    const decision = decideSuggestion({
      recentActivePages: Array(14).fill(17), // 17 ≥ 1.5*10
      currentTarget: 10,
      lastSuggestionAtMs: null,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(true);
    expect(decision.reason).toBe('eligible');
    expect(decision.suggestedTarget).toBe(20); // ceil(17/5)*5
    expect(decision.medianRecentPages).toBe(17);
  });

  it('treats median exactly at threshold as eligible', () => {
    const decision = decideSuggestion({
      recentActivePages: Array(14).fill(15), // 15 == 1.5*10
      currentTarget: 10,
      lastSuggestionAtMs: null,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(true);
    expect(decision.suggestedTarget).toBe(15);
  });

  it('allows re-evaluation after the 14-day cooldown elapses', () => {
    const decision = decideSuggestion({
      recentActivePages: Array(14).fill(20),
      currentTarget: 10,
      lastSuggestionAtMs: NOW - 15 * DAY_MS,
      nowMs: NOW,
    });
    expect(decision.shouldSuggest).toBe(true);
    expect(decision.reason).toBe('eligible');
  });
});
