import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { TestSetData } from "@/types/analysis";

export function useTestSetData() {
  return useQuery<TestSetData>({
    queryKey: ["test-set-data"],
    queryFn: () => apiGet<TestSetData>("/api/analysis/test-set"),
    staleTime: 30 * 60 * 1000,
  });
}
