// Page navigation under a table. Deliberately just "previous / next" with a
// count: with a search box and filters above it, nobody needs to jump to page 7.
import { Button } from "./Primitives.jsx";
import { formatNumber } from "../../lib/format.js";

export const Pagination = ({ pagination, onPageChange, noun = "السجلات" }) => {
  if (!pagination) return null;

  const { page, pageSize, total, totalPages } = pagination;
  if (total === 0) return null;

  const firstOnPage = (page - 1) * pageSize + 1;
  const lastOnPage = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="pagination__info">
        عرض {noun} <strong>{formatNumber(firstOnPage)}</strong>–<strong>{formatNumber(lastOnPage)}</strong>{" "}
        من أصل <strong>{formatNumber(total)}</strong>
      </span>

      <div className="pagination__controls">
        <Button
          size="sm"
          icon="chevronRight"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          السابق
        </Button>
        <span className="pagination__page">
          صفحة {page} من {totalPages}
        </span>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          التالي
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
