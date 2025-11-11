// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Dashboard Module
// Личный кабинет: ID, баланс, quarterly, уровни, балансы
// ═══════════════════════════════════════════════════════════════════

const dashboardModule = {
  // Контракты для этой страницы
  contracts: {},
  
  // Данные пользователя
  userData: {
    address: null,
    balance: '0',
    userID: null,
    rank: '-',
    isRegistered: false,
    maxLevel: 0,
    quarterlyInfo: null,
    balances: {
      marketing: '0',
      leader: '0',
      investment: '0'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('📊 Initializing Dashboard...');
    
    try {
      // Проверяем подключение кошелька
      if (!app.state.userAddress) {
        return;
      }

      this.userData.address = app.state.userAddress;

      // Загружаем контракты
      await this.loadContracts();

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.error('❌ Dashboard init error:', error);
      app.showNotification('Ошибка загрузки dashboard', 'error');
    }
  },

  // Загрузка контрактов
  async loadContracts() {
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.helper = await app.getContract('GlobalWayHelper');
    this.contracts.quarterly = await app.getContract('GlobalWayQuarterly');
    this.contracts.marketing = await app.getContract('GlobalWayMarketing');
    this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
    this.contracts.investment = await app.getContract('GlobalWayInvestment');
    this.contracts.stats = await app.getContract('GlobalWayStats');
    this.contracts.token = await app.getContract('GWTToken');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadPersonalInfo(),
      this.loadQuarterlyInfo(),
      this.loadBalances(),
      this.loadLevels(),
      this.loadTokenInfo(),
      this.loadTransactionHistory()
    ]);
  },

  // Личная информация
  async loadPersonalInfo() {
    try {
      const { address } = this.userData;
      // Баланс BNB
      const balance = await window.web3Manager.provider.getBalance(address);
      this.userData.balance = ethers.utils.formatEther(balance);
      // Проверка регистрации
      this.userData.isRegistered = await this.contracts.globalWay.isUserRegistered(address);
      if (this.userData.isRegistered) {
        // ID пользователя
        const userID = await this.contracts.helper.getUserID(address);
        this.userData.userID = userID !== '' ? `GW${userID}` : '-';
        // Максимальный уровень
        this.userData.maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));
        // ✅ ИСПРАВЛЕНО: Читаем ранг из LeaderPool
        const isFounder = await this.contracts.helper.isFounder(address);
      
        if (isFounder) {
          // Founders автоматически получают PLATINUM
          this.userData.rank = 'Платина ⭐';
        } else {
          // ✅ НОВОЕ: Ранг из LeaderPool
          const [rankEnum] = await this.contracts.leaderPool.getUserRankInfo(address);
          const rank = Number(rankEnum);
          
          switch (rank) {
            case 4: this.userData.rank = 'Платина ⭐'; break;
            case 3: this.userData.rank = 'Золото 🥇'; break;
            case 2: this.userData.rank = 'Серебро 🥈'; break;
            case 1: this.userData.rank = 'Бронза 🥉'; break;
            default: this.userData.rank = 'Никто'; break;
          }
        }
      }
      this.updatePersonalInfoUI();
    } catch (error) {
      console.error('Error loading personal info:', error);
    }
  },

  // Quarterly информация
  async loadQuarterlyInfo() {
    try {
      const { address } = this.userData;

      const [lastPayment, quarterCount, charityAccount, techAccount1, techAccount2, nextPaymentTime] = 
        await this.contracts.quarterly.getUserQuarterlyInfo(address);

      this.userData.quarterlyInfo = {
        quarter: Number(quarterCount),
        lastPayment: Number(lastPayment),
        nextPayment: Number(nextPaymentTime),
        cost: CONFIG.QUARTERLY_COST
      };

      this.updateQuarterlyUI();
    } catch (error) {
      console.error('Error loading quarterly info:', error);
    }
  },

  // Балансы контрактов
  async loadBalances() {
    try {
      const { address } = this.userData;

      // Marketing баланс
      const [referralBalance, matrixBalance] = await this.contracts.marketing.getUserBalances(address);
      this.userData.balances.marketing = ethers.utils.formatEther(referralBalance + matrixBalance);

      // Leader баланс
      const leaderBalance = await this.contracts.leaderPool.pendingRewards(address);
      this.userData.balances.leader = ethers.utils.formatEther(leaderBalance);

      // Investment баланс
      const investmentBalance = await this.contracts.investment.pendingWithdrawals(address);
      this.userData.balances.investment = ethers.utils.formatEther(investmentBalance);

      this.updateBalancesUI();
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  },

  // Информация об уровнях
  async loadLevels() {
    try {
      const { address } = this.userData;
      const levelsContainer = document.getElementById('individualLevels');
      if (!levelsContainer) return;

      levelsContainer.innerHTML = '';

      for (let level = 1; level <= 12; level++) {
        const isActive = await this.contracts.globalWay.isLevelActive(address, level);
        const price = CONFIG.LEVEL_PRICES[level - 1];

        const levelBtn = document.createElement('button');
        levelBtn.className = `level-btn ${isActive ? 'active' : ''}`;
        levelBtn.innerHTML = `
          <span class="level-number">${level}</span>
          <span class="level-price">${price} BNB</span>
        `;
        
        if (!isActive) {
          levelBtn.onclick = () => this.buyLevel(level);
        } else {
          levelBtn.disabled = true;
        }

        levelsContainer.appendChild(levelBtn);
      }
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  },

  // Информация о токенах
async loadTokenInfo() {
  try {
    const address = this.userData.address;
    
    // Баланс токенов
    const tokenBalance = await this.contracts.token.balanceOf(address);
    const tokenAmount = ethers.utils.formatEther(tokenBalance);
    
    // Цена токена
    const tokenPrice = await this.contracts.token.currentPrice();
    const priceInUSD = Number(ethers.utils.formatEther(tokenPrice)).toFixed(6);
    
    // Общая стоимость баланса
    const totalValue = (Number(tokenAmount) * Number(priceInUSD)).toFixed(2);
    
    // Заработанные токены из событий TokensMinted
    let earnedTokens = 0;
    try {
      const filter = this.contracts.token.filters.TokensMinted(address);
      const events = await this.contracts.token.queryFilter(filter, -10000);
      
      for (const event of events) {
        earnedTokens += Number(ethers.utils.formatEther(event.args.amount));
      }
    } catch (error) {
      console.error('Error loading earned tokens:', error);
    }
    
    // Стоимость заработанных токенов
    const earnedValue = (earnedTokens * Number(priceInUSD)).toFixed(2);
    
    // Обновляем UI
    document.getElementById('tokenAmount').textContent = `${app.formatNumber(tokenAmount, 8)} GWT`;
    document.getElementById('tokenPrice').textContent = `$${priceInUSD}`;
    document.getElementById('tokenValue').textContent = `$${totalValue}`;
    
    // Заработанные токены
    const earnedElement = document.getElementById('tokensEarned');
    const earnedValueElement = document.getElementById('tokensEarnedValue');
    if (earnedElement) earnedElement.textContent = `${app.formatNumber(earnedTokens, 2)} GWT`;
    if (earnedValueElement) earnedValueElement.textContent = `$${earnedValue}`;
    
  } catch (error) {
    console.error('Error loading token info:', error);
  }
},

  // История транзакций
  async loadTransactionHistory() {
    try {
      const tableBody = document.getElementById('historyTable');
      if (!tableBody) return;

      tableBody.innerHTML = '<tr><td colspan="6" class="no-data">Загрузка...</td></tr>';

      // Получаем события с контрактов
      const events = await this.getTransactionEvents();

      if (events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">Нет транзакций</td></tr>';
        return;
      }

      tableBody.innerHTML = events.map((event, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${event.level || '-'}</td>
          <td>${event.amount}</td>
          <td>${event.date}</td>
          <td>${event.txHash}</td>
          <td><span class="badge badge-${event.type}">${event.typeLabel}</span></td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading history:', error);
    }
  },

  // Получение событий транзакций
  async getTransactionEvents() {
    const { address } = this.userData;
    const events = [];

    try {
      // События покупки уровней
      const levelFilter = this.contracts.globalWay.filters.LevelActivated(address);
      const levelEvents = await this.contracts.globalWay.queryFilter(levelFilter, -10000);

      for (const event of levelEvents) {
        const block = await event.getBlock();
        events.push({
          level: Number(event.args.level),
          amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
          date: new Date(block.timestamp * 1000).toLocaleDateString(),
          txHash: event.transactionHash.slice(0, 10) + '...',
          type: 'level',
          typeLabel: 'Покупка уровня'
        });
      }

      // TODO: Fix filters -       // События партнерских бонусов
      // TODO:       // TODO: Fix filters -       const referralFilter = this.contracts.marketing.filters.ReferralBonusPaid(null, address);
      // TODO:       // TODO: Fix filters -       const referralEvents = await this.contracts.marketing.queryFilter(referralFilter, -10000);
      // TODO: Fix filters - 
      // TODO: Fix filters -       for (const event of referralEvents) {
      // TODO: Fix filters -         const block = await event.getBlock();
      // TODO: Fix filters -         events.push({
      // TODO: Fix filters -           level: Number(event.args.level),
      // TODO: Fix filters -           amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
      // TODO: Fix filters -           date: new Date(block.timestamp * 1000).toLocaleDateString(),
      // TODO: Fix filters -           txHash: event.transactionHash.slice(0, 10) + '...',
      // TODO: Fix filters -           type: 'partner',
      // TODO: Fix filters -           typeLabel: 'Партнерский бонус'
      // TODO: Fix filters -         });
      // TODO: Fix filters -       }

      // Сортируем по времени
      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      return events.slice(0, 50); // Последние 50
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  updatePersonalInfoUI() {
    const { address, balance, userID, rank } = this.userData;

    document.getElementById('userAddress').textContent = app.formatAddress(address);
    document.getElementById('userBalance').textContent = `${app.formatNumber(balance, 4)} BNB`;
    document.getElementById('userId').textContent = userID || '-';
    document.getElementById('userRank').textContent = rank;

    // Реферальная ссылка
    if (userID && userID !== '-') {
      const refID = userID.replace('GW', '');
      const refLink = `${window.location.origin}?ref=${refID}`;
      document.getElementById('refLink').value = refLink;
    }
  },

  updateQuarterlyUI() {
    const { quarter, lastPayment, nextPayment, cost } = this.userData.quarterlyInfo;

    document.getElementById('currentQuarter').textContent = quarter || '1';
    document.getElementById('quarterlyCost').textContent = `${cost} BNB`;

    if (lastPayment > 0) {
      document.getElementById('lastPayment').textContent = new Date(lastPayment * 1000).toLocaleDateString();
      document.getElementById('nextPayment').textContent = new Date(nextPayment * 1000).toLocaleDateString();
      
      // Проверяем близость следующего платежа
      const daysLeft = Math.floor((nextPayment * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 10) {
        document.getElementById('paymentWarning').style.display = 'flex';
        document.getElementById('daysRemaining').textContent = daysLeft;
      }
    } else {
      document.getElementById('lastPayment').textContent = '-';
      document.getElementById('nextPayment').textContent = '-';
    }
  },

  updateBalancesUI() {
    const { marketing, leader, investment } = this.userData.balances;

    document.getElementById('marketingBalance').textContent = `${app.formatNumber(marketing, 4)} BNB`;
    document.getElementById('leaderBalance').textContent = `${app.formatNumber(leader, 4)} BNB`;
    document.getElementById('investmentBalance').textContent = `${app.formatNumber(investment, 4)} BNB`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ДЕЙСТВИЯ
  // ═══════════════════════════════════════════════════════════════
  
  // Покупка уровня
  async buyLevel(level) {
    if (!await app.checkNetwork()) return;

    try {
      console.log(`🛒 Buying level ${level}...`);
      
      const price = CONFIG.LEVEL_PRICES[level - 1];
      console.log(`💰 Price: ${price} BNB`);
      
      app.showNotification(`Покупка уровня ${level}...`, 'info');

      // Получаем signed contract
      const contract = await app.getSignedContract('GlobalWay');
      console.log(`✅ Contract address: ${contract.address}`);
      console.log(`✅ Signer address: ${await contract.signer.getAddress()}`);
      
      // Проверяем баланс
      const balance = await contract.signer.getBalance();
      console.log(`💳 Balance: ${ethers.utils.formatEther(balance)} BNB`);
      
      if (balance.lt(ethers.utils.parseEther(price))) {
        app.showNotification('Недостаточно BNB для покупки', 'error');
        return;
      }
      
      // Вызываем функцию контракта
      console.log(`📤 Calling activateLevel(${level})...`);
      const tx = await contract.activateLevel(level, {
        value: ethers.utils.parseEther(price),
        gasLimit: 500000 // Явно указываем gas limit
      });
      
      console.log(`📝 Transaction hash: ${tx.hash}`);

      app.showNotification('Ожидание подтверждения...', 'info');
      const receipt = await tx.wait();
      
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`📋 Logs:`, receipt.logs);

      app.showNotification(`Уровень ${level} куплен! 🎉`, 'success');
      
      // Обновляем данные
      await this.refresh();
    } catch (error) {
      console.error('❌ Buy level error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error data:', error.data);
      
      if (error.code === 4001) {
        app.showNotification('Транзакция отклонена', 'error');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        app.showNotification('Недостаточно BNB', 'error');
      } else if (error.data && error.data.message) {
        app.showNotification(`Ошибка: ${error.data.message}`, 'error');
      } else {
        app.showNotification(`Ошибка покупки уровня: ${error.message}`, 'error');
      }
    }
  },

  // Оплата Quarterly
  async payQuarterly() {
    if (!await app.checkNetwork()) return;

    try {
      app.showNotification('Оплата quarterly...', 'info');

      const contract = await app.getSignedContract('GlobalWayQuarterly');
      const tx = await contract.payQuarterlyActivityRegular({
        value: ethers.utils.parseEther(CONFIG.QUARTERLY_COST)
      });

      app.showNotification('Ожидание подтверждения...', 'info');
      await tx.wait();

      app.showNotification('Quarterly оплачен! 🎉', 'success');
      
      await this.refresh();
    } catch (error) {
      console.error('Pay quarterly error:', error);
      if (error.code === 4001) {
        app.showNotification('Транзакция отклонена', 'error');
      } else {
        app.showNotification('Ошибка оплаты', 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    // Кнопка копирования реф. ссылки
    const copyBtn = document.getElementById('copyRefLink');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const refLink = document.getElementById('refLink').value;
        app.copyToClipboard(refLink);
      };
    }

    // Кнопка оплаты quarterly
    const payBtn = document.getElementById('payActivityBtn');
    if (payBtn) {
      payBtn.onclick = () => this.payQuarterly();
    }

    // Фильтр истории
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
      historyFilter.onchange = () => this.filterHistory();
    }

    // Обновление истории
    const refreshBtn = document.getElementById('refreshHistory');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadTransactionHistory();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  getRankName(rankQualified) {
    if (rankQualified[3]) return 'Платина';
    if (rankQualified[2]) return 'Золото';
    if (rankQualified[1]) return 'Серебро';
    if (rankQualified[0]) return 'Бронза';
    return 'Никто';
  },

  showConnectionAlert() {
    const alert = document.getElementById('connectionAlert');
    if (alert) {
      alert.style.display = 'block';
      document.getElementById('alertMessage').textContent = 'Подключите кошелек для доступа';
      document.getElementById('alertAction').textContent = 'Подключить';
      document.getElementById('alertAction').onclick = () => {
        window.web3Manager.connect();
      };
    }
  },

  filterHistory() {
    const filterValue = document.getElementById('historyFilter').value;
    const rows = document.querySelectorAll('#historyTable tr');

    rows.forEach(row => {
      if (filterValue === 'all') {
        row.style.display = '';
      } else {
        const badge = row.querySelector('.badge');
        if (badge && badge.classList.contains(`badge-${filterValue}`)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      }
    });
  },

  // Обновление данных
  async refresh() {
    await this.loadAllData();
  }
};

// Экспорт в window
window.dashboardModule = dashboardModule;
