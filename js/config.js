// Configuration for GlobalWay DApp
const CONFIG = {
  NETWORK: {
    chainId: 204,
    chainIdHex: '0xCC',
    name: 'opBNB Mainnet',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    currency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },

  // ✅ ИСПРАВЛЕНО: НОВЫЕ адреса контрактов (деплой 10.11.2025)
  CONTRACTS: {
    GlobalWay: '0x62b26B98E63e1F272684D8517Ec1e4365322A11b',
    GlobalWayHelper: '0x8F408d8786D862509dD021A06CF6697dF802db3a',
    GlobalWayMarketing: '0x1f3Addbb931270dEbF3c88d457Be1Ef7a7E43D5c',
    GlobalWayQuarterly: '0xd62461F550895D76209DFd9cE7aa1845B099756C',
    GlobalWayLeaderPool: '0xb585cF8a3237166ccC575293B4D8776E50f46ACd',
    GlobalWayInvestment: '0xD8e8CB4e1c9498524F85A1924D2f8B58d16f7655',
    GlobalWayStats: '0x2B1Be8cc641fe0CfeAD7D8140b74857086429cce',
    GlobalWayBridge: '0xC6ec10e2801F6641FBC732fFF549a89E269F324f',
    GlobalWayGovernance: '0xD2281a42bA1185F702C023eb2d759C5140598Ada',
    GlobalWayTechAccounts: '0xA42d60977Fc3AcddFbA5F56fE55bAD2214A7F0dA',
    GWTToken: '0x7dFd9ff1B4D2Cb6Cc830589d5a9556664B9D6C95'
  },

  WALLETS: {
    treasury: '0xE58f778236C1D3cCecf14eC1274761559685a336',
    charity: '0x09c3bD32EB0617e29E41382b738c4E3Cc932A611',
    tokenomics: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F'
  },

  // ✅ ADMIN: Owner + 3 Founders с доступом к админке
  ADMIN: {
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',
    
    founders: [
      {
        address: '0x03284a899147f5a07f82c622f34df92198671635',
        id: '7777777'
      },
      {
        address: '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
        id: '5555555'
      },
      {
        address: '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7',
        id: '9999999'
      },
      {
        address: '0xa3496caCC8523421Dd151f1d92A456c2daFa28c2',
        id: '2290631'
      }
    ],
    
    // Board members (для голосования)
    board: [
      '0x11c4FA4126f9B373c4b9A2D43986Cd331E32d2fA',
      '0x0AB97e3934b1Afc9F1F6447CCF676E4f1D8B9639',
      '0x0561671297Eed07accACB41b4882ED61e87E3644',
      '0x012E0B2b502FE0131Cb342117415a43d59094D6d',
      '0x15b546a61865bdc46783ACfc50c3101a1121c69B',
      '0xB5986B808dad481ad86D63DF152cC0ad7B473e48',
      '0x4d2C77e59538deFe89E3B2951680547FC24aD52C',
      '0xAB17aDbe29c4E1d695C239206682B02ebdB3f707'
    ]
  },

  PROJECTS: [
    {
      id: 'CG',
      name: 'KardGift',
      description: 'Gift card marketplace and exchange platform',
      logo: 'assets/icons/CardGift.png',
      status: 'development',
      requiredLevel: 1,
      prefix: 'CG'
    },
    {
      id: 'GT',
      name: 'GlobalTub',
      description: 'Decentralized video streaming platform',
      logo: 'assets/icons/GlobalTub.png',
      status: 'development',
      requiredLevel: 4,
      prefix: 'GT'
    },
    {
      id: 'GM',
      name: 'GlobalMarket',
      description: 'P2P marketplace for goods and services',
      logo: 'assets/icons/GlobalMarket.png',
      status: 'coming',
      requiredLevel: 4,
      prefix: 'GM'
    },
    {
      id: 'GG',
      name: 'GlobalGame',
      description: 'Play-to-earn gaming ecosystem',
      logo: 'assets/icons/GlobalGame.png',
      status: 'coming',
      requiredLevel: 7,
      prefix: 'GG'
    },
    {
      id: 'GS',
      name: 'GlobalSocial',
      description: 'Decentralized social network',
      logo: 'assets/icons/GlobalSocial.png',
      status: 'planning',
      requiredLevel: 7,
      prefix: 'GS'
    },
    {
      id: 'GB',
      name: 'GlobalBank',
      description: 'DeFi banking and lending platform',
      logo: 'assets/icons/GlobalBank.png',
      status: 'planning',
      requiredLevel: 10,
      prefix: 'GB'
    },
    {
      id: 'GE',
      name: 'GlobalEdu',
      description: 'Educational platform and certification',
      logo: 'assets/icons/GlobalEdu.png',
      status: 'planning',
      requiredLevel: 10,
      prefix: 'GE'
    },
    {
      id: 'GL',
      name: 'EcoVillages',
      description: 'Eco-settlements and sustainable living',
      logo: 'assets/icons/EcoVillages.png',
      status: 'planning',
      requiredLevel: 12,
      prefix: 'GL'
    }
  ],

  LEVEL_PRICES: [
    '0.0015',  // 1
    '0.003',   // 2
    '0.006',   // 3
    '0.012',   // 4
    '0.024',   // 5
    '0.048',   // 6
    '0.096',   // 7
    '0.192',   // 8
    '0.384',   // 9
    '0.768',   // 10
    '1.536',   // 11
    '3.072'    // 12
  ],

  TOKEN_REWARDS: [
    5,     // 1
    5,     // 2
    10,    // 3
    15,    // 4
    35,    // 5
    75,    // 6
    150,   // 7
    300,   // 8
    600,   // 9
    1200,  // 10
    2400,  // 11
    4500   // 12
  ],

  QUARTERLY_COST: '0.075',
  
  DEEP_LINKS: {
    safepal: 'safepal://wc?uri=',
    metamask: 'https://metamask.app.link/dapp/'
  },
  
  QR_CONFIG: {
    size: 256,
    logo: 'assets/icons/logo-32x32.png'
  }
};

// ✅ ЭКСПОРТ В WINDOW
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.contractsConfig = CONFIG.CONTRACTS;
  
  console.log('✅ Config loaded:', {
    network: CONFIG.NETWORK.name,
    contracts: Object.keys(CONFIG.CONTRACTS).length,
    admin: CONFIG.ADMIN.owner
  });
}
