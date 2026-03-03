import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export function useStaticData<T>(
  key: string,
  path: string,
  enabled = true
) {
  return useQuery<T>({
    queryKey: ["static-data", key],
    queryFn: () => apiGet<T>(path),
    staleTime: 60 * 60 * 1000, // 1 hour — this data never changes
    enabled,
  });
}
