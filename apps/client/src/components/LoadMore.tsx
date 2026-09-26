/** "Load more" under a list that starts short; shows how many are still hidden. */
export function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="btn" onClick={onMore} style={{ marginBottom: 24 }}>
      Load more ({total - shown} more)
    </button>
  );
}

/** How many items a patient-page list shows at first, and how many each "Load more" adds. */
export const FIRST_SHOWN = 2;
export const LOAD_STEP = 5;
