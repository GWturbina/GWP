'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import useGameStore from '@/lib/store'
import { shortAddress } from '@/lib/web3'
import { LEVELS } from '@/lib/gameData'
import * as C from '@/lib/contracts'
import * as Team from '@/lib/teamContracts'

const AVATARS = ['👨‍💼','👩‍💻','🧔','👩‍🔬','👨‍🚀','👩‍🎨','🧑‍🔧','👩‍🏫','👨‍🌾','👩‍⚕️','🦸‍♂️','🦸‍♀️','🧙‍♂️','🧙‍♀️','🥷','🤴','👸']

const BUSINESSES = [
  { id:0, name:'Малый Бизнес', price:50, emoji:'💼', color:'#3498DB', totalIncome:204, totalWithPartner:504, steps:['Покупаете долю за $50 — деньги начинают работать в малом бизнесе','Бизнес генерирует доход — первые $50 возвращаются вам на руки + 10% с каждой доли Л.П.','$50 реинвестируются, продолжают приносить доход + 10% от реинвеста партнёра','Следующая выплата $100 — сразу на руки','Система накапливает долю для входа в Средний Бизнес ($250)','Последняя выплата $54 — на руки','Цикл повторяется БЕСКОНЕЧНО'], footer:'Купите 2-ю, 3-ю долю — каждая работает отдельно!' },
  { id:1, name:'Средний Бизнес', price:250, emoji:'🏭', color:'#F39C12', totalIncome:1220, totalWithPartner:2520, steps:['Покупаете долю за $250 — деньги работают в среднем бизнесе','Первые $250 на руки + 10% с каждой доли Л.П.','$250 реинвестируются, продолжают приносить доход','Следующая выплата $500 — на руки','Система накапливает для Большого Бизнеса ($1000)','Последняя выплата $470 — на руки','Реинвестиция $50 в Малый Бизнес','Цикл БЕСКОНЕЧНО'], footer:'Два бизнеса работают одновременно!' },
  { id:2, name:'Большой Бизнес', price:1000, emoji:'🏙', color:'#e74c3c', totalIncome:11200, totalWithPartner:12800, steps:['Покупаете долю за $1000 — Большой Бизнес','Первые $1000 на руки + 10% с каждой доли Л.П.','$1000 обязательный реинвест — продолжают приносить доход','Следующая выплата $1000 — на руки','Накапливает для Среднего Бизнеса ($250)','Очередная выплата $1000 — на руки','Реинвестиция $50 в Малый Бизнес после каждых $1000','Цикл БЕСКОНЕЧНО'], footer:'$50 → $250 → $1000 — три источника дохода!' },
]

export default function TeamTab() {
  const { wallet, sponsorId, level, taps, localNst, nst, tables } = useGameStore()
  const [section, setSection] = useState('profile')
  const [copied, setCopied] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('👨‍💼')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [tempNick, setTempNick] = useState('')
  const fileInputRef = useRef(null)

  // Данные
  const [gwFullStats, setGwFullStats] = useState(null)
  const [gwBalances, setGwBalances] = useState(null)
  const [expandedBiz, setExpandedBiz] = useState(null)

  // 9 ЛИНИЙ
  const [lines, setLines] = useState({}) // {0: {addresses:[], details:[], loaded:false}, 1: {...}, ...}
  const [expandedLine, setExpandedLine] = useState(null)
  const [expandedPartner, setExpandedPartner] = useState(null)
  const [loadingLine, setLoadingLine] = useState(null)
  const [totalPartners, setTotalPartners] = useState(0)

  useEffect(() => { if(typeof window!=='undefined'){setNickname(localStorage.getItem('nss_nickname')||'');setAvatar(localStorage.getItem('nss_avatar')||'👨‍💼')} }, [])

  useEffect(() => {
    if (!wallet) return
    Team.getUserFullStats(wallet).then(setGwFullStats).catch(()=>{})
    Team.getUserGWBalances(wallet).then(setGwBalances).catch(()=>{})
    // Загружаем 1 линию сразу
    loadLine1()
  }, [wallet])

  const loadLine1 = async () => {
    if (!wallet) return
    setLoadingLine(0)
    const addresses = await Team.getDirectReferrals(wallet)
    const details = await Team.loadLineDetails(addresses)
    setLines(prev => ({ ...prev, 0: { addresses, details, loaded: true } }))
    setTotalPartners(addresses.length)
    setLoadingLine(null)
  }

  // Загрузка линии N (по клику)
  const loadLine = useCallback(async (lineNum) => {
    if (lines[lineNum]?.loaded) return // уже загружена
    const prevLine = lines[lineNum - 1]
    if (!prevLine?.addresses?.length) return // предыдущая линия пуста

    setLoadingLine(lineNum)
    const addresses = await Team.getNextLineAddresses(prevLine.addresses)
    const details = await Team.loadLineDetails(addresses)
    setLines(prev => ({ ...prev, [lineNum]: { addresses, details, loaded: true } }))
    setLoadingLine(null)
  }, [lines])

  // Раскрыть линию — загрузить если не загружена
  const toggleLine = async (lineNum) => {
    if (expandedLine === lineNum) { setExpandedLine(null); return }
    if (!lines[lineNum]?.loaded) await loadLine(lineNum)
    setExpandedLine(lineNum)
    setExpandedPartner(null)
  }

  const lv = LEVELS[level]||LEVELS[0]
  const totalNst = nst + localNst
  const isCustomPhoto = avatar.startsWith('data:')
  const baseUrl = typeof window!=='undefined' ? window.location.origin : ''
  const referralLink = sponsorId ? `${baseUrl}/invite/house?ref=${sponsorId}` : ''
  const shareText = '🏠 Свой дом под 0%! Тапай — копи метры — строй дом!'
  const shareLinks = {
    tg: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    wa: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${referralLink}`)}`,
    vb: `viber://forward?text=${encodeURIComponent(`${shareText.replace(/[^\x00-\x7F]/g,'').trim()}\n${referralLink}`)}`,
  }
  const copyLink = () => { if(navigator.clipboard)navigator.clipboard.writeText(referralLink);else{const ta=document.createElement('textarea');ta.value=referralLink;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)} setCopied(true);setTimeout(()=>setCopied(false),2000) }
  const handlePhotoUpload = (e) => { const file=e.target.files?.[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=(ev)=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');const s=200;canvas.width=s;canvas.height=s;const ctx=canvas.getContext('2d');const m=Math.min(img.width,img.height);ctx.beginPath();ctx.arc(s/2,s/2,s/2,0,Math.PI*2);ctx.clip();ctx.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,s,s);const b=canvas.toDataURL('image/jpeg',0.85);setAvatar(b);localStorage.setItem('nss_avatar',b);setShowAvatarPicker(false)};img.src=ev.target.result};reader.readAsDataURL(file);e.target.value='' }
  const saveNickname = () => { if(tempNick.trim()){setNickname(tempNick.trim());localStorage.setItem('nss_nickname',tempNick.trim())} setEditingNick(false) }
  const selectAvatar = (av) => { setAvatar(av);localStorage.setItem('nss_avatar',av);setShowAvatarPicker(false) }

  const rankNum = gwFullStats?.matrixRank||0
  const rankName = Team.RANK_NAMES[rankNum]||'Без ранга'
  const rankColor = Team.RANK_COLORS[rankNum]||'#94a3b8'
  const rankEmoji = Team.RANK_EMOJIS[rankNum]||'⚪'
  const bizEarned = tables.map(tb => parseFloat(tb.earned||0))

  const sections = [
    { id:'profile', icon:'👤', label:'Профиль' },
    { id:'business', icon:'💼', label:'Бизнес' },
    { id:'contest', icon:'⚔️', label:'Турниры' },
  ]
  const now=new Date();const eow=new Date(now);eow.setDate(eow.getDate()+(7-eow.getDay()));eow.setHours(23,59,59)
  const daysLeft=Math.ceil((eow-now)/(1000*60*60*24))

  // Подсчёт общего количества по всем линиям
  const allLinesTotal = Object.values(lines).reduce((s, l) => s + (l.addresses?.length || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <div className="px-3 pt-3 pb-1"><h2 className="text-lg font-black text-gold-400">👥 Команда</h2></div>
      <div className="flex gap-1 px-3 mt-1">
        {sections.map(s => (<button key={s.id} onClick={()=>setSection(s.id)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border ${section===s.id?'bg-gold-400/15 border-gold-400/30 text-gold-400':'border-white/8 text-slate-500'}`}>{s.icon} {s.label}</button>))}
      </div>

      {/* ═══ ПРОФИЛЬ ═══ */}
      {section === 'profile' && (
        <div className="px-3 mt-2 space-y-2">
          {/* Аватар + Ник */}
          <div className="p-4 rounded-2xl glass text-center">
            <div className="relative inline-block mb-2">
              <div onClick={()=>setShowAvatarPicker(!showAvatarPicker)} className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer overflow-hidden" style={{border:`3px solid ${lv.color}60`,background:`${lv.color}15`}}>
                {isCustomPhoto?<img src={avatar} alt="" className="w-full h-full object-cover"/>:<span className="text-4xl">{avatar}</span>}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm border-2" style={{background:`${lv.color}30`,borderColor:lv.color,color:lv.color}}>{level}</div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-white/10 border border-white/20 cursor-pointer" onClick={(e)=>{e.stopPropagation();fileInputRef.current?.click()}}>📷</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
            {showAvatarPicker&&<div className="p-3 rounded-xl bg-white/5 mb-3"><button onClick={()=>fileInputRef.current?.click()} className="w-full py-2 rounded-xl text-[11px] font-bold mb-2 bg-blue-500/15 text-blue-400 border border-blue-500/25">📷 Фото</button><div className="grid grid-cols-6 gap-2 mt-2">{AVATARS.map((av,i)=>(<button key={i} onClick={()=>selectAvatar(av)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${avatar===av?'bg-gold-400/20 border border-gold-400/40':'hover:bg-white/10'}`}>{av}</button>))}</div></div>}
            {editingNick?<div className="flex gap-2 justify-center mb-2"><input value={tempNick} onChange={e=>setTempNick(e.target.value)} placeholder="Ник" maxLength={20} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white text-center outline-none w-40"/><button onClick={saveNickname} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold">✓</button></div>:<div onClick={()=>{setTempNick(nickname);setEditingNick(true)}} className="cursor-pointer mb-1"><div className="text-lg font-black text-white">{nickname||'Задать ник'}</div><div className="text-[9px] text-slate-500">нажми чтобы изменить</div></div>}
            <div className="text-[10px] text-slate-500">{wallet?shortAddress(wallet):'Не подключён'}{sponsorId?` • ID: ${sponsorId}`:''}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{background:`${rankColor}15`,border:`1px solid ${rankColor}30`}}><span>{rankEmoji}</span><span className="text-[11px] font-bold" style={{color:rankColor}}>{rankName}</span></div>
          </div>

          {/* Ссылка */}
          <div className="p-3 rounded-2xl glass">
            <div className="text-[12px] font-bold text-gold-400 mb-2">🔗 Реферальная ссылка</div>
            {!wallet?<div className="text-center py-3 text-[11px] text-slate-400">🔐 Подключите кошелёк</div>:!referralLink?<div className="text-center py-3 text-[11px] text-slate-400">⛏ Купи первый уровень</div>:<><div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-300 break-all">{referralLink}</div><button onClick={copyLink} className={`w-full mt-2 py-2 rounded-xl text-[11px] font-bold ${copied?'bg-emerald-500/15 text-emerald-400':'gold-btn'}`}>{copied?'✅ Скопировано':'📋 Копировать'}</button><div className="flex gap-1.5 mt-1.5"><a href={shareLinks.tg} target="_blank" rel="noopener" className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center bg-blue-500/10 text-blue-400 border border-blue-500/20">📱 TG</a><a href={shareLinks.wa} target="_blank" rel="noopener" className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">💬 WA</a><a href={shareLinks.vb} target="_blank" rel="noopener" className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center bg-purple-500/10 text-purple-400 border border-purple-500/20">📞 VB</a></div></>}
          </div>

          {/* ═══ 9 ЛИНИЙ ПАРТНЁРОВ ═══ */}
          <div className="p-3 rounded-2xl glass">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[12px] font-bold text-blue-400">👥 Команда ({allLinesTotal} чел.)</div>
              <button onClick={loadLine1} className="text-[9px] text-slate-500 hover:text-white">🔄</button>
            </div>

            {!wallet && <div className="text-center py-4 text-[11px] text-slate-500">🔐 Подключите кошелёк</div>}

            {wallet && (
              <div className="space-y-1">
                {[0,1,2,3,4,5,6,7,8].map(lineNum => {
                  const line = lines[lineNum]
                  const count = line?.addresses?.length || 0
                  const isOpen = expandedLine === lineNum
                  const isLoading = loadingLine === lineNum
                  // Линия доступна если предыдущая загружена и не пуста (или это линия 0)
                  const prevLine = lineNum === 0 ? { addresses: [wallet], loaded: true } : lines[lineNum - 1]
                  const canLoad = lineNum === 0 || (prevLine?.loaded && prevLine?.addresses?.length > 0)
                  const isEmpty = line?.loaded && count === 0

                  return (
                    <div key={lineNum}>
                      <button
                        onClick={() => canLoad && toggleLine(lineNum)}
                        disabled={!canLoad}
                        className={`w-full flex items-center gap-2 py-2.5 px-2 rounded-xl text-left transition-all ${isOpen ? 'bg-blue-500/10 border border-blue-500/20' : 'border border-white/5 hover:border-white/10'}`}
                        style={{ opacity: canLoad ? 1 : 0.3 }}>
                        <span className="text-[13px] font-black w-6 text-center" style={{ color: count > 0 ? '#ffd700' : '#4a5568' }}>{lineNum + 1}</span>
                        <div className="flex-1">
                          <span className="text-[11px] font-bold" style={{ color: count > 0 ? '#fff' : '#4a5568' }}>
                            Линия {lineNum + 1}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: count > 0 ? '#10b981' : '#4a5568' }}>
                          {isLoading ? '⏳' : line?.loaded ? `${count} чел.` : canLoad ? '→' : ''}
                        </span>
                      </button>

                      {/* Раскрытая линия — список партнёров */}
                      {isOpen && line?.loaded && (
                        <div className="ml-2 mt-1 mb-2 space-y-0.5">
                          {count === 0 && <div className="py-2 text-[10px] text-slate-500 text-center">Пусто</div>}
                          {line.details.map((p, pi) => {
                            const pLv = LEVELS[p.maxLevel] || LEVELS[0]
                            const pRankE = Team.RANK_EMOJIS[p.matrixRank] || '⚪'
                            const isExpP = expandedPartner === `${lineNum}-${pi}`
                            return (
                              <div key={pi}>
                                <button onClick={() => setExpandedPartner(isExpP ? null : `${lineNum}-${pi}`)}
                                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-left hover:bg-white/3">
                                  <span className="text-[9px] text-slate-600 w-4">{pi+1}</span>
                                  <span className="text-xs">{pLv.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold text-white">{shortAddress(p.address)}</span>
                                    <span className="text-[8px] text-slate-500 ml-1">ID:{p.userId||'—'} Lv.{p.maxLevel} {pRankE}</span>
                                  </div>
                                  <span className="text-[9px]" style={{color:p.quarterlyActive?'#10b981':'#94a3b8'}}>{p.quarterlyActive?'✅':'⏸'}</span>
                                </button>
                                {isExpP && (
                                  <div className="ml-6 mr-1 mb-1 p-2 rounded-lg text-[9px]" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div><span className="text-slate-500">ID: </span><span className="text-white font-bold">{p.userId||'—'}</span></div>
                                      <div><span className="text-slate-500">Спонсор: </span><span className="text-white">{p.sponsorId||'—'}</span></div>
                                      <div><span className="text-slate-500">Уровень: </span><span className="text-gold-400 font-bold">{p.maxLevel}/12</span></div>
                                      <div><span className="text-slate-500">Ранг: </span><span style={{color:Team.RANK_COLORS[p.matrixRank]}}>{Team.RANK_NAMES[p.matrixRank]}</span></div>
                                      <div><span className="text-slate-500">Партнёры: </span><span className="text-white">{p.personalInvites}</span></div>
                                      <div><span className="text-slate-500">Quarterly: </span><span className={p.quarterlyActive?'text-emerald-400':'text-red-400'}>{p.quarterlyActive?'Да':'Нет'}</span></div>
                                      <div><span className="text-slate-500">Партнёрка: </span><span className="text-emerald-400">${parseFloat(p.partnerEarnings).toFixed(2)}</span></div>
                                      <div><span className="text-slate-500">Матричные: </span><span className="text-blue-400">${parseFloat(p.matrixEarnings).toFixed(2)}</span></div>
                                    </div>
                                    <div className="mt-1 text-[8px] text-slate-600 font-mono break-all">{p.address}</div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* GW баланс */}
          {gwBalances && (
            <div className="p-3 rounded-2xl glass">
              <div className="text-[11px] font-bold text-gold-400 mb-2">💰 Баланс GlobalWay</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-white/5 text-center"><div className="font-black text-emerald-400">${parseFloat(gwBalances.partnerFromSponsor).toFixed(2)}</div><div className="text-[8px] text-slate-500">От спонсора</div></div>
                <div className="p-2 rounded-lg bg-white/5 text-center"><div className="font-black text-emerald-400">${parseFloat(gwBalances.partnerFromUpline).toFixed(2)}</div><div className="text-[8px] text-slate-500">От аплайн</div></div>
                <div className="p-2 rounded-lg bg-white/5 text-center"><div className="font-black text-blue-400">${parseFloat(gwBalances.matrixEarnings).toFixed(2)}</div><div className="text-[8px] text-slate-500">Матричные</div></div>
                <div className="p-2 rounded-lg bg-white/5 text-center"><div className="font-black text-purple-400">${parseFloat(gwBalances.pensionBalance).toFixed(2)}</div><div className="text-[8px] text-slate-500">Пенсия</div></div>
              </div>
              <div className="mt-2 p-2 rounded-lg text-center" style={{background:'rgba(255,215,0,0.06)'}}><span className="text-[13px] font-black text-gold-400">${parseFloat(gwBalances.totalBalance).toFixed(2)}</span><span className="text-[9px] text-slate-500 ml-2">Итого</span></div>
            </div>
          )}
        </div>
      )}

      {/* ═══ БИЗНЕС ═══ */}
      {section === 'business' && (
        <div className="px-3 mt-2 space-y-3">
          <div className="text-center text-[11px] text-slate-400 mb-1">Общая очередь • Одни усилия — множество реинвестов и доход</div>
          {BUSINESSES.map((biz,idx)=>{const isOpen=expandedBiz===idx;const earned=bizEarned[idx]||0;const slots=tables[idx]?.slots||0;const reinvests=tables[idx]?.reinvests||0;return(<div key={biz.id} className="rounded-2xl overflow-hidden" style={{border:`1px solid ${biz.color}30`}}><button onClick={()=>setExpandedBiz(isOpen?null:idx)} className="w-full p-4 text-left flex items-center gap-3" style={{background:`${biz.color}10`}}><span className="text-3xl">{biz.emoji}</span><div className="flex-1"><div className="text-[14px] font-black text-white">{biz.name}</div><div className="text-[12px] font-bold" style={{color:biz.color}}>${biz.price} за долю</div></div><div className="text-right">{earned>0&&<div className="text-[13px] font-black text-emerald-400">${earned.toFixed(2)}</div>}{slots>0&&<div className="text-[9px] text-slate-500">{slots} долей • {reinvests} реинв.</div>}</div><span className="text-slate-500 text-[11px]">{isOpen?'▲':'▼'}</span></button>{isOpen&&(<div className="px-4 pb-4"><div className="grid grid-cols-3 gap-2 my-3"><div className="p-2 rounded-xl text-center" style={{background:`${biz.color}20`}}><div className="text-[16px] font-black" style={{color:biz.color}}>${biz.price}</div><div className="text-[8px] text-slate-400">за долю</div></div><div className="p-2 rounded-xl text-center" style={{background:`${biz.color}15`}}><div className="text-[14px] font-black" style={{color:biz.color}}>${biz.totalIncome.toLocaleString()}</div><div className="text-[8px] text-slate-400">чистый доход</div></div><div className="p-2 rounded-xl text-center" style={{background:`${biz.color}10`}}><div className="text-[14px] font-black" style={{color:biz.color}}>${biz.totalWithPartner.toLocaleString()}</div><div className="text-[8px] text-slate-400">общий доход</div></div></div><div className="space-y-0">{biz.steps.map((step,si)=>(<div key={si} className="flex gap-2 py-2" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}><div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{background:si%2===0?`${biz.color}20`:'rgba(255,255,255,0.03)',color:si%2===0?biz.color:'#94a3b8'}}>{si+1}</div><div className="text-[11px] text-slate-300 leading-relaxed">{step}</div></div>))}</div><div className="mt-3 p-2.5 rounded-xl text-center text-[10px] font-bold" style={{background:'rgba(255,215,0,0.06)',color:'#ffd700',border:'1px solid rgba(255,215,0,0.15)'}}>{biz.footer}</div>{slots>0&&<div className="mt-2 p-2 rounded-xl bg-white/3 flex justify-between text-[10px]"><span className="text-slate-500">Долей: <b className="text-white">{slots}</b></span><span className="text-slate-500">Реинв.: <b className="text-white">{reinvests}</b></span><span className="text-emerald-400 font-bold">${earned.toFixed(2)}</span></div>}</div>)}</div>)})}
        </div>
      )}

      {/* ═══ ТУРНИРЫ ═══ */}
      {section === 'contest' && (
        <div className="px-3 mt-2 space-y-2">
          <div className="p-3 rounded-2xl glass border-purple-500/15"><div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-purple-400">⚔️ Еженедельный</div><div className="text-[10px] text-slate-500">{daysLeft} дн.</div></div><div className="text-[11px] text-slate-300 mb-3">Набери больше всех CHT за неделю!</div><div className="space-y-1.5">{[{p:'🥇',r:'500 CHT + 50 CGT'},{p:'🥈',r:'300 CHT + 30 CGT'},{p:'🥉',r:'150 CHT + 15 CGT'}].map((x,i)=>(<div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/5"><span className="text-lg">{x.p}</span><div className="flex-1 text-[11px] text-white font-bold">Место {i+1}</div><div className="text-[10px] font-bold text-purple-400">{x.r}</div></div>))}</div></div>
          <div className="p-3 rounded-2xl glass border-emerald-500/15"><div className="text-[12px] font-bold text-emerald-400 mb-2">🏆 Ежемесячный</div><div className="space-y-1.5">{[{p:'🥇',r:'2000 CHT+200 CGT',c:'Рефералы'},{p:'🥈',r:'1000 CHT+100 CGT',c:'Тапы'},{p:'🥉',r:'500 CHT+50 CGT',c:'м² куплено'}].map((x,i)=>(<div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/5"><span className="text-lg">{x.p}</span><div className="flex-1 text-[11px] font-bold text-white">{x.c}</div><div className="text-[10px] font-bold text-emerald-400">{x.r}</div></div>))}</div></div>
          <div className="p-3 rounded-2xl glass"><div className="text-[12px] font-bold text-gold-400 mb-2">📋 Правила</div><div className="space-y-1 text-[11px] text-slate-300"><p>1. Только зарегистрированные</p><p>2. Обновление раз в сутки</p><p>3. Призы автоматически</p><p>4. Накрутка = бан</p></div></div>
        </div>
      )}
    </div>
  )
}
