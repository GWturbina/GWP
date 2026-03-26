// SafePal deep-link — runs early before DOM
(function() {
  try {
    var ua = navigator.userAgent || '';
    var isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    
    var isSafePalBrowser = 
      ua.includes('SafePal') || 
      ua.includes('safepal') || 
      window.location.href.includes('safepal') ||
      (typeof window.safepal !== 'undefined');
    
    var url = new URL(window.location.href);
    
    if (isSafePalBrowser) {
      console.log('✅ Already in SafePal browser, skip deep-link');
      return;
    }
    
    var shouldDeepLink = isMobile && url.searchParams.get('openInWallet') === '1';

    if (!shouldDeepLink) {
      return;
    }

    console.log('🔗 Triggering SafePal deep-link...');
    
    var currentUrl = window.location.href;
    var encoded = encodeURIComponent(currentUrl);
    var isAndroid = /Android/i.test(ua);
    
    var deepLink = isAndroid
      ? 'safepalwallet://open?url=' + encoded
      : 'https://link.safepal.io/open?url=' + encoded;

    setTimeout(function() {
      window.location.href = deepLink;
    }, 300);

    setTimeout(function() {
      try {
        var storeUrl = isAndroid
          ? 'https://play.google.com/store/apps/details?id=io.safepal.wallet'
          : 'https://apps.apple.com/app/safepal-wallet/id1548297139';
        window.open(storeUrl, '_blank');
      } catch (e) {
        console.warn('Deep-link store redirect error:', e);
      }
    }, 3000);
    
  } catch (e) {
    console.warn('SafePal deep-link error:', e);
  }
})();
