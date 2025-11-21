// ═══════════════════════════════════════════════════════════════════
// ПАТЧ для app.js - Виправлення регістрації
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// ВИПРАВЛЕННЯ #1: getReferralFromURL()
// Лінія 202-205
// ═══════════════════════════════════════════════════════════════
getReferralFromURL() {
  // ✅ ВИПРАВЛЕНО: Перевіряємо як в URL так і в hash
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  
  const refFromURL = urlParams.get('ref') || urlParams.get('sponsor');
  const refFromHash = hashParams.get('ref') || hashParams.get('sponsor');
  
  const referral = refFromURL || refFromHash || null;
  
  console.log('🔍 Checking referral from URL...');
  console.log('   URL search:', window.location.search);
  console.log('   URL hash:', window.location.hash);
  console.log('   Found referral:', referral);
  
  return referral;
}

// ═══════════════════════════════════════════════════════════════
// ВИПРАВЛЕННЯ #2: checkAndAutoRegister()
// Лінія 207-291
// ═══════════════════════════════════════════════════════════════
async checkAndAutoRegister() {
  if (!this.state.userAddress) {
    console.log('⚠️ No user address, skipping registration check');
    return;
  }

  try {
    console.log('🔍 Checking registration status for:', this.state.userAddress);
    
    const matrixRegistry = await this.getContract('MatrixRegistry');
    const isRegistered = await matrixRegistry.isRegistered(this.state.userAddress);
    
    console.log('📋 Registration status:', isRegistered);
    
    if (isRegistered) {
      console.log('✅ User is already registered');
      this.state.isRegistered = true;
      
      const userId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
      this.state.userId = userId.toString();
      console.log('🆔 User ID:', this.state.userId);
      
      // ✅ ДОДАНО: Завантажуємо maxLevel для вже зареєстрованих
      try {
        const globalWay = await this.getContract('GlobalWay');
        const maxLevel = await globalWay.getUserMaxLevel(this.state.userAddress);
        this.state.maxLevel = Number(maxLevel);
        console.log('📊 Max level:', this.state.maxLevel);
      } catch (error) {
        console.warn('⚠️ Could not load maxLevel:', error);
      }
      
      setTimeout(() => {
        this.checkAndShowActivationModal();
      }, 1000);
      
      return;
    }
    
    console.log('🆕 User not registered');
    
    // ✅ ВИПРАВЛЕНО: Перевіряємо чи є реферал в URL перед питанням
    const referralCode = this.getReferralFromURL();
    let sponsorId = null;
    
    if (referralCode) {
      console.log('🔗 Found referral code:', referralCode);
      sponsorId = await this.getSponsorId();
      console.log('🎯 Resolved sponsor ID:', sponsorId);
    }
    
    // ✅ ВИПРАВЛЕНО: Питаємо користувача
    const message = referralCode 
      ? `Добро пожаловать в GlobalWay!\n\nВас запросил партнёр с ID: ${sponsorId}\n\nРегистрация БЕСПЛАТНАЯ и займет несколько секунд.\n\nЗарегистрироваться сейчас?`
      : `Добро пожаловать в GlobalWay!\n\nДля начала работы необходимо зарегистрироваться.\nРегистрация БЕСПЛАТНАЯ и займет несколько секунд.\n\nЗарегистрироваться сейчас?`;
    
    const wantsToRegister = confirm(message);
    
    if (!wantsToRegister) {
      this.showNotification('Регистрация отменена', 'info');
      return;
    }
    
    console.log('🚀 Starting registration...');
    
    // ✅ ВИПРАВЛЕНО: Якщо ще не отримали sponsorId - отримуємо зараз
    if (!sponsorId) {
      sponsorId = await this.getSponsorId();
    }
    
    console.log('🎯 Using sponsor ID:', sponsorId);
    
    if (!sponsorId || sponsorId === '0') {
      throw new Error('Invalid sponsor ID: ' + sponsorId);
    }
    
    // ✅ ВИПРАВЛЕНО: Реєстрація через MatrixRegistry
    console.log('📝 Calling MatrixRegistry.register(' + sponsorId + ')...');
    
    const matrixRegistrySigned = await this.getSignedContract('MatrixRegistry');
    
    // ✅ ДОДАНО: Показуємо попередження перед підтвердженням
    this.showNotification('Підтвердіть транзакцію в гаманці...', 'info');
    
    const registerTx = await matrixRegistrySigned.register(sponsorId, { 
      gasLimit: CONFIG.GAS.register 
    });
    
    console.log('⏳ Transaction sent:', registerTx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    this.showNotification('Реєстрація... Очікуйте підтвердження.', 'info');
    
    const receipt = await registerTx.wait();
    console.log('✅ Transaction confirmed:', receipt.transactionHash);
    
    this.state.isRegistered = true;
    
    // ✅ ВИПРАВЛЕНО: Отримуємо новий ID користувача
    const newUserId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
    this.state.userId = newUserId.toString();

    console.log('✅ Registration completed!');
    console.log('   Transaction hash:', receipt.transactionHash);
    console.log('   Your new ID:', this.state.userId);

    this.showNotification(
      `✅ Реєстрація завершена!\n\nВаш ID: GW${this.state.userId}\n\nТепер активуйте перший рівень!`, 
      'success'
    );

    // ✅ ДОДАНО: Перезавантажуємо дані користувача
    await this.loadUserData();
    await this.loadCurrentPage();

    setTimeout(() => {
      this.showActivationModal();
    }, 1500);

  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error data:', error.data);
    
    if (error.code === 4001) {
      this.showNotification('Дія скасована користувачем', 'info');
    } else if (error.code === -32603) {
      this.showNotification('Помилка виконання транзакції. Перевірте баланс BNB.', 'error');
    } else if (error.message && error.message.includes('Already registered')) {
      console.log('⚠️ User already registered (from error)');
      this.state.isRegistered = true;
      await this.loadUserData();
      this.showNotification('Ви вже зареєстровані!', 'info');
    } else if (error.message && error.message.includes('Sponsor not registered')) {
      this.showNotification('Помилка: спонсор не зареєстрований', 'error');
    } else if (error.message && error.message.includes('Invalid sponsor')) {
      this.showNotification('Помилка: невірний ID спонсора', 'error');
    } else {
      this.showNotification('Помилка: ' + (error.message || 'Невідома помилка'), 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ВИПРАВЛЕННЯ #3: getSponsorId()
// Лінія 293-328
// ═══════════════════════════════════════════════════════════════
async getSponsorId() {
  const refCode = this.getReferralFromURL();
  
  console.log('🔍 Getting sponsor ID for ref code:', refCode);
  
  // Якщо нет реферала - используем ID 1 (основатель)
  if (!refCode) {
    console.log('ℹ️ No referral code, using default sponsor ID: 1');
    return '1';
  }

  try {
    const matrixRegistry = await this.getContract('MatrixRegistry');
    
    // ✅ ВИПРАВЛЕНО: Якщо це GW123456 або просто 123456
    if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
      const id = refCode.replace(/^GW/i, '');
      console.log('🔢 Checking numeric ID:', id);
      
      // Перевіряємо що користувач з таким ID існує
      try {
        const address = await matrixRegistry.getAddressById(id);
        console.log('📍 Address for ID', id, ':', address);
        
        if (address && address !== ethers.constants.AddressZero) {
          console.log('✅ Valid sponsor ID:', id);
          return id;
        } else {
          console.warn('⚠️ Invalid sponsor ID (zero address):', id);
        }
      } catch (error) {
        console.error('❌ Error checking ID:', id, error);
      }
    }
    
    // ✅ ВИПРАВЛЕНО: Якщо це адреса 0x...
    if (refCode.startsWith('0x')) {
      console.log('🔍 Checking address:', refCode);
      
      try {
        const userId = await matrixRegistry.getUserIdByAddress(refCode);
        console.log('🆔 User ID for address:', userId.toString());
        
        if (userId && userId.toString() !== '0') {
          console.log('✅ Valid sponsor from address:', userId.toString());
          return userId.toString();
        } else {
          console.warn('⚠️ Address not registered:', refCode);
        }
      } catch (error) {
        console.error('❌ Error checking address:', refCode, error);
      }
    }
  } catch (error) {
    console.error('❌ Error getting sponsor ID:', error);
  }

  // Возвращаем ID 1 по умолчанию
  console.log('ℹ️ Falling back to default sponsor ID: 1');
  return '1';
}
