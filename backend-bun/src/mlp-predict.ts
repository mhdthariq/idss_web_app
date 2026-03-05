/**
 * Pure TypeScript MLP inference — NO native dependencies.
 *
 * Architecture (from ONNX graph):
 *   1. Embedding lookup for 10 categorical features
 *   2. Concat(embeddings, continuous) → 188 dims
 *   3. input_proj: Linear(188→192) + GELU
 *   4. 4× residual blocks: Linear(192→192) + GELU + residual add
 *   5. output: Linear(192→1) → logit
 */

import { readFileSync, existsSync } from "fs";
import { CONT_FEATURES } from "./features";

// Weight storage
interface MLPWeights {
  embeddings: Record<string, number[][]>; // cat_name → [cardinality × emb_dim]
  input_proj: { weight: number[][]; bias: number[] }; // [192×188], [192]
  residual_blocks: { weight: number[][]; bias: number[] }[]; // 4 blocks
  output: { weight: number[][]; bias: number[] }; // [1×192], [1]
}

interface MLPConfig {
  cat_cardinalities?: Record<string, number>;
  [key: string]: unknown;
}

let weights: MLPWeights | null = null;
let scalerMean: number[] = [];
let scalerScale: number[] = [];

// Categorical feature order for embedding lookup
const CAT_EMB_ORDER = [
  "NamaKategori_Encoded",
  "NamaSubKategori_Encoded",
  "NamaDivisi_Encoded",
  "KodeCabang_Encoded",
  "Provinsi_Encoded",
  "Kota_Encoded",
  "Jumlah_Bin_Encoded",
  "NamaSalesman_Encoded",
  "Kecamatan_Encoded",
  "NamaGroupCustomer_Encoded",
];

export async function loadMLPModel(
  weightsPath: string,
  scalerJson: { mean: number[]; scale: number[] },
): Promise<void> {
  if (!existsSync(weightsPath)) {
    console.log(`  ✗ MLP weights not found at ${weightsPath}`);
    return;
  }

  const raw = JSON.parse(readFileSync(weightsPath, "utf-8")) as Record<
    string,
    number[][] | number[]
  >;

  // Parse embeddings
  const embeddings: Record<string, number[][]> = {};
  for (const catName of CAT_EMB_ORDER) {
    const key = `embeddings.${catName}.weight`;
    if (raw[key]) {
      embeddings[catName] = raw[key] as number[][];
    }
  }

  // Parse linear layers
  weights = {
    embeddings,
    input_proj: {
      weight: raw["input_proj.weight"] as number[][],
      bias: raw["input_proj.bias"] as number[],
    },
    residual_blocks: [0, 1, 2, 3].map((i: number) => ({
      weight: raw[`residual_blocks.${i}.linear.weight`] as number[][],
      bias: raw[`residual_blocks.${i}.linear.bias`] as number[],
    })),
    output: {
      weight: raw["output.weight"] as number[][],
      bias: raw["output.bias"] as number[],
    },
  };

  scalerMean = scalerJson.mean;
  scalerScale = scalerJson.scale;

  console.log(
    `  MLP loaded: pure TypeScript, ${CAT_EMB_ORDER.length} embeddings, 4 residual blocks`,
  );
}

// --- Math helpers ---

function gelu(x: number): number {
  // GELU(x) = 0.5 * x * (1 + erf(x / sqrt(2)))
  return 0.5 * x * (1 + erf(x / Math.SQRT2));
}

function erf(x: number): number {
  // Abramowitz & Stegun approximation (max error ~1.5e-7)
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function linearForward(
  input: number[],
  weight: number[][],
  bias: number[],
): number[] {
  // weight shape: [out_features, in_features]
  // output[i] = sum(weight[i][j] * input[j]) + bias[i]
  const outDim = weight.length;
  const output = new Array<number>(outDim);
  for (let i = 0; i < outDim; i++) {
    let sum = bias[i] ?? 0;
    const w_i = weight[i] ?? [];
    for (let j = 0; j < input.length; j++) {
      sum += (w_i[j] ?? 0) * (input[j] ?? 0);
    }
    output[i] = sum;
  }
  return output;
}

function applyGELU(x: number[]): number[] {
  return x.map(gelu);
}

function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((v: number, i: number) => v + (b[i] ?? 0));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// --- Public API ---

export async function predictMLP(
  featureRow: Record<string, number>,
  mlpConfig: MLPConfig | null,
): Promise<number | null> {
  if (!weights) return null;

  // 1. Scale continuous features
  const contValues = CONT_FEATURES.map((f: string, i: number) => {
    const v = featureRow[f] ?? 0;
    const mean = scalerMean[i] ?? 0;
    const scale = scalerScale[i] ?? 1;
    let scaled = (v - mean) / scale;
    if (!Number.isFinite(scaled)) scaled = 0;
    return scaled;
  });

  // 2. Embedding lookup for categorical features
  const embValues: number[] = [];
  void mlpConfig; // acknowledged but not needed for forward pass

  for (const catName of CAT_EMB_ORDER) {
    const embTable = weights.embeddings[catName];
    if (!embTable) continue;

    let idx = Math.floor(featureRow[catName] ?? 0);
    const maxIdx = embTable.length - 1;
    idx = Math.max(0, Math.min(idx, maxIdx));

    const embRow = embTable[idx] ?? [];
    for (const v of embRow) {
      embValues.push(v);
    }
  }

  // 3. Concat: [continuous, embeddings] = 188 dims
  const input = [...contValues, ...embValues];

  // 4. input_proj: Linear(188→192) + GELU
  let h = linearForward(
    input,
    weights.input_proj.weight,
    weights.input_proj.bias,
  );
  h = applyGELU(h);

  // 5. 4 residual blocks: Linear(192→192) + GELU + residual add
  for (const block of weights.residual_blocks) {
    let blockOut = linearForward(h, block.weight, block.bias);
    blockOut = applyGELU(blockOut);
    h = vectorAdd(blockOut, h); // residual connection
  }

  // 6. Output: Linear(192→1)
  const logit = linearForward(h, weights.output.weight, weights.output.bias);

  return sigmoid(logit[0] ?? 0);
}

export function isMLPLoaded(): boolean {
  return weights !== null;
}
