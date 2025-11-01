/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * Tokens Manager - ВИПРАВЛЕНО
 */

class TokensManager {
  constructor() {
    this.updateInterval = null;
  }

  async init() {
    console.log('💎 Initializing Tokens Manager...');
    
    if (!web3Manager.connected) {
      console.log('⚠️ Wallet not connected');
      return;
    }
    
    this.setupEventListeners();
    await this.loadTokensPage();
    this.setupAutoUpdate();
    
    console.log('✅ Tokens Manager initialized');
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refreshTokenHistory');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadTokenHistory());
    }
    
    const filterEl = document.getElementById('tokenHistoryFilter');
    if (filterEl) {
      filterEl.addEventListener('click', () => this.loadTokenHistory());
    }
    
    const addToWalletBtn = document.getElementById('addToWallet');
    if (addToWalletBtn) {
      addToWalletBtn.addEventListener('click', () => this.addToWallet());
    }
    
    const viewExplorerBtn = document.getElementById('viewExplorer');
    if (viewExplorerBtn) {
      viewExplorerBtn.addEventListener('click', () => {
        window.open(Utils.getExplorerLink(CONFIG.CONTRACTS.GWTToken), '_blank');
      });
    }
  }

  setupAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      if (web3Manager.connected) {
        try {
          await this.loadTokenBalance();
          await this.loadTokenStatistics();
        } catch (error) {
          console.error('Auto update failed:', error);
        }
      }
    }, 30000);
  }

  async loadTokensPage() {
    Utils.showLoader(true, 'Loading tokens...');
    
    try {
      await Promise.all([
        this.loadTokenBalance(),
        this.loadTokenStatistics(),
        this.loadTradingStatus(),
        this.loadLevelRewards(),
        this.loadTokenHistory(),
        this.updateContractInfo()
      ]);
      
      console.log('✅ Tokens page loaded');
      
    } catch (error) {
      console.error('❌ Load tokens page error:', error);
      Utils.showNotification('Failed to load tokens', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  async loadTokenBalance() {
    const address = web3Manager.address;
    
    const balance = await contracts.getTokenBalance(address);
    const tokenAmount = ethers.utils.formatEther(balance);
    
    const totalTokensEl = document.getElementById('totalTokens');
    if (totalTokensEl) {
      totalTokensEl.textContent = `${Utils.formatBNB(tokenAmount)} GWT`;
    }
    
    const price = await contracts.getTokenPrice();
    const tokenPrice = ethers.utils.formatEther(price);
    
    const currentPriceEl = document.getElementById('currentPrice');
    if (currentPriceEl) {
      currentPriceEl.textContent = `$${parseFloat(tokenPrice).toFixed(6)}`;
    }
    
    const value = parseFloat(tokenAmount) * parseFloat(tokenPrice);
    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) {
      totalValueEl.textContent = `$${value.toFixed(2)}`;
    }
  }

  async loadTokenStatistics() {
    try {
      const totalSupply = await contracts.contracts.gwtToken.totalSupply();
      const totalSupplyEl = document.getElementById('totalSupply');
      if (totalSupplyEl) {
        const formatted = Utils.formatNumber(ethers.utils.formatEther(totalSupply));
        totalSupplyEl.textContent = `${formatted} GWT`;
      }
      
      const circSupply = await contracts.contracts.gwtToken.getCirculatingSupply();
      const circSupplyEl = document.getElementById('circSupply');
      if (circSupplyEl) {
        const formatted = Utils.formatNumber(ethers.utils.formatEther(circSupply));
        circSupplyEl.textContent = `${formatted} GWT`;
      }
      
      const burnedBalance = await contracts.getTokenBalance(ethers.constants.AddressZero);
      const burnedTokensEl = document.getElementById('burnedTokens');
      if (burnedTokensEl) {
        const formatted = Utils.formatNumber(ethers.utils.formatEther(burnedBalance));
        burnedTokensEl.textContent = `${formatted} GWT`;
      }
      
      const price = await contracts.getTokenPrice();
      const tokenPrice = parseFloat(ethers.utils.formatEther(price));
      const marketCap = parseFloat(ethers.utils.formatEther(circSupply)) * tokenPrice;
      
      const marketCapEl = document.getElementById('marketCap');
      if (marketCapEl) {
        marketCapEl.textContent = `$${Utils.formatNumber(marketCap)}`;
      }
      
    } catch (error) {
      console.error('loadTokenStatistics error:', error);
    }
  }

  async loadTradingStatus() {
    try {
      const tradingEnabled = await contracts.contracts.gwtToken.getTradingEnabled();
      const currentPrice = await contracts.getTokenPrice();
      const price = parseFloat(ethers.utils.formatEther(currentPrice));
      
      const tradingSection = document.getElementById('tradingSection');
      if (!tradingSection) return;
      
      if (tradingEnabled && price >= 0.01) {
        tradingSection.querySelector('.status-text').textContent = 'Enabled';
        tradingSection.querySelector('.trading-controls').style.opacity = '1';
        
        const buyBtn = document.getElementById('buyBtn');
        const sellBtn = document.getElementById('sellBtn');
        const tradeAmount = document.getElementById('tradeAmount');
        
        if (buyBtn) buyBtn.disabled = false;
        if (sellBtn) sellBtn.disabled = false;
        if (tradeAmount) tradeAmount.disabled = false;
        
        this.setupTradingHandlers();
      }
      
    } catch (error) {
      console.error('loadTradingStatus error:', error);
    }
  }

  setupTradingHandlers() {
    // TODO: Implement trading handlers
  }

  loadLevelRewards() {
    const container = document.getElementById('levelRewards');
    if (!container) return;
    
    container.innerHTML = '';
    
    let total = 0;
    
    for (let i = 0; i < 12; i++) {
      const level = i + 1;
      const reward = CONFIG.TOKEN_REWARDS[i];
      total += reward;
      
      const item = document.createElement('div');
      item.className = 'reward-item';
      item.innerHTML = `
        <div class="reward-level">Level ${level}</div>
        <div class="reward-amount">+${reward} GWT</div>
      `;
      container.appendChild(item);
    }
    
    const totalEl = document.getElementById('totalPossibleRewards');
    if (totalEl) {
      totalEl.textContent = `${total.toLocaleString()} GWT`;
    }
  }

  async loadTokenHistory() {
    const tableBody = document.getElementById('tokenHistoryTable');
    if (!tableBody) return;
    
    try {
      tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Loading...</td></tr>';
      
      const address = web3Manager.address;
      
      const rewardFilter = contracts.contracts.gwtToken.filters.Transfer(ethers.constants.AddressZero, address);
      const rewardEvents = await contracts.contracts.gwtToken.queryFilter(rewardFilter);
      
      const allHistory = [
        ...rewardEvents.map(e => ({ type: 'Reward', event: e }))
      ];
      
      allHistory.sort((a, b) => b.event.blockNumber - a.event.blockNumber);
      
      if (allHistory.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="no-data">No token history yet</td>
          </tr>
        `;
        return;
      }
      
      const rows = await Promise.all(allHistory.slice(0, 50).map(async (item) => {
        const block = await item.event.getBlock();
        const amount = item.event.args.value;
        
        return `
          <tr>
            <td>${Utils.formatDate(block.timestamp)}</td>
            <td><span class="type-badge type-${item.type.toLowerCase()}">${item.type}</span></td>
            <td>-</td>
            <td>${Utils.formatBNB(ethers.utils.formatEther(amount))} GWT</td>
            <td><a href="${Utils.getExplorerLink(item.event.transactionHash)}" target="_blank">View</a></td>
          </tr>
        `;
      }));
      
      tableBody.innerHTML = rows.join('');
      
    } catch (error) {
      console.error('loadTokenHistory error:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="no-data">Failed to load history</td>
        </tr>
      `;
    }
  }

  updateContractInfo() {
    const addressEl = document.querySelector('.contract-address');
    if (addressEl) {
      addressEl.textContent = CONFIG.CONTRACTS.GWTToken;
    }
  }

  async addToWallet() {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONFIG.CONTRACTS.GWTToken,
            symbol: 'GWT',
            decimals: 18,
            image: `${window.location.origin}/assets/icons/logo-32x32.png`
          }
        }
      });
      Utils.showNotification('Token added to wallet', 'success');
    } catch (error) {
      console.error('Add to wallet error:', error);
      Utils.showNotification('Failed to add token', 'error');
    }
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

const tokensManager = new TokensManager();
