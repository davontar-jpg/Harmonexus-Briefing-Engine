"""Build a compact archive research snapshot without contacting live services."""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from silver_temporal import compare_spot_sources, replay_ledger, research


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Exact FX_XAGUSD hourly TradingView CSV")
    parser.add_argument("--as-of", required=True, type=datetime.fromisoformat)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--comparison", type=Path, help="Optional separate OANDA_XAGUSD hourly CSV")
    parser.add_argument("--ledger-out", type=Path, help="Optional new offline holdout replay JSONL")
    args = parser.parse_args()
    if args.archive.resolve() == args.out.resolve() or args.out.suffix.lower() != ".json":
        parser.error("Use a separate .json destination")
    if args.archive.name.casefold() != "fx_xagusd, 60.csv":
        parser.error("Research calendar and provenance are specific to FX_XAGUSD, 60.csv")
    if args.ledger_out and (args.ledger_out.suffix.lower() != ".jsonl" or args.ledger_out.exists()):
        parser.error("The ledger requires a new .jsonl destination; existing ledgers are never overwritten")
    result = research(args.archive, args.as_of)
    if args.comparison:
        if (args.comparison.name.casefold() != "oanda_xagusd, 60.csv"
                or args.comparison.resolve() == args.archive.resolve()):
            parser.error("The comparison must be an independent OANDA_XAGUSD, 60.csv export")
        result["feedComparison"] = compare_spot_sources(args.archive, args.comparison, args.as_of)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    if args.ledger_out:
        with args.ledger_out.open("x", encoding="utf-8") as ledger:
            for record in replay_ledger(args.archive, args.as_of, result["runtimeId"]):
                ledger.write(json.dumps(record, allow_nan=False) + "\n")
    print(json.dumps({"runtimeId": result["runtimeId"], "quality": result["quality"],
                      "sourceAsOf": result["observation"]["sourceAsOf"], "mode": result["mode"]}))


if __name__ == "__main__":
    main()
