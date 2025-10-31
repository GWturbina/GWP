/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG, ethers */

/**
 * Admin Manager - Updated for contracts-v2.js
 * Управління адміністративними функціями
 */

class AdminManager {
  constructor() {
    this.isOwner = false;
    this.isFounder = false;
    this.isBoard = false;
  }

  async init() {
    if (!this.checkRights()) {
      return; // Зупиняємо якщо немає прав
    }
    await this.loadAdminStats();
    await this.loadBoardMembers();
    this.setupAdminActions();
  }

  checkRights() {
    // 🔥 СТРОГА ПЕРЕВІРКА: Тільки Owner + 3 Founders
    const allowedAddresses = [
      CONFIG.ADMIN.owner.toLowerCase(),
      CONFIG.ADMIN.founders[0].toLowerCase(),
      CONFIG.ADMIN.founders[1].toLowerCase(),
      CONFIG.ADMIN.founders[2].toLowerCase()
    ];
    
    const currentAddress = web3Manager.address ? web3Manager.address.toLowerCase() : '';
    const hasAccess = allowedAddresses.includes(currentAddress);
    
    // Визначаємо рівень прав
    this.isOwner = currentAddress === CONFIG.ADMIN.owner.toLowerCase();
    this.isFounder = CONFIG.ADMIN.founders.slice(0, 3).some(f => f.toLowerCase() === currentAddress);
    this.isBoard = hasAccess; // Тільки для сумісності з рештою коду

    const rightsLevel = this.isOwner ? 'Owner' :
                       this.isFounder ? 'Founder' : 'No Access';

    const adminCurrentAccountEl = document.getElementById('adminCurrentAccount');
    const adminRightsLevelEl = document.getElementById('adminRightsLevel');

    if (adminCurrentAccountEl) adminCurrentAccountEl.textContent = Utils.formatAddress(web3Manager.address);
    if (adminRightsLevelEl) adminRightsLevelEl.textContent = rightsLevel;

    // 🔥 СТРОГА ПЕРЕВІРКА: Якщо адреса НЕ в списку дозволених - доступ заборонений
    if (!hasAccess) {
      console.error('❌ ADMIN ACCESS DENIED for:', web3Manager.address);
      console.log('✅ Allowed addresses:');
      console.log('  Owner:', CONFIG.ADMIN.owner);
      console.log('  Founder 1:', CONFIG.ADMIN.founders[0]);
      console.log('  Founder 2:', CONFIG.ADMIN.founders[1]);
      console.log('  Founder 3:', CONFIG.ADMIN.founders[2]);

      Utils.showNotification('Access denied: Only Owner and 3 Founders allowed', 'error');

      const adminPage = document.getElementById('admin');
      if (adminPage) {
        adminPage.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <h2>🔒 Access Denied</h2>
            <p style="color: #ff4444; font-weight: bold;">Admin panel is restricted to 4 addresses only.</p>
            <p>Your address: <code>${web3Manager.address}</code></p>
            <p style="margin-top: 20px;">Allowed addresses:</p>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Owner:</strong> <code>${CONFIG.ADMIN.owner}</code></li>
              <li><strong>Founder 1:</strong> <code>${CONFIG.ADMIN.founders[0]}</code></li>
              <li><strong>Founder 2:</strong> <code>${CONFIG.ADMIN.founders[1]}</code></li>
              <li><strong>Founder 3:</strong> <code>${CONFIG.ADMIN.founders[2]}</code></li>
            </ul>
          </div>
        `;
      }
      return false;
    }

    console.log('✅ Admin access granted:', rightsLevel, 'for', web3Manager.address);
    console.log('🔐 Access level:', this.isOwner ? 'OWNER' : 'FOUNDER');

    // Додаємо клас до body
    document.body.classList.add('admin-access');

    return true;
  }

  async loadAdminStats() {
    try {
      const overview = await contracts.getContractOverview();

      const adminTotalUsersEl = document.getElementById('adminTotalUsers');
      const adminActiveUsersEl = document.getElementById('adminActiveUsers');
      const adminContractBalanceEl = document.getElementById('adminContractBalance');
      const adminTotalVolumeEl = document.getElementById('adminTotalVolume');
      const totalIdsAssignedEl = document.getElementById('totalIdsAssigned');

      if (adminTotalUsersEl) adminTotalUsersEl.textContent = overview.totalUsers.toString();
      if (adminActiveUsersEl) adminActiveUsersEl.textContent = '-';
      if (adminContractBalanceEl) {
        adminContractBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(overview.contractBalance))} BNB`;
      }
      if (adminTotalVolumeEl) {
        adminTotalVolumeEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(overview.totalVolume))} BNB`;
      }
      if (totalIdsAssignedEl) {
        totalIdsAssignedEl.textContent = overview.totalUsers.toString();
      }

    } catch (error) {
      console.error('Load admin stats error:', error);
      Utils.showNotification('Failed to load stats', 'error');
    }
  }

  async loadBoardMembers() {
    try {
      const directors = await contracts.getDirectors();
      
      const boardListEl = document.getElementById('boardMembersList');
      if (!boardListEl) return;

      boardListEl.innerHTML = '';

      if (!directors || directors.length === 0) {
        boardListEl.innerHTML = '<div class="empty-state">No board members</div>';
        return;
      }

      directors.forEach(address => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'board-member-item';
        memberDiv.innerHTML = `
          <span class="member-address">${Utils.formatAddress(address)}</span>
          <button class="btn-danger btn-sm" onclick="adminManager.promptRemoveBoardMember('${address}')">Remove</button>
        `;
        boardListEl.appendChild(memberDiv);
      });

      const boardCountEl = document.getElementById('boardMembersCount');
      if (boardCountEl) {
        boardCountEl.textContent = directors.length;
      }

    } catch (error) {
      console.error('Load board members error:', error);
    }
  }

  setupAdminActions() {
    // Free Activate
    const freeActivateBtn = document.getElementById('freeActivateBtn');
    if (freeActivateBtn) {
      freeActivateBtn.addEventListener('click', () => this.freeActivate());
    }

    // Pause/Unpause
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pauseContract());
    }

    const unpauseBtn = document.getElementById('unpauseBtn');
    if (unpauseBtn) {
      unpauseBtn.addEventListener('click', () => this.unpauseContract());
    }

    // Connect/Disconnect Project
    const connectProjectBtn = document.getElementById('connectProjectBtn');
    if (connectProjectBtn) {
      connectProjectBtn.addEventListener('click', () => this.connectProject());
    }

    const disconnectProjectBtn = document.getElementById('disconnectProjectBtn');
    if (disconnectProjectBtn) {
      disconnectProjectBtn.addEventListener('click', () => this.disconnectProject());
    }

    // Assign ID
    const assignIdBtn = document.getElementById('assignIdBtn');
    if (assignIdBtn) {
      assignIdBtn.addEventListener('click', () => this.assignUserId());
    }

    // User Lookup
    const userLookupBtn = document.getElementById('userLookupBtn');
    if (userLookupBtn) {
      userLookupBtn.addEventListener('click', () => this.lookupUser());
    }

    // Emergency Withdraw
    const emergencyWithdrawBtn = document.getElementById('emergencyWithdrawBtn');
    if (emergencyWithdrawBtn) {
      emergencyWithdrawBtn.addEventListener('click', () => this.emergencyWithdraw());
    }

    // Process Inactive
    const processInactiveBtn = document.getElementById('processInactiveBtn');
    if (processInactiveBtn) {
      processInactiveBtn.addEventListener('click', () => this.processInactive());
    }

    // Add Board Member
    const addBoardMemberBtn = document.getElementById('addBoardMemberBtn');
    if (addBoardMemberBtn) {
      addBoardMemberBtn.addEventListener('click', () => this.addBoardMember());
    }

    // Remove Board Member
    const removeBoardMemberBtn = document.getElementById('removeBoardMemberBtn');
    if (removeBoardMemberBtn) {
      removeBoardMemberBtn.addEventListener('click', () => this.removeBoardMember());
    }

    // Refresh Board
    const refreshBoardBtn = document.getElementById('refreshBoardBtn');
    if (refreshBoardBtn) {
      refreshBoardBtn.addEventListener('click', () => this.loadBoardMembers());
    }

    // Block User
    const blockUserBtn = document.getElementById('blockUserBtn');
    if (blockUserBtn) {
      blockUserBtn.addEventListener('click', () => this.blockUser());
    }
  }

  async freeActivate() {
    if (!this.isFounder) {
      Utils.showNotification('Only Owner/Founders can activate', 'error');
      return;
    }
    
    const addressInput = document.getElementById('activationAddress');
    const sponsorInput = document.getElementById('activationSponsor');
    const levelInput = document.getElementById('activationLevel');
    
    if (!addressInput || !sponsorInput || !levelInput) {
      Utils.showNotification('Form elements not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    const sponsor = sponsorInput.value.trim();
    const maxLevel = parseInt(levelInput.value);
    
    if (!Utils.validateAddress(address) || !Utils.validateAddress(sponsor)) {
      Utils.showNotification('Invalid addresses', 'error');
      return;
    }
    
    if (maxLevel < 1 || maxLevel > 12) {
      Utils.showNotification('Level must be between 1 and 12', 'error');
      return;
    }
    
    if (!confirm(`Activate ${Utils.formatAddress(address)} with ${maxLevel} levels?`)) return;
    
    Utils.showLoader(true, 'Activating founder team member...');
    try {
      await contracts.activateFounderTeam(address, sponsor, maxLevel);
      Utils.showNotification('User activated successfully!', 'success');
      await this.loadAdminStats();
      
      addressInput.value = '';
      sponsorInput.value = '';
      levelInput.value = '12';
    } catch (error) {
      console.error('Activation error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async pauseContract() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can pause contract', 'error');
      return;
    }
    
    if (!confirm('PAUSE CONTRACT? This will stop all operations!')) return;
    
    Utils.showLoader(true, 'Pausing contract...');
    try {
      await contracts.pause();
      Utils.showNotification('Contract paused', 'success');
    } catch (error) {
      console.error('Pause error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async unpauseContract() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can unpause contract', 'error');
      return;
    }
    
    if (!confirm('UNPAUSE CONTRACT?')) return;
    
    Utils.showLoader(true, 'Unpausing contract...');
    try {
      await contracts.unpause();
      Utils.showNotification('Contract unpaused', 'success');
    } catch (error) {
      console.error('Unpause error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async connectProject() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can connect projects', 'error');
      return;
    }
    
    const projectAddressInput = document.getElementById('projectAddress');
    if (!projectAddressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const projectAddress = projectAddressInput.value.trim();
    
    if (!Utils.validateAddress(projectAddress)) {
      Utils.showNotification('Invalid project address', 'error');
      return;
    }
    
    if (!confirm(`Connect project ${Utils.formatAddress(projectAddress)}?`)) return;
    
    Utils.showLoader(true, 'Connecting project...');
    try {
      await contracts.authorizeExternalProject(projectAddress, true);
      Utils.showNotification('Project connected successfully!', 'success');
      projectAddressInput.value = '';
    } catch (error) {
      console.error('Connect project error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async disconnectProject() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can disconnect projects', 'error');
      return;
    }
    
    const projectAddressInput = document.getElementById('projectAddress');
    if (!projectAddressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const projectAddress = projectAddressInput.value.trim();
    
    if (!Utils.validateAddress(projectAddress)) {
      Utils.showNotification('Invalid project address', 'error');
      return;
    }
    
    if (!confirm(`Disconnect project ${Utils.formatAddress(projectAddress)}?`)) return;
    
    Utils.showLoader(true, 'Disconnecting project...');
    try {
      await contracts.authorizeExternalProject(projectAddress, false);
      Utils.showNotification('Project disconnected successfully!', 'success');
      projectAddressInput.value = '';
    } catch (error) {
      console.error('Disconnect project error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async assignUserId() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can assign IDs', 'error');
      return;
    }
    
    const addressInput = document.getElementById('userIdAddress');
    if (!addressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    
    if (!Utils.validateAddress(address)) {
      Utils.showNotification('Invalid address', 'error');
      return;
    }
    
    if (!confirm(`Assign automatic ID to ${Utils.formatAddress(address)}?`)) return;
    
    Utils.showLoader(true, 'Assigning ID...');
    try {
      await contracts.assignIdByOwner(address);
      Utils.showNotification('ID assigned successfully!', 'success');
      addressInput.value = '';
      await this.loadAdminStats();
    } catch (error) {
      console.error('Assign ID error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async lookupUser() {
    const lookupInput = document.getElementById('lookupInput');
    if (!lookupInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const input = lookupInput.value.trim();
    
    if (!input) {
      Utils.showNotification('Please enter address or User ID', 'error');
      return;
    }
    
    Utils.showLoader(true, 'Looking up user...');
    try {
      let address = input;
      
      // Якщо введено User ID - отримати адресу
      if (Utils.validateUserId(input)) {
        address = await contracts.getAddressByUserId(input);
        
        if (address === ethers.constants.AddressZero) {
          Utils.showNotification('User ID not found', 'error');
          Utils.showLoader(false);
          return;
        }
      } else if (!Utils.validateAddress(input)) {
        Utils.showNotification('Invalid address or User ID', 'error');
        Utils.showLoader(false);
        return;
      }
      
      // Отримати повну інформацію
      const userInfo = await contracts.getUserFullInfo(address);
      
      // Відобразити результати
      this.displayUserInfo(userInfo, address);
      
    } catch (error) {
      console.error('Lookup error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  displayUserInfo(userInfo, address) {
    const resultsEl = document.getElementById('lookupResults');
    if (!resultsEl) return;
    
    resultsEl.innerHTML = `
      <div class="user-info-card">
        <h3>User Information</h3>
        
        <div class="info-row">
          <span class="label">Address:</span>
          <span class="value">${Utils.formatAddress(address)}</span>
        </div>
        
        <div class="info-row">
          <span class="label">User ID:</span>
          <span class="value">${Utils.formatUserId(userInfo.id)}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Sponsor ID:</span>
          <span class="value">${Utils.formatUserId(userInfo.sponsorId)}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Rank:</span>
          <span class="value">${Utils.getRankName(userInfo.rankLevel)}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Active Level:</span>
          <span class="value">${userInfo.activeLevel}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Partners:</span>
          <span class="value">${userInfo.partnersCount}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Registration:</span>
          <span class="value">${Utils.formatDate(userInfo.registrationTime)}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Status:</span>
          <span class="value ${userInfo.isActive ? 'status-active' : 'status-inactive'}">
            ${userInfo.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div class="info-section">
          <h4>Balances</h4>
          
          <div class="info-row">
            <span class="label">Marketing Pool:</span>
            <span class="value">${Utils.formatBNB(ethers.utils.formatEther(userInfo.balances.marketing))} BNB</span>
          </div>
          
          <div class="info-row">
            <span class="label">Leader Pool:</span>
            <span class="value">${Utils.formatBNB(ethers.utils.formatEther(userInfo.balances.leader))} BNB</span>
          </div>
          
          <div class="info-row">
            <span class="label">Investment Pool:</span>
            <span class="value">${Utils.formatBNB(ethers.utils.formatEther(userInfo.balances.investment))} BNB</span>
          </div>
          
          <div class="info-row">
            <span class="label">GWT Tokens:</span>
            <span class="value">${Utils.formatTokens(ethers.utils.formatEther(userInfo.balances.tokens))} GWT</span>
          </div>
        </div>
        
        <div class="info-section">
          <h4>Quarterly Activity</h4>
          
          <div class="info-row">
            <span class="label">Last Payment:</span>
            <span class="value">${Utils.formatDate(userInfo.quarterly.lastPaymentTime)}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Next Payment Due:</span>
            <span class="value">${Utils.formatDate(userInfo.quarterly.nextPaymentDue)}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Current Quarter:</span>
            <span class="value">${userInfo.quarterly.currentQuarter}</span>
          </div>
        </div>
        
        <div class="info-section">
          <h4>Team Stats</h4>
          
          <div class="info-row">
            <span class="label">Personal Invites:</span>
            <span class="value">${userInfo.teamStats.personalInvites}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Active Partners:</span>
            <span class="value">${userInfo.teamStats.activePartners}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Total Team Size:</span>
            <span class="value">${userInfo.teamStats.totalTeamSize}</span>
          </div>
        </div>
      </div>
    `;
    
    resultsEl.style.display = 'block';
  }

  async emergencyWithdraw() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can use emergency withdraw', 'error');
      return;
    }
    
    if (!confirm('EMERGENCY WITHDRAW? This will withdraw all contract funds!')) return;
    if (!confirm('Are you ABSOLUTELY SURE? This action cannot be undone!')) return;
    
    Utils.showLoader(true, 'Processing emergency withdrawal...');
    try {
      await contracts.emergencyWithdraw();
      Utils.showNotification('Emergency withdrawal successful!', 'success');
      await this.loadAdminStats();
    } catch (error) {
      console.error('Emergency withdraw error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async processInactive() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can process inactive accounts', 'error');
      return;
    }
    
    const addressInput = document.getElementById('inactiveAddress');
    if (!addressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    
    if (!Utils.validateAddress(address)) {
      Utils.showNotification('Invalid address', 'error');
      return;
    }
    
    if (!confirm(`Process inactive account ${Utils.formatAddress(address)}?`)) return;
    
    Utils.showLoader(true, 'Processing inactive account...');
    try {
      await contracts.processInactiveAccount(address);
      Utils.showNotification('Account processed successfully!', 'success');
      addressInput.value = '';
    } catch (error) {
      console.error('Process inactive error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async addBoardMember() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can add board members', 'error');
      return;
    }
    
    const addressInput = document.getElementById('boardMemberAddress');
    if (!addressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    
    if (!Utils.validateAddress(address)) {
      Utils.showNotification('Invalid address', 'error');
      return;
    }
    
    if (!confirm(`Add ${Utils.formatAddress(address)} to board?`)) return;
    
    Utils.showLoader(true, 'Adding board member...');
    try {
      await contracts.addBoardMember(address);
      Utils.showNotification('Board member added successfully!', 'success');
      addressInput.value = '';
      await this.loadBoardMembers();
    } catch (error) {
      console.error('Add board member error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async promptRemoveBoardMember(address) {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can remove board members', 'error');
      return;
    }
    
    if (!confirm(`Remove ${Utils.formatAddress(address)} from board?\n\nNote: This may require board voting.`)) return;
    
    Utils.showLoader(true, 'Removing board member...');
    try {
      await contracts.removeBoardMember(address);
      Utils.showNotification('Board member removed!', 'success');
      await this.loadBoardMembers();
    } catch (error) {
      console.error('Remove board member error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  async removeBoardMember() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can remove board members', 'error');
      return;
    }
    
    const addressInput = document.getElementById('boardMemberAddress');
    if (!addressInput) {
      Utils.showNotification('Form element not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    
    if (!Utils.validateAddress(address)) {
      Utils.showNotification('Invalid address', 'error');
      return;
    }
    
    await this.promptRemoveBoardMember(address);
    addressInput.value = '';
  }

  async blockUser() {
    if (!this.isOwner) {
      Utils.showNotification('Only Owner can block users', 'error');
      return;
    }
    
    const addressInput = document.getElementById('blockUserAddress');
    const reasonInput = document.getElementById('blockReason');
    
    if (!addressInput || !reasonInput) {
      Utils.showNotification('Form elements not found', 'error');
      return;
    }
    
    const address = addressInput.value.trim();
    const reason = reasonInput.value.trim();
    
    if (!Utils.validateAddress(address)) {
      Utils.showNotification('Invalid address', 'error');
      return;
    }
    
    if (!reason) {
      Utils.showNotification('Please enter a reason', 'error');
      return;
    }
    
    if (!confirm(`Block user ${Utils.formatAddress(address)}?\n\nReason: ${reason}`)) return;
    
    Utils.showLoader(true, 'Blocking user...');
    try {
      await contracts.blockUser(address, reason);
      Utils.showNotification('User blocked successfully!', 'success');
      addressInput.value = '';
      reasonInput.value = '';
    } catch (error) {
      console.error('Block user error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.showLoader(false);
    }
  }
}

// Створити глобальний екземпляр
const adminManager = new AdminManager();

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminManager;
}
