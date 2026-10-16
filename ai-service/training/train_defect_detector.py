
import json
import os
import random
import re
from collections import Counter
from pathlib import Path

import torch
from torch import nn
from torch.nn.utils.rnn import (
    pack_padded_sequence,
    pad_sequence,
)
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)

# --------------------------------------------------
# Configuration: designed for CPU and limited RAM
# --------------------------------------------------

SEED = 42
MAX_LEN = 256
MAX_VOCAB = 20000
EMBED_DIM = 64
HIDDEN_DIM = 64
BATCH_SIZE = 8
EPOCHS = int(os.getenv("BH_EPOCHS", "5"))
LEARNING_RATE = 0.001

ROOT = Path(__file__).resolve().parent
DATA_DIR = (
    ROOT / "CodeXGLUE" / "Code-Code"
    / "Defect-detection" / "dataset"
)

# If the official preprocessing places the files elsewhere,
# update DATA_DIR to the directory containing the JSONL splits.
OUTPUT_DIR = ROOT / "artifacts"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PAD_TOKEN = "<PAD>"
UNK_TOKEN = "<UNK>"

random.seed(SEED)
torch.manual_seed(SEED)
torch.set_num_threads(2)

TOKEN_PATTERN = re.compile(
    r"[A-Za-z_][A-Za-z_0-9]*|"
    r"\d+(?:\.\d+)?|"
    r"[^\s]"
)


def tokenize(code):
    return TOKEN_PATTERN.findall(code)[:MAX_LEN]


def load_jsonl(filename):
    records = []

    with open(filename, "r", encoding="utf-8") as file:
        for line in file:
            if not line.strip():
                continue

            row = json.loads(line)
            code = row.get("func", row.get("code", ""))
            label = int(row["target"])

            if not isinstance(code, str) or not code.strip():
                continue

            if label not in (0, 1):
                continue

            records.append((tokenize(code), label))

    return records


def build_vocab(records):
    counts = Counter()

    for tokens, _ in records:
        counts.update(tokens)

    vocab = {
        PAD_TOKEN: 0,
        UNK_TOKEN: 1,
    }

    for token, _ in counts.most_common(MAX_VOCAB - 2):
        vocab[token] = len(vocab)

    return vocab


class CodeDataset(Dataset):
    def __init__(self, records, vocab):
        self.items = []

        for tokens, label in records:
            ids = [
                vocab.get(token, vocab[UNK_TOKEN])
                for token in tokens
            ]

            if not ids:
                ids = [vocab[UNK_TOKEN]]

            self.items.append(
                (torch.tensor(ids, dtype=torch.long), label)
            )

    def __len__(self):
        return len(self.items)

    def __getitem__(self, index):
        return self.items[index]


def collate_batch(batch):
    sequences, labels = zip(*batch)

    lengths = torch.tensor(
        [len(sequence) for sequence in sequences],
        dtype=torch.long,
    )

    padded = pad_sequence(
        sequences,
        batch_first=True,
        padding_value=0,
    )

    labels = torch.tensor(labels, dtype=torch.long)

    return padded, lengths, labels


class BugHunterBiGRU(nn.Module):
    def __init__(self, vocab_size):
        super().__init__()

        self.embedding = nn.Embedding(
            vocab_size,
            EMBED_DIM,
            padding_idx=0,
        )

        self.gru = nn.GRU(
            input_size=EMBED_DIM,
            hidden_size=HIDDEN_DIM,
            batch_first=True,
            bidirectional=True,
        )

        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(HIDDEN_DIM * 2, 2)

    def forward(self, token_ids, lengths):
        embeddings = self.embedding(token_ids)

        packed = pack_padded_sequence(
            embeddings,
            lengths.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )

        _, hidden = self.gru(packed)

        # Final forward and backward hidden states.
        representation = torch.cat(
            [hidden[-2], hidden[-1]],
            dim=1,
        )

        return self.classifier(
            self.dropout(representation)
        )


def evaluate(model, loader, criterion):
    model.eval()

    all_predictions = []
    all_labels = []
    total_loss = 0.0
    total_examples = 0

    with torch.no_grad():
        for tokens, lengths, labels in loader:
            logits = model(tokens, lengths)
            loss = criterion(logits, labels)

            batch_size = labels.size(0)
            total_loss += loss.item() * batch_size
            total_examples += batch_size

            predictions = logits.argmax(dim=1)

            all_predictions.extend(predictions.tolist())
            all_labels.extend(labels.tolist())

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            all_labels,
            all_predictions,
            average="binary",
            zero_division=0,
        )
    )

    return {
        "loss": total_loss / max(total_examples, 1),
        "accuracy": accuracy_score(
            all_labels, all_predictions
        ),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": confusion_matrix(
            all_labels, all_predictions, labels=[0, 1]
        ).tolist(),
    }


def main():
    train_path = DATA_DIR / "train.jsonl"
    valid_path = DATA_DIR / "valid.jsonl"
    test_path = DATA_DIR / "test.jsonl"

    for path in (train_path, valid_path, test_path):
        if not path.exists():
            raise FileNotFoundError(
                f"Dataset split not found: {path}\n"
                "Check the CodeXGLUE download and DATA_DIR."
            )

    print("Loading dataset...")
    train_records = load_jsonl(train_path)
    valid_records = load_jsonl(valid_path)
    test_records = load_jsonl(test_path)

    print(
        f"Train={len(train_records)}, "
        f"Validation={len(valid_records)}, "
        f"Test={len(test_records)}"
    )

    if not train_records or not valid_records or not test_records:
        raise ValueError("One or more dataset splits are empty.")

    vocab = build_vocab(train_records)

    train_data = CodeDataset(train_records, vocab)
    valid_data = CodeDataset(valid_records, vocab)
    test_data = CodeDataset(test_records, vocab)

    train_loader = DataLoader(
        train_data,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        collate_fn=collate_batch,
    )

    valid_loader = DataLoader(
        valid_data,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_batch,
    )

    test_loader = DataLoader(
        test_data,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_batch,
    )

    model = BugHunterBiGRU(len(vocab))
    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE,
    )

    best_val_f1 = -1.0
    checkpoint_path = OUTPUT_DIR / "defect_detector.pt"

    print(f"Vocabulary size: {len(vocab)}")
    print(f"Trainable parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    print("Training on CPU...")

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0.0
        total_examples = 0

        for tokens, lengths, labels in train_loader:
            optimizer.zero_grad()

            logits = model(tokens, lengths)
            loss = criterion(logits, labels)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                model.parameters(), max_norm=1.0
            )
            optimizer.step()

            batch_size = labels.size(0)
            total_loss += loss.item() * batch_size
            total_examples += batch_size

        train_loss = total_loss / max(total_examples, 1)
        metrics = evaluate(model, valid_loader, criterion)

        print(
            f"Epoch {epoch + 1}/{EPOCHS} | "
            f"train_loss={train_loss:.4f} | "
            f"val_loss={metrics['loss']:.4f} | "
            f"val_precision={metrics['precision']:.4f} | "
            f"val_recall={metrics['recall']:.4f} | "
            f"val_f1={metrics['f1']:.4f}"
        )

        if metrics["f1"] > best_val_f1:
            best_val_f1 = metrics["f1"]

            torch.save(
                {
                    "model_state": model.state_dict(),
                    "vocab": vocab,
                    "max_len": MAX_LEN,
                    "embed_dim": EMBED_DIM,
                    "hidden_dim": HIDDEN_DIM,
                    "seed": SEED,
                },
                checkpoint_path,
            )

    # Evaluate the selected checkpoint on the test set only
    # after model selection is complete.
    checkpoint = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=False,
    )

    best_model = BugHunterBiGRU(
        len(checkpoint["vocab"])
    )
    best_model.load_state_dict(checkpoint["model_state"])

    test_metrics = evaluate(
        best_model, test_loader, criterion
    )

    print("\nFinal test metrics:")
    for key, value in test_metrics.items():
        print(f"{key}: {value}")

    metrics_path = OUTPUT_DIR / "test_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as file:
        json.dump(test_metrics, file, indent=2)

    print(f"\nModel saved to: {checkpoint_path}")
    print(f"Metrics saved to: {metrics_path}")


if __name__ == "__main__":
    main()
