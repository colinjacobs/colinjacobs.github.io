(function () {
  const manifest = {
    id: 'ai-assistant',
    title: 'OBOL // TERM',
    defaultSize: { w: 440, h: 340 },
  };

  // Recognized protocol verbs. Checked client-side first so obviously
  // malformed input never even leaves the browser — same grammar
  // enforced server-side in obol_server.py, kept in sync by hand.
  const VERBS = ['QUERY', 'STATUS', 'LOCATE'];

  const OBOL_ENDPOINT = 'https://obol-server.ashymushroom-29a4ae6f.eastus2.azurecontainerapps.io/obol';

  function mount(contentEl) {
    contentEl.innerHTML = `
      <style>
        .ai-wrap {
          display: flex; flex-direction: column; height: 100%;
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
        }
        .ai-log {
          flex: 1; overflow-y: auto; padding: 10px;
          color: var(--text); line-height: 1.6;
        }
        .ai-log .line-in   { color: var(--text-mid); }
        .ai-log .line-out  { color: var(--amber-glow); }
        .ai-log .line-err  { color: var(--red); }
        .ai-log .line-meta { color: var(--text-dim); font-size: 9px; }
        .ai-input-row {
          display: flex; border-top: 1px solid var(--border-bright);
          padding: 8px;
        }
        .ai-prompt { color: var(--amber-dim); margin-right: 6px; }
        .ai-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text-bright); font-family: inherit; font-size: 11px;
          letter-spacing: 1px;
        }
      </style>
      <div class="ai-wrap">
        <div class="ai-log" id="aiLog">
          <div class="line-out">OBOL // CONNECTING TO ${OBOL_ENDPOINT}</div>
          <div class="line-out">VALID VERBS: QUERY / STATUS / LOCATE</div>
        </div>
        <div class="ai-input-row">
          <span class="ai-prompt">OBOL&gt;</span>
          <input class="ai-input" id="aiInput" placeholder="VERB ARGUMENT" autocomplete="off" />
        </div>
      </div>
    `;

    const log = contentEl.querySelector('#aiLog');
    const input = contentEl.querySelector('#aiInput');

    function appendLine(text, cls) {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function validateLocally(raw) {
      const parts = raw.split(/\s+/);
      const verb = parts[0].toUpperCase();
      const rest = parts.slice(1);
      if (!VERBS.includes(verb)) {
        return `REJECTED. UNRECOGNIZED VERB "${parts[0]}".`;
      }
      if (rest.length === 0 && verb !== 'STATUS') {
        return `REJECTED. ${verb} REQUIRES AN ARGUMENT.`;
      }
      return null;
    }

    async function sendToObol(raw) {
      let response;
      try {
        response = await fetch(OBOL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: raw }),
        });
      } catch (err) {
        appendLine('CANNOT REACH OBOL BACKEND. IS obol_server.py RUNNING?', 'line-err');
        return;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        appendLine(errBody.error || `SERVER ERROR (${response.status})`, 'line-err');
        return;
      }

      const data = await response.json();
      appendLine(data.reply, 'line-out');
      // Preview of the phase-8 status line — real, varying facts, not filler.
      appendLine(
        `[CTX=${data.context_matched} TOK_IN=${data.tokens_in} TOK_OUT=${data.tokens_out} ${data.elapsed_seconds}s]`,
        'line-meta'
      );
    }

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const raw = input.value.trim();
      if (!raw) return;
      appendLine(`OBOL> ${raw}`, 'line-in');
      input.value = '';

      const localError = validateLocally(raw);
      if (localError) {
        appendLine(localError, 'line-err');
        return;
      }
      sendToObol(raw);
    });
  }

  window.ShellApps = window.ShellApps || {};
  window.ShellApps['ai-assistant'] = { manifest, mount };
})();
