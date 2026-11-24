// The footer's "play offline" hint, on every page. It only appears where its instructions are right:
// - iPhone and iPad: Safari has no install prompt, so it explains Share, then Add to Home Screen.
// - Browsers that offer installing (Chrome, Edge, Samsung Internet): "Install the app to play offline", with
//   "Install the app" as the button that opens their prompt.
// - Anywhere else, or once installed: nothing.

/** Chrome's install prompt event, which isn't in TypeScript's DOM types. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS reports itself as a Mac, so a touch-screen "Mac" counts as an iPad.
const isAppleMobile = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function initInstallHint(hint: HTMLElement): void {
  const text = hint.querySelector<HTMLElement>('[data-install-text]');
  const button = hint.querySelector<HTMLButtonElement>('[data-install-button]');
  if (!text || !button || isInstalled()) return;

  if (isAppleMobile()) {
    text.textContent = 'To play offline, tap Share, then Add to Home Screen.';
    hint.hidden = false;
  }

  let prompt: InstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Hold the browser's own prompt back and offer it from the button instead.
    event.preventDefault();
    prompt = event as InstallPromptEvent;
    text.textContent = ' to play offline.';
    button.hidden = false;
    hint.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // A prompt can only be used once. If they said no, the hint goes until the browser offers it again.
    prompt = null;
    if (outcome !== 'accepted') hint.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    hint.hidden = true;
  });
}
