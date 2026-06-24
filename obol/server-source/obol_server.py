"""
OBOL inference server.

Wraps the same protocol parsing + lore retrieval as obol_chat.py, exposed
over HTTP. Two ways to run this:

LOCAL DEV (what you've been doing):
    python obol_server.py --model /path/to/model.gguf
    -> runs Flask's built-in dev server on 127.0.0.1:8765

CONTAINER / PRODUCTION (phase 5, Azure Container Apps):
    OBOL_MODEL_PATH=/app/model.gguf gunicorn --bind 0.0.0.0:8765 \
        --workers 1 --timeout 120 obol_server:app
    -> model loads via the OBOL_MODEL_PATH env var when gunicorn imports
       this module, since gunicorn never calls main()/argparse.

Why --workers 1: each worker would load its own full copy of the model
into memory. One worker means one model in RAM, full stop. If this ever
needs to handle concurrent requests under real load, scale via multiple
container replicas instead of multiple workers per replica — that keeps
memory predictable.
"""

import os
import time
from pathlib import Path

from flask import Flask, request, jsonify

from lore_store import retrieve as retrieve_lore

VERBS = {"QUERY", "STATUS", "LOCATE"}

app = Flask(__name__)
llm = None
system_prompt = None

# "*" works for local dev against any origin. For a real deployment, set
# OBOL_ALLOWED_ORIGIN to the exact origin the desktop shell is served
# from (e.g. https://yourname.github.io) — wildcard CORS on a publicly
# reachable endpoint means anyone's website could call your model.
ALLOWED_ORIGIN = os.environ.get("OBOL_ALLOWED_ORIGIN", "*")


def load_system_prompt():
    return (Path(__file__).parent / "system_prompt.txt").read_text()


def init_model(model_path: str, n_ctx: int = 4096, n_gpu_layers: int = 0):
    """Loads the model into the module-level `llm`. Called either from
    main() (local CLI) or once at import time when OBOL_MODEL_PATH is
    set (container)."""
    global llm, system_prompt
    from llama_cpp import Llama

    print(f"Loading model from {model_path} ...")
    llm = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=n_gpu_layers,
        verbose=False,
    )
    system_prompt = load_system_prompt()
    print("Model loaded.")


def parse_input(raw: str):
    """Identical grammar to obol_chat.py and the desktop shell's
    ai-assistant app. Kept in sync by hand for now."""
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


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/health", methods=["GET"])
def health():
    # Container Apps can probe this to know whether the replica is
    # actually ready (model loaded) vs just "the process started."
    return jsonify({"status": "ok", "model_loaded": llm is not None})


@app.route("/obol", methods=["POST", "OPTIONS"])
def obol_endpoint():
    if request.method == "OPTIONS":
        return "", 204

    if llm is None:
        return jsonify({"error": "MODEL NOT LOADED"}), 503

    body = request.get_json(silent=True) or {}
    raw_input = body.get("input", "")

    verb, arg, error = parse_input(raw_input)
    if error:
        return jsonify({"error": error}), 400

    user_content = f"{verb} {arg}".strip()
    matched_facts = retrieve_lore(arg)

    if matched_facts:
        context_block = (
            "CONTEXT (from lore_store.py — use only if relevant to the "
            "query, do not add facts not present here):\n"
            + "\n".join(f"- {f}" for f in matched_facts)
        )
        system_content = system_prompt + "\n\n" + context_block
    else:
        system_content = system_prompt

    start = time.time()
    result = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ],
        max_tokens=256,
        temperature=0.2,
    )
    elapsed = time.time() - start

    reply = result["choices"][0]["message"]["content"].strip()
    usage = result.get("usage", {})

    return jsonify({
        "verb": verb,
        "arg": arg,
        "reply": reply,
        "context_matched": len(matched_facts),
        "tokens_in": usage.get("prompt_tokens"),
        "tokens_out": usage.get("completion_tokens"),
        "elapsed_seconds": round(elapsed, 2),
    })


# Container path: gunicorn imports this module without ever calling
# main(), so model loading has to happen here, gated on the env var
# actually being set (keeps `import obol_server` harmless in any other
# context, e.g. if something later imports this module for testing).
_env_model_path = os.environ.get("OBOL_MODEL_PATH")
if _env_model_path:
    init_model(
        _env_model_path,
        n_ctx=int(os.environ.get("OBOL_N_CTX", "4096")),
        n_gpu_layers=int(os.environ.get("OBOL_N_GPU_LAYERS", "0")),
    )


def main():
    """Local CLI path — unchanged from how you've been running this."""
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--n-ctx", type=int, default=4096)
    ap.add_argument("--n-gpu-layers", type=int, default=0)
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()

    init_model(args.model, args.n_ctx, args.n_gpu_layers)

    print(f"OBOL server listening on http://127.0.0.1:{args.port}/obol")
    app.run(host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
