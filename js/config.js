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

  // ✅ НОВЫЕ АДРЕСА КОНТРАКТОВ (деплой 15.11.2025)
  CONTRACTS: {
    GlobalWay: '0x115D37c4ee5a3c15fc3d0C05CB481728AcaBf036',
    GlobalWayHelper: '0x20EA180B9945B7391925940DeaAB9e576BfB9c81',
    GlobalWayMarketing: '0xd5906199C749643714C1FcB9E6217dF07A89edcd',
    GlobalWayQuarterly: '0x0e65983DdAaC6c0B142787fF1cf79e0A75ca294A',
    GlobalWayLeaderPool: '0x0CaD4395c1D074DC42Fe606907BED372C63406C3',
    GlobalWayInvestment: '0xb141036899f4e32744ecF3520BD134f41acD6b26',
    GlobalWayStats: '0xF493CDe52f9da6390cDd8f200109fDBF333080b3',
    GlobalWayBridge: '0xe63f5bf69232E2e76E530F2797bBd81e4fafE512',
    GlobalWayGovernance: '0x7f52082AfA3931f9404fBF856D676F9a4b604Bf6',
    GlobalWayTechAccounts: '0x7A2Dee3679FC25C6a998a5198921E92D8907Bc31',
    GWTToken: '0xa9d16942aCB90df6465B81f95c9a91f13F1700Ae'
  },

  WALLETS: {
    treasury: '0xE58f778236C1D3cCecf14eC1274761559685a336',
    charity: '0x09c3bD32EB0617e29E41382b738c4E3Cc932A611',
    tokenomics: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F',
    ops: '0x956C8350b874D01D32236Eb2944089B54C3b9670',
    dev: '0xF8C5504dc1e5165a0748A3DC410384BfCBab13Dd'
  },

  // ✅ ADMIN: Owner + 3 Founders (с доступом к админке)
  ADMIN: {
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',
    
    // ✅ ТОЛЬКО ЭТИ 3 FOUNDERS ИМЕЮТ ДОСТУП К АДМИНКЕ
    adminFounders: [
      {
        address: '0x03284A899147f5a07F82C622F34DF92198671635',
        id: '7777777',
        name: 'Founder 1'
      },
      {
        address: '0x9b49bD9c9458615e11C051afd1EBe983563b67EE',
        id: '5555555',
        name: 'Founder 2'
      },
      {
        address: '0xc2b58114cBc873cf360f7A673e4d8EE25d1431e7',
        id: '9999999',
        name: 'Founder 3'
      }
    ],
    
    // ВСЕ 4 FOUNDERS (для справки)
    allFounders: [
      {
        address: '0x03284A899147f5a07F82C622F34DF92198671635',
        id: '7777777',
        name: 'Founder 1',
        hasAdminAccess: true
      },
      {
        address: '0x9b49bD9c9458615e11C051afd1EBe983563b67EE',
        id: '5555555',
        name: 'Founder 2',
        hasAdminAccess: true
      },
      {
        address: '0xc2b58114cBc873cf360f7A673e4d8EE25d1431e7',
        id: '9999999',
        name: 'Founder 3',
        hasAdminAccess: true
      },
      {
        address: '0xa3496caCC8523421Dd151f1d92A456c2daFa28c2',
        id: '2290631',
        name: 'Founder 4',
        hasAdminAccess: false
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

  // ✅ ПРАВИЛЬНЫЕ ЦЕНЫ УРОВНЕЙ (в BNB)
  LEVEL_PRICES: [
    '0.005',   // Level 1
    '0.01',    // Level 2
    '0.02',    // Level 3
    '0.04',    // Level 4
    '0.08',    // Level 5
    '0.16',    // Level 6
    '0.32',    // Level 7
    '0.64',    // Level 8
    '1.28',    // Level 9
    '2.56',    // Level 10
    '5.12',    // Level 11
    '10.24'    // Level 12
  ],

  // ✅ ТОКЕНЫ ЗА УРОВНИ (GWT)
  TOKEN_REWARDS: [
    5,     // Level 1
    5,     // Level 2
    10,    // Level 3
    15,    // Level 4
    35,    // Level 5
    75,    // Level 6
    150,   // Level 7
    300,   // Level 8
    600,   // Level 9
    1200,  // Level 10
    2400,  // Level 11
    4500   // Level 12
  ],

  // ✅ КВАРТАЛЬНАЯ ОПЛАТА
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
    admin: CONFIG.ADMIN.owner,
    adminFounders: CONFIG.ADMIN.adminFounders.length,
    totalFounders: CONFIG.ADMIN.allFounders.length
  });
}
