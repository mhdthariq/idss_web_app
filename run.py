#!/usr/bin/env python3
"""
Convenience script to start the IDSS Backend API server.

Usage:
    cd idss_web_app
    uv run python run.py
    uv run python run.py --host 127.0.0.1 --port 8080 --reload

Or directly with uvicorn:
    uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import argparse
import sys


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Start the IDSS Backend API server.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Bind address",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Bind port",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        default=False,
        help="Enable auto-reload on code changes (development only)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (use 1 for development, >1 for production)",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Uvicorn log level",
    )
    parser.add_argument(
        "--check-artifacts",
        action="store_true",
        default=False,
        help="Check that required model artifacts exist and exit",
    )

    args = parser.parse_args()

    # --- Artifact check mode ---
    if args.check_artifacts:
        from backend.app.config import check_artifacts

        print("Checking model artifacts…\n")
        status = check_artifacts(strict=False)
        all_ok = True
        for name, exists in status.items():
            symbol = "✓" if exists else "✗"
            print(f"  {symbol} {name}")
            if "[required]" in name and not exists:
                all_ok = False

        print()
        if all_ok:
            print("All required artifacts are present. ✅")
        else:
            print(
                "Some required artifacts are missing. ❌\n"
                "Run `python app/prepare_pipeline.py` from the parent project root."
            )
            sys.exit(1)
        return

    # --- Start server ---
    import uvicorn

    print(f"Starting IDSS Backend API on http://{args.host}:{args.port}")
    print(f"API docs:  http://{args.host}:{args.port}/docs")
    print(f"ReDoc:     http://{args.host}:{args.port}/redoc")
    print()

    uvicorn.run(
        "backend.app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers,
        log_level=args.log_level,
    )


if __name__ == "__main__":
    main()
