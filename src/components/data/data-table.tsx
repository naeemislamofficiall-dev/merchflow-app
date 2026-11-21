"use client";

import { useState } from "react";
import {
  flexRender,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appFeatures, type AppTableFeatures } from "@/components/data/table-features";

export function DataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder = "Search...",
  emptyText = "Nothing here yet",
  rich = false,
  empty,
  searchLabel = "Find",
  wideSearch = false,
  rowsFooter = false,
  liveSearch = false,
  toolbar,
  pageNumber = false,
  noSearch = false,
  rowLabel = "rows",
}: {
  columns: ColumnDef<AppTableFeatures, TData>[];
  data: TData[];
  searchPlaceholder?: string;
  emptyText?: string;
  // rich: icon-sohoh search card + "Find" button, card-er bhitore table, "Showing x-y of z results"
  rich?: boolean;
  // empty: emptyText-er bodole nijer empty state (icon, title, button ityadi)
  empty?: React.ReactNode;
  searchLabel?: string;
  // true hole search input pura width nei
  wideSearch?: boolean;
  // true hole rich footer-e "Showing x-y of z" na dekhiye "N rows · page 1 of 1" dekhay
  rowsFooter?: boolean;
  // true hole rich search-e Find button thake na, type korle sathe sathe filter hoy
  liveSearch?: boolean;
  // search card-er daan dike boshbe (jemon filter dropdown)
  toolbar?: React.ReactNode;
  // true hole Previous ar Next-er majhe current page number dekhay
  pageNumber?: boolean;
  noSearch?: boolean;
  // footer-e "N rows" er "rows" shobdo
  rowLabel?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  // rich mode-e type korle filter hoy na, Find chaple (ba Enter) hoy
  const [draft, setDraft] = useState("");

  const table = useTable({
    features: appFeatures,
    columns,
    data,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageIndex = table.state.pagination.pageIndex;
  const pageSize = table.state.pagination.pageSize;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  const search = rich ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFilter(draft);
      }}
      className="flex flex-wrap items-center gap-3 rounded-card border border-slate-100 bg-white p-4 shadow-card"
    >
      <div className={cn("relative w-full", wideSearch ? "min-w-64 flex-1" : "max-w-md")}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (liveSearch || !e.target.value) setFilter(e.target.value);
          }}
          placeholder={searchPlaceholder}
          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
        />
      </div>
      {!liveSearch && (
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> {searchLabel}
        </button>
      )}
      {toolbar && <div className="ml-auto">{toolbar}</div>}
    </form>
  ) : (
    <Input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      placeholder={searchPlaceholder}
      className="max-w-xs"
    />
  );

  const tableBox = (
    <div className={cn("bg-card", !rich && "rounded-lg border")}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className={cn("hover:bg-transparent", rich && "bg-blue-50/70")}>
              {hg.headers.map((h) => {
                const sorted = h.column.getIsSorted();
                return (
                  <TableHead key={h.id} className={cn(rich && "text-navy-800")}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        className="inline-flex items-center gap-1 uppercase"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className={cn("text-center text-muted-foreground", empty ? "p-0" : "h-24")}
              >
                {empty ?? emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const footer = (
    <div
      className={cn(
        "flex items-center justify-between text-sm text-muted-foreground",
        rich && "px-6 py-4"
      )}
    >
      <span className={cn(rich && "font-medium text-navy-800")}>
        {rich && !rowsFooter ? (
          <>
            Showing {from}–{to} of {total} results
          </>
        ) : (
          <>
            {total} {rowLabel} · page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </>
        )}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        {pageNumber && (
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2 text-sm font-semibold text-white">
            {pageIndex + 1}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {!noSearch && search}
      {rich ? (
        <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
          {tableBox}
          {footer}
        </div>
      ) : (
        <>
          {tableBox}
          {footer}
        </>
      )}
    </div>
  );
}