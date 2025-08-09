### Client Side caching with tanstack Query

## General

Optimistically update everything as far as possible (update UI, then invalidate Queries => will trigger automatic refetch)

## Query Keys

NEVER hardcode query Keys, always use a QueryKeys.ts file like /features/einsatz/QueryKeys.ts

## Invalidate Queries

Invalidate after all useMutations using matching Query Keys (generated - see ## Query Keys)
