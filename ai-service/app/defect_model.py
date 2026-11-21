import json
import re
from pathlib import Path
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence

MAX_LEN = 256
EMBED_DIM = 64
HIDDEN_DIM = 64
PAD_TOKEN = "<PAD>"
UNK_TOKEN = "<UNK>"

TOKEN_PATTERN = re.compile(
    r"[A-Za-z_][A-Za-z_0-9]*|"
    r"\d+(?:\.\d+)?|"
    r"[^\s]"
)


def tokenize(code: str, max_len: int = MAX_LEN) -> list[str]:
    return TOKEN_PATTERN.findall(code)[:max_len]


class BugHunterBiGRU(nn.Module):
    """Bidirectional GRU defect detector trained on Microsoft CodeXGLUE."""

    def __init__(self, vocab_size: int, embed_dim: int = EMBED_DIM, hidden_dim: int = HIDDEN_DIM):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            bidirectional=True,
        )
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(hidden_dim * 2, 2)

    def forward(self, token_ids, lengths):
        embeddings = self.embedding(token_ids)
        packed = pack_padded_sequence(
            embeddings,
            lengths.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        _, hidden = self.gru(packed)
        representation = torch.cat([hidden[-2], hidden[-1]], dim=1)
        return self.classifier(self.dropout(representation))


class DefectDetectorService:
    """Loads the trained CodeXGLUE PyTorch checkpoint and runs defect risk inference."""

    def __init__(self):
        base_dir = Path(__file__).resolve().parent.parent
        self.artifacts_dir = base_dir / "training" / "artifacts"
        self.checkpoint_path = self.artifacts_dir / "defect_detector.pt"
        self.metrics_path = self.artifacts_dir / "test_metrics.json"
        self.model = None
        self.vocab = None
        self.max_len = MAX_LEN
        self.metrics = self._load_metrics()

    def _load_metrics(self) -> dict | None:
        if self.metrics_path.exists():
            try:
                return json.loads(self.metrics_path.read_text(encoding="utf-8"))
            except Exception:
                return None
        return None

    def load(self) -> bool:
        if self.model is not None and self.vocab is not None:
            return True

        if not self.checkpoint_path.exists():
            return False

        checkpoint = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
        self.vocab = checkpoint["vocab"]
        self.max_len = int(checkpoint.get("max_len", MAX_LEN))
        embed_dim = int(checkpoint.get("embed_dim", EMBED_DIM))
        hidden_dim = int(checkpoint.get("hidden_dim", HIDDEN_DIM))

        model = BugHunterBiGRU(len(self.vocab), embed_dim=embed_dim, hidden_dim=hidden_dim)
        model.load_state_dict(checkpoint["model_state"])
        model.eval()
        self.model = model
        self.metrics = self._load_metrics()
        return True

    def get_info(self) -> dict:
        loaded = self.load()
        return {
            "model_loaded": loaded,
            "architecture": "BugHunterBiGRU (PyTorch Bidirectional GRU)",
            "dataset": "Microsoft CodeXGLUE Defect-Detection",
            "checkpoint_path": str(self.checkpoint_path),
            "vocab_size": len(self.vocab) if self.vocab else 0,
            "max_sequence_length": self.max_len,
            "training_metrics": self.metrics,
        }

    def predict(self, code: str) -> dict:
        if not code or not code.strip():
            raise ValueError("Source code cannot be empty for defect detection.")

        loaded = self.load()
        tokens = tokenize(code, self.max_len)
        token_count = len(tokens)

        if not loaded:
            raise FileNotFoundError(
                f"Trained PyTorch checkpoint not found at {self.checkpoint_path}. "
                "Run ai-service/training/train_defect_detector.py to generate the model checkpoint."
            )

        unk_id = self.vocab.get(UNK_TOKEN, 1)
        ids = [self.vocab.get(tok, unk_id) for tok in tokens]
        if not ids:
            ids = [unk_id]

        unk_count = sum(1 for tok in tokens if tok not in self.vocab)
        unk_ratio = round(unk_count / max(token_count, 1), 4)

        tensor_ids = torch.tensor([ids], dtype=torch.long)
        lengths = torch.tensor([len(ids)], dtype=torch.long)

        with torch.no_grad():
            logits = self.model(tensor_ids, lengths)
            probs = torch.softmax(logits, dim=1)[0]
            clean_prob = round(float(probs[0].item()), 4)
            defect_prob = round(float(probs[1].item()), 4)

        if defect_prob >= 0.65:
            risk_level = "HIGH"
        elif defect_prob >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "model_loaded": True,
            "architecture": "BugHunterBiGRU (PyTorch Bidirectional GRU)",
            "dataset": "CodeXGLUE Defect-Detection",
            "defect_probability": defect_prob,
            "clean_probability": clean_prob,
            "defect_percentage": round(defect_prob * 100, 1),
            "is_defective": defect_prob >= 0.5,
            "risk_level": risk_level,
            "token_count": token_count,
            "unknown_token_ratio": unk_ratio,
            "training_metrics": self.metrics,
        }


defect_detector_service = DefectDetectorService()

