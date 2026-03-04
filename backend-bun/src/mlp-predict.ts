/**
 * MLP inference via ONNX Runtime.
 *
 * Loads the ONNX model and applies StandardScaler before inference.
 */

import * as ort from "onnxruntime-node";
import { CONT_FEATURES, CAT_FEATURES, CONSERVATIVE_FEATURES } from "./features";

let session: ort.InferenceSession | null = null;
let scalerMean: number[] = [];
let scalerScale: number[] = [];

export async function loadMLPModel(
  onnxPath: string,
  scalerJson: { mean: number[]; scale: number[] }
): Promise<void> {
  session = await ort.InferenceSession.create(onnxPath);
  scalerMean = scalerJson.mean;
  scalerScale = scalerJson.scale;

  const inputNames = session.inputNames;
  console.log(`  MLP loaded: ONNX session, inputs=${inputNames.join(", ")}`);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export async function predictMLP(
  featureRow: Record<string, number>,
  mlpConfig: any
): Promise<number | null> {
  if (!session) return null;

  try {
    // Extract continuous features and apply scaler
    const contValues = CONT_FEATURES.map((f) => featureRow[f] ?? 0);
    const scaledCont = contValues.map((v, i) => {
      const mean = scalerMean[i] ?? 0;
      const scale = scalerScale[i] ?? 1;
      let scaled = (v - mean) / scale;
      if (!isFinite(scaled)) scaled = 0;
      return scaled;
    });

    // Extract categorical features
    const catCardinalities = mlpConfig?.cat_cardinalities ?? {};
    const catValues = CAT_FEATURES.map((f) => {
      let val = Math.floor(featureRow[f] ?? 0);
      const maxValid = (catCardinalities[f] ?? 1000) - 1;
      val = Math.max(0, Math.min(val, maxValid));
      return BigInt(val);
    });

    // Create tensors
    const contTensor = new ort.Tensor(
      "float32",
      Float32Array.from(scaledCont),
      [1, CONT_FEATURES.length]
    );
    const catTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from(catValues),
      [1, CAT_FEATURES.length]
    );

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    const inputNames = session.inputNames;

    // The ONNX model expects x_cont and x_cat
    if (inputNames.includes("x_cont") && inputNames.includes("x_cat")) {
      feeds["x_cont"] = contTensor;
      feeds["x_cat"] = catTensor;
    } else {
      // Fallback: use positional
      feeds[inputNames[0]!] = contTensor;
      if (inputNames.length > 1) {
        feeds[inputNames[1]!] = catTensor;
      }
    }

    const results = await session.run(feeds);
    const outputName = session.outputNames[0]!;
    const outputData = results[outputName]!.data as Float32Array;

    // Apply sigmoid to logit
    return sigmoid(outputData[0]!);
  } catch (e) {
    console.error("MLP inference error:", e);
    return null;
  }
}

export function isMLPLoaded(): boolean {
  return session !== null;
}
