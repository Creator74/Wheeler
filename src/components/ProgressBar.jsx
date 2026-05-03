export default function ProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--cream)', opacity: 0.7 }}>
        <span>{completed}/{total} lessons complete</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-2" style={{ background: '#333' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--orange)' }}
        />
      </div>
    </div>
  )
}
