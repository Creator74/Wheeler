export default function PermissionBanner({ onYes, onLater }) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 flex items-center justify-between gap-3"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--orange)', zIndex: 50 }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>
        Got a tip — hear it?
      </span>
      <div className="flex gap-2">
        <button
          onClick={onYes}
          className="px-5 py-2 rounded font-bold text-sm"
          style={{ background: 'var(--orange)', color: '#fff' }}
        >
          Yes
        </button>
        <button
          onClick={onLater}
          className="px-5 py-2 rounded font-bold text-sm border"
          style={{ borderColor: 'var(--orange)', color: 'var(--cream)', background: 'transparent' }}
        >
          Later
        </button>
      </div>
    </div>
  )
}
