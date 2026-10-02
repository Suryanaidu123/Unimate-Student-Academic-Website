export default function Table({ columns, data, empty = 'No records found' }) {
  return (
    <div className="-mx-4 sm:mx-0">
      <div className="overflow-x-auto sm:overflow-x-visible">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="py-2 pr-4 font-medium whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-slate-400"
                >
                  {empty}
                </td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr
                key={row._id || row.id || i}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                {columns.map((c) => (
                  <td key={c.key} className="py-3 pr-4 align-middle whitespace-nowrap">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}