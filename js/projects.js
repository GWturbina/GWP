/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG, ethers */

/**
 * Tokens Manager - Управління GWT токенами
 */
class TokensManager {
  constructor() {
    this.tokenPrice = '0';
    this.userBalance = '0';
    this.bnbBalance = '0';
    this.priceHistory = [];
    this.chart = null;
  }

  /**
   * Ініціалізація
   */
  async init() {
    console.log('💎 Initializing Tokens Manager...');
    
    this.setupEventListeners();
    await this.loadTokenData();
    this.startPriceMonitoring();
    
    console.log('✅ Tokens Manager initialized');
  }

  /**
   * Налаштування обробників подій
   */
  setupEventListeners() {
    // Buy/Sell tabs
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');

    if (buyTab) {
      buyTab.addEventListener('click', () => this.switchTab('buy'));
    }

    if (sellTab) {
      sellTab.addEventListener('click', () => this.switchTab('sell'));
    }

    // Amount inputs
    const buyBnbInput = document.getElementById('buyBnbAmount');
    const sellTokenInput = document.getElementById('sellTokenAmount');

    if (buyBnbInput) {
      buyBnbInput.addEventListener('input', (e) => {
        this.calculateBuyTokens(e.target.value);
      });
    }

    if (sellTokenInput) {
      sellTokenInput.addEventListener('input', (e) => {
        this.calculateSellBnb(e.target.value);
      });
    }

    // Max buttons
    const buyMaxBtn = document.getElementById('buyMaxBtn');
    const sellMaxBtn = document.getElementById('sellMaxBtn');

    if (buyMaxBtn) {
      buyMaxBtn.addEventListener('click', () => this.setBuyMax());
    }

    if (sellMaxBtn) {
      sellMaxBtn.addEventListener('click', () => this.setSellMax());
    }

    // Execute buttons
    const buyBtn = document.getElementById('executeBuyBtn');
    const sellBtn = document.getElementById('executeSellBtn');

    if (buyBtn) {
      buyBtn.addEventListener('click', () => this.executeBuy());
    }

    if (sellBtn) {
      sellBtn.addEventListener('click', () => this.executeSell());
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshTokensBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadTokenData());
    }
  }

  /**
   * Перемикання вкладок
   */
  switchTab(tab) {
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    const buyPanel = document.getElementById('buyPanel');
    const sellPanel = document.getElementById('sellPanel');

    if (tab === 'buy') {
      buyTab?.classList.add('active');
      sellTab?.classList.remove('active');
      buyPanel?.classList.add('active');
      sellPanel?.classList.remove('active');
    } else {
      sellTab?.classList.add('active');
      buyTab?.classList.remove('active');
      sellPanel?.classList.add('active');
      buyPanel?.classList.remove('active');
    }
  }

  /**
   * Завантаження даних токенів
   */
  async loadTokenData() {
    if (!web3Manager.connected) return;

    Utils.showLoader(true, 'Loading token data...');

    try {
      const address = web3Manager.address;

      // Отримати ціну токена
      this.tokenPrice = await contracts.getTokenPrice();
      
      // Отримати баланс токенів
      this.userBalance = await contracts.getTokenBalance(address);
      
      // Отримати баланс BNB
      this.bnbBalance = await web3Manager.provider.getBalance(address);

      console.log('💎 Token data loaded:', {
        price: ethers.utils.formatEther(this.tokenPrice),
        balance: ethers.utils.formatEther(this.userBalance),
        bnb: ethers.utils.formatEther(this.bnbBalance)
      });

      // Оновити UI
      this.updateTokenUI();

      // Завантажити історію цін
      await this.loadPriceHistory();

      // Завантажити транзакції
      await this.loadTransactions();

    } catch (error) {
      console.error('❌ Load token data error:', error);
      Utils.showNotification('Failed to load token data', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оновлення UI
   */
  updateTokenUI() {
    // Token price
    const priceEl = document.getElementById('tokenPrice');
    if (priceEl) {
      priceEl.textContent = Utils.formatBNB(ethers.utils.formatEther(this.tokenPrice)) + ' BNB';
    }

    // User balance
    const balanceEl = document.getElementById('userTokenBalance');
    if (balanceEl) {
      balanceEl.textContent = Utils.formatTokens(ethers.utils.formatEther(this.userBalance)) + ' GWT';
    }

    // BNB balance
    const bnbBalanceEl = document.getElementById('userBnbBalance');
    if (bnbBalanceEl) {
      bnbBalanceEl.textContent = Utils.formatBNB(ethers.utils.formatEther(this.bnbBalance)) + ' BNB';
    }

    // Total supply
    this.updateTotalSupply();

    // Market cap (якщо є total supply)
    this.updateMarketCap();
  }

  /**
   * Оновлення total supply
   */
  async updateTotalSupply() {
    try {
      const totalSupply = await contracts.getTotalSupply();
      const supplyEl = document.getElementById('totalSupply');
      if (supplyEl) {
        supplyEl.textContent = Utils.formatTokens(ethers.utils.formatEther(totalSupply)) + ' GWT';
      }
    } catch (error) {
      console.error('Update total supply error:', error);
    }
  }

  /**
   * Оновлення market cap
   */
  updateMarketCap() {
    const supplyEl = document.getElementById('totalSupply');
    const marketCapEl = document.getElementById('marketCap');

    if (supplyEl && marketCapEl) {
      const supply = parseFloat(supplyEl.textContent.replace(/[^0-9.]/g, ''));
      const price = parseFloat(ethers.utils.formatEther(this.tokenPrice));
      const marketCap = supply * price;
      marketCapEl.textContent = Utils.formatBNB(marketCap) + ' BNB';
    }
  }

  /**
   * Розрахунок кількості токенів при купівлі
   */
  calculateBuyTokens(bnbAmount) {
    if (!bnbAmount || parseFloat(bnbAmount) <= 0) {
      document.getElementById('buyTokensReceive').textContent = '0';
      return;
    }

    try {
      const bnb = ethers.utils.parseEther(bnbAmount);
      const price = this.tokenPrice;
      
      // Tokens = BNB / Price
      const tokens = bnb.mul(ethers.utils.parseEther('1')).div(price);
      
      const receiveEl = document.getElementById('buyTokensReceive');
      if (receiveEl) {
        receiveEl.textContent = Utils.formatTokens(ethers.utils.formatEther(tokens));
      }

    } catch (error) {
      console.error('Calculate buy error:', error);
    }
  }

  /**
   * Розрахунок BNB при продажу
   */
  calculateSellBnb(tokenAmount) {
    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      document.getElementById('sellBnbReceive').textContent = '0';
      return;
    }

    try {
      const tokens = ethers.utils.parseEther(tokenAmount);
      const price = this.tokenPrice;
      
      // BNB = Tokens * Price
      const bnb = tokens.mul(price).div(ethers.utils.parseEther('1'));
      
      const receiveEl = document.getElementById('sellBnbReceive');
      if (receiveEl) {
        receiveEl.textContent = Utils.formatBNB(ethers.utils.formatEther(bnb));
      }

    } catch (error) {
      console.error('Calculate sell error:', error);
    }
  }

  /**
   * Встановити максимум для купівлі
   */
  setBuyMax() {
    const bnbAmount = ethers.utils.formatEther(this.bnbBalance);
    const maxBnb = Math.max(0, parseFloat(bnbAmount) - 0.01); // Залишити 0.01 BNB на gas

    const input = document.getElementById('buyBnbAmount');
    if (input) {
      input.value = maxBnb.toFixed(4);
      this.calculateBuyTokens(maxBnb.toString());
    }
  }

  /**
   * Встановити максимум для продажу
   */
  setSellMax() {
    const tokenAmount = ethers.utils.formatEther(this.userBalance);

    const input = document.getElementById('sellTokenAmount');
    if (input) {
      input.value = tokenAmount;
      this.calculateSellBnb(tokenAmount);
    }
  }

  /**
   * Виконати купівлю
   */
  async executeBuy() {
    const input = document.getElementById('buyBnbAmount');
    if (!input || !input.value) {
      Utils.showNotification('Please enter BNB amount', 'warning');
      return;
    }

    const bnbAmount = input.value;

    if (!Utils.isValidBNBAmount(bnbAmount, 0.0001)) {
      Utils.showNotification('Invalid BNB amount', 'error');
      return;
    }

    // Підтвердження
    const confirmed = await Utils.confirm(
      `Buy tokens for ${bnbAmount} BNB?`,
      'Confirm Purchase'
    );

    if (!confirmed) return;

    Utils.showLoader(true, 'Buying tokens...');

    try {
      const tx = await contracts.buyTokens(bnbAmount);
      
      Utils.showNotification(
        `Transaction sent! Hash: ${tx.hash.substring(0, 10)}...`,
        'info',
        5000
      );

      await tx.wait();

      Utils.showNotification('Tokens purchased successfully!', 'success');

      // Оновити дані
      await this.loadTokenData();

      // Очистити input
      input.value = '';
      document.getElementById('buyTokensReceive').textContent = '0';

    } catch (error) {
      console.error('❌ Buy tokens error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Виконати продаж
   */
  async executeSell() {
    const input = document.getElementById('sellTokenAmount');
    if (!input || !input.value) {
      Utils.showNotification('Please enter token amount', 'warning');
      return;
    }

    const tokenAmount = input.value;

    if (!Utils.validateAmount(tokenAmount)) {
      Utils.showNotification('Invalid token amount', 'error');
      return;
    }

    // Перевірити баланс
    const balance = parseFloat(ethers.utils.formatEther(this.userBalance));
    if (parseFloat(tokenAmount) > balance) {
      Utils.showNotification('Insufficient token balance', 'error');
      return;
    }

    // Підтвердження
    const confirmed = await Utils.confirm(
      `Sell ${tokenAmount} GWT tokens?`,
      'Confirm Sale'
    );

    if (!confirmed) return;

    Utils.showLoader(true, 'Selling tokens...');

    try {
      const tx = await contracts.sellTokens(tokenAmount);
      
      Utils.showNotification(
        `Transaction sent! Hash: ${tx.hash.substring(0, 10)}...`,
        'info',
        5000
      );

      await tx.wait();

      Utils.showNotification('Tokens sold successfully!', 'success');

      // Оновити дані
      await this.loadTokenData();

      // Очистити input
      input.value = '';
      document.getElementById('sellBnbReceive').textContent = '0';

    } catch (error) {
      console.error('❌ Sell tokens error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Завантаження історії цін
   */
  async loadPriceHistory() {
    try {
      // TODO: Реалізувати завантаження історії з контракту або API
      // Поки що використовуємо поточну ціну
      this.priceHistory = [
        {
          timestamp: Date.now() - 86400000 * 7,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 0.9
        },
        {
          timestamp: Date.now() - 86400000 * 6,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 0.92
        },
        {
          timestamp: Date.now() - 86400000 * 5,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 0.95
        },
        {
          timestamp: Date.now() - 86400000 * 4,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 0.98
        },
        {
          timestamp: Date.now() - 86400000 * 3,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 1.0
        },
        {
          timestamp: Date.now() - 86400000 * 2,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 1.02
        },
        {
          timestamp: Date.now() - 86400000,
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice)) * 1.05
        },
        {
          timestamp: Date.now(),
          price: parseFloat(ethers.utils.formatEther(this.tokenPrice))
        }
      ];

      this.renderPriceChart();

    } catch (error) {
      console.error('Load price history error:', error);
    }
  }

  /**
   * Рендеринг графіку цін
   */
  renderPriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;

    // Простий canvas chart
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Очистити
    ctx.clearRect(0, 0, width, height);

    if (this.priceHistory.length === 0) return;

    // Знайти min/max
    const prices = this.priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Намалювати сітку
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Намалювати лінію цін
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    this.priceHistory.forEach((point, index) => {
      const x = (width / (this.priceHistory.length - 1)) * index;
      const y = height - ((point.price - minPrice) / priceRange) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Додати точки
    ctx.fillStyle = '#00d4ff';
    this.priceHistory.forEach((point, index) => {
      const x = (width / (this.priceHistory.length - 1)) * index;
      const y = height - ((point.price - minPrice) / priceRange) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Завантаження транзакцій
   */
  async loadTransactions() {
    try {
      // TODO: Реалізувати завантаження транзакцій з контракту
      // Поки що порожній список
      const container = document.getElementById('tokenTransactionsTable');
      if (container) {
        container.innerHTML = `
          <tr>
            <td colspan="5" class="text-center empty-state">
              No transactions yet
            </td>
          </tr>
        `;
      }

    } catch (error) {
      console.error('Load transactions error:', error);
    }
  }

  /**
   * Моніторинг ціни (кожні 30 секунд)
   */
  startPriceMonitoring() {
    setInterval(async () => {
      try {
        const newPrice = await contracts.getTokenPrice();
        
        if (!newPrice.eq(this.tokenPrice)) {
          this.tokenPrice = newPrice;
          this.updateTokenUI();
          
          // Додати до історії
          this.priceHistory.push({
            timestamp: Date.now(),
            price: parseFloat(ethers.utils.formatEther(newPrice))
          });

          // Обмежити історію (останні 100 точок)
          if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
          }

          this.renderPriceChart();
        }
      } catch (error) {
        console.error('Price monitoring error:', error);
      }
    }, 30000); // Кожні 30 секунд
  }
}

// Створити глобальний екземпляр
const tokensManager = new TokensManager();
