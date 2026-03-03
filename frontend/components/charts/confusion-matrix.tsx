"use client";

interface ConfusionMatrixProps {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  modelName: string;
}

export function ConfusionMatrix({
  tp,
  fp,
  tn,
  fn,
  modelName,
}: ConfusionMatrixProps) {
  const total = tp + fp + tn + fn;

  const cells = [
    {
      label: "TN",
      value: tn,
      color: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
    },
    {
      label: "FP",
      value: fp,
      color: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
    },
    {
      label: "FN",
      value: fn,
      color: "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300",
    },
    {
      label: "TP",
      value: tp,
      color: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
    },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-center">{modelName}</h4>
      <div className="grid grid-cols-[auto_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-1 max-w-xs mx-auto">
        <div />
        <div className="text-center text-xs font-medium p-2">
          Pred: On-time
        </div>
        <div className="text-center text-xs font-medium p-2">Pred: Late</div>

        <div className="text-xs font-medium p-2 flex items-center">
          Actual: On-time
        </div>
        {cells.slice(0, 2).map((cell) => (
          <div
            key={cell.label}
            className={`${cell.color} rounded-lg p-3 text-center transition-all duration-200`}
          >
            <p className="text-xl font-bold">{cell.value}</p>
            <p className="text-xs opacity-70">
              {cell.label} ({total > 0 ? ((cell.value / total) * 100).toFixed(1) : 0}%)
            </p>
          </div>
        ))}

        <div className="text-xs font-medium p-2 flex items-center">
          Actual: Late
        </div>
        {cells.slice(2, 4).map((cell) => (
          <div
            key={cell.label}
            className={`${cell.color} rounded-lg p-3 text-center transition-all duration-200`}
          >
            <p className="text-xl font-bold">{cell.value}</p>
            <p className="text-xs opacity-70">
              {cell.label} ({total > 0 ? ((cell.value / total) * 100).toFixed(1) : 0}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
