/* jshint esversion: 8 */
/* global CONFIG, Promise, ethers */

/**
 * Web3Manager - Універсальний менеджер підключення гаманців
 * Підтримує: MetaMask, SafePal, Trust Wallet, Coinbase Wallet та інші
 */

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.connected = false;
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.isSafePalBrowser = this.detectSafePalBrowser();
  }

  /**
   * Детекція SafePal браузера
   */
  detectSafePalBrowser() {
    try {
      const ua = navigator.userAgent || '';
      
      console.log('🔍 Detecting SafePal browser...');
      console.log('User-Agent:', ua);
      
      // Перевірка User-Agent
      if (ua.includes('SafePal') || ua.includes('safepal')) {
        console.log('✅ SafePal detected via User-Agent');
        return true;
      }
      
      // Перевірка URL
      if (window.location.href && window.location.href.includes('safepal')) {
        console.log('✅ SafePal detected via URL');
        return true;
      }
      
      // Перевірка глобальних об'єктів
      if (window.safepal) {
        console.log('✅ SafePal detected via window.safepal');
        return true;
      }
      
      if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
        console.log('✅ SafePal detected via window.ethereum flags');
        return true;
      }
      
      // Перевірка providers array
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

  /**
   * Ініціалізація Web3Manager
   */
  async init() {
    console.log('🔌 Initializing Web3Manager...');
    console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
    console.log('🦊 SafePal Browser:', this.isSafePalBrowser);

    // Auto-connect якщо збережено
    const savedAddress = localStorage.getItem('walletAddress');
    const walletConnected = localStorage.getItem('walletConnected');

    if (savedAddress && walletConnected === 'true') {
      console.log('🔄 Found saved wallet, attempting auto-connect...');
      await this.autoConnect();
    }
  }

  /**
   * ГОЛОВНИЙ МЕТОД ПІДКЛЮЧЕННЯ
   */
  async connect() {
    try {
      console.log('🔌 Starting wallet connection...');
      console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
      console.log('🦊 SafePal Browser:', this.isSafePalBrowser);
      
      let rawProvider = null;
      let walletName = 'Unknown';

      // ============================================================
      // 1. СПРОБА ЗНАЙТИ ПРОВАЙДЕР
      // ============================================================

      // 1.1 SafePal (пріоритет)
      if (window.safepal) {
        console.log('✅ Found window.safepal');
        rawProvider = window.safepal;
        walletName = 'SafePal';
      }
      // 1.2 Пошук в ethereum.providers
      else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        console.log('🔍 Searching in ethereum.providers...');
        
        // Пріоритет: SafePal
        const safePal = window.ethereum.providers.find(p => 
          p && (p.isSafePal || p.isSafePalWallet || p.isSafePalProvider)
        );
        if (safePal) {
          console.log('✅ Found SafePal in providers');
          rawProvider = safePal;
          walletName = 'SafePal';
        }
        // Другий пріоритет: MetaMask
        else {
          const metaMask = window.ethereum.providers.find(p => 
            p && p.isMetaMask
          );
          if (metaMask) {
            console.log('✅ Found MetaMask in providers');
            rawProvider = metaMask;
            walletName = 'MetaMask';
          }
          // Третій пріоритет: будь-який інший
          else if (window.ethereum.providers.length > 0) {
            console.log('✅ Using first available provider');
            rawProvider = window.ethereum.providers[0];
            walletName = 'Wallet';
          }
        }
      }
      // 1.3 Використання window.ethereum напряму
      else if (window.ethereum) {
        console.log('✅ Found window.ethereum');
        rawProvider = window.ethereum;
        
        // Визначення типу гаманця
        if (window.ethereum.isMetaMask) {
          walletName = 'MetaMask';
        } else if (window.ethereum.isSafePal || window.ethereum.isSafePalWallet) {
          walletName = 'SafePal';
        } else if (window.ethereum.isTrust) {
          walletName = 'Trust Wallet';
        } else if (window.ethereum.isCoinbaseWallet) {
          walletName = 'Coinbase Wallet';
        } else {
          walletName = 'Wallet';
        }
      }

      // ============================================================
      // 2. ПЕРЕВІРКА ЧИ ЗНАЙДЕНО ПРОВАЙДЕР
      // ============================================================

      if (!rawProvider) {
        console.error('❌ No wallet provider found');
        
        if (this.isMobile) {
          throw new Error(
            'No wallet detected!\n\n' +
            'Please install MetaMask, SafePal, or Trust Wallet\n' +
            'and open this page in the wallet browser.'
          );
        } else {
          throw new Error(
            'No wallet detected!\n\n' +
            'Please install MetaMask or SafePal extension:\n' +
            '• MetaMask: metamask.io\n' +
            '• SafePal: safepal.com'
          );
        }
      }

      console.log(`🔗 Connecting to ${walletName}...`);

      // ============================================================
      // 3. СТВОРЕННЯ ETHERS PROVIDER
      // ============================================================

      this.provider = new ethers.providers.Web3Provider(rawProvider, {
        chainId: CONFIG.CHAIN_ID || 204,
        name: CONFIG.NETWORK_NAME || 'opBNB Mainnet'
      });

      console.log('📝 Requesting accounts...');

      // ============================================================
      // 4. ЗАПИТ АКАУНТІВ
      // ============================================================

      try {
        const accounts = await this.provider.send('eth_requestAccounts', []);
        console.log('✅ Accounts received:', accounts);
      } catch (reqError) {
        console.warn('⚠️ eth_requestAccounts failed, trying fallback');
        
        // Fallback через request
        if (rawProvider.request) {
          const accounts = await rawProvider.request({ 
            method: 'eth_requestAccounts' 
          });
          console.log('✅ Accounts received via fallback:', accounts);
        } else {
          throw new Error('Failed to request accounts from wallet');
        }
      }

      // ============================================================
      // 5. ОТРИМАННЯ SIGNER ТА ADDRESS
      // ============================================================

      this.signer = this.provider.getSigner();
      this.address = await this.signer.getAddress();
      
      console.log('✅ Address obtained:', this.address);

      // ============================================================
      // 6. ПЕРЕВІРКА МЕРЕЖІ
      // ============================================================

      await this.checkNetwork();

      // ============================================================
      // 7. ЗБЕРЕЖЕННЯ ПІДКЛЮЧЕННЯ
      // ============================================================

      this.connected = true;
      await this.saveConnection();

      // ============================================================
      // 8. ФІНАЛЬНА ПЕРЕВІРКА
      // ============================================================

      const finalAddress = await this.signer.getAddress();
      if (finalAddress !== this.address) {
        throw new Error('Address mismatch after connection');
      }

      console.log(`✅ Successfully connected to ${walletName}:`, this.address);
      return this.address;
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      
      // Скидання стану при помилці
      this.connected = false;
      this.signer = null;
      this.address = null;
      this.provider = null;
      
      // Показ помилки користувачу (окрім відміни)
      if (!/User rejected|User denied|Cancelled|user closed/i.test(error.message || '')) {
        alert(error.message || 'Connection failed. Please try again.');
      }
      
      throw error;
    }
  }

  /**
   * Автоматичне підключення (при перезавантаженні)
   */
  async autoConnect() {
    try {
      console.log('🔄 Auto-connecting...');
      
      let rawProvider = null;

      // Пошук провайдера
      if (window.safepal) {
        rawProvider = window.safepal;
      } else if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        rawProvider = window.ethereum.providers.find(p => 
          p && (p.isSafePal || p.isSafePalWallet || p.isMetaMask)
        ) || window.ethereum.providers[0];
      } else if (window.ethereum) {
        rawProvider = window.ethereum;
      }

      if (!rawProvider) {
        console.log('⚠️ No provider available for auto-connect');
        return;
      }

      this.provider = new ethers.providers.Web3Provider(rawProvider);
      const accounts = await this.provider.listAccounts();

      if (accounts && accounts.length > 0) {
        this.signer = this.provider.getSigner();
        this.address = accounts[0];
        this.connected = true;
        await this.checkNetwork();
        console.log('✅ Auto-connected:', this.address);
      } else {
        console.log('ℹ️ Auto-connect: no accounts available');
      }
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
    }
  }

  /**
   * Перевірка та перемикання мережі
   */
  async checkNetwork() {
    try {
      if (!this.provider) {
        throw new Error('No provider to check network');
      }

      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      
      console.log('🌐 Current network:', network.chainId, network.name);

      const desiredChainId = CONFIG.CHAIN_ID || 204;

      if (network.chainId !== desiredChainId) {
        console.log(`⚠️ Wrong network (${network.chainId}), switching to ${desiredChainId}...`);
        await this.switchNetwork();
      } else {
        console.log('✅ Already on correct network');
      }
    } catch (error) {
      console.error('❌ Network check failed:', error);
      throw error;
    }
  }

  /**
   * Перемикання мережі
   */
  async switchNetwork() {
    try {
      if (!this.provider) {
        throw new Error('No provider to switch network');
      }

      const chainId = CONFIG.CHAIN_ID || 204;
      const chainIdHex = '0x' + chainId.toString(16);

      console.log(`🔄 Switching to chain ${chainId} (${chainIdHex})...`);

      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: chainIdHex }
      ]);

      console.log('✅ Network switched successfully');

    } catch (error) {
      // Якщо мережа не додана - додаємо
      if (error.code === 4902 || error.data?.originalError?.code === 4902) {
        console.log('➕ Network not found, adding...');
        await this.addNetwork();
      } else {
        console.error('❌ Switch network failed:', error);
        throw new Error(
          'Please switch to opBNB Mainnet manually in your wallet\n\n' +
          'Network: opBNB Mainnet\n' +
          'Chain ID: 204'
        );
      }
    }
  }

  /**
   * Додавання мережі до гаманця
   */
  async addNetwork() {
    try {
      if (!this.provider) {
        throw new Error('No provider to add network');
      }

      const chainId = CONFIG.CHAIN_ID || 204;
      const chainIdHex = '0x' + chainId.toString(16);

      const networkParams = {
        chainId: chainIdHex,
        chainName: CONFIG.NETWORK_NAME || 'opBNB Mainnet',
        nativeCurrency: {
          name: CONFIG.CURRENCY_NAME || 'BNB',
          symbol: CONFIG.CURRENCY_SYMBOL || 'BNB',
          decimals: CONFIG.CURRENCY_DECIMALS || 18
        },
        rpcUrls: [CONFIG.RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org'],
        blockExplorerUrls: [CONFIG.EXPLORER_URL || 'https://opbnbscan.com']
      };

      console.log('➕ Adding network:', networkParams);

      await this.provider.send('wallet_addEthereumChain', [networkParams]);

      console.log('✅ Network added successfully');

    } catch (error) {
      console.error('❌ Add network failed:', error);
      throw new Error(
        'Failed to add network. Please add opBNB Mainnet manually:\n\n' +
        'Network Name: opBNB Mainnet\n' +
        'RPC URL: https://opbnb-mainnet-rpc.bnbchain.org\n' +
        'Chain ID: 204\n' +
        'Currency: BNB\n' +
        'Explorer: https://opbnbscan.com'
      );
    }
  }

  /**
   * Збереження підключення
   */
  async saveConnection() {
    try {
      if (this.address) {
        localStorage.setItem('walletAddress', this.address);
        localStorage.setItem('walletConnected', 'true');
        console.log('💾 Connection saved');
      }
    } catch (e) {
      console.warn('Failed to save connection:', e);
    }
  }

  /**
   * Відключення гаманця
   */
  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.connected = false;

    try {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletConnected');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }

    console.log('🔌 Disconnected');
  }

  /**
   * Отримання балансу
   */
  async getBalance() {
    if (!this.connected || !this.provider || !this.address) {
      return '0';
    }
    
    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }

  /**
   * Отримання контракту
   */
  getContract(contractKey, abi) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    // Підтримка обох варіантів: GLOBALWAY та GlobalWay
    const address = CONFIG.CONTRACTS[contractKey] || 
                   CONFIG.CONTRACTS[contractKey.toUpperCase()];

    if (!address) {
      throw new Error(`Contract ${contractKey} not found in CONFIG.CONTRACTS`);
    }

    return new ethers.Contract(address, abi, this.signer);
  }

  /**
   * Перевірка чи користувач - адмін
   */
  isAdmin() {
    if (!this.address || !CONFIG.ADMIN) return false;
    
    const addr = this.address.toLowerCase();
    
    // Перевірка owner
    if (CONFIG.ADMIN.owner && addr === CONFIG.ADMIN.owner.toLowerCase()) {
      return true;
    }
    
    // Перевірка founders
    if (Array.isArray(CONFIG.ADMIN.founders)) {
      if (CONFIG.ADMIN.founders.some(f => f.toLowerCase() === addr)) {
        return true;
      }
    }
    
    // Перевірка board
    if (Array.isArray(CONFIG.ADMIN.board)) {
      if (CONFIG.ADMIN.board.some(b => b.toLowerCase() === addr)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Перевірка чи користувач - owner
   */
  isOwner() {
    if (!this.address || !CONFIG.ADMIN || !CONFIG.ADMIN.owner) {
      return false;
    }
    
    const result = this.address.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
    console.log('🔍 isOwner check:', this.address, '→', result);
    return result;
  }

  /**
   * Перевірка чи користувач - founder
   */
  isFounder() {
    if (!this.address || !CONFIG.ADMIN) return false;
    
    const addr = this.address.toLowerCase();
    
    // Owner теж вважається founder
    if (this.isOwner()) return true;
    
    // Перевірка в списку founders
    if (Array.isArray(CONFIG.ADMIN.founders)) {
      const result = CONFIG.ADMIN.founders.some(f => f.toLowerCase() === addr);
      console.log('🔍 isFounder check:', this.address, '→', result);
      return result;
    }
    
    return false;
  }
}

// Створення глобального екземпляру
const web3Manager = new Web3Manager();
