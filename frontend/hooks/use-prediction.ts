import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import type { PredictionInput, PredictionResult } from "@/types/prediction";

export function usePrediction() {
  return useMutation<PredictionResult, Error, PredictionInput>({
    mutationFn: (input) =>
      apiPost<PredictionResult>("/api/predict", input),
  });
}
