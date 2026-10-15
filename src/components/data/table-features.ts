import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from "@tanstack/react-table";

// সব টেবিলের জন্য এক জায়গায়: কোন ফিচার (sort / search / page) চালু থাকবে।
// নিয়ম: আগে ফিচার, তারপর তার row model (TanStack v9-এর নিয়ম)।
export const appFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
});

// কলাম-এর সংজ্ঞায় ColumnDef<AppTableFeatures, XRow> লিখতে এটা লাগবে
export type AppTableFeatures = typeof appFeatures;