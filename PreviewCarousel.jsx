import { useEffect, useState } from 'react'

const toUrl = (p) => 'media://local/' + String(p).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')
const isVid = (p) => /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(p || '')

export default function PreviewCarousel({ paths = [], delay = 3000 }) {
  const key = paths.join('|')
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => { if (i >= paths.length) setI(0) }, [key])
  useEffect(() => {
    if (paused || paths.length < 2) return
    const t = setInterval(() => setI((p) => (p + 1) % paths.length), delay)
    return () => clearInterval(t)
  }, [paused, key, delay])

  if (!paths.length) return null
  const go = (n) => setI((n + paths.length) % paths.length)
  const arrow = (side) => ({
    position: 'absolute', top: '50%', [side]: 8, transform: 'translateY(-50%)',
    width: 28, height: 28, borderRadius: '50%', border: 0, cursor: 'pointer',
    background: 'rgba(255,255,255,.9)', fontSize: 16
  })

  return (
    <div style={{ maxWidth: 320, margin: '16px auto' }}>
      <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, aspectRatio: '4 / 5', background: '#111' }}>
        <div style={{ display: 'flex', height: '100%', transition: 'transform .6s ease', transform: 'translateX(-' + i * 100 + '%)' }}>
          {paths.map((p, n) => (
            <div key={p} style={{ flex: '0 0 100%', height: '100%' }}>
              {isVid(p)
                ? <video src={toUrl(p)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <img src={toUrl(p)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
        {paths.length > 1 && <button type="button" onClick={() => go(i - 1)} style={arrow('left')}>&#8249;</button>}
        {paths.length > 1 && <button type="button" onClick={() => go(i + 1)} style={arrow('right')}>&#8250;</button>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
        {paths.map((_, n) => (
          <button key={n} type="button" onClick={() => go(n)}
            style={{ width: 6, height: 6, padding: 0, border: 0, borderRadius: '50%', cursor: 'pointer', background: n === i ? '#0095f6' : '#c4c4c4' }} />
        ))}
      </div>
    </div>
  )
}
