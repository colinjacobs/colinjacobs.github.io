"""
OBOL local prototyping harness.

Run this on YOUR machine (not in a sandboxed/restricted-network
environment) after downloading a quantized GGUF build of
Qwen2.5-Coder-1.5B-Instruct (or whichever model you settle on).

Usage:
    python obol_chat.py --model /path/to/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf

This is deliberately a thin, disposable script — its only job is fast
iteration on system_prompt.txt and the protocol grammar before any of
this gets containerized in phase 5. Don't over-invest in this file.
"""

import argparse
import sys
import time
from pathlib import Path

VERBS = {"QUERY", "STATUS", "LOCATE"}


def load_system_prompt() -> str:
    path = Path(__file__).parent / "system_prompt.txt"
    return path.read_text()


def parse_input(raw: str):
    """
    Mirrors the same grammar enforced client-side in the desktop shell's
    ai-assistant stub (apps/ai-assistant/index.js). Keeping the validation
    logic identical in both places means behavior doesn't drift once the
    shell starts talking to this model for real.
    """
    raw = raw.strip()
    if not raw:
        return None, None, "EMPTY INPUT"

    parts = raw.split(maxsplit=1)
    verb = parts[0].upper()
    arg = parts[1] if len(parts) > 1 else ""

    if verb not in VERBS:
        return None, None, f'REJECTED. UNRECOGNIZED VERB "{parts[0]}".'

    if verb != "STATUS" and not arg:
        return None, None, f"REJECTED. {verb} REQUIRES AN ARGUMENT."

    return verb, arg, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Path to a GGUF model file")
    ap.add_argument("--n-ctx", type=int, default=4096)
    ap.add_argument("--n-gpu-layers", type=int, default=0,
                     help="Set >0 if you have GPU offload available; 0 = CPU only")
    ap.add_argument("--max-tokens", type=int, default=256)
    ap.add_argument("--raw", action="store_true",
                     help="Print full prompt + timing + token counts (phase-8 dry run)")
    args = ap.parse_args()

    try:
        from llama_cpp import Llama
    except ImportError:
        print("llama-cpp-python is not installed. Run:")
        print("  pip install llama-cpp-python --break-system-packages")
        sys.exit(1)

    print(f"Loading model from {args.model} ...")
    llm = Llama(
        model_path=args.model,
        n_ctx=args.n_ctx,
        n_gpu_layers=args.n_gpu_layers,
        verbose=False,
    )
    print("OBOL // STUB LOCAL HARNESS. VALID VERBS: QUERY / STATUS / LOCATE")
    print("Ctrl+C to exit.\n")

    system_prompt = load_system_prompt()

    from lore_store import retrieve as retrieve_lore

    while True:
        try:
            raw = input("OBOL> ")
        except (EOFError, KeyboardInterrupt):
            print()
            break

        verb, arg, error = parse_input(raw)
        if error:
            print(error)
            continue

        user_content = f"{verb} {arg}".strip()

        # Context injection — plain keyword match against lore_store.py.
        # Not training, not hidden: this is the entire mechanism, and
        # --raw shows exactly what was matched.
        matched_facts = retrieve_lore(arg)
        if matched_facts:
            context_block = (
                "CONTEXT (from lore_store.py — use only if relevant to "
                "the query, do not add facts not present here):\n"
                + "\n".join(f"- {f}" for f in matched_facts)
            )
            system_content = system_prompt + "\n\n" + context_block
            if args.raw:
                print(f"\n[CONTEXT MATCHED: {len(matched_facts)} fact(s)]")
        else:
            system_content = system_prompt

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]

        start = time.time()
        result = llm.create_chat_completion(
            messages=messages,
            max_tokens=args.max_tokens,
            temperature=0.2,  # low — this persona should not ramble or improvise
        )
        elapsed = time.time() - start

        reply = result["choices"][0]["message"]["content"].strip()
        usage = result.get("usage", {})

        print(reply)

        if args.raw:
            print(
                f"\n[TOK_IN={usage.get('prompt_tokens', '?')} "
                f"TOK_OUT={usage.get('completion_tokens', '?')} "
                f"TIME={elapsed:.2f}s]\n"
            )


if __name__ == "__main__":
    main()
