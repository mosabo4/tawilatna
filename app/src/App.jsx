import { useStore, useRoute } from './store'
import { Avatar, Toast } from './ui'
import Login from './pages/Login'
import Home from './pages/Home'
import Games, { GameView, GameForm } from './pages/Games'
import History, { PlayView } from './pages/History'
import LogPlay from './pages/LogPlay'
import PlayersList, { PlayerView, VersusView } from './pages/Players'
import Me from './pages/Me'
import { Friday, Board } from './pages/Social'
import Ranking from './pages/Ranking'
import Recap from './pages/Recap'
import Levels from './pages/Levels'
import Styles from './pages/Styles'
import Live from './pages/Live'
import Titles from './pages/Titles'
import { Search, Alerts } from './pages/Search'
import { unread } from './events'
import { DEMO } from './api'

const I = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  games: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  rank: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.7M17 6h2.5a2.5 2.5 0 0 1-2.6 3.7" /></>,
  friday: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="m9.5 15 1.8 1.8 3.4-3.6" /></>,
  board: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></>,
  me: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></>,
  players: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 13.2c2.7.2 4.6 2.6 4.6 5.8" /></>,
}
const Icon = ({ d }) => <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>

// الأقسام: كل قسم له تبويبات داخلية
const SECTIONS = {
  games: { title: 'الألعاب', tabs: [['games', 'الدولاب'], ['friday', 'الجلسة الجاية']] },
  shilla: { title: 'الشلة', tabs: [['rank', 'الترتيب'], ['players', 'اللاعبين'], ['board', 'اللوحة'], ['history', 'السجل']] },
}
const SECTION_OF = { games: 'games', friday: 'games', rank: 'shilla', players: 'shilla', board: 'shilla', history: 'shilla' }
const NAV_OF = { ...SECTION_OF, game: 'games', play: 'shilla', vs: 'shilla', player: 'shilla', me: 'me', levels: 'me', titles: 'me' }

function SectionHead({ at }) {
  const { idx, me } = useStore()
  const sec = SECTIONS[SECTION_OF[at]]
  const posts = me ? unread(idx, me).filter(e => e.post).length : 0
  return (
    <header className="sec-head">
      <div className="sec-top">
        <h1>{sec.title}</h1>
        <div className="sec-actions">
          <a className="icon-btn" href="#/search" aria-label="بحث">🔍</a>
          {me && <a className="me-pill" href="#/me" aria-label="أنا"><Avatar player={me} size={32} /></a>}
        </div>
      </div>
      <nav className="subtabs" aria-label={sec.title}>
        {sec.tabs.map(([k, t]) => <a key={k} href={`#/${k}`} className={at === k ? 'on' : ''} aria-current={at === k ? 'page' : undefined}>{t}{k === 'board' && posts > 0 && <i className="sub-dot">{posts}</i>}</a>)}
      </nav>
    </header>
  )
}

function Nav({ at }) {
  const { idx, me, setGuest } = useStore()
  const tab = (href, key, label, active, dot) => (
    <a href={href} className={`tab ${active ? 'on' : ''}`} aria-current={active ? 'page' : undefined}><Icon d={I[key]} /><span>{label}</span>{dot ? <i className="nav-dot" /> : null}</a>
  )
  const sec = NAV_OF[at]
  const hasNew = me ? unread(idx, me).some(e => e.post) : false
  return (
    <nav className="bottom-nav" aria-label="التنقل">
      {tab('#/', 'home', 'الرئيسية', at === '')}
      {tab('#/games', 'games', 'الألعاب', sec === 'games')}
      {me
        ? <a href="#/log" className="tab-add" aria-label="سجّل قيم"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></a>
        : <button className="tab-add login" onClick={() => setGuest(false)}>ادخل</button>}
      {tab('#/rank', 'players', 'الشلة', sec === 'shilla', hasNew)}
      {tab('#/me', 'me', 'أنا', sec === 'me')}
    </nav>
  )
}

function Main({ r }) {
  const [a, b, c] = r
  const params = new URLSearchParams(location.hash.split('?')[1] || '')
  switch (a) {
    case undefined: return <Home />
    case 'games': return b === 'new' ? <GameForm /> : <Games />
    case 'game': return c === 'edit' ? <GameForm id={b} key={b} /> : <GameView id={b} key={b} />
    case 'log': return <LogPlay id={b} presetGame={params.get('game')} live={params.get('live') === '1'} key={(b || 'new') + (params.get('game') || '') + (params.get('live') || '')} />
    case 'history': return <History />
    case 'play': return <PlayView id={b} />
    case 'rank': return <Ranking />
    case 'players': return <PlayersList />
    case 'player': return <PlayerView id={b} key={b} />
    case 'vs': return <VersusView a={b} b={c} />
    case 'me': return <Me sub={b} key={b || 'hub'} />
    case 'live': return <Live />
    case 'titles': return <Titles />
    case 'search': return <Search />
    case 'alerts': return <Alerts />
    case 'friday': return <Friday />
    case 'board': return <Board />
    case 'levels': return <Levels />
    default: return <Home />
  }
}

export default function App() {
  const { idx, data, loadError, reload, me, guest } = useStore()
  const r = useRoute()

  if (!idx) {
    return (
      <div className="splash">
        <h1 className="brand">طاولتنا</h1>
        {loadError
          ? <><p>{loadError}</p><button className="btn gold" onClick={reload}>حاول مرة ثانية</button></>
          : <div className="loader" aria-label="يحمّل" />}
      </div>
    )
  }
  const locked = !!data?.settings?.login_locked
  if (!me && (!guest || locked)) return <><Login /><Toast /></>

  if (r[0] === 'styles') return <Styles />
  if (r[0] === 'recap') return <><Recap month={r[1] || new Date().toISOString().slice(0, 7)} key={r[1]} /><Toast /></>

  const top = r[0] === undefined
  const alerts = me ? unread(idx, me).length : 0
  return (
    <div className="app">
      {top && (
        <header className="topbar home-top">
          <h1 className="brand">طاولتنا</h1>
          <div className="sec-actions">
            <a className="icon-btn" href="#/search" aria-label="بحث">🔍</a>
            {me && <a className="icon-btn bell" href="#/alerts" aria-label="التنبيهات">🔔{alerts > 0 && <i className="bell-n">{alerts > 9 ? '9+' : alerts}</i>}</a>}
            {me && <a className="me-pill" href="#/me" aria-label="أنا"><Avatar player={me} size={34} /></a>}
          </div>
        </header>
      )}
      {DEMO && top && <p className="demo-banner">نسخة تجريبية: الأقيام والتقييمات وهمية</p>}
      {SECTION_OF[r[0]] && <SectionHead at={r[0]} />}
      <main><Main r={r} /></main>
      <Nav at={r[0] || ''} />
      <Toast />
    </div>
  )
}
