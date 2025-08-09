### Client Side caching with tanstack Query

## General

Optimistically update everything as far as possible (update UI, then invalidate Queries => will trigger automatic refetch).

Server Side API requests arent currently cached - still looking for proper solution (react cache? unstable_cache for heavy ops?)

## Query Keys

NEVER hardcode query Keys, always use a QueryKeys.ts file like /features/einsatz/QueryKeys.ts

## Invalidate Queries

Invalidate after all useMutations using the generated query keys - see "Query Keys"
