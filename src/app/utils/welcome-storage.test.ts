import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasSeenWelcome, markWelcomeSeen } from './welcome-storage';

describe('welcome storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reports unseen on a fresh browser, then seen once dismissed', () => {
    expect(hasSeenWelcome()).toBe(false);
    markWelcomeSeen();
    expect(hasSeenWelcome()).toBe(true);
  });

  it('treats blocked storage as seen so the page cannot reappear on every load', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(hasSeenWelcome()).toBe(true);
  });

  it('does not throw when storage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => markWelcomeSeen()).not.toThrow();
  });
});
