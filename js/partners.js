/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * Partners Manager - ПОВНІСТЮ ПЕРЕПИСАНО
 * Використовує Stats контракт для отримання структури
 */

class PartnersManager {
  constructor() {
    this.currentLevel = 1;
    this.partners = [];
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
      const address = web3Manager.address;
      
      const structureStats = await contracts.getUserStructureStats(address);
      
      this.partners = [];
      
      for (const partnerAddress of structureStats.referrals) {
        const partnerInfo = await contracts.getUserInfo(partnerAddress);
        const partnerRank = await contracts.getRankInfo(partnerAddress);
        
        this.partners.push({
          address: partnerAddress,
          id: partnerInfo.id,
          sponsorId: partnerInfo.sponsorId,
          registrationTime: partnerInfo.registrationTime,
          activeLevel: partnerInfo.activeLevel,
          partnersCount: partnerInfo.partnersCount,
          rank: partnerRank.currentRank,
          isActive: partnerInfo.isActive
        });
      }
      
      this.updateStatistics(structureStats);
      await this.updateQualification();
      await this.updateEarnings();
      await this.loadPartnersForLevel(this.currentLevel);
      
      console.log('✅ Partners loaded:', this.partners.length);
      
    } catch (error) {
      console.error('❌ Load partners error:', error);
      Utils.showNotification('Failed to load partners', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  async loadPartnersForLevel(level) {
    const tableBody = document.getElementById('partnersTable');
    if (!tableBody) return;
    
    const levelPartners = this.partners.filter(p => p.activeLevel >= level);
    
    if (levelPartners.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="no-data">No partners at this level</td>
        </tr>
      `;
      return;
    }
    
    tableBody.innerHTML = levelPartners.map((partner, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${partner.id}</td>
        <td><a href="${Utils.getExplorerLink(partner.address)}" target="_blank">${Utils.formatAddress(partner.address)}</a></td>
        <td>${partner.sponsorId}</td>
        <td>${Utils.formatDate(partner.registrationTime)}</td>
        <td>${partner.activeLevel}/12</td>
        <td>${partner.partnersCount}</td>
        <td><span class="rank-badge rank-${partner.rank}">${this.getRankName(partner.rank)}</span></td>
      </tr>
    `).join('');
  }

  updateStatistics(structureStats) {
    const personalInvitesEl = document.getElementById('personalInvites');
    if (personalInvitesEl) {
      personalInvitesEl.textContent = structureStats.directReferrals || 0;
    }
    
    const activePartnersEl = document.getElementById('activePartners');
    if (activePartnersEl) {
      const activeCount = this.partners.filter(p => p.isActive).length;
      activePartnersEl.textContent = activeCount;
    }
    
    const totalTeamEl = document.getElementById('totalTeam');
    if (totalTeamEl) {
      totalTeamEl.textContent = this.partners.length;
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
      
      const directBonusEl = document.getElementById('directBonus');
      if (directBonusEl) {
        directBonusEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.referralBalance))} BNB`;
      }
      
      const partnerBonusEl = document.getElementById('partnerBonus');
      if (partnerBonusEl) {
        const partnerBonus = balances.matrixBalance.div(2);
        partnerBonusEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(partnerBonus))} BNB`;
      }
      
      const matrixBonusEl = document.getElementById('matrixBonus');
      if (matrixBonusEl) {
        const matrixBonus = balances.matrixBalance.div(2);
        matrixBonusEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(matrixBonus))} BNB`;
      }
      
      const leadershipBonusEl = document.getElementById('leadershipBonus');
      if (leadershipBonusEl) {
        leadershipBonusEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.leaderBalance))} BNB`;
      }
      
      const totalEarnedEl = document.getElementById('totalEarned');
      if (totalEarnedEl) {
        const total = balances.referralBalance
          .add(balances.matrixBalance)
          .add(balances.leaderBalance);
        totalEarnedEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(total))} BNB`;
      }
      
    } catch (error) {
      console.error('updateEarnings error:', error);
    }
  }

  getRankName(rankLevel) {
    const ranks = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    return ranks[rankLevel] || 'None';
  }
}

const partnersManager = new PartnersManager();
