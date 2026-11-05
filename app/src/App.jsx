import { useStore, useRoute } from './store'
import { Avatar, Toast } from './ui'
import Login from './pages/Login'
import Home from './pages/Home'
import Games, { GameView, GameForm } from './pages/Games'
import History, { PlayView } from './pages/History'
import LogPlay from './pages/LogPlay'
import { PlayerView, VersusView } from './pages/Players'
import Me from './pages/Me'
import { Friday, Board } from './pages/Social'
import Ranking from './pages/Ranking'
import { DEMO } from './api'

const I = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  games: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  rank: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.7M17 6h2.5a2.5 2.5 0 0 1-2.6 3.7" /></>,
  friday: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="m9.5 15 1.8 1.8 3.4-3.6" /></>,
  board: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></>,
  players: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 13.2c2.7.2 4.6 2.6 4.6 5.8" /></>,
}
const Icon = ({ d }) => <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>

function Nav({ at }) {
  const { me, setGuest } = useStore()
  const tab = (href, key, label, active) => (
    <a href={href} className={`tab ${active ? 'on' : ''}`} aria-current={active ? 'page' : undefined}><Icon d={I[key]} /><span>{label}</span></a>
  )
  return (
    <nav className="bottom-nav" aria-label="التنقل">
      {tab('#/', 'home', 'الرئيسية', at === '')}
      {tab('#/rank', 'rank', 'الترتيب', ['rank', 'players', 'player', 'vs'].includes(at))}
      {tab('#/games', 'games', 'الألعاب', at === 'games' || at === 'game')}
      {me
        ? <a href="#/log" className="tab-add" aria-label="سجّل قيم"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></a>
        : <button className="tab-add login" onClick={() => setGuest(false)}>ادخل</button>}
      {tab('#/friday', 'friday', 'الجلسة', at === 'friday')}
      {tab('#/board', 'board', 'الشلة', ['board', 'history', 'play'].includes(at))}
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
    case 'log': return <LogPlay id={b} presetGame={params.get('game')} key={(b || 'new') + (params.get('game') || '')} />
    case 'history': return <History />
    case 'play': return <PlayView id={b} />
    case 'players': case 'rank': return <Ranking />
    case 'player': return <PlayerView id={b} key={b} />
    case 'vs': return <VersusView a={b} b={c} />
    case 'me': return <Me />
    case 'friday': return <Friday />
    case 'board': return <Board />
    default: return <Home />
  }
}

export default function App() {
  const { idx, loadError, reload, me, guest } = useStore()
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
  if (!me && !guest) return <><Login /><Toast /></>

  const top = r[0] === undefined
  return (
    <div className="app">
      {top && (
        <header className="topbar home-top">
          <h1 className="brand">طاولتنا</h1>
          {me && <a className="me-pill" href="#/me" aria-label="حسابي"><span>{me.name}</span><Avatar player={me} size={30} /></a>}
        </header>
      )}
      {DEMO && top && <p className="demo-banner">نسخة تجريبية: الأقيام والتقييمات وهمية</p>}
      <main><Main r={r} /></main>
      <Nav at={r[0] || ''} />
      <Toast />
    </div>
  )
}
