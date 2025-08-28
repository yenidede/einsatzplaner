import { useQueryState } from "nuqs";
import { z } from "zod";
import { filterItemSchema } from "./parsers";

const FiltersSchema = z.array(filterItemSchema);

export function useUrlFilters() {
    const [filtersParam] = useQueryState("filters");

    let filters: z.infer<typeof FiltersSchema> = [];
    if (filtersParam) {
        try {
            const parsed = JSON.parse(filtersParam);
            filters = FiltersSchema.parse(parsed);
        } catch (e) {
            console.error("Invalid filters in URL:", e);
        }
    }
    return filters;
}