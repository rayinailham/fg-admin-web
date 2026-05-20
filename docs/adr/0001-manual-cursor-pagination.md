# Manual cursor state over useInfiniteQuery for pagination

All paginated lists use TanStack Query's `useQuery` with manual cursor state (a `ref` holding the current cursor) instead of `useInfiniteQuery`. 

`useInfiniteQuery` is designed for infinite scroll — it accumulates all fetched pages in memory and renders them as a growing list. Our admin tables use discrete prev/next navigation with no page numbers (keyset cursor), display one page at a time, and follow a terminal aesthetic where infinite scroll would feel wrong. Manual cursor state is simpler (no page accumulation, no `getNextPageParam` gymnastics for bidirectional cursors), uses less memory, and maps directly to the API's `next_cursor` omit-when-done pattern.

## Considered Options

- **useInfiniteQuery**: TanStack Query's built-in cursor pagination. Rejected because it accumulates pages (memory), assumes forward-only or append-style UX, and adds complexity for a simple prev/next model.
- **Manual cursor in useQuery**: A ref holds the current cursor. On "next", set cursor to `next_cursor` from response. On "prev", pop from a cursor history stack. Query key includes the cursor, so TanStack Query caches each page independently.

## Consequences

- Each list component maintains a `cursorStack: Ref<string[]>` for back-navigation.
- Cache invalidation is per-page (fine — admin data changes infrequently during a session).
- If we ever need infinite scroll (unlikely for admin), this decision would need revisiting.
