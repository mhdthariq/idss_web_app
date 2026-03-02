"""
Neural network model definitions.

Extracted from prepare_pipeline.py, split_instability_analysis.py,
modeling_dl_v3.py, and streamlit_app.py to eliminate duplication.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset


# ===================================================================
# Focal Loss
# ===================================================================
class FocalLoss(nn.Module):
    """
    Focal Loss for binary classification with optional label smoothing
    and per-sample weights.

    FL(p_t) = -α_t · (1 − p_t)^γ · log(p_t)

    Parameters
    ----------
    alpha : float
        Weighting factor for positive class (0-1).
    gamma : float
        Focusing parameter. gamma=0 recovers BCE. gamma=2 is standard.
    label_smoothing : float
        Label smoothing factor (0 = no smoothing).
    reduction : str
        'mean', 'sum', or 'none'.
    """

    def __init__(
        self,
        alpha: float = 0.5,
        gamma: float = 2.0,
        label_smoothing: float = 0.0,
        reduction: str = "mean",
    ):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.label_smoothing = label_smoothing
        self.reduction = reduction

    def forward(
        self,
        logits: torch.Tensor,
        targets: torch.Tensor,
        sample_weights: torch.Tensor | None = None,
    ) -> torch.Tensor:
        if self.label_smoothing > 0:
            targets = targets * (1 - self.label_smoothing) + 0.5 * self.label_smoothing

        probs = torch.sigmoid(logits)
        bce = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")

        p_t = probs * targets + (1 - probs) * (1 - targets)
        alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
        focal_weight = alpha_t * (1 - p_t) ** self.gamma

        loss = focal_weight * bce

        if sample_weights is not None:
            loss = loss * sample_weights

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


# ===================================================================
# Residual Block
# ===================================================================
class ResidualBlock(nn.Module):
    """
    Residual block with pre-LayerNorm, GELU activation, and dropout.
    If input and output dims differ, a linear projection is used for
    the skip connection.
    """

    def __init__(
        self,
        in_dim: int,
        out_dim: int,
        dropout: float = 0.3,
        use_layernorm: bool = True,
    ):
        super().__init__()
        self.use_layernorm = use_layernorm
        if use_layernorm:
            self.norm = nn.LayerNorm(in_dim)
        self.linear = nn.Linear(in_dim, out_dim)
        self.activation = nn.GELU()
        self.dropout = nn.Dropout(dropout)
        if in_dim != out_dim:
            self.skip_proj = nn.Linear(in_dim, out_dim, bias=False)
        else:
            self.skip_proj = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.norm(x) if self.use_layernorm else x
        out = self.linear(out)
        out = self.activation(out)
        out = self.dropout(out)
        if self.skip_proj is not None:
            residual = self.skip_proj(residual)
        return out + residual


# ===================================================================
# Residual Embedding MLP
# ===================================================================
class ResidualEmbeddingMLP(nn.Module):
    """
    Residual MLP with Entity Embeddings for categorical features.

    Architecture:
        embeddings → concat with continuous → input projection →
        N residual blocks → LayerNorm → output logit.
    """

    def __init__(
        self,
        cat_cardinalities: dict[str, int],
        n_continuous: int,
        hidden_dims: tuple[int, ...] | list[int] = (256, 256, 128),
        dropout: float = 0.3,
        emb_dropout: float = 0.2,
        use_layernorm: bool = True,
        use_input_batchnorm: bool = True,
    ):
        super().__init__()

        # Entity embeddings
        self.embeddings = nn.ModuleDict()
        self.emb_dims: dict[str, int] = {}
        total_emb_dim = 0
        for col, card in cat_cardinalities.items():
            emb_dim = min(50, (card + 1) // 2)
            self.embeddings[col] = nn.Embedding(card, emb_dim)
            self.emb_dims[col] = emb_dim
            total_emb_dim += emb_dim

        self.cat_keys = list(cat_cardinalities.keys())
        self.emb_dropout = nn.Dropout(emb_dropout)

        # Optional BatchNorm for continuous inputs
        self.use_input_batchnorm = use_input_batchnorm
        if use_input_batchnorm and n_continuous > 0:
            self.input_bn = nn.BatchNorm1d(n_continuous)

        # Input projection
        input_dim = n_continuous + total_emb_dim
        self.input_dim = input_dim
        self.input_proj = nn.Linear(input_dim, hidden_dims[0])
        self.input_activation = nn.GELU()
        self.input_dropout = nn.Dropout(dropout)

        # Residual blocks
        blocks: list[nn.Module] = []
        prev_dim = hidden_dims[0]
        for h_dim in hidden_dims[1:]:
            blocks.append(
                ResidualBlock(
                    prev_dim, h_dim, dropout=dropout, use_layernorm=use_layernorm
                )
            )
            prev_dim = h_dim
        self.residual_blocks = nn.Sequential(*blocks)

        # Final normalization and output
        self.final_norm = nn.LayerNorm(prev_dim) if use_layernorm else nn.Identity()
        self.output = nn.Linear(prev_dim, 1)

        self._init_weights()

    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Embedding):
                nn.init.normal_(m.weight, mean=0.0, std=0.01)
            elif isinstance(m, (nn.BatchNorm1d, nn.LayerNorm)):
                if hasattr(m, "weight") and m.weight is not None:
                    nn.init.ones_(m.weight)
                if hasattr(m, "bias") and m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x_cont: torch.Tensor, x_cat: torch.Tensor) -> torch.Tensor:
        # Embeddings
        emb_list = []
        for i, key in enumerate(self.cat_keys):
            emb_list.append(self.embeddings[key](x_cat[:, i]))

        # Concatenate
        parts: list[torch.Tensor] = []
        if x_cont.shape[1] > 0:
            cont = self.input_bn(x_cont) if self.use_input_batchnorm else x_cont
            parts.append(cont)
        if emb_list:
            emb_concat = torch.cat(emb_list, dim=1)
            emb_concat = self.emb_dropout(emb_concat)
            parts.append(emb_concat)

        x = torch.cat(parts, dim=1) if len(parts) > 1 else parts[0]

        # Input projection
        x = self.input_proj(x)
        x = self.input_activation(x)
        x = self.input_dropout(x)

        # Residual blocks → final norm → output
        x = self.residual_blocks(x)
        x = self.final_norm(x)
        logits = self.output(x)
        return logits.squeeze(-1)


# ===================================================================
# Tabular Dataset
# ===================================================================
class TabularDataset(Dataset):
    """
    PyTorch Dataset for tabular data with separate continuous and
    categorical feature arrays, plus optional per-sample weights.
    """

    def __init__(
        self,
        cont_features: np.ndarray,
        cat_features: np.ndarray,
        labels: np.ndarray | None = None,
        sample_weights: np.ndarray | None = None,
    ):
        self.cont = torch.tensor(cont_features, dtype=torch.float32)
        self.cat = torch.tensor(cat_features, dtype=torch.long)
        self.labels = (
            torch.tensor(labels, dtype=torch.float32) if labels is not None else None
        )
        self.sample_weights = (
            torch.tensor(sample_weights, dtype=torch.float32)
            if sample_weights is not None
            else None
        )

    def __len__(self) -> int:
        return len(self.cont)

    def __getitem__(self, idx: int) -> tuple:
        items = [self.cont[idx], self.cat[idx]]
        if self.labels is not None:
            items.append(self.labels[idx])
        if self.sample_weights is not None:
            items.append(self.sample_weights[idx])
        return tuple(items)
