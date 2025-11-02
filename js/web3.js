/* jshint esversion: 8 */
/* global CONFIG, Promise, ethers */
// 🔥 ИСПРАВЛЕННЫЙ Web3Manager - SafePal ПРИОРИТЕТ (MetaMask УДАЛЕН)
// Версия: 2.2 - Удалены ВСЕ упоминания MetaMask

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.isSafePalBrowser = this.detectSafePalBrowser();
  }

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  detectSafePalBrowser() {
    try {
      const ua = navigator.userAgent || '';
      
      console.log('🔍 Detecting SafePal browser...');
      console.log('User-Agent:', ua);
      
      if (ua.includes('SafePal') || ua.includes('safepal')) {
        console.log('✅ SafePal detected via User-Agent');
        return true;
      }
      
      if (window.location.href && window.location.href.includes('safepal')) {
        console.log('✅ SafePal detected via URL');
        return true;
      }
      
      if (window.safepal) {
        console.log('✅ SafePal detected via window.safepal');
        return true;
      }
      
      if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        console.log('✅ SafePal detected via window.ethereum flags');
        return true;
      }
      
      if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        for (const p of window.ethereum.providers) {
          if (p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)) {
            console.log('✅ SafePal detected via ethereum.providers');
            return true;
          }
        }
      }
      
      console.log('⚠️ SafePal NOT detected');
      
    } catch (e) {
      console.warn('SafePal detect error', e);
    }
    return false;
  }

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  async init() {
    console.log('🔌 Initializing Web3Manager...');
    console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
    console.log('🦊 SafePal Browser:', this.isSafePalBrowser);

    if (this.isSafePalBrowser) {
      console.log('⏳ Waiting for SafePal injection...');
      await this.waitForSafePal(5000);
      if (this.hasSafePalProvider()) {
        console.log('✅ SafePal provider detected during init');
        await this.autoConnect();
        return;
      }
    }

    else if (this.isSafePalBrowser && !this.connected) {
      console.log('⚠️ SafePal provider not ready, trying autoConnect anyway...');
      await this.autoConnect();
    }

    // Auto-connect если сохранён кошелёк
    const savedAddress = localStorage.getItem('walletAddress');
    const walletConnected = localStorage.getItem('walletConnected');

    if (savedAddress && walletConnected === 'true') {
      console.log('🔄 Found saved wallet, attempting auto-connect...');
      await this.autoConnect();
    }
  }

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  async connect() {
    try {
      console.log('🔌 Starting wallet connection...');
      console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
      console.log('🦊 SafePal Browser:', this.isSafePalBrowser);
      
      const initialDelay = this.isMobile ? 1000 : 500;
      console.log(`⏳ Initial delay: ${initialDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      
      console.log('🔍 Waiting for SafePal provider...');
      const safePalFound = await this.waitForSafePal(4000);
      console.log('🔍 SafePal provider found:', safePalFound);
      
      // Priority 1: SafePal provider
      if (this.hasSafePalProvider()) {
        console.log('✅ SafePal provider detected, connecting...');
        await this.connectSafePal();
        
        if (!this.signer || !this.address) {
          console.error('❌ SafePal connected but signer/address missing');
          throw new Error('SafePal connection incomplete. Please try again.');
        }
        
        if (this.isMobile) {
          console.log('📱 Mobile SafePal - verifying connection...');
          await new Promise(resolve => setTimeout(resolve, 300));
          
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
        const message = this.isMobile 
          ? '❌ SafePal app not detected!\n\nPlease install SafePal Wallet and open this link in the app.'
          : '❌ SafePal wallet not detected!\n\nDesktop: Install SafePal extension\nMobile: Open in SafePal Wallet app';
        
        throw new Error(message);
      }
      
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
      if (finalAddress !== this.address) {
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

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  async waitForSafePal(maxWaitTime = 5000) {
    const start = Date.now();
    const interval = 100;
    
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
    
    console.log('⏰ SafePal wait timeout after', maxWaitTime, 'ms');
    return false;
  }

  // 🔥 ИСПРАВЛЕНО: Удалены ВСЕ проверки MetaMask
  hasSafePalProvider() {
    // 1. Прямой провайдер SafePal
    if (window.safepal) {
      console.log('✅ window.safepal found');
      return true;
    }
    
    // 2. SafePal флаги в window.ethereum
    if (window.ethereum) {
      if (window.ethereum.isSafePal || window.ethereum.isSafePalWallet) {
        console.log('✅ SafePal flags in window.ethereum');
        return true;
      }
      
      // 3. SafePal в providers array
      if (Array.isArray(window.ethereum.providers)) {
        const safePalProvider = window.ethereum.providers.find(p => 
          p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)
        );
        if (safePalProvider) {
          console.log('✅ SafePal in ethereum.providers');
          return true;
        }
      }
      
      // 🔥 ИСПРАВЛЕНО: Простая проверка наличия ethereum провайдера
      // Без блокировки по MetaMask
      if (window.ethereum.isConnected && typeof window.ethereum.request === 'function') {
        console.log('✅ Ethereum provider available');
        return true;
      }
    }
    
    console.log('⚠️ No SafePal provider found');
    return false;
  }

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  async connectSafePal() {
    try {
      console.log('🔌 Connecting to SafePal...');

      let rawProvider = null;

      if (window.safepal) {
        rawProvider = window.safepal;
        console.log('📱 Using window.safepal');
      } else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        const sp = window.ethereum.providers.find(p => p && (p.isSafePal || p.isSafePalWallet));
        if (sp) {
          rawProvider = sp;
          console.log('📱 Using SafePal from providers array');
        }
      } else if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        rawProvider = window.ethereum;
        console.log('📱 Using window.ethereum with SafePal flags');
      } else if (window.ethereum) {
        rawProvider = window.ethereum;
        console.log('📱 Using window.ethereum (fallback)');
      }

      if (!rawProvider) {
        throw new Error('SafePal provider not found');
      }

      this.provider = new ethers.providers.Web3Provider(rawProvider);

      try {
        await this.provider.send('eth_requestAccounts', []);
      } catch (reqErr) {
        if (reqErr.code === -32002) {
          console.log('⏳ Pending request detected, trying direct request...');
          await rawProvider.request({ method: 'eth_requestAccounts' });
        } else {
          throw reqErr;
        }
      }

      this.signer = this.provider.getSigner();
      this.address = await this.signer.getAddress();
      
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ SafePal connected:', this.address);
    } catch (error) {
      console.error('❌ SafePal connection failed:', error);
      throw error;
    }
  }

  // ✅ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
  async openSafePalApp() {
    const currentUrl = window.location.href;
    const deepLink = `safepal://wc?uri=${encodeURIComponent(currentUrl)}`;
    
    console.log('🔗 Opening SafePal app via deep link');
    window.location.href = deepLink;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 🔥 ИСПРАВЛЕНО: Удалены ВСЕ проверки MetaMask
  async autoConnect() {
    try {
      console.log('🔄 Auto-connecting...');
      
      if (this.isSafePalBrowser) {
        await this.waitForSafePal(5000);
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      let provider = null;

      // 🔥 ПРИОРИТЕТ 1: SafePal провайдеры
      if (this.hasSafePalProvider()) {
        if (window.safepal) {
          provider = new ethers.providers.Web3Provider(window.safepal);
        }
        else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
          const p = window.ethereum.providers.find(p => p && (p.isSafePal || p.isSafePalWallet));
          if (p) provider = new ethers.providers.Web3Provider(p);
        } 
        else if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
          provider = new ethers.providers.Web3Provider(window.ethereum);
        }
        // 🔥 ИСПРАВЛЕНО: Если есть ethereum - используем его
        else if (window.ethereum) {
          provider = new ethers.providers.Web3Provider(window.ethereum);
        }
        console.log('🔄 Auto-connect using provider');
      } 
      // 🔥 ИСПРАВЛЕНО: Если есть ethereum - используем его
      else if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('🔄 Auto-connect using ethereum provider');
      }

      if (!provider) {
        console.log('⚠️ No provider available for auto-connect');
        return;
      }

      const accounts = await provider.listAccounts();

      if (accounts && accounts.length > 0) {
        this.provider = provider;
        this.signer = provider.getSigner();
        this.address = accounts[0];
        this.connected = true;
        await this.checkNetwork();
        console.log('✅ Auto-connected:', this.address);
      } else {
        console.log('ℹ️ Auto-connect: no accounts available yet');
      }
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
    }
  }

  // ✅ ВСЁ НИЖЕ СОХРАНЕНО БЕЗ ИЗМЕНЕНИЙ
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

  async switchNetwork() {
    try {
      if (!this.provider) throw new Error('No provider to switch network');

      const chainIdHex = CONFIG.NETWORK.chainIdHex || '0x' + Number(CONFIG.NETWORK.chainId).toString(16);

      await this.provider.send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
      console.log('✅ Network switch requested');
    } catch (error) {
      if (error && error.code === 4902) {
        console.log('➕ Chain not found, adding network...');
        await this.addNetwork();
      } else {
        console.error('❌ Switch failed:', error);
        throw new Error('Please switch to opBNB manually in your wallet');
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
        nativeCurrency: CONFIG.NETWORK.currency,
        rpcUrls: [CONFIG.NETWORK.rpcUrl],
        blockExplorerUrls: [CONFIG.NETWORK.explorer]
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

  isAdmin() {
    if (!this.address || !CONFIG.ADMIN) return false;
    const addr = this.address.toLowerCase();
    if (CONFIG.ADMIN.owner && addr === CONFIG.ADMIN.owner.toLowerCase()) return true;
    if (Array.isArray(CONFIG.ADMIN.founders) && CONFIG.ADMIN.founders.some(f => f.toLowerCase() === addr)) return true;
    if (Array.isArray(CONFIG.ADMIN.board) && CONFIG.ADMIN.board.some(b => b.toLowerCase() === addr)) return true;
    return false;
  }

  isOwner() {
    if (!this.address || !CONFIG.ADMIN) return false;
    const result = CONFIG.ADMIN.owner && this.address.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
    console.log('🔍 isOwner check:', this.address, '→', result);
    return result;
  }

  isFounder() {
    if (!this.address || !CONFIG.ADMIN) return false;
    const addr = this.address.toLowerCase();
    const result = this.isOwner() || (Array.isArray(CONFIG.ADMIN.founders) && CONFIG.ADMIN.founders.some(f => f.toLowerCase() === addr));
    console.log('🔍 isFounder check:', this.address, '→', result);
    console.log('📋 Founders list:', CONFIG.ADMIN.founders);
    return result;
  }
}

const web3Manager = new Web3Manager();
