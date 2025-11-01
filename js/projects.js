/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * Projects Manager - З ІНТЕГРАЦІЄЮ BRIDGE
 */

class ProjectsManager {
  constructor() {
    this.projects = [];
  }

  async init() {
    console.log('🚀 Initializing Projects Manager...');
    
    if (!web3Manager.connected) {
      console.log('⚠️ Wallet not connected');
      return;
    }
    
    await this.loadProjects();
    this.setupEventListeners();
    
    console.log('✅ Projects Manager initialized');
  }

  setupEventListeners() {
    const proposalForm = document.getElementById('proposalForm');
    if (proposalForm) {
      proposalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitProposal();
      });
    }
    
    const joinProgramBtn = document.getElementById('joinProgram');
    if (joinProgramBtn) {
      joinProgramBtn.addEventListener('click', () => {
        Utils.showNotification('Developer program coming soon', 'info');
      });
    }
    
    const viewDocsBtn = document.getElementById('viewDocs');
    if (viewDocsBtn) {
      viewDocsBtn.addEventListener('click', () => {
        window.open('https://docs.globalway.io', '_blank');
      });
    }
  }

  async loadProjects() {
    try {
      const projects = CONFIG.PROJECTS;
      
      const userStatus = await contracts.getUserAccessStatus(web3Manager.address);
      const activeProjects = await contracts.getAllProjects();
      
      this.renderProjects(projects, userStatus, activeProjects);
      this.updateProjectStats(projects, activeProjects);
      
    } catch (error) {
      console.error('loadProjects error:', error);
      Utils.showNotification('Failed to load projects', 'error');
    }
  }

  renderProjects(projects, userStatus, activeProjects) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (const project of projects) {
      const hasAccess = userStatus.isRegistered && 
                        userStatus.maxLevel >= project.requiredLevel &&
                        userStatus.quarterlyActive;
      
      const isActiveOnBridge = activeProjects.includes(project.id);
      
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-logo">
          <img src="${project.logo}" alt="${project.name}" onerror="this.src='assets/icons/default.png'">
        </div>
        <div class="project-info">
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <div class="project-meta">
            <span class="project-status status-${project.status}">${project.status}</span>
            <span class="project-level">Level ${project.requiredLevel}+</span>
          </div>
        </div>
        <div class="project-actions">
          ${hasAccess && isActiveOnBridge ? 
            `<button class="btn-primary" onclick="projectsManager.openProject('${project.id}')">Open Project</button>` :
            `<button class="btn-secondary" onclick="projectsManager.showProjectDetails('${project.id}')">View Details</button>`
          }
        </div>
      `;
      
      grid.appendChild(card);
    }
  }

  async showProjectDetails(projectId) {
    const project = CONFIG.PROJECTS.find(p => p.id === projectId);
    if (!project) return;
    
    let accessStatus;
    try {
      accessStatus = await contracts.checkUserAccess(projectId, web3Manager.address);
    } catch (error) {
      console.error('checkUserAccess error:', error);
      accessStatus = {
        isRegistered: false,
        maxLevel: 0,
        userStatus: 0,
        quarterlyActive: false
      };
    }
    
    const modal = document.getElementById('projectModal');
    if (!modal) return;
    
    document.getElementById('projectModalLogo').src = project.logo;
    document.getElementById('projectModalTitle').textContent = project.name;
    document.getElementById('projectModalStatus').textContent = project.status;
    document.getElementById('projectModalStatus').className = `project-status status-${project.status}`;
    document.getElementById('projectModalDescription').textContent = project.description;
    document.getElementById('projectModalRequirements').textContent = `Level ${project.requiredLevel} or higher`;
    document.getElementById('projectModalPrefix').textContent = `${project.prefix}-XXXXXXX`;
    
    const actionBtn = document.getElementById('projectModalAction');
    if (actionBtn) {
      if (accessStatus.isRegistered && accessStatus.maxLevel >= project.requiredLevel && accessStatus.quarterlyActive) {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Open Project';
        actionBtn.onclick = () => {
          modal.style.display = 'none';
          this.openProject(projectId);
        };
      } else {
        actionBtn.disabled = true;
        if (!accessStatus.isRegistered) {
          actionBtn.textContent = 'Please Register First';
        } else if (accessStatus.maxLevel < project.requiredLevel) {
          actionBtn.textContent = `Requires Level ${project.requiredLevel}`;
        } else if (!accessStatus.quarterlyActive) {
          actionBtn.textContent = 'Pay Quarterly Activity First';
        } else {
          actionBtn.textContent = 'Access Denied';
        }
      }
    }
    
    modal.style.display = 'block';
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => modal.style.display = 'none';
    }
  }

  async openProject(projectId) {
    try {
      const projectData = await contracts.getProject(projectId);
      
      if (!projectData || !projectData.isActive) {
        Utils.showNotification('Project is not active yet', 'warning');
        return;
      }
      
      const userInfo = await contracts.getUserInfo(web3Manager.address);
      const projectUserId = `${projectId}-${userInfo.id}`;
      
      Utils.showNotification(`Opening ${projectId} with ID: ${projectUserId}`, 'info');
      
    } catch (error) {
      console.error('openProject error:', error);
      Utils.showNotification('Failed to open project', 'error');
    }
  }

  updateProjectStats(projects, activeProjects) {
    const totalProjectsEl = document.getElementById('totalProjects');
    if (totalProjectsEl) {
      totalProjectsEl.textContent = projects.length;
    }
    
    const activeProjectsEl = document.getElementById('activeProjects');
    if (activeProjectsEl) {
      activeProjectsEl.textContent = activeProjects.length;
    }
    
    const devProjectsEl = document.getElementById('devProjects');
    if (devProjectsEl) {
      const devCount = projects.filter(p => p.status === 'development').length;
      devProjectsEl.textContent = devCount;
    }
    
    const comingProjectsEl = document.getElementById('comingProjects');
    if (comingProjectsEl) {
      const comingCount = projects.filter(p => p.status === 'coming' || p.status === 'planning').length;
      comingProjectsEl.textContent = comingCount;
    }
  }

  async submitProposal() {
    const author = document.getElementById('proposalAuthor').value;
    const contact = document.getElementById('proposalContact').value;
    const sphere = document.getElementById('proposalSphere').value;
    const idea = document.getElementById('proposalIdea').value;
    const description = document.getElementById('proposalDescription').value;
    
    if (!author || !contact || !sphere || !idea || !description) {
      Utils.showNotification('Please fill all fields', 'warning');
      return;
    }
    
    try {
      Utils.showLoader(true, 'Submitting proposal...');
      
      const proposal = {
        author,
        contact,
        sphere,
        idea,
        description,
        timestamp: Date.now(),
        submitter: web3Manager.address
      };
      
      console.log('Proposal:', proposal);
      
      Utils.showNotification('Proposal submitted successfully!', 'success');
      
      document.getElementById('proposalForm').reset();
      
    } catch (error) {
      console.error('submitProposal error:', error);
      Utils.showNotification('Failed to submit proposal', 'error');
    } finally {
      Utils.hideLoader();
    }
  }
}

const projectsManager = new ProjectsManager();
