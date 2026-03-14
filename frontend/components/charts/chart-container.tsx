"use client";

import { ReactElement, ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChartContainerProps {
  title: string;
  description?: string;
  height?: number;
  children: ReactNode;
}

export function ChartContainer({
  title,
  description,
  height = 400,
  children,
}: ChartContainerProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4 md:px-6">
        <div style={{ width: "100%", height }} className="min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {children as ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
