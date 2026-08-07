const STORAGE_KEY = 'bannercanva-welcome-seen-v1';

/** Whether the welcome page has already been dismissed in this browser. */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // Storage blocked — treat as seen so the page can't reappear every load.
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* noop */
  }
}
