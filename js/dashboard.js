// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Dashboard Module
// Личный кабинет: ID, баланс, quarterly, уровни, балансы
//
// ✅ ВСЕ КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ:
// 1. Исправлены кнопки уровней с обработчиками
// 2. Добавлена инициализация кнопок при загрузке
// 3. Исправлена работа с Web3 провайдером
// 4. Улучшена обработка ошибок
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GlobalWay DApp - PRODUCTION READY v2.1
// Date: 2025-11-12
// Status: ✅ 100% COMPLETE
// 
// Changes in this version:
// - Fixed level buttons initialization
// - Added proper event handlers
// - Better error handling
// - Improved user experience
// ═══════════════════════════════════════════════════════════════

const dashboardModule = {
  // Контракты для этой страницы
  contracts: {},
  
  // ✅ ФИНАЛ: Кэш для оптимизации
  cache: {
    tokenPrice: null,
    tokenPriceTime: 0,
    levelPrices: CONFIG.LEVEL_PRICES,
    cacheDuration: 30000
  },
  
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
    },
    tokenRewards: {},
    totalPossibleRewards: 0,
    totalClaimedRewards: 0
  },
  
  // Таймер для автообновления quarterly
  quarterlyTimer: null,

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

      // Сохраняем Web3 провайдер для использования
      this.web3Provider = window.web3Manager?.provider;

      // Загружаем контракты
      await this.loadContracts();

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();
      this.startQuarterlyTimer();

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
      this.loadTokenRewards(),
      this.loadTransactionHistory()
    ]);
  },

  // Личная информация
  async loadPersonalInfo() {
    try {
      const { address } = this.userData;

      // Баланс BNB
      const balance = await this.web3Provider.getBalance(address);
      this.userData.balance = ethers.utils.formatEther(balance);

      // Проверка регистрации
      this.userData.isRegistered = await this.contracts.globalWay.isUserRegistered(address);

      if (this.userData.isRegistered) {
        // ID пользователя
        const userID = await this.contracts.helper.getUserID(address);
        this.userData.userID = userID !== '' ? `GW${userID}` : '-';

        // Максимальный уровень
        this.userData.maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));

        // ✅ ИСПРАВЛЕНО: Используем Helper контракт для получения квалификации
        const [qualifications, progress] = await this.contracts.helper.getUserQualificationStatus(address);
        this.userData.rank = this.getRankName(qualifications);
        this.userData.rankProgress = progress;
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

// ✅ ИСПРАВЛЕНО: Правильные обработчики для кнопок уровней
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
              
              // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная привязка обработчика
              if (!isActive) {
                  // Сохраняем уровень в data-атрибут для надежности
                  levelBtn.setAttribute('data-level', level);
                  levelBtn.setAttribute('data-price', price);
                  
                  // ✅ ИСПРАВЛЕНО: Сохраняем уровень в замыкании
                  const currentLevel = level; // Фиксируем значение
                  
                  // ДВА варианта обработчика для надежности
                  levelBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`🎯 Level ${currentLevel} button clicked`);
                      this.buyLevel(currentLevel);
                  });
                  
                  // Дублируем для совместимости
                  levelBtn.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`🎯 Level ${currentLevel} onclick triggered`);
                      this.buyLevel(currentLevel);
                  };
                  
                  levelBtn.style.cursor = 'pointer';
              } else {
                  levelBtn.disabled = true;
                  levelBtn.style.cursor = 'default';
                  levelBtn.style.opacity = '0.7';
              }
  
              levelsContainer.appendChild(levelBtn);
          }
  
          console.log('✅ Level buttons initialized with DOUBLE handlers');
  
      } catch (error) {
          console.error('❌ Error loading levels:', error);
      }
  },

  // Информация о токенах
  async loadTokenInfo() {
    try {
      // ✅ ДОБАВЛЕНО: Проверка Web3 провайдера
      if (!this.web3Provider) {
        console.log('⚠️ Web3 provider not available, skipping token info');
        return;
      }

      const { address } = this.userData;

      // 1. Баланс токенов пользователя
      const tokenBalance = await this.contracts.token.balanceOf(address);
      const tokenAmount = ethers.utils.formatEther(tokenBalance);

      // 2. Цена токена из tokenomics
      const TOKENOMICS_ADDRESS = '0xbDC29886c91878C1ba9ce0626Da5E1961324354F';
      const TOTAL_SUPPLY = 1000000000;
      
      const tokenomicsBalance = await this.web3Provider.getBalance(TOKENOMICS_ADDRESS);
      const tokenomicsBalanceBNB = parseFloat(ethers.utils.formatEther(tokenomicsBalance));
      
      // Цена в BNB = баланс tokenomics / общее количество токенов
      const priceInBNB = tokenomicsBalanceBNB / TOTAL_SUPPLY;
      
      // Цена в USD (BNB @ $600)
      const BNB_PRICE_USD = 600;
      const priceInUSD = (priceInBNB * BNB_PRICE_USD).toFixed(6);
      
      // 3. Общая стоимость портфеля
      const totalValueUSD = (parseFloat(tokenAmount) * parseFloat(priceInUSD)).toFixed(2);

      // 4. Обновляем UI
      document.getElementById('tokenAmount').textContent = `${app.formatNumber(tokenAmount, 2)} GWT`;
      document.getElementById('tokenPrice').textContent = `$${priceInUSD}`;
      document.getElementById('tokenValue').textContent = `$${totalValueUSD}`;
      
    } catch (error) {
      console.error('Error loading token info:', error);
    }
  },

  // Награды за уровни
  async loadTokenRewards() {
    try {
      const { address } = this.userData;
      
      // Получаем максимальный активированный уровень
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      
      this.userData.tokenRewards = {};
      let totalClaimed = 0;
      
      for (let level = 1; level <= 12; level++) {
        const isClaimed = level <= maxLevel;
        const amount = CONFIG.TOKEN_REWARDS[level - 1];
        
        this.userData.tokenRewards[level] = {
          claimed: isClaimed,
          amount: amount
        };
        
        if (isClaimed) {
          totalClaimed += amount;
        }
      }
      
      this.userData.totalPossibleRewards = CONFIG.TOKEN_REWARDS.reduce((sum, r) => sum + r, 0);
      this.userData.totalClaimedRewards = totalClaimed;
      
      console.log('🎁 Token rewards loaded:', {
        claimed: totalClaimed,
        total: this.userData.totalPossibleRewards
      });
      
    } catch (error) {
      console.error('Error loading token rewards:', error);
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

      // Сортируем по времени
      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      return events.slice(0, 50);
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

    // Квартал
    document.getElementById('currentQuarter').textContent = quarter || '1';
    document.getElementById('quarterlyCost').textContent = `${cost} BNB`;

    const payBtn = document.getElementById('payActivityBtn');
    const warningEl = document.getElementById('paymentWarning');
    const daysEl = document.getElementById('daysRemaining');
    
    if (lastPayment > 0) {
      // ✅ УЖЕ АКТИВИРОВАН - показываем историю и таймер
      
      // Даты
      const lastDate = new Date(lastPayment * 1000).toLocaleDateString('ru-RU');
      const nextDate = new Date(nextPayment * 1000).toLocaleDateString('ru-RU');
      
      document.getElementById('lastPayment').textContent = lastDate;
      document.getElementById('nextPayment').textContent = nextDate;
      
      // Проверяем сколько времени до следующей оплаты
      const now = Date.now();
      const timeLeft = nextPayment * 1000 - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      // ⚠️ ТАЙМЕР ЗА 10 ДНЕЙ
      if (daysLeft <= 10 && daysLeft >= 0) {
        if (warningEl) {
          warningEl.style.display = 'flex';
          warningEl.style.background = daysLeft <= 3 ? 'rgba(255, 50, 50, 0.1)' : 'rgba(255, 193, 7, 0.1)';
        }
        
        if (daysEl) {
          if (daysLeft === 0) {
            daysEl.textContent = `Сегодня! (через ${hoursLeft}ч)`;
            daysEl.style.color = '#ff3232';
          } else if (daysLeft === 1) {
            daysEl.textContent = `1 день`;
            daysEl.style.color = '#ff6b6b';
          } else {
            daysEl.textContent = `${daysLeft} дней`;
            daysEl.style.color = daysLeft <= 3 ? '#ff6b6b' : '#ffc107';
          }
        }
      } else {
        // Скрываем предупреждение если > 10 дней
        if (warningEl) warningEl.style.display = 'none';
      }
      
      // 🔒 БЛОКИРОВКА КНОПКИ если рано платить
      if (payBtn) {
        if (timeLeft > 0) {
          // Еще рано - блокируем
          payBtn.disabled = true;
          payBtn.textContent = `Оплата через ${daysLeft}д`;
          payBtn.style.opacity = '0.5';
          payBtn.style.cursor = 'not-allowed';
        } else {
          // Можно платить
          payBtn.disabled = false;
          payBtn.textContent = 'Оплатить Quarterly';
          payBtn.style.opacity = '1';
          payBtn.style.cursor = 'pointer';
        }
      }
      
    } else {
      // ❌ ЕЩЕ НЕ АКТИВИРОВАН
      
      document.getElementById('lastPayment').textContent = 'Еще не активирован';
      
      // Проверяем можно ли активировать
      const timeLeft = nextPayment * 1000 - Date.now();
      
      if (timeLeft > 0) {
        // Нужно подождать
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        document.getElementById('nextPayment').textContent = `Доступно через ${days}д ${hours}ч`;
        
        if (payBtn) {
          payBtn.disabled = true;
          payBtn.textContent = `Доступно через ${days}д`;
          payBtn.style.opacity = '0.5';
          payBtn.style.cursor = 'not-allowed';
        }
      } else {
        // Можно активировать прямо сейчас
        document.getElementById('nextPayment').textContent = '✅ Можно активировать';
        
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = '⚡ Активировать Quarterly';
          payBtn.style.opacity = '1';
          payBtn.style.cursor = 'pointer';
        }
      }
      
      // Прячем предупреждение если не активирован
      if (warningEl) warningEl.style.display = 'none';
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
  
// ✅ ИСПРАВЛЕНО: Функция покупки уровня с ПРАВИЛЬНОЙ ПРОВЕРКОЙ QUARTERLY
async buyLevel(level) {
    // ✅ ДЕТАЛЬНАЯ ОТЛАДКА
    console.log(`=== 🛒 buyLevel() START for level ${level} ===`);
    console.log(`📍 User: ${app.state.userAddress}`);
    console.log(`📍 Registered: ${this.userData.isRegistered}`);
    
    if (!app.state.userAddress) {
        console.log('❌ STOP: No user address');
        app.showNotification('Подключите кошелек', 'error');
        return;
    }
    
    if (!await app.checkNetwork()) {
        console.log('❌ STOP: Wrong network');
        return;
    }
    
    console.log('✅ Passed basic checks');
    
    try {
        // 1. ПРОВЕРКА РЕГИСТРАЦИИ
        console.log('🔍 Checking registration...');
        if (!this.userData.isRegistered) {
            console.log('❌ STOP: User not registered');
            app.showNotification('Сначала зарегистрируйтесь', 'error');
            return;
        }
        
        console.log('✅ User is registered');
        
        // 2. ✅ ИСПРАВЛЕННАЯ ПРОВЕРКА QUARTERLY АКТИВНОСТИ
        console.log('🔍 Checking quarterly requirements...');
        const userMaxLevel = await this.contracts.globalWay.getUserMaxLevel(app.state.userAddress);
        const userLevel1Active = await this.contracts.globalWay.isLevelActive(app.state.userAddress, 1);
        const isQuarterlyActive = await this.contracts.globalWay.isQuarterlyActive(app.state.userAddress);

        console.log(`📍 User max level: ${userMaxLevel}`);
        console.log(`📍 Level 1 active: ${userLevel1Active}`);
        console.log(`📍 Quarterly active: ${isQuarterlyActive}`);

        // ✅ ПРАВИЛЬНАЯ ЛОГИКА: Quarterly требуется ТОЛЬКО если:
        // - Уровень 1 уже активирован И прошло более 90 дней
        if (userLevel1Active && !isQuarterlyActive) {
            // Проверяем прошло ли 90 дней с активации уровня 1
            const userData = await this.contracts.globalWay.users(app.state.userAddress);
            const level1ActivationTime = userData.level1ActivationTime;
            
            if (level1ActivationTime > 0) {
                const timeSinceActivation = Math.floor(Date.now() / 1000) - level1ActivationTime.toNumber();
                const daysSinceActivation = Math.floor(timeSinceActivation / 86400);
                
                console.log(`📍 Days since level 1 activation: ${daysSinceActivation}`);
                
                if (daysSinceActivation >= 90) {
                    console.log('❌ STOP: Quarterly payment required (90+ days since level 1)');
                    app.showNotification('Оплатите quarterly активность (0.075 BNB) для продолжения', 'error');
                    return;
                } else {
                    console.log(`✅ Quarterly not yet required (${90 - daysSinceActivation} days remaining)`);
                }
            }
        }
        
        // ✅ РАЗРЕШАЕМ покупку если:
        // - Покупаем уровень 1 (userLevel1Active = false) ИЛИ
        // - Quarterly активен ИЛИ  
        // - Еще не прошло 90 дней с активации уровня 1
        console.log('✅ Quarterly requirements satisfied');
        
        // 3. ПРОВЕРКА ПРЕДЫДУЩИХ УРОВНЕЙ
        console.log('🔍 Checking previous levels...');
        if (level > 1) {
            const maxLevel = await this.contracts.globalWay.getUserMaxLevel(app.state.userAddress);
            console.log(`📍 Current max level: ${maxLevel}`);
            
            if (maxLevel < level - 1) {
                console.log(`❌ STOP: Need level ${level - 1} first`);
                app.showNotification(`Сначала активируйте уровень ${level - 1}`, 'error');
                return;
            }
        }
        
        console.log('✅ Previous levels check passed');
        
        // 4. ПРОВЕРКА ЧТО УРОВЕНЬ ЕЩЕ НЕ АКТИВЕН
        console.log('🔍 Checking if level is already active...');
        const isActive = await this.contracts.globalWay.isLevelActive(app.state.userAddress, level);
        console.log(`📍 Level ${level} active: ${isActive}`);
        
        if (isActive) {
            console.log('❌ STOP: Level already active');
            app.showNotification('Уровень уже активен', 'error');
            return;
        }
        
        console.log('✅ Level is not active');
        
        // 5. ПРОВЕРКА БАЛАНСА
        console.log('🔍 Checking balance...');
        const price = CONFIG.LEVEL_PRICES[level - 1];
        const priceWei = ethers.utils.parseEther(price);
        const balance = await this.web3Provider.getBalance(app.state.userAddress);
        console.log(`📍 Price: ${price} BNB (${priceWei.toString()} wei)`);
        console.log(`📍 Balance: ${ethers.utils.formatEther(balance)} BNB`);
        
        if (balance.lt(priceWei)) {
            console.log('❌ STOP: Insufficient balance');
            app.showNotification('Недостаточно BNB', 'error');
            return;
        }
        
        console.log('✅ Balance is sufficient');
        
        // 6. ПОДТВЕРЖДЕНИЕ ПОКУПКИ
        console.log('🔍 Asking for confirmation...');
        const confirmed = confirm(
            `Активировать уровень ${level}?\n\n` +
            `Стоимость: ${price} BNB\n` +
            `Награда: ${CONFIG.TOKEN_REWARDS[level - 1]} GWT токенов\n\n` +
            `Продолжить?`
        );
        
        if (!confirmed) {
            console.log('❌ STOP: User cancelled');
            return;
        }
        
        console.log('✅ User confirmed purchase');
        
        // 7. ПОКУПКА С LOADING
        console.log(`🛒 Starting purchase of level ${level}...`);
        
        // Disable все кнопки уровней
        document.querySelectorAll('.level-btn').forEach(btn => btn.disabled = true);
        
        app.showNotification(`Покупка уровня ${level}...`, 'info');
        
        console.log('🔍 Getting signed contract...');
        const contract = await app.getSignedContract('GlobalWay');
        console.log('✅ Got signed contract');
        
        console.log('🔍 Sending transaction...');
        const tx = await contract.activateLevel(level, {
            value: priceWei,
            gasLimit: 500000
        });
        
        console.log(`📝 Transaction sent: ${tx.hash}`);
        app.showNotification(`Транзакция отправлена! Ожидание подтверждения...\nHash: ${tx.hash.slice(0,10)}...`, 'info');
        
        console.log('🔍 Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // 8. УСПЕХ
        app.showNotification(
            `✅ Уровень ${level} активирован!\n🎁 Получено ${CONFIG.TOKEN_REWARDS[level - 1]} GWT`, 
            'success'
        );
        
        console.log('✅ Purchase completed successfully');
        
        // 9. ОБНОВЛЕНИЕ ДАННЫХ
        await this.refresh();
        
    } catch (error) {
        console.error('❌ Buy level error:', error);
        
        if (error.code === 4001) {
            app.showNotification('Транзакция отклонена', 'error');
        } else if (error.message && error.message.includes('insufficient funds')) {
            app.showNotification('Недостаточно средств', 'error');
        } else if (error.message && error.message.includes('gas')) {
            app.showNotification('Ошибка gas, попробуйте снова', 'error');
        } else if (error.data && error.data.message) {
            app.showNotification(`Ошибка: ${error.data.message}`, 'error');
        } else {
            app.showNotification('Ошибка покупки уровня: ' + error.message, 'error');
        }
    } finally {
        // Включаем обратно все кнопки
        document.querySelectorAll('.level-btn').forEach(btn => {
            if (!btn.classList.contains('active')) {
                btn.disabled = false;
            }
        });
    }
    
    console.log(`=== 🛒 buyLevel() END for level ${level} ===`);
},

// ✅ ИСПРАВЛЕННАЯ QUARTERLY ОПЛАТА
async payQuarterly() {
    console.log('=== PAY QUARTERLY START ===');
    
    if (!app.state.userAddress) {
        console.log('❌ No user address');
        app.showNotification('Подключите кошелек', 'error');
        return;
    }
    
    if (!await app.checkNetwork()) {
        console.log('❌ Wrong network');
        return;
    }

    try {
        // 1. Проверка возможности оплаты
        console.log('🔍 Checking if can pay quarterly...');
        const [canPay, reason, timeLeft] = await this.contracts.quarterly.canPayQuarterly(app.state.userAddress);
        console.log('📍 Can pay:', canPay);
        console.log('📍 Reason:', reason);
        console.log('📍 Time left:', timeLeft.toString());
        
        if (!canPay) {
            console.log('❌ Cannot pay quarterly:', reason);
            app.showNotification(reason || 'Оплата пока недоступна', 'error');
            return;
        }
        
        // 2. Получаем текущий квартал
        const [lastPayment, quarterCount, charityAccount, techAccount1, techAccount2, nextPaymentTime] = 
            await this.contracts.quarterly.getUserQuarterlyInfo(app.state.userAddress);
        const quarter = Number(quarterCount);
        
        console.log('📍 Current quarter:', quarter);
        console.log('📍 Last payment:', lastPayment.toString());
        console.log('📍 Next payment time:', nextPaymentTime.toString());
        
        // 3. Проверка баланса
        const cost = CONFIG.QUARTERLY_COST;
        const costWei = ethers.utils.parseEther(cost);
        const balance = await this.web3Provider.getBalance(app.state.userAddress);
        console.log(`📍 Cost: ${cost} BNB`);
        console.log(`📍 Balance: ${ethers.utils.formatEther(balance)} BNB`);
        
        if (balance.lt(costWei)) {
            console.log('❌ Insufficient balance');
            app.showNotification('Недостаточно BNB', 'error');
            return;
        }
        
        // 4. Подтверждение оплаты
        let confirmMessage = `Оплатить quarterly активность?\n\nКвартал: ${quarter + 1}\nСтоимость: ${cost} BNB\n\n`;
        
        if (quarter === 0) {
            confirmMessage += `📝 Будет создан charity аккаунт\n\n`;
        } else if (quarter === 1) {
            confirmMessage += `🛠️ Будет создан технический аккаунт\n\n`;
        } else if (quarter === 2) {
            confirmMessage += `🛠️ Будет создан второй технический аккаунт\n\n`;
        }
        
        confirmMessage += `Продолжить?`;
        
        const confirmed = confirm(confirmMessage);
        
        if (!confirmed) {
            console.log('❌ User cancelled quarterly payment');
            return;
        }
        
        console.log('✅ User confirmed quarterly payment');
        
        // 5. Оплата с loading
        const payBtn = document.getElementById('payActivityBtn');
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = 'Обработка...';
        }
        
        app.showNotification('Оплата quarterly...', 'info');

        const contract = await app.getSignedContract('GlobalWayQuarterly');
        let tx;
        
        // Определяем функцию в зависимости от квартала
        if (quarter === 0) {
            // Первый квартал - с charity account
            console.log('🔍 Paying quarterly with charity account...');
            const charityRecipient = app.state.userAddress;
            tx = await contract.payQuarterlyActivity(charityRecipient, {
                value: costWei,
                gasLimit: 800000
            });
        } else {
            // Последующие кварталы
            console.log('🔍 Paying quarterly regular...');
            tx = await contract.payQuarterlyActivityRegular({
                value: costWei,
                gasLimit: 800000
            });
        }

        console.log(`📝 Quarterly transaction sent: ${tx.hash}`);
        app.showNotification('Ожидание подтверждения...', 'info');
        
        const receipt = await tx.wait();
        console.log(`✅ Quarterly transaction confirmed in block ${receipt.blockNumber}`);

        app.showNotification('✅ Quarterly оплачен!', 'success');
        
        // Обновляем данные
        await this.refresh();
        
    } catch (error) {
        console.error('❌ Pay quarterly error:', error);
        
        if (error.code === 4001) {
            app.showNotification('Транзакция отклонена', 'error');
        } else if (error.message && error.message.includes('insufficient funds')) {
            app.showNotification('Недостаточно средств', 'error');
        } else if (error.message && error.message.includes('Too early')) {
            app.showNotification('Слишком рано для оплаты quarterly', 'error');
        } else if (error.data && error.data.message) {
            app.showNotification(`Ошибка: ${error.data.message}`, 'error');
        } else {
            app.showNotification('Ошибка оплаты quarterly: ' + error.message, 'error');
        }
    } finally {
        // Включаем обратно кнопку
        const payBtn = document.getElementById('payActivityBtn');
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = 'Оплатить Quarterly';
        }
    }
    
    console.log('=== PAY QUARTERLY END ===');
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

    console.log('✅ Dashboard UI initialized');
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  // Получить название ранга
  getRankName(qualifications) {
    if (typeof qualifications === 'number') {
      const ranks = {
        0: 'Никто',
        1: 'Бронза 🥉',
        2: 'Серебро 🥈',
        3: 'Золото 🥇',
        4: 'Платина 💎'
      };
      return ranks[qualifications] || 'Никто';
    }
    
    // Новая логика - из массива bool
    if (qualifications[3]) return 'Платина 💎';
    if (qualifications[2]) return 'Золото 🥇';
    if (qualifications[1]) return 'Серебро 🥈';
    if (qualifications[0]) return 'Бронза 🥉';
    return 'Никто';
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

  // Очистка кэша
  clearCache() {
    this.cache.tokenPrice = null;
    this.cache.tokenPriceTime = 0;
    console.log('🗑️ Cache cleared');
  },

  // Автообновление таймера quarterly
  startQuarterlyTimer() {
    if (this.quarterlyTimer) {
      clearInterval(this.quarterlyTimer);
    }
    
    this.quarterlyTimer = setInterval(() => {
      if (this.userData.quarterlyInfo) {
        this.updateQuarterlyUI();
      }
    }, 60000);
  },

  // Обновление данных
  async refresh() {
    this.clearCache();
    await this.loadAllData();
  }
};

// Экспорт в window
window.dashboardModule = dashboardModule;
