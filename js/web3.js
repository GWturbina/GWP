/* jshint esversion: 8 */
/* global CONFIG, ethers */

/**
 * Web3Manager - SafePal Priority Implementation
 * Version: 2.0 - Production Ready
 * КРИТИЧНО: SafePal ТОЛЬКО! MetaMask ЗАПРЕЩЁН!
 */

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
    this.network = null;
    
    // Определение устройства
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.isAndroid = /Android/i.test(navigator.userAgent);
    
    // Определение SafePal браузера
    this.isSafePalBrowser = this.detectSafePalBrowser();
    
    console.log('🔧 Web3Manager initialized');
    console.log('📱 Device:', this.isMobile ? 'Mobile' : 'Desktop');
    console.log('🦊 SafePal Browser:', this.isSafePalBrowser);
  }

  /**
   * Определение SafePal браузера
   * Проверяет несколько признаков для надёжности
   */
  detectSafePalBrowser() {
    try {
      const ua = navigator.userAgent || '';
      
      // Проверка 1: User-Agent содержит 'SafePal'
      if (ua.includes('SafePal') || ua.includes('safepal')) {
        console.log('✅ SafePal detected via User-Agent');
        return true;
      }
      
      // Проверка 2: URL содержит 'safepal'
      if (window.location.href.includes('safepal')) {
        console.log('✅ SafePal detected via URL');
        return true;
      }
      
      // Проверка 3: window.safepal объект существует
      if (typeof window.safepal !== 'undefined') {
        console.log('✅ SafePal detected via window.safepal');
        return true;
      }
      
      // Проверка 4: window.ethereum имеет флаги SafePal
      if (window.ethereum) {
        if (window.ethereum.isSafePal || window.ethereum.isSafePalWallet) {
          console.log('✅ SafePal detected via window.ethereum flags');
          return true;
        }
      }
      
      // Проверка 5: providers массив содержит SafePal
      if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        for (const provider of window.ethereum.providers) {
          if (provider.isSafePal || provider.isSafePalWallet || provider.isSafePalProvider) {
            console.log('✅ SafePal detected via ethereum.providers array');
            return true;
          }
        }
      }
      
      console.log('ℹ️ SafePal NOT detected');
      return false;
      
    } catch (error) {
      console.warn('⚠️ SafePal detection error:', error);
      return false;
    }
  }

  /**
   * Инициализация Web3Manager
   * Вызывается при загрузке приложения
   */
  async init() {
    console.log('🔌 Initializing Web3Manager...');
    
    try {
      // Если в SafePal браузере - ждём injection
      if (this.isSafePalBrowser) {
        console.log('⏳ Waiting for SafePal provider injection...');
        await this.waitForSafePal(CONFIG.TIMEOUTS.safePalInjection);
        
        // Попытка автоподключения
        const savedAddress = localStorage.getItem('walletAddress');
        const wasConnected = localStorage.getItem('walletConnected') === 'true';
        
        if (savedAddress && wasConnected) {
          console.log('🔄 Attempting auto-connect to saved wallet...');
          try {
            await this.autoConnect();
          } catch (error) {
            console.warn('⚠️ Auto-connect failed:', error.message);
            // Не критично, пользователь переподключится вручную
          }
        }
      }
      
      console.log('✅ Web3Manager initialized');
    } catch (error) {
      console.error('❌ Web3Manager initialization error:', error);
    }
  }

  /**
   * Автоподключение к сохранённому кошельку
   */
  async autoConnect() {
    try {
      const provider = this.getSafePalProvider();
      if (!provider) {
        throw new Error('SafePal provider not found');
      }
      
      // Попытка получить аккаунты без запроса разрешения
      const accounts = await provider.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts && accounts.length > 0) {
        console.log('✅ Auto-connect: accounts found');
        await this.setupProvider(provider, accounts[0]);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Auto-connect failed:', error.message);
      return false;
    }
  }

  /**
   * Основная функция подключения кошелька
   * КРИТИЧНО: Только SafePal!
   */
  async connect() {
    console.log('🔌 Starting wallet connection...');
    console.log('📱 Device Type:', this.isMobile ? 'Mobile' : 'Desktop');
    console.log('🦊 SafePal Browser:', this.isSafePalBrowser);
    
    try {
      // ПРІОРИТЕТ 1: SafePal Browser
      if (this.isSafePalBrowser) {
        console.log('✅ SafePal browser detected, connecting...');
        
        // Дополнительная задержка для стабильности на мобильных
        if (this.isMobile) {
          console.log('⏳ Mobile delay for stability...');
          await this.delay(2000);
        }
        
        // Ожидание injection
        console.log('⏳ Waiting for SafePal provider...');
        const providerReady = await this.waitForSafePal(CONFIG.TIMEOUTS.safePalInjection);
        
        if (!providerReady) {
          throw new Error('SafePal provider not ready. Please refresh the page.');
        }
        
        // Подключение через SafePal
        await this.connectSafePal();
        return;
      }
      
      // ПРІОРИТЕТ 2: Mobile Device (не SafePal браузер)
      if (this.isMobile && !this.isSafePalBrowser) {
        console.log('📱 Mobile device detected (not SafePal browser)');
        
        const userConfirmed = confirm(
          '🦊 To connect your wallet:\n\n' +
          '1. SafePal app will open\n' +
          '2. Navigate to DApp Browser\n' +
          '3. Open this website\n' +
          '4. Click Connect again\n\n' +
          'Press OK to open SafePal app'
        );
        
        if (!userConfirmed) {
          throw new Error('Connection cancelled by user');
        }
        
        // Открыть SafePal через deep-link
        await this.openSafePalApp();
        
        throw new Error(
          'Please complete connection in SafePal app.\n\n' +
          'Steps:\n' +
          '1. Open DApp Browser in SafePal\n' +
          '2. Navigate to this website\n' +
          '3. Click Connect Wallet'
        );
      }
      
      // ПРІОРИТЕТ 3: Desktop
      console.log('💻 Desktop device detected');
      throw new Error(
        '🦊 Please open this DApp in SafePal Browser\n\n' +
        'Instructions:\n' +
        '1. Open SafePal app on your phone\n' +
        '2. Go to DApp Browser\n' +
        '3. Enter URL: ' + window.location.href + '\n\n' +
        'Or scan QR code with SafePal'
      );
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw error;
    }
  }

  /**
   * Подключение через SafePal provider
   */
  async connectSafePal() {
    console.log('🔗 Connecting to SafePal...');
    
    try {
      // Получить SafePal provider
      const provider = this.getSafePalProvider();
      
      if (!provider) {
        throw new Error('SafePal provider not found. Please refresh the page.');
      }
      
      console.log('✅ SafePal provider found');
      
      // Запросить доступ к аккаунтам
      console.log('📤 Requesting account access...');
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please try again.');
      }
      
      console.log('✅ Accounts received:', accounts.length);
      
      // Настроить provider
      await this.setupProvider(provider, accounts[0]);
      
      console.log('✅ SafePal connected successfully!');
      console.log('📍 Address:', this.address);
      
    } catch (error) {
      console.error('❌ SafePal connection failed:', error);
      
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      }
      
      throw error;
    }
  }

  /**
   * Настройка provider после подключения
   */
  async setupProvider(provider, address) {
    try {
      // Создать ethers provider
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();
      this.address = ethers.utils.getAddress(address); // Нормализация адреса
      this.connected = true;
      
      // Получить информацию о сети
      this.network = await this.provider.getNetwork();
      console.log('🌐 Network:', this.network.name, 'ChainId:', this.network.chainId);
      
      // Проверка правильной сети
      if (this.network.chainId !== CONFIG.NETWORK.chainId) {
        console.warn('⚠️ Wrong network detected, switching...');
        await this.switchNetwork();
      }
      
      // Сохранить в localStorage
      localStorage.setItem('walletAddress', this.address);
      localStorage.setItem('walletConnected', 'true');
      
      // Настроить слушатели событий
      this.setupEventListeners(provider);
      
      console.log('✅ Provider setup complete');
      
    } catch (error) {
      console.error('❌ Provider setup failed:', error);
      throw error;
    }
  }

  /**
   * Настройка слушателей событий кошелька
   */
  setupEventListeners(provider) {
    // Смена аккаунта
    provider.on('accountsChanged', async (accounts) => {
      console.log('🔄 Accounts changed:', accounts);
      
      if (!accounts || accounts.length === 0) {
        console.log('🔌 No accounts, disconnecting...');
        this.disconnect();
        
        // Перезагрузка страницы
        window.location.reload();
      } else {
        console.log('🔄 Switching to new account...');
        this.address = ethers.utils.getAddress(accounts[0]);
        localStorage.setItem('walletAddress', this.address);
        
        // Обновление UI
        if (window.app && typeof window.app.onAccountChanged === 'function') {
          await window.app.onAccountChanged(this.address);
        } else {
          // Fallback: перезагрузка
          window.location.reload();
        }
      }
    });
    
    // Смена сети
    provider.on('chainChanged', (chainId) => {
      console.log('🌐 Chain changed:', chainId);
      // Всегда перезагружаем при смене сети
      window.location.reload();
    });
    
    // Отключение
    provider.on('disconnect', (error) => {
      console.log('🔌 Provider disconnected:', error);
      this.disconnect();
      window.location.reload();
    });
  }

  /**
   * Получить SafePal provider
   * Проверяет несколько источников
   */
  getSafePalProvider() {
    console.log('🔍 Searching for SafePal provider...');
    
    // Попытка 1: Прямой window.ethereum с флагами SafePal
    if (window.ethereum && (window.ethereum.isSafePal || window.ethereum.isSafePalWallet)) {
      console.log('✅ Found via window.ethereum (direct)');
      return window.ethereum;
    }
    
    // Попытка 2: Поиск в providers массиве
    if (window.ethereum && Array.isArray(window.ethereum.providers)) {
      for (const provider of window.ethereum.providers) {
        if (provider.isSafePal || provider.isSafePalWallet || provider.isSafePalProvider) {
          console.log('✅ Found via window.ethereum.providers');
          return provider;
        }
      }
    }
    
    // Попытка 3: window.safepal
    if (window.safepal) {
      console.log('✅ Found via window.safepal');
      return window.safepal;
    }
    
    // Попытка 4: Если в SafePal браузере, используем window.ethereum
    if (this.isSafePalBrowser && window.ethereum) {
      console.log('✅ Found via window.ethereum (SafePal browser)');
      return window.ethereum;
    }
    
    console.log('❌ SafePal provider not found');
    return null;
  }

  /**
   * Ожидание injection SafePal provider
   */
  async waitForSafePal(timeout = 10000) {
    console.log('⏳ Waiting for SafePal provider injection...');
    
    const start = Date.now();
    const checkInterval = 100; // Проверка каждые 100ms
    
    return new Promise((resolve) => {
      const check = () => {
        const elapsed = Date.now() - start;
        
        // Проверка наличия provider
        const provider = this.getSafePalProvider();
        if (provider) {
          console.log(`✅ SafePal provider found after ${elapsed}ms`);
          resolve(true);
          return;
        }
        
        // Таймаут
        if (elapsed >= timeout) {
          console.log(`⏱️ SafePal provider timeout after ${elapsed}ms`);
          resolve(false);
          return;
        }
        
        // Следующая проверка
        setTimeout(check, checkInterval);
      };
      
      check();
    });
  }

  /**
   * Открыть SafePal приложение через deep-link
   */
  async openSafePalApp() {
    console.log('📱 Opening SafePal app...');
    
    try {
      const currentUrl = window.location.href;
      const encodedUrl = encodeURIComponent(currentUrl);
      
      // Deep-link схемы для разных платформ
      const deepLink = this.isAndroid
        ? `safepalwallet://open?url=${encodedUrl}`
        : `safepal://wc?uri=${encodedUrl}`;
      
      console.log('🔗 Deep-link:', deepLink);
      
      // Попытка открыть приложение
      window.location.href = deepLink;
      
      // Через 3 секунды показать инструкцию
      setTimeout(() => {
        const storeUrl = this.isAndroid
          ? 'https://play.google.com/store/apps/details?id=io.safepal.wallet'
          : 'https://apps.apple.com/app/safepal-wallet/id1548297139';
        
        const wantsToInstall = confirm(
          '📱 SafePal Wallet Required\n\n' +
          'To use this DApp:\n\n' +
          '1. Install SafePal Wallet (if not installed)\n' +
          '2. Open DApp Browser in SafePal\n' +
          '3. Navigate to this website\n\n' +
          'Press OK to open app store'
        );
        
        if (wantsToInstall) {
          window.open(storeUrl, '_blank');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to open SafePal app:', error);
      throw new Error('Failed to open SafePal app. Please install SafePal Wallet.');
    }
  }

  /**
   * Переключение на opBNB сеть
   */
  async switchNetwork() {
    console.log('🌐 Switching to opBNB network...');
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONFIG.NETWORK.chainIdHex }]
      });
      
      console.log('✅ Network switched successfully');
      
      // Обновить информацию о сети
      this.network = await this.provider.getNetwork();
      
    } catch (switchError) {
      // Если сеть не добавлена (код 4902)
      if (switchError.code === 4902) {
        console.log('⚠️ Network not added, adding now...');
        await this.addNetwork();
      } else {
        console.error('❌ Failed to switch network:', switchError);
        throw switchError;
      }
    }
  }

  /**
   * Добавление opBNB сети в кошелёк
   */
  async addNetwork() {
    console.log('➕ Adding opBNB network...');
    
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CONFIG.NETWORK.chainIdHex,
          chainName: CONFIG.NETWORK.name,
          nativeCurrency: CONFIG.NETWORK.currency,
          rpcUrls: [CONFIG.NETWORK.rpcUrl],
          blockExplorerUrls: [CONFIG.NETWORK.explorer]
        }]
      });
      
      console.log('✅ Network added successfully');
      
      // Обновить информацию о сети
      this.network = await this.provider.getNetwork();
      
    } catch (error) {
      console.error('❌ Failed to add network:', error);
      throw new Error('Failed to add opBNB network. Please add it manually in SafePal settings.');
    }
  }

  /**
   * Отключение кошелька
   */
  disconnect() {
    console.log('🔌 Disconnecting wallet...');
    
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
    this.network = null;
    
    // Очистить localStorage
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletConnected');
    
    console.log('✅ Wallet disconnected');
  }

  /**
   * Проверка владельца
   */
  isOwner() {
    if (!this.address) return false;
    return this.address.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
  }

  /**
   * Проверка основателя
   */
  isFounder() {
    if (!this.address) return false;
    const addr = this.address.toLowerCase();
    return CONFIG.ADMIN.founders.some(f => f.toLowerCase() === addr);
  }

  /**
   * Проверка администратора
   */
  isAdmin() {
    return this.isOwner() || this.isFounder();
  }

  /**
   * Вспомогательная функция задержки
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить баланс BNB
   */
  async getBalance(address = null) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    const addr = address || this.address;
    if (!addr) {
      throw new Error('No address provided');
    }
    
    const balance = await this.provider.getBalance(addr);
    return ethers.utils.formatEther(balance);
  }

  /**
   * Получить информацию о сети
   */
  getNetworkInfo() {
    return {
      connected: this.connected,
      address: this.address,
      chainId: this.network?.chainId,
      chainName: this.network?.name,
      isCorrectNetwork: this.network?.chainId === CONFIG.NETWORK.chainId
    };
  }
}

// Создать глобальный экземпляр
const web3Manager = new Web3Manager();

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Web3Manager;
}
