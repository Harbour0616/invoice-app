export default function MasterLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-12 animate-pulse">
      <div className="h-7 w-32 bg-muted rounded mb-6" />

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-20 bg-muted rounded mb-[-1px]" />
        ))}
      </div>

      {/* ボタン */}
      <div className="mb-4">
        <div className="h-11 w-28 bg-muted rounded-lg" />
      </div>

      {/* テーブル */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex gap-6 px-4 py-4 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-muted rounded" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-4 border-b border-table-separator">
            <div className="h-4 w-14 bg-muted/60 rounded" />
            <div className="h-4 w-36 bg-muted/60 rounded" />
            <div className="h-4 w-24 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-16 bg-muted/60 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
