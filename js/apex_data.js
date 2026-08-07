/**
 * Apex Legends Dataset
 * Includes all 29 weapon assets.
 */

const APEX_DATA = {
  classes: {
    assault: { name: '突擊 (Assault)', color: '#FF4A4A', icon: '⚔️' },
    skirmisher: { name: '游擊 (Skirmisher)', color: '#4AF2FF', icon: '⚡' },
    recon: { name: '偵察 (Recon)', color: '#FFD44A', icon: '🎯' },
    support: { name: '支援 (Support)', color: '#4AFF85', icon: '🛡️' },
    controller: { name: '控場 (Controller)', color: '#B84AFF', icon: '🔒' }
  },

  legends: [
    // Assault (突擊)
    { id: 'bangalore', fileKey: 'Bangalore', name: '邦加羅爾', englishName: 'Bangalore', class: 'assault', color: '#E63946' },
    { id: 'fuse', fileKey: 'Fuse', name: '轟哥', englishName: 'Fuse', class: 'assault', color: '#D90429' },
    { id: 'ash', fileKey: 'Ash', name: '艾許', englishName: 'Ash', class: 'assault', color: '#9D0208' },
    { id: 'mad_maggie', fileKey: 'MadMaggie', name: '瘋狂瑪吉', englishName: 'Mad Maggie', class: 'assault', color: '#DC2626' },
    { id: 'ballistic', fileKey: 'Ballistic', name: '彈道', englishName: 'Ballistic', class: 'assault', color: '#B91C1C' },

    // Skirmisher (游擊)
    { id: 'pathfinder', fileKey: 'Pathfinder', name: '探路者', englishName: 'Pathfinder', class: 'skirmisher', color: '#00B4D8' },
    { id: 'wraith', fileKey: 'Wraith', name: '惡靈', englishName: 'Wraith', class: 'skirmisher', color: '#0077B6' },
    { id: 'mirage', fileKey: 'Mirage', name: '幻象', englishName: 'Mirage', class: 'skirmisher', color: '#90E0EF' },
    { id: 'octane', fileKey: 'Octane', name: '辛烷', englishName: 'Octane', class: 'skirmisher', color: '#10B981' },
    { id: 'horizon', fileKey: 'Horizon', name: '天際線', englishName: 'Horizon', class: 'skirmisher', color: '#0284C7' },
    { id: 'valkyrie', fileKey: 'Valkyrie', name: '瓦爾基里', englishName: 'Valkyrie', class: 'skirmisher', color: '#2563EB' },
    { id: 'revenant', fileKey: 'Revenant', name: '亡靈', englishName: 'Revenant', class: 'skirmisher', color: '#4F46E5' },
    { id: 'alter', fileKey: 'Alter', name: '變幻', englishName: 'Alter', class: 'skirmisher', color: '#EC4899' },
    { id: 'axle', fileKey: 'Axle', name: '艾瑟兒', englishName: 'Axle', class: 'skirmisher', color: '#10B981' },

    // Recon (偵察)
    { id: 'bloodhound', fileKey: 'Bloodhound', name: '尋血犬', englishName: 'Bloodhound', class: 'recon', color: '#F59E0B' },
    { id: 'crypto', fileKey: 'Crypto', name: '暗碼士', englishName: 'Crypto', class: 'recon', color: '#D97706' },
    { id: 'seer', fileKey: 'Seer', name: '席爾', englishName: 'Seer', class: 'recon', color: '#B45309' },
    { id: 'vantage', fileKey: 'Vantage', name: '萬塔捷', englishName: 'Vantage', class: 'recon', color: '#EAB308' },
    { id: 'sparrow', fileKey: 'sparrow', name: '雀影', englishName: 'Sparrow', class: 'recon', color: '#FFD44A' },

    // Support (支援)
    { id: 'gibraltar', fileKey: 'Gibraltar', name: '直布羅陀', englishName: 'Gibraltar', class: 'support', color: '#10B981' },
    { id: 'lifeline', fileKey: 'Lifeline', name: '生命線', englishName: 'Lifeline', class: 'support', color: '#059669' },
    { id: 'loba', fileKey: 'Loba', name: '蘿芭', englishName: 'Loba', class: 'support', color: '#047857' },
    { id: 'newcastle', fileKey: 'Newcastle', name: '紐卡索', englishName: 'Newcastle', class: 'support', color: '#065F46' },
    { id: 'conduit', fileKey: 'Conduit', name: '導管', englishName: 'Conduit', class: 'support', color: '#34D399' },

    // Controller (控場)
    { id: 'caustic', fileKey: 'Caustic', name: '腐蝕', englishName: 'Caustic', class: 'controller', color: '#8B5CF6' },
    { id: 'wattson', fileKey: 'Wattson', name: '華森', englishName: 'Wattson', class: 'controller', color: '#7C3AED' },
    { id: 'rampart', fileKey: 'Rampart', name: '蕾帕特', englishName: 'Rampart', class: 'controller', color: '#6D28D9' },
    { id: 'catalyst', fileKey: 'Catalyst', name: '催化劑', englishName: 'Catalyst', class: 'controller', color: '#5B21B6' }
  ],

  weaponCategories: {
    ar: { name: '突擊步槍 (AR)', color: '#FF5722' },
    smg: { name: '衝鋒槍 (SMG)', color: '#00BCD4' },
    lmg: { name: '輕機槍 (LMG)', color: '#8BC34A' },
    marksman: { name: '神射手步槍 (Marksman)', color: '#FFC107' },
    sniper: { name: '狙擊槍 (Sniper)', color: '#9C27B0' },
    shotgun: { name: '霰彈槍 (Shotgun)', color: '#F44336' },
    pistol: { name: '手槍 (Pistol)', color: '#FF9800' }
  },

  weapons: [
    // AR (突擊步槍)
    { id: 'r301', fileKey: 'R-301_Carbine', name: 'R-301', category: 'ar', color: '#FF6B6B' },
    { id: 'flatline', fileKey: 'VK-47_Flatline', name: '平行步槍', category: 'ar', color: '#EE5253' },
    { id: 'hemlok', fileKey: 'Hemlok_Burst_AR', name: '汗洛', category: 'ar', color: '#FF7979' },
    { id: 'havoc', fileKey: 'HAVOC_Rifle', name: '哈博克', category: 'ar', color: '#FF5252' },
    { id: 'nemesis', fileKey: 'Nemesis_Burst_AR', name: '死敵', category: 'ar', color: '#E84118' },

    // SMG (衝鋒槍)
    { id: 'r99', fileKey: 'R-99_SMG', name: 'R-99', category: 'smg', color: '#48DBFB' },
    { id: 'alternator', fileKey: 'Alternator_SMG', name: '轉換者', category: 'smg', color: '#0ABDE3' },
    { id: 'car', fileKey: 'C.A.R._SMG', name: 'CAR', category: 'smg', color: '#00D2D3' },
    { id: 'volt', fileKey: 'Volt_SMG', name: '電能衝鋒槍', category: 'smg', color: '#54A0FF' },
    { id: 'prowler', fileKey: 'Prowler_Burst_PDW', name: '獵獸', category: 'smg', color: '#2E86DE' },

    // LMG (輕機槍)
    { id: 'spitfire', fileKey: 'M600_Spitfire', name: '噴火槍', category: 'lmg', color: '#1DD1A1' },
    { id: 'devotion', fileKey: 'Devotion_LMG', name: '專注輕機槍', category: 'lmg', color: '#10AC84' },
    { id: 'lstar', fileKey: 'L-STAR_EMG', name: 'L-STAR', category: 'lmg', color: '#2ED573' },
    { id: 'rampage', fileKey: 'Rampage_LMG', name: '狂暴', category: 'lmg', color: '#26DE81' },

    // Marksman (神射手步槍)
    { id: 'g7', fileKey: 'G7_Scout', name: 'G7', category: 'marksman', color: '#FECA57' },
    { id: 'triple_take', fileKey: 'Triple_Take', name: '三重擊', category: 'marksman', color: '#FF9F43' },
    { id: 'repeater3030', fileKey: '30-30_Repeater', name: '30-30', category: 'marksman', color: '#F39C12' },
    { id: 'bocek', fileKey: 'Bocek_Compound_Bow', name: '博切克', category: 'marksman', color: '#E67E22' },

    // Sniper (狙擊槍)
    { id: 'sentinel', fileKey: 'Sentinel', name: '哨兵', category: 'sniper', color: '#9B59B6' },
    { id: 'longbow', fileKey: 'Longbow_DMR', name: '長弓', category: 'sniper', color: '#8E44AD' },
    { id: 'charge_rifle', fileKey: 'Charge_Rifle', name: '電能步槍', category: 'sniper', color: '#A55EEA' },
    { id: 'kraber', fileKey: 'Kraber_.50-Cal_Sniper', name: '克萊柏', category: 'sniper', color: '#8854D0' },

    // Shotgun (霰彈槍)
    { id: 'peacekeeper', fileKey: 'Peacekeeper', name: '和平使者', category: 'shotgun', color: '#FF4757' },
    { id: 'mastiff', fileKey: 'Mastiff_Shotgun', name: '獒犬', category: 'shotgun', color: '#FF6B81' },
    { id: 'eva8', fileKey: 'EVA-8_Auto', name: 'EVA-8', category: 'shotgun', color: '#ED4C67' },
    { id: 'mozambique', fileKey: 'Mozambique_Shotgun', name: '莫三比克', category: 'shotgun', color: '#B83280' },

    // Pistol (手槍)
    { id: 'wingman', fileKey: 'Wingman', name: '小幫手', category: 'pistol', color: '#FFA502' },
    { id: 're45', fileKey: 'RE-45_Auto', name: 'RE-45', category: 'pistol', color: '#FF7F50' },
    { id: 'p2020', fileKey: 'P2020', name: 'P2020', category: 'pistol', color: '#E15F41' }
  ]
};
