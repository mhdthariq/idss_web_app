/**
 * XGBoost tree traversal inference from JSON booster dump.
 *
 * The JSON file contains the XGBoost model exported via
 * `booster.save_model("model.json")`. We parse the tree structure
 * and run inference by walking each tree from root to leaf.
 */

import { CONSERVATIVE_FEATURES } from "./features";

interface TreeNode {
  nodeid: number;
  depth?: number;
  split?: string;
  split_condition?: number;
  yes?: number;
  no?: number;
  missing?: number;
  leaf?: number;
  children?: TreeNode[];
}

export interface XGBModelJson {
  learner?: {
    learner_model_param?: {
      base_score?: string;
    };
    gradient_booster?: {
      model?: {
        trees?: XGBTreeData[];
      };
    };
  };
}

interface XGBTreeData {
  tree_param?: { num_nodes?: string };
  left_children?: number[];
  right_children?: number[];
  split_indices?: number[];
  split_conditions?: number[];
  default_left?: number[];
}

let baseScore = 0.5;

function buildTree(treeData: XGBTreeData): TreeNode {
  // XGBoost JSON format stores nodes as arrays
  const numNodes = treeData.tree_param?.num_nodes
    ? parseInt(treeData.tree_param.num_nodes)
    : 0;

  if (numNodes === 0) {
    return { nodeid: 0, leaf: 0 };
  }

  const leftChildren: number[] = treeData.left_children ?? [];
  const rightChildren: number[] = treeData.right_children ?? [];
  const splitIndices: number[] = treeData.split_indices ?? [];
  const splitConditions: number[] = treeData.split_conditions ?? [];
  const defaultLeft: number[] = treeData.default_left ?? [];

  // Build nodes
  const nodes: TreeNode[] = [];
  for (let i = 0; i < numNodes; i++) {
    const isLeaf = leftChildren[i] === -1;

    if (isLeaf) {
      nodes.push({
        nodeid: i,
        leaf: splitConditions[i], // leaf value stored in split_conditions for leaves
      });
    } else {
      // Find the feature name for this split index
      const splitIdx = splitIndices[i] ?? 0;
      const featureName =
        splitIdx < CONSERVATIVE_FEATURES.length
          ? (CONSERVATIVE_FEATURES[splitIdx] ?? `f${splitIdx}`)
          : `f${splitIdx}`;

      nodes.push({
        nodeid: i,
        split: featureName,
        split_condition: splitConditions[i],
        yes: leftChildren[i],
        no: rightChildren[i],
        missing: defaultLeft[i] === 1 ? leftChildren[i] : rightChildren[i],
      });
    }
  }

  // Return root node
  return nodes[0] ?? { nodeid: 0, leaf: 0 };
}

function traverseTree(treeData: XGBTreeData, featureValues: number[]): number {
  const leftChildren: number[] = treeData.left_children ?? [];
  const rightChildren: number[] = treeData.right_children ?? [];
  const splitIndices: number[] = treeData.split_indices ?? [];
  const splitConditions: number[] = treeData.split_conditions ?? [];
  const defaultLeft: number[] = treeData.default_left ?? [];

  let nodeIdx = 0;

  while (leftChildren[nodeIdx] !== -1) {
    const splitIdx = splitIndices[nodeIdx] ?? 0;
    const threshold = splitConditions[nodeIdx] ?? 0;
    const fval = featureValues[splitIdx];

    if (fval === undefined || Number.isNaN(fval)) {
      // Missing → go to default direction
      nodeIdx =
        defaultLeft[nodeIdx] === 1
          ? (leftChildren[nodeIdx] ?? 0)
          : (rightChildren[nodeIdx] ?? 0);
    } else if (fval < threshold) {
      nodeIdx = leftChildren[nodeIdx] ?? 0;
    } else {
      nodeIdx = rightChildren[nodeIdx] ?? 0;
    }
  }

  // At leaf node — leaf value is in split_conditions
  return splitConditions[nodeIdx] ?? 0;
}

// Store raw tree data for traversal
let rawTreesData: XGBTreeData[] = [];

// Keep buildTree available for potential direct model loading
void buildTree;

export function loadXGBoostModelDirect(modelJson: XGBModelJson): void {
  const learner = modelJson.learner;
  const lp = learner?.learner_model_param;
  if (lp?.base_score) {
    // XGBoost JSON format stores base_score as "[5E-1]" or similar
    let bs: string = lp.base_score;
    if (typeof bs === "string") {
      bs = bs.replace(/[\[\]]/g, ""); // Remove brackets
    }
    const parsed = parseFloat(bs);
    baseScore = Number.isNaN(parsed) ? 0.5 : parsed;
  }

  const gbtree = learner?.gradient_booster?.model;
  rawTreesData = gbtree?.trees ?? [];

  console.log(
    `  XGBoost loaded: ${rawTreesData.length} trees, base_score=${baseScore}`,
  );
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function predictXGBoost(featureRow: Record<string, number>): number {
  if (rawTreesData.length === 0) return 0.5;

  // Build feature values array in the order of CONSERVATIVE_FEATURES
  const fvals = CONSERVATIVE_FEATURES.map((f: string) => featureRow[f] ?? 0);

  // Sum leaf values from all trees
  // For binary logistic, base_score is already the bias in log-odds space
  // We convert base_score from probability to log-odds, then add tree margins
  let margin = -Math.log(1 / baseScore - 1); // Convert prob → logit
  for (const treeData of rawTreesData) {
    margin += traverseTree(treeData, fvals);
  }

  return sigmoid(margin);
}
