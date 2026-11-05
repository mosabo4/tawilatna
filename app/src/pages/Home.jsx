import { useMemo } from 'react'
import { useStore, go } from '../store'
import { leaderboard } from '../stats'
import { Avatar, Section, Empty, Cover } from '../ui'
import { PlayCard } from './History'
import { FridayCard } from './Social'
import { useLevels, LevelPill } from './Levels'
import { usePerks, TitleBadge } from '../perks'
import { Stage } from '../characters'

export default function Home() {
  const { idx, me } = useStore()
  const { active } = usePerks()
  const board = useMemo(() => leaderboard(idx), [idx])
  const leader = board.find(b => b.plays > 0)
  const levels = useLevels()
  const myLv = me ? levels.get(me.id) : null

  // ألعاب لعبتها وما قيّمتها
  const unrated = useMemo(() => {
    if (!me) return []
    const played = new Set(idx.plays.filter(p => p.results.some(r => r.player_id === me.id)).map(p => p.game_id))
    const rated = new Set(idx.ratings.filter(r => r.player_id === me.id).map(r => r.game_id))
    return [...played].filter(id => !rated.has(id)).map(id => idx.gamesById.get(id)).filter(Boolean)
  }, [idx, me])

  if (!idx.games.length) {
    return (
      <div className="page">
        <Empty title="الطاولة فاضية" text="ابدأ بإضافة ألعابك، بعدها تقدرون تسجلون الأقيام وتقيّمونها."
          action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف أول لعبة</button>} />
      </div>
    )
  }

  const scene = active.scene
  return (
    <div className="page stack home">
      {scene && me && (
        <div className="glass stage-card">
          <Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action} customA={active.char} />
        </div>
      )}

      {myLv && (
        <a className="glass lv-home" href="#/levels">
          <span className="lv-av"><Avatar player={me} size={46} /><LevelPill level={myLv.level} /></span>
          <span className="lv-main">
            <span className="lv-top"><b>هلا {me.name}</b>{active.title ? <TitleBadge title={active.title} small /> : <small>ليفل {myLv.level} · {myLv.title}</small>}</span>
            <span className="lv-bar"><span style={{ width: `${Math.max(3, myLv.progress * 100)}%`, '--c': active.color || me.color }} /></span>
            <small className="lv-hint">باقي {myLv.need - myLv.into} XP على ليفل {myLv.level + 1}{myLv.nextReward ? ` · ${myLv.nextReward.icon} ${myLv.nextReward.name}` : ''}</small>
          </span>
        </a>
      )}

      {unrated.length > 0 && (
        <a className="glass rate-nudge compact" href={`#/game/${unrated[0].id}`}>
          <span className="rn-covers">{unrated.slice(0, 3).map(g => <Cover key={g.id} game={g} className="xs" />)}</span>
          <span className="rn-text"><b>{unrated.length === 1 ? `قيّم ${unrated[0].name}` : `عندك ${unrated.length} ألعاب لعبتها وما قيّمتها`}</b><small>تقييمك يضبط ترتيب الألعاب عند الشلة</small></span>
          <em>قيّم</em>
        </a>
      )}

      <FridayCard />

      {leader && (
        <a className="glass leader-mini" href="#/rank">
          <Avatar player={leader.player} size={40} />
          <span><small>المتصدر</small><b>{leader.player.name}</b></span>
          <strong>{leader.points}%</strong>
          <span className="more">الترتيب ←</span>
        </a>
      )}

      {idx.plays.length > 0 && (
        <Section title="آخر الأقيام" action={<a className="more" href="#/history">السجل</a>}>
          <div className="play-list">{idx.plays.slice(0, 3).map(p => <PlayCard key={p.id} play={p} />)}</div>
        </Section>
      )}
    </div>
  )
}
