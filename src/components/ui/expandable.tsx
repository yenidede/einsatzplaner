import { useState } from "react";

type Props<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
};

export function ShowMoreList<T>({ items, renderItem }: Props<T>) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div>
      {visibleItems.map(renderItem)}

      {hasMore && (
        <button type="button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
