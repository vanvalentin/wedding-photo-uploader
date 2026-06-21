import { useCallback, useState } from 'react';

export function useMediaSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const enterSelectionMode = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsSelecting(true);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelecting,
    enterSelectionMode,
    exitSelectionMode,
    toggle,
    selectAll,
    isSelected,
  };
}
