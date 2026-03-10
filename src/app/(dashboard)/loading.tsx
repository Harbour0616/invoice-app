export default function DashboardLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-12 animate-pulse">
      {/* タイトル */}
      <div className="h-7 w-40 bg-muted rounded mb-6" />

      {/* タブ or フィルター */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-24 bg-muted rounded" />
        <div className="h-10 w-24 bg-muted rounded" />
        <div className="h-10 w-24 bg-muted rounded" />
      </div>

      {/* カード or テーブル */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* ヘッダー行 */}
        <div className="flex gap-4 px-4 py-4 border-b border-border">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded ml-auto" />
        </div>
        {/* データ行 */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4 border-b border-table-separator last:border-b-0">
            <div className="h-4 w-16 bg-muted/60 rounded" />
            <div className="h-4 w-40 bg-muted/60 rounded" />
            <div className="h-4 w-28 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-16 bg-muted/60 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
