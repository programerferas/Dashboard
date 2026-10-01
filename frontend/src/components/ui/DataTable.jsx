// One table component for all four pages.
//
// `columns` describes the table; `rows` is the data. Each column is:
//   {
//     key:    unique string
//     label:  header text
//     render: (row) => cell contents
//     align:  "right" for numbers
//   }
//
// A falsy entry in `columns` is skipped, which is how a page hides a column from
// employees (for example the delete action).
//
// On phones the CSS turns each row into a stacked card and prints the column
// label next to every value, which is why every cell carries data-label.
import { Loading, EmptyState, ErrorState, TableSkeleton } from "./States.jsx";

export const DataTable = ({
  columns,
  rows,
  loading = false,
  error = null,
  onRetry,
  empty,
  getRowKey,
  onRowClick,
  // The first paint shows a spinner; later reloads keep the table and show
  // skeleton rows, which is much calmer while typing in the search box.
  firstLoad = false,
}) => {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && firstLoad) return <Loading />;
  if (!loading && (!rows || rows.length === 0)) return empty ?? <EmptyState />;

  const visible = columns.filter(Boolean);

  return (
    <div className="table-wrap">
      <table className={`table table--stack${onRowClick ? " table--clickable" : ""}`}>
        <thead>
          <tr>
            {visible.map((column) => (
              <th
                key={column.key}
                className={column.align === "right" ? "table__num" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {loading ? (
          <TableSkeleton columns={visible.length} />
        ) : (
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey ? getRowKey(row) : index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {visible.map((column) => (
                  <td
                    key={column.key}
                    data-label={column.label}
                    className={column.align === "right" ? "table__num" : undefined}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
};

export default DataTable;
