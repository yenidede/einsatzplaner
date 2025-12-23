export const activityLogQueryKeys = {
  all: ["activities"] as const,

  list: (params: { limit: number; offset: number }) =>
    [...activityLogQueryKeys.all, "list", params] as const,
};
