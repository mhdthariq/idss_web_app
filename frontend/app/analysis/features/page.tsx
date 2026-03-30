"use client";

import { useState } from "react";
import { useStaticData } from "@/hooks/use-static-data";
import { FeatureImportanceBar } from "@/components/charts/feature-importance-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { ShapData } from "@/types/analysis";

export default function FeaturesPage() {
  const [selectedModel, setSelectedModel] = useState("XGB-Aug");
  const { data, isLoading, error } = useStaticData<ShapData>(
    "shap",
    "/api/data/shap"
  );

  if (isLoading)
    return (
      <div className="skeleton-page p-4">
        <div className="skeleton skeleton-header" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  const modelKeys = Object.keys(data.feature_importance ?? {});
  const currentFeatures = data.feature_importance?.[selectedModel] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Fitur Penting</h1>
            <p className="text-muted-foreground text-sm">
              Analisis fitur yang paling berpengaruh terhadap prediksi model
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="importance">
        <TabsList>
          <TabsTrigger value="importance">Feature Importance</TabsTrigger>
          <TabsTrigger value="shap">SHAP Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="importance" className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Model:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelKeys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FeatureImportanceBar
            features={currentFeatures}
            modelName={selectedModel}
            topN={20}
          />
        </TabsContent>

        <TabsContent value="shap" className="space-y-4">
          {data.shap_values?.shap_values ? (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-base">SHAP Summary</CardTitle>
                <CardDescription>
                  Mean |SHAP| values menunjukkan pengaruh rata-rata setiap fitur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sv = data.shap_values;
                  const nFeatures = sv.features.length;
                  const meanAbsShap = Array(nFeatures).fill(0);
                  for (const row of sv.shap_values) {
                    for (let j = 0; j < nFeatures; j++) {
                      meanAbsShap[j] += Math.abs(row[j]);
                    }
                  }
                  const shapFeatures = sv.features
                    .map((name: string, j: number) => ({
                      feature: name,
                      importance: meanAbsShap[j] / sv.shap_values.length,
                    }))
                    .sort(
                      (a: { importance: number }, b: { importance: number }) =>
                        b.importance - a.importance
                    );
                  return (
                    <FeatureImportanceBar
                      features={shapFeatures}
                      modelName="SHAP (Mean |SHAP|)"
                      topN={20}
                    />
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="surface-card flex items-center justify-center py-12">
              <CardContent className="text-center text-muted-foreground">
                <p>SHAP data tidak tersedia</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
