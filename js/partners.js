/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * Partners Manager - ПОВНІСТЮ ПЕРЕПИСАНО
 * Використовує Stats контракт для отримання структури
 */

class PartnersManager {
  constructor() {
    this.currentLevel = 1;
    // 🔥 ИСПРАВЛЕНО: Убрали this.partners, теперь загружаем партнёров динамически по уровням
  }

  async init() {
    console.log('👥 Initializing Partners Manager...');
    
    if (!web3Manager.connected) {
      console.log('⚠️ Wallet not connected');
      return;
    }
    
    this.setupEventListeners();
    await this.loadPartners();
    
    console.log('✅ Partners Manager initialized');
  }

  setupEventListeners() {
    const levelButtons = document.getElementById('partnerLevels');
    if (levelButtons) {
      levelButtons.innerHTML = '';
      for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.dataset.level = i;
        btn.textContent = `Level ${i}`;
        if (i === this.currentLevel) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', () => this.switchLevel(i));
        levelButtons.appendChild(btn);
      }
    }
  }

  async switchLevel(level) {
    this.currentLevel = level;
    
    document.querySelectorAll('#partnerLevels .level-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
    
    this.updateLevelInfo(level);
    await this.loadPartnersForLevel(level);
  }

  updateLevelInfo(level) {
    const currentLevelNumEl = document.getElementById('currentLevelNum');
    if (currentLevelNumEl) {
      currentLevelNumEl.textContent = level;
    }
    
    const currentLevelCostEl = document.getElementById('currentLevelCost');
    if (currentLevelCostEl) {
      currentLevelCostEl.textContent = `${CONFIG.LEVEL_PRICES[level - 1]} BNB`;
    }
    
    const levelTotalEarnedEl = document.getElementById('levelTotalEarned');
    if (levelTotalEarnedEl) {
      levelTotalEarnedEl.textContent = '0 BNB';
    }
  }

  async loadPartners() {
    if (!web3Manager.connected) return;
    
    Utils.showLoader(true, 'Loading partners...');
    
    try {
      // 🔥 ИСПРАВЛЕНО: Загружаем только статистику, партнёров загрузим по уровням
      const address = web3Manager.address;
      const structureStats = await contracts.getUserStructureStats(address);
      
      this.updateStatistics(structureStats);
      await this.updateQualification();
      await this.updateEarnings();
      
      // Загружаем партнёров для текущего уровня глубины
      await this.loadPartnersForLevel(this.currentLevel);
      
      console.log('✅ Partners data loaded');
      
    } catch (error) {
      console.error('❌ Load partners error:', error);
      Utils.showNotification('Failed to load partners', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Загрузить партнёров для конкретного уровня глубины
   * 🔥 ИСПРАВЛЕНО: Рекурсивная загрузка по глубине структуры
   * Уровень 1: прямые рефералы
   * Уровень 2: рефералы рефералов
   * Уровень N: рефералы на глубине N
   */
  async loadPartnersForLevel(level) {
    const tableBody = document.getElementById('partnersTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="8" class="loading">Loading partners...</td></tr>';
    
    try {
      const address = web3Manager.address;
      
      // Получаем партнёров на указанной глубине
      const partners = await this.getPartnersAtDepth(address, level);
      
      console.log(`📊 Partners at level ${level}:`, partners.length);
      
      if (partners.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="no-data">No partners at level ${level}</td>
          </tr>
        `;
        return;
      }
      
      // Загружаем информацию о каждом партнёре
      const partnersData = [];
      for (const partnerAddress of partners) {
        try {
          const partnerInfo = await contracts.getUserInfo(partnerAddress);
          partnersData.push({
            address: partnerAddress,
            id: partnerInfo.id || `GW${partnerAddress.slice(2, 9)}`,
            sponsorId: partnerInfo.sponsorId || '-',
            registrationTime: partnerInfo.registrationTime,
            activeLevel: partnerInfo.activeLevel,
            partnersCount: partnerInfo.partnersCount,
            rankLevel: partnerInfo.rankLevel,
            isActive: partnerInfo.isActive
          });
        } catch (error) {
          console.error(`Error loading partner ${partnerAddress}:`, error);
        }
      }
      
      // Отображаем в таблице
      tableBody.innerHTML = partnersData.map((partner, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${partner.id}</td>
          <td><a href="${CONFIG.NETWORK.explorer}/address/${partner.address}" target="_blank" rel="noopener">${Utils.formatAddress(partner.address)}</a></td>
          <td>${partner.sponsorId}</td>
          <td>${Utils.formatDate(partner.registrationTime)}</td>
          <td>${partner.activeLevel}/12</td>
          <td>${partner.partnersCount}</td>
          <td><span class="rank-badge rank-${partner.rankLevel}">${this.getRankName(partner.activeLevel)}</span></td>
        </tr>
      `).join('');
      
    } catch (error) {
      console.error('❌ loadPartnersForLevel error:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="error">Error loading partners: ${error.message}</td>
        </tr>
      `;
    }
  }
  
  /**
   * Рекурсивно получить партнёров на определённой глубине
   * @param {string} address - Адрес пользователя
   * @param {number} depth - Глубина (1 = прямые, 2 = второй уровень и т.д.)
   * @returns {Promise<string[]>} Массив адресов партнёров на указанной глубине
   */
  async getPartnersAtDepth(address, depth) {
    if (depth === 1) {
      // Прямые рефералы
      try {
        const referrals = await contracts.getDirectReferrals(address);
        return referrals || [];
      } catch (error) {
        console.error('Error getting direct referrals:', error);
        return [];
      }
    }
    
    // Для глубины > 1: рекурсивно получаем партнёров
    try {
      // Получаем партнёров на глубине depth-1
      const previousLevelPartners = await this.getPartnersAtDepth(address, depth - 1);
      
      // Для каждого партнёра с предыдущего уровня получаем их прямых рефералов
      const allPartners = [];
      for (const partnerAddress of previousLevelPartners) {
        try {
          const referrals = await contracts.getDirectReferrals(partnerAddress);
          if (referrals && referrals.length > 0) {
            allPartners.push(...referrals);
          }
        } catch (error) {
          console.error(`Error getting referrals for ${partnerAddress}:`, error);
        }
      }
      
      // Убираем дубликаты (если партнёр встречается несколько раз)
      return [...new Set(allPartners)];
      
    } catch (error) {
      console.error(`Error getting partners at depth ${depth}:`, error);
      return [];
    }
  }

  updateStatistics(structureStats) {
    // Личные приглашения (прямые рефералы)
    const personalInvitesEl = document.getElementById('personalInvites');
    if (personalInvitesEl) {
      personalInvitesEl.textContent = structureStats.personalInvites || 0;
    }
    
    // Активные партнёры
    const activePartnersEl = document.getElementById('activePartners');
    if (activePartnersEl) {
      activePartnersEl.textContent = structureStats.activePartners || 0;
    }
    
    // Общая команда
    const totalTeamEl = document.getElementById('totalTeam');
    if (totalTeamEl) {
      totalTeamEl.textContent = structureStats.totalTeam || 0;
    }
  }

  async updateQualification() {
    try {
      const rankInfo = await contracts.getRankInfo(web3Manager.address);
      const currentRank = rankInfo.currentRank;
      
      this.updateQualificationBadge('bronzeQual', currentRank >= 1);
      this.updateQualificationBadge('silverQual', currentRank >= 2);
      this.updateQualificationBadge('goldQual', currentRank >= 3);
      this.updateQualificationBadge('platinumQual', currentRank >= 4);
      
    } catch (error) {
      console.error('updateQualification error:', error);
    }
  }

  updateQualificationBadge(elementId, isQualified) {
    const badge = document.getElementById(elementId);
    if (!badge) return;
    
    const progressBar = badge.querySelector('.progress');
    if (progressBar) {
      if (isQualified) {
        progressBar.style.width = '100%';
        badge.classList.add('qualified');
      } else {
        progressBar.style.width = '0%';
        badge.classList.remove('qualified');
      }
    }
  }

  async updateEarnings() {
    try {
      const balances = await contracts.getUserBalances(web3Manager.address);
      
      // 🔥 ИСПРАВЛЕНО: Используем правильные имена балансов из contracts.getUserBalances()
      // balances уже возвращает отформатированные строки, не BigNumber
      
      // Direct Bonus = referral balance
      const directBonusEl = document.getElementById('directBonus');
      if (directBonusEl) {
        directBonusEl.textContent = `${Utils.formatBNB(balances.referral)} BNB`;
      }
      
      // Partner Bonus = половина matrix balance
      const partnerBonusEl = document.getElementById('partnerBonus');
      if (partnerBonusEl) {
        const partnerBonus = parseFloat(balances.matrix) / 2;
        partnerBonusEl.textContent = `${Utils.formatBNB(partnerBonus)} BNB`;
      }
      
      // Matrix Bonus = половина matrix balance
      const matrixBonusEl = document.getElementById('matrixBonus');
      if (matrixBonusEl) {
        const matrixBonus = parseFloat(balances.matrix) / 2;
        matrixBonusEl.textContent = `${Utils.formatBNB(matrixBonus)} BNB`;
      }
      
      // Leadership Bonus = leaderPool balance
      const leadershipBonusEl = document.getElementById('leadershipBonus');
      if (leadershipBonusEl) {
        leadershipBonusEl.textContent = `${Utils.formatBNB(balances.leaderPool)} BNB`;
      }
      
      // Total Earned
      const totalEarnedEl = document.getElementById('totalEarned');
      if (totalEarnedEl) {
        const total = parseFloat(balances.referral) + parseFloat(balances.matrix) + parseFloat(balances.leaderPool);
        totalEarnedEl.textContent = `${Utils.formatBNB(total)} BNB`;
      }
      
    } catch (error) {
      console.error('updateEarnings error:', error);
    }
  }

  /**
   * Получить название ранга по количеству активных уровней
   * 🔥 ИСПРАВЛЕНО: Определяем ранг по activeLevel
   */
  getRankName(activeLevel) {
    if (!activeLevel || activeLevel === 0) return 'None';
    if (activeLevel >= 1 && activeLevel <= 3) return 'Bronze';
    if (activeLevel >= 4 && activeLevel <= 7) return 'Silver';
    if (activeLevel >= 8 && activeLevel <= 10) return 'Gold';
    if (activeLevel >= 11 && activeLevel <= 12) return 'Platinum';
    return 'None';
  }
}

const partnersManager = new PartnersManager();
