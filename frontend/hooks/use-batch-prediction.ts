import { useMutation } from "@tanstack/react-query";
import { apiPostFile } from "@/lib/api-client";
import type { BatchPredictionResult } from "@/types/prediction";

export function useBatchPrediction() {
  return useMutation<BatchPredictionResult, Error, File>({
    mutationFn: (file) =>
      apiPostFile<BatchPredictionResult>("/api/predict/batch", file),
  });
}
