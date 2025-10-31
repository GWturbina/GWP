/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG, ethers */

/**
 * Partners Manager - Управління партнерами
 */
class PartnersManager {
  constructor() {
    this.partners = [];
    this.filteredPartners = [];
    this.currentSort = { field: 'id', order: 'asc' };
    this.currentFilter = { level: 'all', status: 'all' };
  }

  async init() {
    console.log('📊 Initializing Partners Manager...');
    this.setupEventListeners();
    await this.loadPartners();
    console.log('✅ Partners Manager initialized');
  }

  setupEventListeners() {
    const levelFilter = document.getElementById('partnerLevelFilter');
    const statusFilter = document.getElementById('partnerStatusFilter');
    const searchInput = document.getElementById('partnerSearch');

    if (levelFilter) levelFilter.addEventListener('change', () => this.applyFilters());
    if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());
    if (searchInput) searchInput.addEventListener('input', (e) => this.searchPartners(e.target.value));

    document.querySelectorAll('.sortable-header').forEach(header => {
      header.addEventListener('click', () => this.sortPartners(header.dataset.field));
    });

    const refreshBtn = document.getElementById('refreshPartnersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadPartners());
  }

  async loadPartners() {
    if (!web3Manager.connected) return;
    const address = web3Manager.address;
    Utils.showLoader(true, 'Loading partners...');

    try {
      console.log('📊 Loading partners for:', address);
      const userInfo = await contracts.getUserInfo(address);
      const activeLevel = userInfo.activeLevel || 12;
      this.partners = [];

      for (let level = 1; level <= activeLevel; level++) {
        const levelPartners = await contracts.getUserPartners(address, level);
        for (const partnerAddress of levelPartners) {
          const partnerInfo = await contracts.getUserInfo(partnerAddress);
          const teamStats = await contracts.getTeamStats(partnerAddress);
          this.partners.push({
            address: partnerAddress,
            id: partnerInfo.id,
            level: level,
            rankLevel: partnerInfo.rankLevel,
            activeLevel: partnerInfo.activeLevel,
            partnersCount: partnerInfo.partnersCount,
            registrationTime: partnerInfo.registrationTime,
            isActive: partnerInfo.isActive,
            teamSize: teamStats.totalTeamSize || 0,
            personalInvites: teamStats.personalInvites || 0
          });
        }
      }

      console.log(`✅ Loaded ${this.partners.length} partners`);
      this.applyFilters();
      this.renderPartners();
      this.updatePartnersStats();
    } catch (error) {
      console.error('❌ Load partners error:', error);
      Utils.showNotification('Failed to load partners', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  renderPartners() {
    const container = document.getElementById('partnersTableBody');
    if (!container) return;

    if (this.filteredPartners.length === 0) {
      container.innerHTML = '<tr><td colspan="8" class="text-center empty-state">No partners found</td></tr>';
      return;
    }

    container.innerHTML = this.filteredPartners.map(partner => `
      <tr class="partner-row" data-address="${partner.address}">
        <td>${Utils.formatUserId(partner.id)}</td>
        <td><a href="${Utils.getExplorerLink(partner.address)}" target="_blank">${Utils.formatAddress(partner.address)}</a></td>
        <td>Level ${partner.level}</td>
        <td><span class="rank-badge rank-${partner.rankLevel}">${Utils.getRankName(partner.rankLevel)}</span></td>
        <td>${partner.activeLevel}/12</td>
        <td>${partner.partnersCount}</td>
        <td>${partner.teamSize}</td>
        <td>${Utils.formatDateShort(partner.registrationTime)}</td>
        <td><button class="btn-sm btn-primary" onclick="partnersManager.viewPartnerDetails('${partner.address}')">View</button></td>
      </tr>
    `).join('');
  }

  applyFilters() {
    this.filteredPartners = this.partners.filter(partner => {
      const levelFilter = document.getElementById('partnerLevelFilter');
      if (levelFilter && levelFilter.value !== 'all' && partner.level !== parseInt(levelFilter.value)) return false;

      const statusFilter = document.getElementById('partnerStatusFilter');
      if (statusFilter && statusFilter.value !== 'all') {
        if (statusFilter.value === 'active' && !partner.isActive) return false;
        if (statusFilter.value === 'inactive' && partner.isActive) return false;
      }
      return true;
    });
    this.sortPartnersArray();
  }

  searchPartners(query) {
    if (!query) {
      this.applyFilters();
      this.renderPartners();
      return;
    }
    query = query.toLowerCase();
    this.filteredPartners = this.partners.filter(partner => 
      partner.address.toLowerCase().includes(query) ||
      Utils.formatUserId(partner.id).toLowerCase().includes(query) ||
      Utils.getRankName(partner.rankLevel).toLowerCase().includes(query)
    );
    this.renderPartners();
  }

  sortPartners(field) {
    if (this.currentSort.field === field) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.field = field;
      this.currentSort.order = 'asc';
    }
    this.sortPartnersArray();
    this.renderPartners();
    this.updateSortIndicators();
  }

  sortPartnersArray() {
    const field = this.currentSort.field;
    const order = this.currentSort.order;
    this.filteredPartners.sort((a, b) => {
      let aVal = a[field], bVal = b[field];
      if (typeof aVal === 'number' && typeof bVal === 'number') return order === 'asc' ? aVal - bVal : bVal - aVal;
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  updateSortIndicators() {
    document.querySelectorAll('.sortable-header').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    const currentHeader = document.querySelector(`.sortable-header[data-field="${this.currentSort.field}"]`);
    if (currentHeader) currentHeader.classList.add(`sort-${this.currentSort.order}`);
  }

  updatePartnersStats() {
    const totalPartners = this.partners.length;
    const activePartners = this.partners.filter(p => p.isActive).length;
    const totalTeamSize = this.partners.reduce((sum, p) => sum + p.teamSize, 0);

    const totalEl = document.getElementById('totalPartnersCount');
    const activeEl = document.getElementById('activePartnersCount');
    const teamEl = document.getElementById('totalTeamSize');

    if (totalEl) totalEl.textContent = totalPartners;
    if (activeEl) activeEl.textContent = activePartners;
    if (teamEl) teamEl.textContent = totalTeamSize;
  }

  async viewPartnerDetails(address) {
    Utils.showLoader(true, 'Loading partner details...');
    try {
      const partnerInfo = await contracts.getUserFullInfo(address);
      const modalContent = `
        <div class="partner-details">
          <div class="detail-row"><span class="label">Address:</span><span class="value"><a href="${Utils.getExplorerLink(address)}" target="_blank">${address}</a></span></div>
          <div class="detail-row"><span class="label">User ID:</span><span class="value">${Utils.formatUserId(partnerInfo.id)}</span></div>
          <div class="detail-row"><span class="label">Sponsor ID:</span><span class="value">${Utils.formatUserId(partnerInfo.sponsorId)}</span></div>
          <div class="detail-row"><span class="label">Rank:</span><span class="value"><span class="rank-badge rank-${partnerInfo.rankLevel}">${Utils.getRankName(partnerInfo.rankLevel)}</span></span></div>
          <div class="detail-row"><span class="label">Active Level:</span><span class="value">${partnerInfo.activeLevel}/12</span></div>
          <div class="detail-row"><span class="label">Partners Count:</span><span class="value">${partnerInfo.partnersCount}</span></div>
          <div class="detail-row"><span class="label">Team Size:</span><span class="value">${partnerInfo.teamStats?.totalTeamSize || 0}</span></div>
          <div class="detail-row"><span class="label">Registration:</span><span class="value">${Utils.formatDate(partnerInfo.registrationTime)}</span></div>
          <h4>Balances:</h4>
          <div class="detail-row"><span class="label">Marketing Pool:</span><span class="value">${Utils.formatBNB(ethers.utils.formatEther(partnerInfo.balances?.marketing || 0))} BNB</span></div>
          <div class="detail-row"><span class="label">Leader Pool:</span><span class="value">${Utils.formatBNB(ethers.utils.formatEther(partnerInfo.balances?.leader || 0))} BNB</span></div>
          <div class="detail-row"><span class="label">Investment Pool:</span><span class="value">${Utils.formatBNB(ethers.utils.formatEther(partnerInfo.balances?.investment || 0))} BNB</span></div>
        </div>
      `;
      Utils.showModal('Partner Details', modalContent);
    } catch (error) {
      console.error('View partner details error:', error);
      Utils.showNotification('Failed to load partner details', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  exportToCSV() {
    const headers = ['User ID','Address','Level','Rank','Active Level','Partners','Team Size','Registration Date'];
    const rows = this.filteredPartners.map(p => [
      Utils.formatUserId(p.id), p.address, p.level, Utils.getRankName(p.rankLevel),
      p.activeLevel, p.partnersCount, p.teamSize, Utils.formatDate(p.registrationTime)
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partners_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    Utils.showNotification('Partners exported successfully', 'success');
  }
}

const partnersManager = new PartnersManager();
