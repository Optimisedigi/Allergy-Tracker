// Register Service Worker for PWA functionality
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ PWA: Service Worker registered successfully:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.log('❌ PWA: Service Worker registration failed:', error);
        });
    });
  }
}

// Detect if app is installed as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Get install prompt event for custom install UI
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Save the event for later use
  deferredPrompt = e;
  // Dispatch custom event that components can listen to
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

export function showInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!deferredPrompt) {
      resolve(false);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ PWA: User accepted the install prompt');
        resolve(true);
      } else {
        console.log('❌ PWA: User dismissed the install prompt');
        resolve(false);
      }
      deferredPrompt = null;
    });
  });
}

export function canShowInstallPrompt(): boolean {
  return deferredPrompt !== null && !isPWA();
}
