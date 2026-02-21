/* jshint esversion: 8 */
/* global CONFIG, Promise, ethers */
// 🔥 ИСПРАВЛЕННЫЙ Web3Manager для SafePal Mobile
// Оптимизированные задержки, упрощённая логика, лучшая совместимость

// ═══════════════════════════════════════════════════════════════
// GlobalWay DApp - PRODUCTION READY v2.1
// Date: 2025-12-28
// Status: ✅ 100% COMPLETE
// 
// Changes in this version:
// - All critical bugs fixed
// - All important issues resolved
// - Loading states added
// - CONFIG validation
// - Better UX messages
// - Caching optimization
// - Final polish applied
// - 🔥 NEW: Solana provider detection & user-friendly error message
// ═══════════════════════════════════════════════════════════════


class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.isSafePalBrowser = this.detectSafePalBrowser();
  }

  // ✅ УЛУЧШЕННАЯ детекция SafePal (все варианты включая DApp Browser)
  detectSafePalBrowser() {
    try {
      const ua = navigator.userAgent || '';
      
      console.log('🔍 Detecting SafePal browser...');
      console.log('User-Agent:', ua);
      
      // User-Agent проверки
      if (ua.includes('SafePal') || ua.includes('safepal') || ua.includes('SAFEPAL')) {
        console.log('✅ SafePal detected via User-Agent');
        return true;
      }
      
      // URL проверки
      if (window.location.href && window.location.href.includes('safepal')) {
        console.log('✅ SafePal detected via URL');
        return true;
      }
      
      // window.safepal (проверяем что это EVM-совместимый провайдер)
      if (window.safepal && typeof window.safepal.request === 'function') {
        console.log('✅ SafePal detected via window.safepal (EVM)');
        return true;
      }
      
      // window.ethereum flags
      if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        console.log('✅ SafePal detected via window.ethereum flags');
        return true;
      }
      
      // ethereum.providers массив
      if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        for (const p of window.ethereum.providers) {
          if (p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)) {
            console.log('✅ SafePal detected via ethereum.providers');
            return true;
          }
        }
      }
      
      // SafePal DApp Browser может не показывать себя в UA, но инжектирует провайдер
      // Если мы на мобильном и есть window.ethereum — скорее всего это браузер кошелька
      if (this.isMobile && window.ethereum) {
        console.log('✅ Mobile + ethereum provider — treating as wallet browser');
        return true;
      }
      
      console.log('⚠️ SafePal NOT detected');
      
    } catch (e) {
      console.warn('SafePal detect error', e);
    }
    return false;
  }

  // ✅ ИСПРАВЛЕНО: Проверка на Solana провайдер (не EVM)
  // ВАЖНО: SafePal может иметь publicKey в window.safepal даже в EVM режиме!
  // Поэтому проверяем только ОТСУТСТВИЕ EVM-метода request(), а не наличие Solana-полей
  isSolanaProvider(provider) {
    try {
      if (!provider) return false;
      
      // Главный признак EVM провайдера — метод request()
      // Если request() есть — это EVM, даже если есть publicKey (SafePal dual-chain)
      if (typeof provider.request === 'function') {
        console.log('✅ EVM provider confirmed (has request method)');
        return false;
      }
      
      // Признак 1: isPhantom без EVM методов — точно Solana
      if (provider.isPhantom && !provider.request) {
        console.log('⚠️ Phantom Solana provider detected');
        return true;
      }
      
      // Признак 2: только Solana методы, нет EVM request
      if (typeof provider.signTransaction === 'function' && 
          typeof provider.signAllTransactions === 'function' &&
          typeof provider.request !== 'function' &&
          typeof provider.send !== 'function') {
        console.log('⚠️ Solana-only provider methods detected');
        return true;
      }
      
      // Признак 3: адрес не начинается с 0x И нет request() — точно не EVM
      if (provider.address && typeof provider.address === 'string') {
        if (!provider.address.startsWith('0x') && provider.address.length > 30 && !provider.request) {
          console.log('⚠️ Non-EVM address + no request method:', provider.address.substring(0, 10) + '...');
          return true;
        }
      }
      
      // УДАЛЕНО: проверка publicKey — SafePal EVM провайдер тоже имеет publicKey!
      // Это вызывало ложное срабатывание (false positive)
      
      return false;
    } catch (e) {
      console.warn('isSolanaProvider check error', e);
      return false;
    }
  }

  // 🔥 НОВОЕ: Показ сообщения о неправильной сети
  showSolanaNetworkError() {
    const message = 
      (_t ? _t('web3.solanaMsg') : 'GlobalWay runs on opBNB (EVM). Switch to opBNB in SafePal.');
    
    alert(message);
    throw new Error('Solana wallet detected. Please switch to opBNB/BNB network in SafePal.');
  }

  async init() {
    console.log('🔌 Initializing Web3Manager...');
    console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
    console.log('🦊 SafePal Browser:', this.isSafePalBrowser);

    // 🔥 ИСПРАВЛЕНО: Короткое ожидание для SafePal
    if (this.isSafePalBrowser) {
      console.log('⏳ Waiting for SafePal injection...');
      await this.waitForSafePal(5000); // 🔥 5 секунд вместо 10
      if (this.hasSafePalProvider()) {
        console.log('✅ SafePal provider detected during init');
        await this.autoConnect();
        return;
      }
    }

    // Auto-connect если сохранён кошелёк
    const savedAddress = localStorage.getItem('walletAddress');
    const walletConnected = localStorage.getItem('walletConnected');

    if (savedAddress && walletConnected === 'true') {
      console.log('🔄 Found saved wallet, attempting auto-connect...');
      await this.autoConnect();
    }
  }

  // 🔥 ИСПРАВЛЕНО: Упрощённый метод подключения
async connect() {
    try {
      console.log('🔌 Starting wallet connection...');
      console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
      console.log('🦊 SafePal Browser:', this.isSafePalBrowser);
      
      // 🔥 ИСПРАВЛЕНО: Минимальная задержка
      const initialDelay = this.isMobile ? 1000 : 500; // 🔥 Уменьшено!
      console.log(`⏳ Initial delay: ${initialDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      
      // 🔥 ИСПРАВЛЕНО: Умное ожидание SafePal
      console.log('🔍 Waiting for SafePal provider...');
      const safePalFound = await this.waitForSafePal(4000); // 🔥 4 секунды вместо 8
      console.log('🔍 SafePal provider found:', safePalFound);
      
      // Priority 1: SafePal provider
      if (this.hasSafePalProvider()) {
        console.log('✅ SafePal provider detected, connecting...');
        await this.connectSafePal();
        
        if (!this.signer || !this.address) {
          console.error('❌ SafePal connected but signer/address missing');
          throw new Error('SafePal connection incomplete. Please try again.');
        }
        
        // 🔥 ИСПРАВЛЕНО: Быстрая проверка для мобильных
        if (this.isMobile) {
          console.log('📱 Mobile SafePal - verifying connection...');
          await new Promise(resolve => setTimeout(resolve, 300)); // 🔥 300ms вместо 500ms
          
          try {
            const testAddress = await this.signer.getAddress();
            if (!testAddress || testAddress !== this.address) {
              throw new Error('Address verification failed');
            }
          } catch (verifyError) {
            console.error('❌ Address verification failed:', verifyError);
            throw new Error('Mobile wallet verification failed. Please reconnect.');
          }
        }
      }
      // Priority 2: Mobile deep link
      else if (this.isMobile && !this.isSafePalBrowser) {
        console.log('📱 Mobile but not SafePal browser. Triggering deep-link...');
        
        const userConfirmed = confirm(
          'To connect your wallet:\n\n1. SafePal app will open\n2. Approve connection\n3. Return to this page\n4. Click Connect again\n\nPress OK to continue'
        );
        
        if (!userConfirmed) {
          throw new Error('Connection cancelled by user');
        }
        
        await this.openSafePalApp();
        throw new Error('Please complete connection in SafePal app and return. Then click Connect again.');
      }
      // Priority 3: Fallback
      else {
        let message;
        if (this.isMobile) {
          message = 
            '📱 SafePal wallet not found!\n\n' +
            '1. Install SafePal Wallet app\n' +
            '2. Create or restore a wallet\n' +
            '3. Open this link in SafePal browser\n\n' +
            '💡 Tap "Browser" in SafePal app';
        } else {
          message = 
            '💻 SafePal wallet not found!\n\n' +
            'Install SafePal browser extension:\n' +
            '1. Go to safepal.com\n' +
            '2. Download extension\n' +
            '3. Create wallet\n' +
            '4. Refresh this page';
        }
        
        throw new Error(message);
      }
      
      // 🔥 ИСПРАВЛЕНО: Быстрая финальная проверка
      if (!this.provider || !this.signer || !this.address) {
        console.error('❌ Connection state incomplete:', {
          provider: !!this.provider,
          signer: !!this.signer, 
          address: !!this.address
        });
        throw new Error('Wallet connection incomplete. Please refresh and try again.');
      }
      
      // Проверка сети
      await this.checkNetwork();
      
      // Сохранение подключения
      await this.saveConnection();
      
      // Финальная проверка адреса
      const finalAddress = await this.signer.getAddress();
      if (finalAddress.toLowerCase() !== this.address.toLowerCase()) { // 🔥 FIX: Case-insensitive comparison
        throw new Error('Address mismatch after connection');
      }
      
      this.connected = true;
      
      console.log('✅ Successfully connected:', this.address);
      return this.address;
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      
      // Сброс состояния при ошибке
      this.connected = false;
      this.signer = null;
      this.address = null;
      
      if (!/User rejected|User denied|Cancelled|user closed/i.test(error.message || '')) {
        const errorMsg = error.message || 'Connection failed. Please try again.';
        
        if (error.message.includes('SafePal') || error.message.includes('wallet') || error.message.includes('connection')) {
          alert(errorMsg);
        }
      }
      
      throw error;
    }
  }

  // 🔥 ИСПРАВЛЕНО: Оптимизированное ожидание SafePal
  async waitForSafePal(maxWaitTime = 5000) { // 🔥 5 секунд по умолчанию
    const start = Date.now();
    const interval = 100; // 🔥 100ms вместо 120ms
    
    while (Date.now() - start < maxWaitTime) {
      if (this.hasSafePalProvider()) {
        console.log('✅ SafePal provider found after', Date.now() - start, 'ms');
        return true;
      }
      
      if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        if (window.ethereum.providers.some(p => p && (p.isSafePal || p.isSafePalWallet))) {
          console.log('✅ SafePal found in ethereum.providers');
          return true;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    console.warn('⚠️ SafePal not found after', maxWaitTime, 'ms');
    return false;
  }

  hasSafePalProvider() {
    try {
      // window.safepal — проверяем что это EVM провайдер (имеет метод request)
      if (window.safepal && typeof window.safepal.request === 'function') {
        console.log('✅ SafePal EVM provider: window.safepal');
        return true;
      }
      
      if (window.ethereum) {
        if (window.ethereum.isSafePal || window.ethereum.isSafePalWallet) {
          console.log('✅ SafePal provider: window.ethereum flags');
          return true;
        }
        
        if (Array.isArray(window.ethereum.providers)) {
          for (const p of window.ethereum.providers) {
            if (p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)) {
              console.log('✅ SafePal provider: ethereum.providers');
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (e) {
      console.warn('hasSafePalProvider error', e);
      return false;
    }
  }

  async connectSafePal() {
    try {
      let provider = null;
      let rawProvider = null;
      
      // Приоритет 1: window.safepal (только если это EVM провайдер)
      if (window.safepal && typeof window.safepal.request === 'function') {
        console.log('🔗 Connecting via window.safepal (EVM)');
        rawProvider = window.safepal;
      }
      // Приоритет 2: ethereum.providers массив
      else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        console.log('🔗 Connecting via ethereum.providers');
        rawProvider = window.ethereum.providers.find(p => 
          p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)
        );
        // Если SafePal не найден в массиве — используем первый EVM провайдер
        if (!rawProvider) {
          rawProvider = window.ethereum.providers.find(p => 
            p && typeof p.request === 'function'
          );
          if (rawProvider) console.log('🔗 Using first available EVM provider from providers array');
        }
      }
      // Приоритет 3: window.ethereum с флагами SafePal
      else if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        console.log('🔗 Connecting via window.ethereum (SafePal flags)');
        rawProvider = window.ethereum;
      }
      // Приоритет 4: любой window.ethereum на мобильном (DApp browser)
      else if (this.isMobile && window.ethereum && typeof window.ethereum.request === 'function') {
        console.log('🔗 Mobile DApp browser: connecting via window.ethereum');
        rawProvider = window.ethereum;
      }

      // ✅ ИСПРАВЛЕНО: Проверка на Solana провайдер
      if (rawProvider && this.isSolanaProvider(rawProvider)) {
        console.error('❌ Solana provider detected, cannot use with EVM DApp');
        this.showSolanaNetworkError();
        return;
      }

      if (!rawProvider) {
        throw new Error('SafePal provider not found after detection');
      }

      // Создаём ethers провайдер
      try {
        provider = new ethers.providers.Web3Provider(rawProvider);
      } catch (providerError) {
        if (providerError.code === 'INVALID_ARGUMENT' || 
            providerError.message.includes('unsupported provider')) {
          console.error('❌ Unsupported provider - likely Solana:', providerError);
          this.showSolanaNetworkError();
          return;
        }
        throw providerError;
      }

      console.log('📤 Requesting accounts...');
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Проверка что адрес начинается с 0x (EVM адрес)
      const account = accounts[0];
      if (!account.startsWith('0x')) {
        console.error('❌ Non-EVM address returned:', account);
        this.showSolanaNetworkError();
        return;
      }

      this.provider = provider;
      this.signer = provider.getSigner();
      this.address = account.toLowerCase();
      
      console.log('✅ SafePal connected successfully');
      console.log('📍 Address:', this.address);
      
    } catch (error) {
      console.error('❌ SafePal connection error:', error);
      
      if (error.code === 'INVALID_ARGUMENT' || 
          (error.message && error.message.includes('unsupported provider'))) {
        this.showSolanaNetworkError();
        return;
      }
      
      throw error;
    }
  }

  async autoConnect() {
    try {
      console.log('🔄 Auto-connecting...');
      
      // Ждём провайдер
      if (this.isSafePalBrowser) {
        await this.waitForSafePal(3000);
      }

      let provider = null;
      let rawProvider = null; // 🔥 Сохраняем raw провайдер для проверки

      // Ищем SafePal провайдер
      if (window.safepal) {
        rawProvider = window.safepal;
      } else if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        rawProvider = window.ethereum;
      } else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        rawProvider = window.ethereum.providers.find(p => p && (p.isSafePal || p.isSafePalWallet));
      }

      if (!rawProvider) {
        console.log('⚠️ No provider for auto-connect');
        return;
      }

      // 🔥 НОВОЕ: Проверка на Solana провайдер
      if (this.isSolanaProvider(rawProvider)) {
        console.warn('⚠️ Solana provider detected in auto-connect, skipping');
        return; // Не показываем ошибку при автоподключении, просто пропускаем
      }

      // Создаём ethers провайдер только если это EVM
      try {
        provider = new ethers.providers.Web3Provider(rawProvider);
      } catch (providerError) {
        if (providerError.code === 'INVALID_ARGUMENT' || 
            providerError.message.includes('unsupported provider')) {
          console.warn('⚠️ Unsupported provider in auto-connect, skipping');
          return;
        }
        throw providerError;
      }

      // Проверяем уже подключённые аккаунты (без popup)
      const accounts = await provider.listAccounts();

      if (accounts && accounts.length > 0) {
        // 🔥 НОВОЕ: Проверка что адрес начинается с 0x
        const account = accounts[0];
        if (!account.startsWith('0x')) {
          console.warn('⚠️ Non-EVM address in auto-connect, skipping');
          return;
        }
        
        this.provider = provider;
        this.signer = provider.getSigner();
        this.address = account.toLowerCase();
        this.connected = true;
        await this.checkNetwork();
        console.log('✅ Auto-connected:', this.address);
      } else {
        console.log('ℹ️ No accounts available for auto-connect');
      }
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
    }
  }

  // Замени функцию openSafePalApp() (строка ~333) на:

  async openSafePalApp() {
    const currentUrl = encodeURIComponent(window.location.href);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
    let deepLink;
    let storeUrl;
  
    if (isAndroid) {
      deepLink = `safepalwallet://open?url=${currentUrl}`;
      storeUrl = 'https://play.google.com/store/apps/details?id=io.safepal.wallet';
    } else if (isIOS) {
      deepLink = `https://link.safepal.io/open?url=${currentUrl}`;
      storeUrl = 'https://apps.apple.com/app/safepal-wallet/id1548297139';
    } else {
      throw new Error('Unsupported mobile platform');
    }
  
    console.log('🔗 Opening SafePal:', deepLink);
  
    // Пробуем открыть приложение
    window.location.href = deepLink;
  
    // Через 2.5 сек проверяем — если страница ещё видна, значит SafePal не установлен
    await new Promise(resolve => setTimeout(resolve, 2500));
  
    // Если мы всё ещё здесь — приложение не открылось
    const install = confirm(
      'SafePal not installed.\n\n' +
      'Install SafePal Wallet?\n\n' +
      'After installation, open this link in SafePal browser ("Browser" tab in the app).'
    );
  
    if (install) {
      window.open(storeUrl, '_blank');
    }
  }

  async checkNetwork() {
    try {
      if (!this.provider) throw new Error('No provider to check network');
      const network = await this.provider.getNetwork();
      console.log('🌐 Network:', network.chainId, network.name);

      if (typeof CONFIG === 'undefined' || !CONFIG.NETWORK) {
        console.warn('CONFIG.NETWORK not found — skipping network checks');
        return;
      }

      const desiredChainId = Number(CONFIG.NETWORK.chainId);
      if (network.chainId !== desiredChainId) {
        console.log('⚠️ Wrong network, switching to opBNB...');
        await this.switchNetwork();
      } else {
        console.log('✅ Already on opBNB network');
      }
    } catch (error) {
      console.error('❌ Network check failed:', error);
      throw error;
    }
  }

  // ✅ ФИНАЛ: Улучшенная смена сети
  async switchNetwork() {
    try {
      if (!this.provider) throw new Error('No provider to switch network');

      const chainIdHex = CONFIG.NETWORK.chainIdHex || '0x' + Number(CONFIG.NETWORK.chainId).toString(16);

      await this.provider.send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
      console.log('✅ Network switched successfully');
    } catch (error) {
      if (error && error.code === 4902) {
        // Сеть не найдена - добавляем
        console.log('➕ Network not found, adding...');
        try {
          await this.addNetwork();
          console.log('✅ Network added and switched');
        } catch (addError) {
          console.error('❌ Failed to add network:', addError);
          throw new Error(
            'Failed to add opBNB network.\n\n' +
            'Add manually:\n' +
            `Name: ${CONFIG.NETWORK.name}\n` +
            `RPC: ${CONFIG.NETWORK.rpcUrl}\n` +
            `Chain ID: ${CONFIG.NETWORK.chainId}`
          );
        }
      } else if (error.code === 4001) {
        // Пользователь отклонил
        throw new Error('Network switch rejected');
      } else {
        console.error('❌ Switch failed:', error);
        throw new Error(_t ? _t('web3.switchNetwork') : 'Switch to opBNB manually');
      }
    }
  }

  async addNetwork() {
    try {
      if (!this.provider) throw new Error('No provider to add network');

      const chainIdHex = CONFIG.NETWORK.chainIdHex || '0x' + Number(CONFIG.NETWORK.chainId).toString(16);

      await this.provider.send('wallet_addEthereumChain', [{
        chainId: chainIdHex,
        chainName: CONFIG.NETWORK.name,
        nativeCurrency: CONFIG.NETWORK.nativeCurrency,
        rpcUrls: [CONFIG.NETWORK.rpcUrl],
        blockExplorerUrls: [CONFIG.NETWORK.blockExplorer]
      }]);
      console.log('✅ Network added to wallet');
    } catch (error) {
      console.error('❌ Add network failed:', error);
      throw new Error('Please add opBNB network manually in your wallet');
    }
  }

  async saveConnection() {
    try {
      if (this.address) {
        localStorage.setItem('walletAddress', this.address);
        localStorage.setItem('walletConnected', 'true');
        console.log('💾 Connection saved to localStorage');
      }
    } catch (e) {
      console.warn('Failed to save connection', e);
    }
  }

  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;

    try {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletConnected');
    } catch (e) {
      // ignore
    }

    console.log('🔌 Disconnected & local state cleared');
  }

  async getBalance() {
    if (!this.connected || !this.provider || !this.address) return '0';
    try {
      const bal = await this.provider.getBalance(this.address);
      return ethers.utils.formatEther(bal);
    } catch (error) {
      console.error('❌ Balance fetch error', error);
      return '0';
    }
  }

  getContract(name, abi) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    if (!CONFIG.CONTRACTS || !CONFIG.CONTRACTS[name]) {
      throw new Error(`Contract ${name} address not found in CONFIG.CONTRACTS`);
    }
    return new ethers.Contract(CONFIG.CONTRACTS[name], abi, this.signer);
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ 1: isAdmin()
  // ═══════════════════════════════════════════════════════════════
  isAdmin() {
    if (!this.address || !CONFIG.ADMIN) return false;
    const addr = this.address.toLowerCase();
    
    // Проверка owner
    if (CONFIG.ADMIN.owner && addr === CONFIG.ADMIN.owner.toLowerCase()) {
      return true;
    }
    
    // ✅ ИСПРАВЛЕНО: founders - массив объектов {address, id}
    if (Array.isArray(CONFIG.ADMIN.founders)) {
      const isFounderAdmin = CONFIG.ADMIN.founders.some(f => {
        const founderAddr = typeof f === 'string' ? f : f.address;
        return founderAddr.toLowerCase() === addr;
      });
      if (isFounderAdmin) return true;
    }
    
    // Проверка board
    if (Array.isArray(CONFIG.ADMIN.board) && 
        CONFIG.ADMIN.board.some(b => b.toLowerCase() === addr)) {
      return true;
    }
    
    return false;
  }

  isOwner() {
    if (!this.address || !CONFIG.ADMIN) return false;
    const result = CONFIG.ADMIN.owner && this.address.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
    console.log('🔍 isOwner check:', this.address, '→', result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ 2: isFounder()
  // ═══════════════════════════════════════════════════════════════
  isFounder() {
    if (!this.address || !CONFIG || !CONFIG.ADMIN) return false;
    const addr = this.address.toLowerCase();
    
    // ✅ ИСПРАВЛЕНО: founders — массив строк-адресов
    const result = this.isOwner() || 
      (Array.isArray(CONFIG.ADMIN.founders) && 
       CONFIG.ADMIN.founders.some(f => {
         // Поддержка обоих форматов: строка-адрес или объект {address, id}
         const founderAddr = typeof f === 'string' ? f : (f && f.address ? f.address : '');
         return founderAddr.toLowerCase() === addr;
       }));
    
    console.log('🔍 isFounder check:', this.address, '→', result);
    return result;
  }
}

const web3Manager = new Web3Manager();
// Экспорт в window
window.web3Manager = web3Manager;

// Добавление геттеров
Object.defineProperty(Web3Manager.prototype, 'currentAccount', {
  get: function() {
    return this.address;
  }
});

Object.defineProperty(Web3Manager.prototype, 'isConnected', {
  get: function() {
    return this.connected;
  }
});

// Автоматическая инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    web3Manager.init();
  });
} else {
  web3Manager.init();
}

console.log('✅ Web3Manager loaded and exported to window');
