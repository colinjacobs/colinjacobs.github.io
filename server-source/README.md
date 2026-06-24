# OBOL — Local Model Prototyping

Phase 4 of the desktop-shell project. This is throwaway scaffolding for
iterating on the persona and protocol grammar before anything gets
containerized (phase 5) or wired into the shell's context bus (phase 7).

## 1. Get the model

Download a quantized GGUF build of Qwen2.5-Coder-1.5B-Instruct. The Qwen
team publishes official GGUF quantizations on Hugging Face under:

    Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF

Grab the `q4_k_m` variant to start (~1GB, good balance of size/quality for
CPU inference). If responses feel technically thin once you're testing real
prompts, the same repo format exists for the 3B version
(`Qwen2.5-Coder-3B-Instruct-GGUF`) — swap the `--model` path, nothing else
about this harness changes.

## 2. Install dependencies

    pip install llama-cpp-python --break-system-packages

This compiles a llama.cpp binding on install — on most machines this is
fine but can take a couple minutes. If you have a GPU and want offload,
follow llama-cpp-python's CUDA/Metal build instructions instead of the
plain pip install (different install command, same Python API — nothing
in obol_chat.py needs to change either way, just pass --n-gpu-layers).

## 3. Run it

    python obol_chat.py --model /path/to/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf

Then type protocol-formatted input at the `OBOL>` prompt, e.g.:

    OBOL> QUERY what is a race condition
    OBOL> QUERY explain this: for i in range(len(x)): print(x[i])
    OBOL> STATUS
    OBOL> LOCATE the file browser

Anything that isn't QUERY/STATUS/LOCATE gets rejected before it ever
reaches the model — same grammar enforced in the desktop shell's
ai-assistant stub, kept here so the two don't drift.

Add `--raw` to see token counts and latency per response — this is a
preview of what phase 8's status line will eventually surface for real,
useful now for sanity-checking that responses aren't taking absurdly long
on your hardware.

## 4. What you're actually testing right now

- **Does the persona hold?** Read system_prompt.txt, then see if the model
  actually stays terse/literal/non-anthropomorphic or drifts back into
  chatty defaults after a few exchanges. Small models sometimes need the
  system prompt reinforced, or need temperature pushed even lower (already
  set to 0.2 here).
- **Is the protocol grammar usable or annoying?** Spend a real five minutes
  just using it before judging — three fixed verbs is a real constraint,
  worth feeling out before it's load-bearing in the actual shell.
- **Is 1.5B technically competent enough?** Throw real code at it — actual
  snippets from your projects, not toy examples. If it's consistently
  shallow on anything non-trivial, that's the signal to move to the 3B
  variant before investing further, not after deploying to Azure.

Iterate on system_prompt.txt directly and re-run — no rebuild step, it's
just a text file read fresh each launch.
