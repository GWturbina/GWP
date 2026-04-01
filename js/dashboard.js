// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Dashboard Module
// Личный кабинет: ID, баланс, quarterly, уровни, балансы
// ПОЛНОСТЬЮ ПЕРЕПИСАН под новые контракты
// Date: 2025-01-19
// ═══════════════════════════════════════════════════════════════════

const dashboardModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  cache: {
    tokenPrice: null,
    tokenPriceTime: 0,
    cacheDuration: CONFIG.CACHE.tokenPriceDuration
  },

    allEvents: [],

  // ✅ SECURITY: Rate limiting state
  _isLoading: false,
  _lastLoadTime: 0,
  _lastBuyTime: 0,
  _loadCooldown: 5000,  // минимум 5 сек между полными загрузками
  
  userData: {
    address: null,
    balance: '0',
    userId: null,
    rank: '-',
    isRegistered: false,
    maxLevel: 0,
    quarterlyInfo: null,
    balances: {
      // ❌ УБРАНО: partner - платежи идут сразу на кошельки
      leader: '0',      // ✅ Пул лидеров (6%) - накапливается в контракте
      investment: '0',  // ✅ Инвестиционный пул (5%) - накапливается в контракте
      pension: '0'      // ✅ Пенсионный баланс - накапливается в QuarterlyPayments
    },
    tokenBalance: '0',
    totalEarnings: '0'
  },
  
  quarterlyTimer: null,
  buyLevelInProgress: false,

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('📊 Initializing Dashboard...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address, showing connect prompt');
        return;
      }

      this.userData.address = app.state.userAddress;
      this.web3Provider = window.web3Manager?.provider;

      await this.loadContracts();
      await this.loadAllData();
      this.initUI();
      this.startQuarterlyTimer();

      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.error('❌ Dashboard init error:', error);
      app.showNotification((_t('notifications.dashboardError')), 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts...');
    
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.quarterlyPayments = await app.getContract('QuarterlyPayments');
    this.contracts.partnerProgram = await app.getContract('PartnerProgram');
    this.contracts.matrixPayments = await app.getContract('MatrixPayments');
    this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
    this.contracts.investment = await app.getContract('GlobalWayInvestment');
    this.contracts.stats = await app.getContract('GlobalWayStats');
    this.contracts.token = await app.getContract('GWTToken');
    
    console.log('✅ All contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    // ✅ SECURITY: Предотвращение параллельных загрузок и спама
    const now = Date.now();
    if (this._isLoading) {
      console.log('⚠️ loadAllData already in progress, skipping');
      return;
    }
    if (now - this._lastLoadTime < this._loadCooldown) {
      console.log('⚠️ loadAllData cooldown active, skipping');
      return;
    }
    
    this._isLoading = true;
    this._lastLoadTime = now;
    
    try {
      await Promise.all([
        this.loadPersonalInfo(),
        this.loadQuarterlyInfo(),
        this.loadBalances(),
        this.loadLevels(),
        this.loadTokenInfo(),
        this.loadTransactionHistory()
      ]);
    } finally {
      this._isLoading = false;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЛИЧНАЯ ИНФОРМАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async loadPersonalInfo() {
    try {
      const { address } = this.userData;
      console.log('👤 Loading personal info for', address);

      // 1. Баланс BNB
      const balance = await this.web3Provider.getBalance(address);
      this.userData.balance = ethers.utils.formatEther(balance);

      // 2. Проверка регистрации - 🔥 FIX: используем MatrixRegistry как в app.js
      // Также проверяем app.state.isRegistered как fallback
      try {
        this.userData.isRegistered = await this.contracts.matrixRegistry.isRegistered(address);
        console.log('📋 Dashboard registration check (MatrixRegistry):', this.userData.isRegistered);
      } catch (e) {
        console.warn('⚠️ MatrixRegistry check failed, using app.state:', e.message);
        this.userData.isRegistered = app.state.isRegistered || false;
      }
      
      // Fallback: если app.js уже загрузил данные, используем их
      if (!this.userData.isRegistered && app.state.isRegistered) {
        console.log('📋 Using app.state.isRegistered as fallback');
        this.userData.isRegistered = true;
      }

      if (this.userData.isRegistered) {
        // 3. User ID - также с fallback на app.state
        try {
          const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
          this.userData.userId = userId.toString();
        } catch (e) {
          console.warn('⚠️ getUserIdByAddress failed, using app.state:', e.message);
          this.userData.userId = app.state.userId || null;
        }
        
        // Fallback
        if (!this.userData.userId && app.state.userId) {
          this.userData.userId = app.state.userId;
        }

        // 4. Максимальный уровень
        try {
          const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
          this.userData.maxLevel = Number(maxLevel);
        } catch (e) {
          console.warn('⚠️ getUserMaxLevel failed, using app.state:', e.message);
          this.userData.maxLevel = app.state.maxLevel || 0;
        }

        // 5. Ранг (из LeaderPool)
        try {
          const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
          this.userData.rank = this.getRankName(Number(rankInfo.rank));
        } catch (e) {
          console.warn('⚠️ Could not get rank:', e);
          this.userData.rank = (_t('ranks.bronze'));
        }

        console.log('✅ Personal info loaded:', {
          userId: this.userData.userId,
          maxLevel: this.userData.maxLevel,
          rank: this.userData.rank
        });
      }

      this.updatePersonalInfoUI();
    } catch (error) {
      console.error('❌ Error loading personal info:', error);
    }
  },

async loadQuarterlyInfo() {
  try {
    const { address } = this.userData;
    console.log('📅 Loading quarterly info...');
    
    const info = await this.contracts.quarterlyPayments.quarterlyInfo(address);
    const lastPayment = Number(info[0] || 0);
    const quartersPaid = Number(info[1] || 0);
    
    const QUARTERLY_INTERVAL = 7776000; // 90 дней
    const WARNING_PERIOD = 86400; // 1 день до окончания
    const now = Math.floor(Date.now() / 1000);
    
    let canPay, nextPayment, daysRemaining, status;
    
    if (lastPayment === 0) {
      // Ещё не было квартальных платежей
      // Нужно получить дату активации уровня 1
      try {
        const activationTime = await this.getLevel1ActivationTime(address);
        
        if (activationTime === 0) {
          // Уровень 1 не активирован
          canPay = false;
          nextPayment = 0;
          daysRemaining = 0;
          status = _t('dashboard.activateFirst');
        } else {
          // Уровень 1 активирован — считаем от даты активации
          nextPayment = activationTime + QUARTERLY_INTERVAL;
          const timeUntilNext = nextPayment - now;
          daysRemaining = Math.max(0, Math.ceil(timeUntilNext / 86400));
          
          if (timeUntilNext <= 0) {
            canPay = true;
            status = '⚠️ ' + _t('dashboard.quarterExpired');
          } else if (timeUntilNext <= WARNING_PERIOD) {
            canPay = true;
            status = _t('dashboard.canActivate');
          } else {
            canPay = false;
            status = _t('dashboard.availableIn') + ' ' + daysRemaining + ' ' + _t('common.days');
          }
        }
      } catch(e) {
        console.warn('⚠️ Could not get activation time:', e.message);
        canPay = false;
        nextPayment = 0;
        daysRemaining = 0;
        status = _t('dashboard.notActivated');
      }
    } else {
      // Уже были квартальные платежи — считаем от последнего
      nextPayment = lastPayment + QUARTERLY_INTERVAL;
      const timeUntilNext = nextPayment - now;
      daysRemaining = Math.max(0, Math.ceil(timeUntilNext / 86400));
      
      if (timeUntilNext <= 0) {
        canPay = true;
        status = '⚠️ ' + _t('dashboard.quarterExpired');
      } else if (timeUntilNext <= WARNING_PERIOD) {
        canPay = true;
        status = _t('dashboard.canActivate');
      } else {
        canPay = false;
        status = _t('dashboard.availableIn') + ' ' + daysRemaining + ' ' + _t('common.days');
      }
    }
    
    let pensionBalance = '0';
    try {
      const pension = await this.contracts.quarterlyPayments.getPensionBalance(address);
      pensionBalance = ethers.utils.formatEther(pension);
    } catch(e) {
      console.warn('⚠️ Could not get pension:', e.message);
    }
    
    this.userData.quarterlyInfo = {
      canPay,
      quarter: lastPayment === 0 ? 1 : quartersPaid + 1,
      lastPayment,
      nextPayment,
      daysRemaining,
      status,
      cost: CONFIG.QUARTERLY_COST || '0.075',
      pensionBalance
    };
    
    console.log('✅ Quarterly info loaded:', this.userData.quarterlyInfo);
    this.updateQuarterlyUI();
    
  } catch (error) {
    console.error('❌ Error loading quarterly info:', error);
    this.userData.quarterlyInfo = {
      canPay: false,
      quarter: 0,
      lastPayment: 0,
      nextPayment: 0,
      daysRemaining: 0,
      status: _t('common.loadError'),
      cost: CONFIG.QUARTERLY_COST || '0.075',
      pensionBalance: '0'
    };
    this.updateQuarterlyUI();
  }
},

  // Новая функция для получения времени активации уровня 1
  async getLevel1ActivationTime(address) {
    try {
      // Получаем registrationTime из MatrixRegistry
      const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      const node = await this.contracts.matrixRegistry.matrixNodes(userId);
      const registrationTime = Number(node[6]);
    
      if (registrationTime > 0) {
        return registrationTime;
      }
    
      return 0;
    } catch(e) {
      console.warn('⚠️ getLevel1ActivationTime error:', e.message);
      return 0;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // БАЛАНСЫ КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadBalances() {
    try {
      const { address } = this.userData;
      console.log('💰 Loading balances...');

      // ✅ ИСПОЛЬЗУЕМ GlobalWayStats.getUserBalances()
      try {
        const balances = await this.contracts.stats.getUserBalances(address);
        // balances: (partnerFromSponsor, partnerFromUpline, matrixEarnings, 
        //            matrixFrozen, pensionBalance, leaderBalance, totalBalance)
      
        // ❌ УБРАНО: partner - платежи идут сразу на кошелёк
        // const partnerTotal = balances[0].add(balances[1]);
        // this.userData.balances.partner = ethers.utils.formatEther(partnerTotal);
      
        // ✅ Только балансы из контрактов
        this.userData.balances.leader = ethers.utils.formatEther(balances[5]); // leaderBalance
        this.userData.balances.investment = ethers.utils.formatEther(balances[4]); // pensionBalance (на самом деле investment)
      
        // ✅ Пенсия отдельно из QuarterlyPayments
        try {
          const pension = await this.contracts.quarterlyPayments.getPensionBalance(address);
          this.userData.balances.pension = ethers.utils.formatEther(pension);
        } catch (e) {
          this.userData.balances.pension = '0';
        }
      
        console.log('✅ Balances loaded from GlobalWayStats:', this.userData.balances);
      } catch (e) {
        console.warn('⚠️ Could not get balances from Stats:', e.message);
      
        // Фолбек: получаем из отдельных контрактов
        try {
          const pendingReward = await this.contracts.leaderPool.pendingRewards(address);
          this.userData.balances.leader = ethers.utils.formatEther(pendingReward);
        } catch (e2) {
          this.userData.balances.leader = '0';
        }
        
        this.userData.balances.investment = '0';
      
        try {
          const pension = await this.contracts.quarterlyPayments.getPensionBalance(address);
         this.userData.balances.pension = ethers.utils.formatEther(pension);
       } catch (e2) {
         this.userData.balances.pension = '0';
       }
     }

     console.log('✅ Balances loaded:', this.userData.balances);
     this.updateBalancesUI();
    
   } catch (error) {
     console.error('❌ Error loading balances:', error);
     this.userData.balances = {
       leader: '0',
       investment: '0',
       pension: '0'
     };
     this.updateBalancesUI();
   }
  },

  // ═══════════════════════════════════════════════════════════════
  // УРОВНИ (КНОПКИ 1-12)
  // ═══════════════════════════════════════════════════════════════
  async loadLevels() {
    try {
      const { address } = this.userData;
      const levelsContainer = document.getElementById('individualLevels');
      if (!levelsContainer) return;

      // ✅ SECURITY: Проверка что кошелёк подключён
      if (!address || !app.state.userAddress) {
        console.log('⚠️ loadLevels: no wallet connected');
        return;
      }

      console.log('🔘 Loading levels...');

      // ✅ FIX: Атомарный рендер — сначала загружаем ВСЕ статусы, потом рендерим
      const levelStatuses = [];
      for (let level = 1; level <= 12; level++) {
        const isActive = await this.contracts.globalWay.isLevelActive(address, level);
        levelStatuses.push({ level, isActive, price: CONFIG.LEVEL_PRICES[level - 1] });
      }

      // Если дошли сюда — ВСЕ вызовы успешны, можно рендерить
      levelsContainer.innerHTML = '';

      for (const { level, isActive, price } of levelStatuses) {
        const levelBtn = document.createElement('button');
        levelBtn.className = `level-btn ${isActive ? 'active' : ''}`;
        levelBtn.innerHTML = `
          <span class="level-number">${level}</span>
          <span class="level-price">${price} BNB</span>
        `;
        
        if (!isActive) {
          levelBtn.setAttribute('data-level', level);
          levelBtn.setAttribute('data-price', price);
          
          const currentLevel = level;
          const self = this;
          
          // Флаг для предотвращения двойных вызовов
          let isProcessing = false;
          
          const handleLevelClick = async (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            
            if (isProcessing) {
              console.log(`⚠️ Level ${currentLevel} click already processing`);
              return;
            }
            
            isProcessing = true;
            console.log(`🎯 Level ${currentLevel} triggered (${e ? e.type : 'direct'})`);
            
            try {
              await self.buyLevel(currentLevel);
            } finally {
              isProcessing = false;
            }
          };
          
          // Click для десктопа
          levelBtn.addEventListener('click', handleLevelClick);
          
          // Touchend для мобильных с задержкой для предотвращения ghost clicks
          levelBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Небольшая задержка чтобы избежать проблем с touch
            setTimeout(() => handleLevelClick(e), 50);
          }, { passive: false });
          
          // Стили для мобильных
          levelBtn.style.cursor = 'pointer';
          levelBtn.style.touchAction = 'manipulation';
          levelBtn.style.webkitTapHighlightColor = 'transparent';
        } else {
          levelBtn.disabled = true;
          levelBtn.style.cursor = 'default';
          levelBtn.style.opacity = '0.7';
        }

        levelsContainer.appendChild(levelBtn);
      }

      console.log('✅ Level buttons created');

    } catch (error) {
      console.error('❌ Error loading levels:', error);
      // ✅ FIX: При ошибке показываем предупреждение вместо пустых/ошибочных кнопок
      const levelsContainer = document.getElementById('individualLevels');
      if (levelsContainer) {
        levelsContainer.innerHTML = '<div style="color:#ff6b6b;text-align:center;padding:16px;font-size:14px;">⚠️ ' + 
          escapeHtml(_t('notifications.levelsLoadError') || 'Ошибка загрузки уровней. Обновите страницу.') + '</div>';
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНФОРМАЦИЯ О ТОКЕНАХ
  // ═══════════════════════════════════════════════════════════════
  async loadTokenInfo() {
    try {
      if (!this.web3Provider) {
        console.log('⚠️ Web3 provider not available');
        return;
      }

      const { address } = this.userData;
      console.log('🪙 Loading token info...');

      // 1. Баланс токенов
      const tokenBalance = await this.contracts.token.balanceOf(address);
      this.userData.tokenBalance = ethers.utils.formatEther(tokenBalance);

      // 2. Цена токена (можно взять из Stats контракта или рассчитать)
      // Пока используем простую логику
      const totalSupply = await this.contracts.token.totalSupply();
      const tokenPrice = 0.000001; // Примерная цена в BNB

      // 3. Обновляем UI
      const tokenAmount = document.getElementById('tokenAmount');
      const tokenPriceEl = document.getElementById('tokenPrice');
      const tokenValue = document.getElementById('tokenValue');

      if (tokenAmount) {
        tokenAmount.textContent = `${app.formatNumber(this.userData.tokenBalance, 2)} GWT`;
      }
      
      if (tokenPriceEl) {
        tokenPriceEl.textContent = `$${(tokenPrice * 600).toFixed(6)}`; // BNB @ $600
      }
      
      if (tokenValue) {
        const valueUSD = parseFloat(this.userData.tokenBalance) * tokenPrice * 600;
        tokenValue.textContent = `$${valueUSD.toFixed(2)}`;
      }

      console.log('✅ Token info loaded');
      
    } catch (error) {
      console.error('❌ Error loading token info:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ТРАНЗАКЦИЙ
  // ═══════════════════════════════════════════════════════════════
  async loadTransactionHistory() {
    try {
      const tableBody = document.getElementById('historyTable');
      if (!tableBody) return;
      console.log('📜 Loading transaction history...');
      tableBody.innerHTML = '<tr><td colspan="6" class="no-data">' + _t('common.loading') + '</td></tr>';
    
      this.allEvents = await this.getTransactionEvents();
    
      if (this.allEvents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">' + _t('common.noTransactions') + '</td></tr>';
        return;
      }
    
      this.applyHistoryFilter();

      console.log('✅ Transaction history loaded');
    } catch (error) {
      console.error('❌ Error loading history:', error);
    }
  },

  applyHistoryFilter() {
    const tableBody = document.getElementById('historyTable');
    const filterSelect = document.getElementById('historyFilter');
    
    if (!tableBody || !filterSelect) return;
  
    const filterType = filterSelect.value;
  
    const filteredEvents = filterType === 'all' 
      ? this.allEvents 
      : this.allEvents.filter(e => e.type === filterType);
  
    if (filteredEvents.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="no-data">' + _t('common.noTransactionsType') + '</td></tr>';
      return;
    }
    
    tableBody.innerHTML = filteredEvents.map((event, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(String(event.level || '-'))}</td>
        <td>${escapeHtml(String(event.amount))}</td>
        <td>${escapeHtml(String(event.date))}</td>
        <td><a href="${escapeHtml(CONFIG.NETWORK.blockExplorer)}/tx/${escapeHtml(event.txHash)}" target="_blank" rel="noopener">${escapeHtml(event.txHash.slice(0, 10))}...</a></td>
        <td><span class="badge badge-${escapeHtml(event.type)}">${escapeHtml(event.typeLabel)}</span></td>
      </tr>
    `).join('');
  },

  // ✅ ИСПРАВЛЕНО: queryFilter с чанками — opBNB реальный безопасный лимит 5000 блоков
  async queryFilterChunked(contract, filter, blocksBack = 50000, chunkSize = 5000) {
    try {
      const provider = contract.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blocksBack);
      
      const results = [];
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        try {
          const chunk = await contract.queryFilter(filter, start, end);
          results.push(...chunk);
        } catch (e) {
          console.warn(`⚠️ Chunk ${start}-${end} failed: ${e.message}`);
        }
      }
      return results;
    } catch (e) {
      console.warn('⚠️ queryFilterChunked error:', e.message);
      return [];
    }
  },

  async getTransactionEvents() {
    const { address } = this.userData;
    const events = [];
  
    try {
      const BLOCKS_BACK = 50000; // ✅ FIX: уменьшено — opBNB стабильно работает с 50k блоков при чанках по 5k
      
      try {
        const levelFilter = this.contracts.globalWay.filters.LevelActivated(address);
        const levelEvents = await this.queryFilterChunked(this.contracts.globalWay, levelFilter, BLOCKS_BACK);
        
        for (const event of levelEvents) {
          events.push({
            blockNumber: event.blockNumber,
            level: Number(event.args.level),
            amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
            timestamp: 0,
            txHash: event.transactionHash,
            type: 'level',
            typeLabel: _t('dashboard.txTypes.levelPurchase')
          });
        }
      } catch (e) {
        console.warn('⚠️ Could not load level events:', e.message);
      }
      
      try {
        const sponsorFilter = this.contracts.partnerProgram.filters.SponsorPaid(null, address);
        const sponsorEvents = await this.queryFilterChunked(this.contracts.partnerProgram, sponsorFilter, BLOCKS_BACK);
        
        for (const event of sponsorEvents) {
          events.push({
            blockNumber: event.blockNumber,
            level: Number(event.args.level || 0),
            amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
            timestamp: 0,
            txHash: event.transactionHash,
            type: 'partner',
            typeLabel: _t('dashboard.txTypes.partnerBonus')
          });
        }
        
        const uplineFilter = this.contracts.partnerProgram.filters.UplinePaid(null, address);
        const uplineEvents = await this.queryFilterChunked(this.contracts.partnerProgram, uplineFilter, BLOCKS_BACK);
      
        for (const event of uplineEvents) {
          events.push({
            blockNumber: event.blockNumber,
            level: Number(event.args.fromLevel || 0),
            amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
            timestamp: 0,
            txHash: event.transactionHash,
            type: 'partner',
            typeLabel: _t('dashboard.txTypes.partnerUpline')
          });
        }
      } catch (e) {
        console.warn('⚠️ Could not load partner events:', e.message);
      }
    
      try {
        const matrixFilter = this.contracts.matrixPayments.filters.MatrixPaymentSent(null, address);
        const matrixEvents = await this.queryFilterChunked(this.contracts.matrixPayments, matrixFilter, BLOCKS_BACK);
        
        for (const event of matrixEvents) {
          events.push({
            blockNumber: event.blockNumber,
            level: Number(event.args.level || 0),
            amount: ethers.utils.formatEther(event.args.amount) + ' BNB',
            timestamp: 0,
            txHash: event.transactionHash,
            type: 'matrix',
            typeLabel: _t('dashboard.txTypes.matrixBonus')
          });
        }
      } catch (e) {
        console.warn('⚠️ Could not load matrix events:', e.message);
      }
    
      try {
        const quarterlyFilter = this.contracts.quarterlyPayments.filters.QuarterlyPaid(address);
        const quarterlyEvents = await this.queryFilterChunked(this.contracts.quarterlyPayments, quarterlyFilter, BLOCKS_BACK);
      
        for (const event of quarterlyEvents) {
          events.push({
            blockNumber: event.blockNumber,
            level: '-',
            amount: ethers.utils.formatEther(event.args.amount || '0') + ' BNB',
            timestamp: 0,
            txHash: event.transactionHash,
            type: 'quarterly',
            typeLabel: _t('dashboard.txTypes.quarterlyActivity')
          });
        }
      } catch (e) {
        console.warn('⚠️ Could not load quarterly events:', e.message);
      }
    
      events.sort((a, b) => b.blockNumber - a.blockNumber);
    
      const limitedEvents = events.slice(0, 50);
      
      for (const event of limitedEvents) {
        try {
          const block = await this.contracts.globalWay.provider.getBlock(event.blockNumber);
          event.timestamp = block.timestamp;
          event.date = new Date(block.timestamp * 1000).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          event.date = '-';
        }
      }
    
      return limitedEvents;
    
    } catch (error) {
      console.error('❌ Error getting events:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  updatePersonalInfoUI() {
    const { address, balance, userId, rank } = this.userData;

    const userAddress = document.getElementById('userAddress');
    const userBalance = document.getElementById('userBalance');
    const userIdEl = document.getElementById('userId');
    const userRank = document.getElementById('userRank');

    if (userAddress) userAddress.textContent = app.formatAddress(address);
    if (userBalance) userBalance.textContent = `${app.formatNumber(balance, 4)} BNB`;
    if (userIdEl) userIdEl.textContent = userId ? `GW${userId}` : '-';
    if (userRank) userRank.textContent = rank;

    // Реферальная ссылка
    if (userId) {
      const refLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
      const refLinkInput = document.getElementById('refLink');
      if (refLinkInput) refLinkInput.value = refLink;
    }
  },

  updateQuarterlyUI() {
    const { quarter, lastPayment, nextPayment, canPay, daysRemaining, cost } = this.userData.quarterlyInfo;

    const currentQuarter = document.getElementById('currentQuarter');
    const quarterlyCost = document.getElementById('quarterlyCost');
    const lastPaymentEl = document.getElementById('lastPayment');
    const nextPaymentEl = document.getElementById('nextPayment');
    const payBtn = document.getElementById('payActivityBtn');
    const warningEl = document.getElementById('paymentWarning');
    const daysEl = document.getElementById('daysRemaining');

    if (currentQuarter) currentQuarter.textContent = quarter || '1';
    if (quarterlyCost) quarterlyCost.textContent = `${cost} BNB`;

    if (lastPayment > 0) {
      const lastDate = new Date(lastPayment * 1000).toLocaleDateString('ru-RU');
      const nextDate = new Date(nextPayment * 1000).toLocaleDateString('ru-RU');
      
      if (lastPaymentEl) lastPaymentEl.textContent = lastDate;
      if (nextPaymentEl) nextPaymentEl.textContent = nextDate;

      // Показываем таймер если <= 10 дней
      if (daysRemaining <= 10 && daysRemaining >= 0) {
        if (warningEl) {
          warningEl.style.display = 'flex';
          warningEl.style.background = daysRemaining <= 3 ? 'rgba(255, 50, 50, 0.1)' : 'rgba(255, 193, 7, 0.1)';
        }
        
        if (daysEl) {
          daysEl.textContent = daysRemaining === 0 ? _t('common.today') : daysRemaining + ' ' + _t('common.days');
          daysEl.style.color = daysRemaining <= 3 ? '#ff3232' : '#ffc107';
        }
      } else {
        if (warningEl) warningEl.style.display = 'none';
      }

      // Кнопка оплаты
      if (payBtn) {
        if (canPay) {
          payBtn.disabled = false;
          payBtn.textContent = _t('dashboard.payQuarterly');
          payBtn.style.opacity = '1';
          payBtn.style.cursor = 'pointer';
        } else {
          payBtn.disabled = true;
          payBtn.textContent = _t('dashboard.paymentIn') + ' ' + daysRemaining + _t('common.daysShort');
          payBtn.style.opacity = '0.5';
          payBtn.style.cursor = 'not-allowed';
        }
      }
    } else {
      // Еще не активирован
      if (lastPaymentEl) lastPaymentEl.textContent = _t('dashboard.notActivated');
      
      if (canPay) {
        if (nextPaymentEl) nextPaymentEl.textContent = '✅ ' + _t('dashboard.canActivate');
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = '⚡ ' + _t('dashboard.activateQuarterly');
          payBtn.style.opacity = '1';
          payBtn.style.cursor = 'pointer';
        }
      } else {
        if (nextPaymentEl) nextPaymentEl.textContent = _t('dashboard.availableIn') + ' ' + daysRemaining + _t('common.daysShort');
        if (payBtn) {
          payBtn.disabled = true;
          payBtn.textContent = _t('dashboard.availableIn') + ' ' + daysRemaining + _t('common.daysShort');
          payBtn.style.opacity = '0.5';
          payBtn.style.cursor = 'not-allowed';
        }
      }

      if (warningEl) warningEl.style.display = 'none';
    }
  },

  updateBalancesUI() {
    const { leader, investment, pension } = this.userData.balances;

    // ✅ FIX: partner удалён (платежи идут сразу на кошелёк), показываем pension вместо partner
    const leaderBalance = document.getElementById('leaderBalance');
    const investmentBalance = document.getElementById('investmentBalance');
    const pensionBalance = document.getElementById('marketingBalance'); // переиспользуем слот для pension

    if (leaderBalance) leaderBalance.textContent = `${app.formatNumber(leader, 4)} BNB`;
    if (investmentBalance) investmentBalance.textContent = `${app.formatNumber(investment, 4)} BNB`;
    if (pensionBalance) pensionBalance.textContent = `${app.formatNumber(pension || '0', 4)} BNB`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ДЕЙСТВИЯ
  // ═══════════════════════════════════════════════════════════════
  
  async buyLevel(level) {
    if (this.buyLevelInProgress) {
      console.log('⚠️ Buy level already in progress');
      return;
    }
    
    // ✅ SECURITY: Кулдаун 30 секунд между покупками
    const now = Date.now();
    if (this._lastBuyTime && (now - this._lastBuyTime < 30000)) {
      const remaining = Math.ceil((30000 - (now - this._lastBuyTime)) / 1000);
      app.showNotification(`⏳ Подождите ${remaining} сек. перед следующей покупкой`, 'error');
      return;
    }

    // ✅ SECURITY: Проверка что кошелёк подключён через web3Manager
    if (!window.web3Manager || !window.web3Manager.isConnected || !window.web3Manager.signer) {
      app.showNotification(_t('notifications.connectWalletFirst'), 'error');
      return;
    }

    // ✅ SECURITY: Проверка что адрес совпадает
    try {
      const signerAddress = await window.web3Manager.signer.getAddress();
      if (signerAddress.toLowerCase() !== app.state.userAddress.toLowerCase()) {
        console.error('❌ Address mismatch! Signer:', signerAddress, 'State:', app.state.userAddress);
        app.showNotification('⚠️ Ошибка: адрес кошелька не совпадает. Переподключите кошелёк.', 'error');
        return;
      }
    } catch (addrErr) {
      console.error('❌ Cannot verify signer address:', addrErr);
      app.showNotification('⚠️ Ошибка верификации кошелька. Переподключите.', 'error');
      return;
    }

    this.buyLevelInProgress = true;
    
    console.log(`=== 🛒 buyLevel() START for level ${level} ===`);
    
    if (!app.state.userAddress) {
      console.log('❌ No user address');
      app.showNotification(_t('notifications.connectWalletFirst'), 'error');
      this.buyLevelInProgress = false;
      return;
    }
    
    console.log('✅ User address OK:', app.state.userAddress);
    
    const networkCheck = await app.checkNetwork();
    console.log('🌐 Network check result:', networkCheck);
    
    if (!networkCheck) {
      console.log('❌ Network check failed');
      this.buyLevelInProgress = false;
      return;
    }
    
    console.log('✅ Network check passed');
    
    try {
      console.log('1️⃣ Checking registration...');
      
      // 🔥 FIX: Используем app.state.isRegistered (он корректно загружается в app.js)
      if (!app.state.isRegistered && !this.userData.isRegistered) {
        console.log('❌ User not registered');
        app.showNotification(_t('notifications.registerFirst'), 'error');
        this.buyLevelInProgress = false;
        return;
      }
      
      console.log('✅ User registered');
      console.log('2️⃣ Checking previous levels...');
      
      if (level > 1) {
        const maxLevel = await this.contracts.globalWay.getUserMaxLevel(app.state.userAddress);
        console.log('   Current max level:', Number(maxLevel));
        if (Number(maxLevel) < level - 1) {
          console.log('❌ Previous level not activated');
          app.showNotification(_t('dashboard.activateFirst'), 'error');
          this.buyLevelInProgress = false;
          return;
        }
      }
      
      console.log('✅ Previous levels OK');
      console.log('3️⃣ Checking if level already active...');
      
      const isActive = await this.contracts.globalWay.isLevelActive(app.state.userAddress, level);
      console.log('   Level', level, 'active:', isActive);
      
      if (isActive) {
        console.log('❌ Level already active');
        app.showNotification(_t('notifications.levelAlreadyActive'), 'error');
        this.buyLevelInProgress = false;
        return;
      }
      
      console.log('✅ Level not active yet');
      console.log('4️⃣ Getting price...');
      
      const price = CONFIG.LEVEL_PRICES[level - 1];
      const priceWei = ethers.utils.parseEther(price);
      console.log('   Price:', price, 'BNB');
      
      console.log('5️⃣ Checking balance...');
      const balance = await this.web3Provider.getBalance(app.state.userAddress);
      console.log('   Balance:', ethers.utils.formatEther(balance), 'BNB');
      
      if (balance.lt(priceWei)) {
        console.log('❌ Insufficient balance');
        app.showNotification(_t('notifications.insufficientBNB'), 'error');
        this.buyLevelInProgress = false;
        return;
      }
      
      console.log('✅ Balance sufficient');
      console.log('6️⃣ Asking user confirmation...');
      
      // ✅ FIX: Заменяем confirm() на не-блокирующий модал для мобильных
      const confirmed = await new Promise((resolve) => {
        const existing = document.getElementById('buyLevelConfirmModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'buyLevelConfirmModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        modal.innerHTML = `
          <div style="background:linear-gradient(135deg,#0d1117,#1a1f2e);border:1px solid #ffd70044;border-radius:16px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 40px #ffd70022;">
            <div style="font-size:40px;margin-bottom:10px">🚀</div>
            <h3 style="color:#ffd700;margin:0 0 12px;font-size:20px">${_t('dashboard.activateLevel')} ${level}</h3>
            <p style="color:#ccc;margin:4px 0;font-size:14px">${_t('dashboard.cost')}: <strong style="color:#fff">${price} BNB</strong></p>
            <p style="color:#ccc;margin:4px 0;font-size:14px">${_t('dashboard.reward')}: <strong style="color:#ffd700">${CONFIG.TOKEN_REWARDS[level - 1]} GWT</strong></p>
            <div style="display:flex;gap:10px;margin-top:20px">
              <button id="blcNo" style="flex:1;padding:14px;border:1px solid #555;border-radius:10px;background:transparent;color:#aaa;font-size:15px;cursor:pointer;">❌</button>
              <button id="blcYes" style="flex:1;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#ffd700,#ff9500);color:#000;font-weight:700;font-size:15px;cursor:pointer;">✅ ${_t('dashboard.continue')}</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const cleanup = (val) => { modal.remove(); resolve(val); };
        document.getElementById('blcYes').onclick = () => cleanup(true);
        document.getElementById('blcNo').onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
      });
      
      if (!confirmed) {
        console.log('❌ User cancelled');
        this.buyLevelInProgress = false;
        return;
      }
      
      console.log('✅ User confirmed');
      console.log('7️⃣ Disabling buttons...');
      document.querySelectorAll('.level-btn').forEach(btn => btn.disabled = true);
      
      console.log('8️⃣ Calling GlobalWay.activateLevel(' + level + ')...');
      app.showNotification(_t('dashboard.buyingLevel') + ' ' + level + '...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      console.log('   Contract loaded:', contract.address);
      
      const tx = await contract.activateLevel(level, {
        value: priceWei,
        gasLimit: CONFIG.GAS.buyLevel
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      app.showNotification(_t('notifications.txSent'), 'info');
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      
      app.showNotification(
        `✅ ${_t('dashboard.levelActivated')}\n🎁 ${_t('dashboard.received')} ${CONFIG.TOKEN_REWARDS[level - 1]} GWT`, 
        'success'
      );
      
      // ✅ SECURITY: Обновляем кулдаун после успешной покупки
      this._lastBuyTime = Date.now();
      
      await this.refresh();
      
    } catch (error) {
      console.error('❌ Buy level error:', error);
      
      if (error.code === 4001) {
        app.showNotification(_t('notifications.txRejected'), 'error');
      } else if (error.message && error.message.includes('insufficient funds')) {
        app.showNotification(_t('notifications.insufficientFunds'), 'error');
      } else {
        app.showNotification(_t('notifications.buyError') + ': ' + error.message, 'error');
      }
    } finally {
      document.querySelectorAll('.level-btn').forEach(btn => {
        if (!btn.classList.contains('active')) {
          btn.disabled = false;
        }
      });
      
      this.buyLevelInProgress = false;
    }
    
    console.log(`=== 🛒 buyLevel() END ===`);
  },

  async payQuarterly() {
    console.log('=== 💳 PAY QUARTERLY START ===');
    
    if (!app.state.userAddress) {
      app.showNotification(_t('notifications.connectWalletFirst'), 'error');
      return;
    }
    
    if (!await app.checkNetwork()) {
      return;
    }

    try {
      const { quarter, canPay } = this.userData.quarterlyInfo;
      
      if (!canPay) {
        app.showNotification(_t('notifications.paymentNotAvailable'), 'error');
        return;
      }

      // ✅ FIX: Модал вместо confirm() для мобильных
      const cost = CONFIG.QUARTERLY_COST;
      const confirmed = await new Promise((resolve) => {
        const existing = document.getElementById('quarterlyConfirmModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'quarterlyConfirmModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        modal.innerHTML = `
          <div style="background:linear-gradient(135deg,#0d1117,#1a1f2e);border:1px solid #ffd70044;border-radius:16px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 40px #ffd70022;">
            <div style="font-size:40px;margin-bottom:10px">📅</div>
            <h3 style="color:#ffd700;margin:0 0 12px;font-size:20px">${_t('dashboard.payQuarterlyConfirm')}</h3>
            <p style="color:#ccc;margin:4px 0;font-size:14px">${_t('dashboard.quarter')}: <strong style="color:#fff">${quarter + 1}</strong></p>
            <p style="color:#ccc;margin:4px 0;font-size:14px">${_t('dashboard.cost')}: <strong style="color:#fff">${cost} BNB</strong></p>
            <div style="display:flex;gap:10px;margin-top:20px">
              <button id="qpcNo" style="flex:1;padding:14px;border:1px solid #555;border-radius:10px;background:transparent;color:#aaa;font-size:15px;cursor:pointer;">❌</button>
              <button id="qpcYes" style="flex:1;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#ffd700,#ff9500);color:#000;font-weight:700;font-size:15px;cursor:pointer;">✅ ${_t('dashboard.continue')}</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const cleanup = (val) => { modal.remove(); resolve(val); };
        document.getElementById('qpcYes').onclick = () => cleanup(true);
        document.getElementById('qpcNo').onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
      });
      
      if (!confirmed) {
        return;
      }

      // Проверка баланса
      const costWei = ethers.utils.parseEther(cost);
      const balance = await this.web3Provider.getBalance(app.state.userAddress);
      
      if (balance.lt(costWei)) {
        app.showNotification(_t('notifications.insufficientBNB'), 'error');
        return;
      }
      
      const payBtn = document.getElementById('payActivityBtn');
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Processing...';
      }
      
      app.showNotification(_t('dashboard.payingQuarterly'), 'info');

      const contract = await app.getSignedContract('QuarterlyPayments');
      
      const tx = await contract.payQuarterly({
        value: costWei,
        gasLimit: CONFIG.GAS.payQuarterly
      });

      console.log(`📝 Quarterly transaction sent: ${tx.hash}`);
      app.showNotification('Waiting for confirmation...', 'info');
      
      const receipt = await tx.wait();
      console.log(`✅ Quarterly confirmed in block ${receipt.blockNumber}`);

      app.showNotification('✅ Quarterly paid!', 'success');
      
      await this.refresh();
      
    } catch (error) {
      console.error('❌ Pay quarterly error:', error);
      
      if (error.code === 4001) {
        app.showNotification(_t('notifications.txRejected'), 'error');
      } else if (error.message && error.message.includes('insufficient funds')) {
        app.showNotification(_t('notifications.insufficientFunds'), 'error');
      } else {
        app.showNotification(_t('notifications.paymentError') + ': ' + error.message, 'error');
      }
    } finally {
      const payBtn = document.getElementById('payActivityBtn');
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = _t('dashboard.payQuarterly');
      }
    }
    
    console.log('=== 💳 PAY QUARTERLY END ===');
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    const copyBtn = document.getElementById('copyRefLink');
    const refLinkInput = document.getElementById('refLink');
  
    if (copyBtn) {
      const handleCopy = async (e) => {
        if (e) e.preventDefault();
        console.log('📋 Copy ref link triggered');
        
        if (!refLinkInput || !refLinkInput.value) {
          app.showNotification(_t('common.linkEmpty'), 'error');
          return;
        }
        
        // ✅ FIX: Используем улучшенный app.copyToClipboard с мобильным фолбеком
        await app.copyToClipboard(refLinkInput.value);
      };
      
      copyBtn.addEventListener('click', handleCopy);
      copyBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        handleCopy(e);
      }, { passive: false });
    }
  
    const payBtn = document.getElementById('payActivityBtn');
    if (payBtn) {
      const self = this;
      const handlePay = (e) => {
        if (e) e.preventDefault();
        console.log('💳 Pay quarterly triggered');
        self.payQuarterly();
      };
      
      payBtn.addEventListener('click', handlePay);
      payBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        handlePay(e);
      }, { passive: false });
    }
  
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
      historyFilter.addEventListener('change', () => {
        this.applyHistoryFilter();
      });
    }
  
    const refreshHistory = document.getElementById('refreshHistory');
    if (refreshHistory) {
      const self = this;
      const handleRefresh = async (e) => {
        if (e) e.preventDefault();
        console.log('🔄 Refresh history triggered');
        await self.loadTransactionHistory();
        app.showNotification(_t('notifications.updated'), 'success');
      };
      
      refreshHistory.addEventListener('click', handleRefresh);
      refreshHistory.addEventListener('touchend', function(e) {
        e.preventDefault();
        handleRefresh(e);
      }, { passive: false });
    }
  
    console.log('✅ Dashboard UI initialized');
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  getRankName(rankId) {
    const ranks = {
      0: (_t ? _t('ranks.none') : 'Никто'),   // ✅ FIX: был ranks.nobody → ranks.none
      1: (_t ? _t('ranks.bronze') : 'Бронза 🥉'),
      2: (_t ? _t('ranks.silver') : 'Серебро 🥈'),
      3: (_t ? _t('ranks.gold') : 'Золото 🥇'),
      4: (_t ? _t('ranks.platinum') : 'Платина 💎')
    };
    return ranks[rankId] ?? (_t ? _t('ranks.none') : 'Никто');
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

  clearCache() {
    this.cache.tokenPrice = null;
    this.cache.tokenPriceTime = 0;
    console.log('🗑️ Cache cleared');
  },

  startQuarterlyTimer() {
    if (this.quarterlyTimer) {
      clearInterval(this.quarterlyTimer);
    }
    
    this.quarterlyTimer = setInterval(() => {
      if (this.userData.quarterlyInfo) {
        this.updateQuarterlyUI();
      }
    }, 60000); // 1 минута
  },

  async refresh() {
    this.clearCache();
    await this.loadAllData();
  }
};

// Экспорт в window
window.dashboardModule = dashboardModule;
