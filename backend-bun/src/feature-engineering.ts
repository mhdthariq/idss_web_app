/**
 * Feature engineering — port of feature_engineering.py
 *
 * Transforms raw transaction input into the 69-feature vector
 * required by both models. All logic is pure map lookups + math.
 */

import { CONSERVATIVE_FEATURES } from "./features";

export interface RawInput {
  Jumlah: number;
  KodeCustomer: string;
  NamaSalesman: string;
  NamaDivisi: string;
  NamaKategori: string;
  NamaSubKategori: string;
  KodeCabang: string;
  Provinsi: string;
  Kota: string;
  Kecamatan: string;
  NamaGroupCustomer?: string;
  Keterangan?: string;
}

export interface PipelineMaps {
  winsor_bounds?: { jumlah_lower?: number; jumlah_upper?: number };
  jumlah_bin_edges?: number[];
  jumlah_bin_labels?: string[];
  global_jumlah_mean?: number;
  global_total_mean?: number;
  global_late_rate?: number;
  global_median?: number;
  global_diversity?: number;
  global_sales_cust?: number;
  cust_total_map?: Record<string, number>;
  cust_late_rate_map?: Record<string, number>;
  branch_medians?: Record<string, number>;
  div_medians?: Record<string, number>;
  sales_div_diversity?: Record<string, number>;
  sales_cust_count?: Record<string, number>;
  target_encoding?: Record<string, Record<string, number>>;
  frequency_encoding?: Record<string, Record<string, number>>;
  interaction_te?: Record<
    string,
    { col_a: string; col_b: string; map: Record<string, number> }
  >;
  interaction_freq?: Record<
    string,
    { col_a: string; col_b: string; map: Record<string, number> }
  >;
  label_encoders?: Record<string, Record<string, number>>;
  unique_values?: Record<string, string[]>;
  group_agg?: Record<
    string,
    {
      avg_map: Record<string, number>;
      count_map: Record<string, number>;
      std_map: Record<string, number>;
    }
  >;
}

function log1p(x: number): number {
  return Math.log(1 + x);
}

function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Safely look up a field on a RawInput by string key.
 * Returns the string value or undefined if not found.
 */
function getRawField(raw: RawInput, key: string): string | number | undefined {
  return (raw as unknown as Record<string, string | number | undefined>)[key];
}

export function engineerSingleTransaction(
  raw: RawInput,
  pm: PipelineMaps,
): Record<string, number> {
  const row: Record<string, number> = {};
  const jumlah = raw.Jumlah;
  row["Jumlah"] = jumlah;

  // Winsorised amount features
  const wb = pm.winsor_bounds ?? {};
  const jl = wb.jumlah_lower ?? 0;
  const ju = wb.jumlah_upper ?? 1e12;
  row["Jumlah_Winsor"] = clip(jumlah, jl, ju);
  row["Log_Jumlah"] = log1p(jumlah);
  row["Log_Jumlah_Winsor"] = log1p(row["Jumlah_Winsor"]);

  // Jumlah bin + approximate percentile
  const binEdges = pm.jumlah_bin_edges ?? [-Infinity, 0, 0, 0, Infinity];
  const binLabels = pm.jumlah_bin_labels ?? [
    "Q1_Low",
    "Q2_Mid_Low",
    "Q3_Mid_High",
    "Q4_High",
  ];

  let jumlahBin: string = binLabels[binLabels.length - 1] ?? "Q4_High";
  for (let i = 0; i < binEdges.length - 1; i++) {
    if (
      (binEdges[i] ?? 0) <= jumlah &&
      jumlah < (binEdges[i + 1] ?? Infinity)
    ) {
      jumlahBin = binLabels[i] ?? jumlahBin;
      break;
    }
  }

  const binIdx = binLabels.indexOf(jumlahBin);
  row["Jumlah_Percentile"] =
    ((binIdx >= 0 ? binIdx : 2) + 0.5) / binLabels.length;

  // Binary flags
  row["Is_Group_Customer"] =
    (raw.NamaGroupCustomer ?? "NON-GROUP CUSTOMER") === "NON-GROUP CUSTOMER"
      ? 0
      : 1;
  row["Has_Remark"] = (raw.Keterangan ?? "No Remark") === "No Remark" ? 0 : 1;

  // Group aggregation features
  const globalMean = pm.global_jumlah_mean ?? jumlah;
  const aggMaps = pm.group_agg ?? {};

  const aggKeyMap: Record<string, keyof RawInput> = {
    Cust: "KodeCustomer",
    SubCat: "NamaSubKategori",
    Div: "NamaDivisi",
    Branch: "KodeCabang",
    Sales: "NamaSalesman",
    Kota: "Kota",
  };

  for (const [prefix, rawKey] of Object.entries(aggKeyMap)) {
    const aggInfo = aggMaps[prefix] ?? {
      avg_map: {},
      count_map: {},
      std_map: {},
    };
    const lookupVal = String(raw[rawKey] ?? "");
    row[`${prefix}_Avg_Jumlah`] = aggInfo.avg_map[lookupVal] ?? globalMean;
    row[`${prefix}_Tx_Count`] = aggInfo.count_map[lookupVal] ?? 1;
    row[`${prefix}_Std_Jumlah`] = aggInfo.std_map[lookupVal] ?? 0;
  }

  // Customer total Jumlah
  const custCode = raw.KodeCustomer ?? "";
  const globalTotalMean = pm.global_total_mean ?? jumlah;
  row["Cust_Total_Jumlah"] = pm.cust_total_map?.[custCode] ?? globalTotalMean;

  // Customer historical late rate
  const globalLate = pm.global_late_rate ?? 0.289;
  row["Cust_Historical_Late_Rate"] =
    pm.cust_late_rate_map?.[custCode] ?? globalLate;

  // Rank / ratio features
  const branchCode = raw.KodeCabang ?? "";
  const divName = raw.NamaDivisi ?? "";
  const globalMedian = pm.global_median ?? globalMean;
  const branchMed = pm.branch_medians?.[branchCode] ?? globalMedian;
  const divMed = pm.div_medians?.[divName] ?? globalMedian;

  row["Branch_Jumlah_Ratio"] = jumlah / (branchMed + 1);
  row["Div_Jumlah_Ratio"] = jumlah / (divMed + 1);

  const custAvg = row["Cust_Avg_Jumlah"] ?? 0;
  const custStd = row["Cust_Std_Jumlah"] ?? 0;
  row["Jumlah_Cust_Zscore"] = custStd > 0 ? (jumlah - custAvg) / custStd : 0;
  row["Log_Jumlah_vs_Branch"] =
    log1p(jumlah) - log1p(row["Branch_Avg_Jumlah"] ?? 0);
  row["Log_Jumlah_vs_Div"] = log1p(jumlah) - log1p(row["Div_Avg_Jumlah"] ?? 0);

  // Target encodings
  const teMaps = pm.target_encoding ?? {};
  const teColRawMap: Record<string, string | null> = {
    NamaSalesman: "NamaSalesman",
    NamaSubKategori: "NamaSubKategori",
    NamaDivisi: "NamaDivisi",
    Kota: "Kota",
    KodeCabang: "KodeCabang",
    Kecamatan: "Kecamatan",
    NamaGroupCustomer: "NamaGroupCustomer",
    NamaKategori: "NamaKategori",
    Jumlah_Bin: null,
  };

  for (const [teCol, rawKey] of Object.entries(teColRawMap)) {
    const encMap = teMaps[teCol] ?? {};
    const val: string =
      rawKey !== null ? String(getRawField(raw, rawKey) ?? "") : jumlahBin;
    row[`${teCol}_TE`] = encMap[val] ?? globalLate;
  }

  // Frequency encodings
  const freqMaps = pm.frequency_encoding ?? {};
  const freqCols = [
    "NamaSalesman",
    "NamaSubKategori",
    "NamaDivisi",
    "Kota",
    "KodeCabang",
    "Kecamatan",
    "NamaGroupCustomer",
    "NamaKategori",
  ];

  for (const col of freqCols) {
    const encMap = freqMaps[col] ?? {};
    const val = String(getRawField(raw, col) ?? "");
    row[`${col}_Freq`] = encMap[val] ?? 0;
  }

  // Interaction features
  const interactionTe = pm.interaction_te ?? {};
  const interactionFreq = pm.interaction_freq ?? {};

  for (const [prefix, info] of Object.entries(interactionTe)) {
    const combined =
      String(getRawField(raw, info.col_a) ?? "") +
      "__" +
      String(getRawField(raw, info.col_b) ?? "");
    row[`${prefix}__interaction_${prefix}_TE`] =
      info.map[combined] ?? globalLate;
  }

  for (const [prefix, info] of Object.entries(interactionFreq)) {
    const combined =
      String(getRawField(raw, info.col_a) ?? "") +
      "__" +
      String(getRawField(raw, info.col_b) ?? "");
    row[`${prefix}__interaction_${prefix}_Freq`] = info.map[combined] ?? 0;
  }

  // Additional derived features
  const salesman = raw.NamaSalesman ?? "";
  row["Sales_Div_Diversity"] =
    pm.sales_div_diversity?.[salesman] ?? pm.global_diversity ?? 1;
  row["Sales_Cust_Count"] =
    pm.sales_cust_count?.[salesman] ?? pm.global_sales_cust ?? 1;

  // Label encodings
  const leMap = pm.label_encoders ?? {};
  const leColRawMap: Record<string, string | null> = {
    NamaKategori: "NamaKategori",
    NamaSubKategori: "NamaSubKategori",
    NamaDivisi: "NamaDivisi",
    KodeCabang: "KodeCabang",
    Provinsi: "Provinsi",
    Kota: "Kota",
    Jumlah_Bin: null,
    NamaSalesman: "NamaSalesman",
    Kecamatan: "Kecamatan",
    NamaGroupCustomer: "NamaGroupCustomer",
  };

  for (const [leCol, rawKey] of Object.entries(leColRawMap)) {
    const le = leMap[leCol] ?? {};
    const val: string =
      rawKey !== null ? String(getRawField(raw, rawKey) ?? "") : jumlahBin;
    const nClasses = Object.keys(le).length;
    row[`${leCol}_Encoded`] = le[val] ?? nClasses;
  }

  // Ensure all 69 features exist
  for (const feat of CONSERVATIVE_FEATURES) {
    if (row[feat] === undefined) {
      row[feat] = 0;
    }
  }

  return row;
}
