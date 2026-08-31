/* agent.js — canned self-learning agent loop playground
   Scripted playback of retrieve → act → write → evaluate → reflect → promote.
   No live LLM; scenarios mirror the real Python loop. */

(function () {
  'use strict';

  var STAGES = [
    { id: 'retrieve', label: 'Retrieve' },
    { id: 'act', label: 'Act' },
    { id: 'write_facts', label: 'Write facts' },
    { id: 'evaluate', label: 'Evaluate' },
    { id: 'reflect', label: 'Reflect' },
    { id: 'write_lessons', label: 'Write lessons' },
    { id: 'promote', label: 'Promote' },
  ];

  var STAGE_INFO = {
    retrieve: {
      title: 'Retrieve',
      body: 'Semantic search over facts, lessons, and skills. Hybrid keep: hard ≥ 0.5, soft ≥ 0.28 + lexical ≥ 0.12. Domain cues gate tool prefs; identity queries expand.',
    },
    act: {
      title: 'Act',
      body: 'Reply with retrieved memories injected into the system prompt. Style prefs always apply; domain prefs only when on-topic.',
    },
    write_facts: {
      title: 'Write facts',
      body: 'Mem0 extracts durable facts from the turn (infer=True). Trivial greetings are skipped so the store stays clean.',
    },
    evaluate: {
      title: 'Evaluate',
      body: 'You mark /good or /bad — the outcome signal. Optional note can correct contradicted facts.',
    },
    reflect: {
      title: 'Reflect',
      body: 'Low-temperature pass extracts 1–3 short imperative lessons from feedback. Behavior change, not biography.',
    },
    write_lessons: {
      title: 'Write lessons',
      body: 'Lessons stored with metadata.type=lesson, outcome=good|bad, infer=False so the text stays clean.',
    },
    promote: {
      title: 'Promote',
      body: 'Cluster similar lessons → named skill playbooks (name / when / steps). Maintenance, not every turn.',
    },
  };

  var LADDER = [
    {
      layer: 'Interface',
      local: 'cli.py REPL',
      prod: 'FastAPI + auth, per-user user_id, review UI for /good · /bad',
    },
    {
      layer: 'LLM / embed',
      local: 'Ollama llama3.1:8b + mxbai-embed-large (1024-d)',
      prod: 'Hosted LLM or vLLM — dims must stay 1024 or wipe collection',
    },
    {
      layer: 'Vector',
      local: 'Qdrant on-disk path or Docker :6333',
      prod: 'Qdrant Cloud / Pinecone — same collection + metadata filters',
    },
    {
      layer: 'Memory SDK',
      local: 'Mem0 OSS from_config',
      prod: 'Mem0 Cloud or thin store adapter — SelfLearningAgent stays',
    },
    {
      layer: 'Feedback',
      local: 'Explicit /good · /bad [note]',
      prod: 'Implicit signals (edit, retry, thumbs) + optional human queue',
    },
    {
      layer: 'Maintenance',
      local: '/promote · /consolidate · /maintain',
      prod: 'Cron jobs — never on the hot path',
    },
    {
      layer: 'Multi-user',
      local: 'USER_ID env',
      prod: 'Auth → user_id isolation; do not share one collection blindly',
    },
    {
      layer: 'Eval',
      local: 'Manual restart + /memories',
      prod: 'Golden dialogues: gating, correction, lesson retrieval',
    },
  ];

  /* ── Scenarios ─────────────────────────────────────────────── */

  var SCENARIOS = [
    {
      id: 'remember',
      label: 'Remember me',
      blurb: 'State prefs → facts land → next coding turn retrieves them.',
      steps: [
        {
          stage: 'retrieve',
          delay: 700,
          chat: { role: 'user', text: 'I prefer concise answers and pytest.' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Empty store — first turn',
            body: 'No prior memories. Search returns nothing; act without injection.',
            logs: [
              { kind: 'info', text: 'query: "I prefer concise answers and pytest."' },
              { kind: 'info', text: 'raw hits: 0' },
              { kind: 'info', text: 'facts (0) · lessons (0) · skills (0)' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 800,
          chat: {
            role: 'ai',
            text: 'Got it — I\'ll keep replies short and use pytest when we write tests.',
          },
          inspector: {
            kicker: 'Act',
            title: 'Reply without memory bias',
            body: 'System prompt has empty facts/lessons blocks. Temperature 0.3.',
            logs: [{ kind: 'info', text: 'ACT_SYSTEM: facts=(none) lessons=(none)' }],
          },
          enableFeedback: true,
        },
        {
          stage: 'write_facts',
          delay: 900,
          memories: {
            add: [
              { id: 'f1', kind: 'fact', text: 'User prefers concise answers', source: 'conversation' },
              { id: 'f2', kind: 'fact', text: 'User prefers pytest over unittest', source: 'conversation' },
            ],
          },
          inspector: {
            kicker: 'Write facts',
            title: 'Mem0 infer=True',
            body: 'Extractor pulls durable prefs from the turn. Stored with type=fact, source=conversation.',
            logs: [
              { kind: 'keep', text: 'UPSERT fact: User prefers concise answers' },
              { kind: 'keep', text: 'UPSERT fact: User prefers pytest over unittest' },
            ],
          },
        },
        {
          stage: 'retrieve',
          delay: 900,
          chat: { role: 'user', text: 'How should I structure a Python unit test for get_capital?' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Coding query — prefs match',
            body: 'Domain cue "test" unlocks the pytest fact. Concise style always applies.',
            logs: [
              { kind: 'keep', text: 'KEEP hard | conf=0.72 | type=fact | User prefers concise answers' },
              { kind: 'keep', text: 'KEEP hard | conf=0.68 | type=fact | User prefers pytest…' },
              { kind: 'info', text: 'injected: facts(2) lessons(0) skills(0)' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 900,
          chat: {
            role: 'ai',
            text: 'Use a pytest function — keep it short:\n\ndef test_get_capital():\n    assert get_capital("FR") == "Paris"',
          },
          inspector: {
            kicker: 'Act',
            title: 'Memories in the prompt',
            body: 'Pytest preference and brevity are in the system prompt. Reply stays short and uses pytest.',
            logs: [{ kind: 'info', text: 'facts injected · domain prefs on-topic' }],
          },
          enableFeedback: true,
        },
        {
          stage: 'write_facts',
          delay: 600,
          inspector: {
            kicker: 'Write facts',
            title: 'No new durable facts',
            body: 'Turn is a how-to question; extractor finds nothing new to store.',
            logs: [{ kind: 'info', text: '(no memories written — extractor found nothing)' }],
          },
        },
      ],
    },
    {
      id: 'gating',
      label: 'Domain gating',
      blurb: 'Pytest fact DROPs on “capital of France”; concise still KEEPs.',
      seed: [
        { id: 'f1', kind: 'fact', text: 'User prefers concise answers', source: 'conversation' },
        { id: 'f2', kind: 'fact', text: 'User prefers pytest over unittest', source: 'conversation' },
      ],
      steps: [
        {
          stage: 'retrieve',
          delay: 800,
          chat: { role: 'user', text: 'What is the capital of France?' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Domain gating in action',
            body: '_memory_relevant + _DOMAIN_CUES: tool-centric prefs only when the query matches coding/test cues. Style prefs still apply.',
            logs: [
              { kind: 'keep', text: 'KEEP hard | conf=0.61 | type=fact | User prefers concise answers' },
              { kind: 'drop', text: 'DROP irrelevant | conf=0.55 | type=fact | User prefers pytest…' },
              { kind: 'info', text: 'injected: facts(1) — pytest gated out' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 800,
          chat: { role: 'ai', text: 'Paris.' },
          inspector: {
            kicker: 'Act',
            title: 'No forced tool examples',
            body: 'Without gating, a noisy local extractor would drag pytest into geography. One-word reply respects concise.',
            logs: [{ kind: 'info', text: 'facts: concise only · no code/tests injected' }],
          },
          enableFeedback: true,
        },
        {
          stage: 'write_facts',
          delay: 500,
          inspector: {
            kicker: 'Write facts',
            title: 'Skip trivia noise',
            body: 'Capital facts about countries are not personal user facts — nothing useful to persist.',
            logs: [{ kind: 'info', text: '(no memories written)' }],
          },
        },
      ],
    },
    {
      id: 'toolong',
      label: 'Too long → /bad',
      blurb: 'Verbose reply → /bad “too long” → imperative lessons land.',
      seed: [
        { id: 'f1', kind: 'fact', text: 'User prefers concise answers', source: 'conversation' },
      ],
      steps: [
        {
          stage: 'retrieve',
          delay: 600,
          chat: { role: 'user', text: 'Explain what a REST API is.' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Style fact available',
            body: 'Concise preference is retrieved, but the model still overshoots.',
            logs: [
              { kind: 'keep', text: 'KEEP hard | conf=0.64 | type=fact | User prefers concise answers' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 1000,
          chat: {
            role: 'ai',
            text: 'A REST API is an architectural style for networked applications. It stands for Representational State Transfer and was defined by Roy Fielding. Clients interact with resources identified by URIs using standard HTTP methods such as GET, POST, PUT, and DELETE. Responses are typically JSON. Statelessness means each request carries all context. Caching, layered systems, and uniform interfaces are further constraints. In practice you might also consider versioning, pagination, rate limits, authentication schemes, HATEOAS, OpenAPI specs, and idempotency keys when designing production services…',
          },
          inspector: {
            kicker: 'Act',
            title: 'Verbose despite preference',
            body: 'Facts alone are weak constraints. Feedback is how behavior gets locked in as lessons.',
            logs: [{ kind: 'info', text: 'reply length ≫ preferred style' }],
          },
          enableFeedback: true,
          feedbackNote: 'too long',
          autoFeedback: 'bad',
        },
        {
          stage: 'evaluate',
          delay: 700,
          chat: { role: 'system', text: '/bad too long' },
          inspector: {
            kicker: 'Evaluate',
            title: 'Outcome signal',
            body: 'User marks the last reply unhelpful with a note. That triggers reflect + optional fact correction.',
            logs: [{ kind: 'info', text: 'outcome=bad · note="too long"' }],
          },
        },
        {
          stage: 'reflect',
          delay: 800,
          inspector: {
            kicker: 'Reflect',
            title: 'Extract lessons (temp 0.1)',
            body: '1–3 short imperative sentences. Scope domain advice; do not restate user biography.',
            logs: [
              { kind: 'keep', text: 'Keep answers under 5 sentences.' },
              { kind: 'keep', text: 'Lead with the direct answer, then one clarifying detail max.' },
            ],
          },
        },
        {
          stage: 'write_lessons',
          delay: 900,
          memories: {
            add: [
              {
                id: 'l1',
                kind: 'lesson',
                text: 'Keep answers under 5 sentences.',
                source: 'feedback',
                outcome: 'bad',
              },
              {
                id: 'l2',
                kind: 'lesson',
                text: 'Lead with the direct answer, then one clarifying detail max.',
                source: 'feedback',
                outcome: 'bad',
              },
            ],
          },
          inspector: {
            kicker: 'Write lessons',
            title: 'infer=False · type=lesson',
            body: 'Lessons stored with outcome=bad and a short topic from the user message. Next similar question will retrieve them.',
            logs: [
              { kind: 'keep', text: 'STORE lesson: Keep answers under 5 sentences.' },
              { kind: 'keep', text: 'STORE lesson: Lead with the direct answer…' },
            ],
          },
        },
        {
          stage: 'retrieve',
          delay: 800,
          chat: { role: 'user', text: 'What is a REST API?' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Lessons now inject',
            body: 'Same topic retrieves brevity lessons. Prefer lessons over conflicting generic advice when on-topic.',
            logs: [
              { kind: 'keep', text: 'KEEP hard | type=fact | User prefers concise answers' },
              { kind: 'keep', text: 'KEEP hard | type=lesson | Keep answers under 5 sentences.' },
              { kind: 'keep', text: 'KEEP hard | type=lesson | Lead with the direct answer…' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 700,
          chat: {
            role: 'ai',
            text: 'A REST API exposes resources over HTTP (GET/POST/PUT/DELETE), usually as JSON, with each request carrying its own context.',
          },
          inspector: {
            kicker: 'Act',
            title: 'Behavior changed',
            body: 'Verbal RL: next reply respects the lessons without touching model weights.',
            logs: [{ kind: 'info', text: 'lessons applied · short answer' }],
          },
          enableFeedback: true,
        },
      ],
    },
    {
      id: 'correct',
      label: 'Correct a fact',
      blurb: 'Stale “days left” → /bad with date note → delete + add.',
      seed: [
        {
          id: 'f3',
          kind: 'fact',
          text: 'User has approximately 12 days left until the interview (assuming today is August 20).',
          source: 'conversation',
        },
        { id: 'f4', kind: 'fact', text: 'Interview is scheduled for September 1, 2026.', source: 'conversation' },
      ],
      steps: [
        {
          stage: 'retrieve',
          delay: 700,
          chat: { role: 'user', text: 'How many days until my interview?' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Identity / schedule query',
            body: 'Query expansion: “days left” → “interview date scheduled…”. Soft identity thresholds apply.',
            logs: [
              { kind: 'info', text: 'expanded: "interview date scheduled days left prepare"' },
              { kind: 'keep', text: 'KEEP identity | type=fact | …12 days left…' },
              { kind: 'keep', text: 'KEEP soft | type=fact | Interview is scheduled for September 1…' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 800,
          chat: {
            role: 'ai',
            text: 'You have about 12 days left until your September 1 interview.',
          },
          inspector: {
            kicker: 'Act',
            title: 'Stale derived estimate',
            body: 'Derived “days left” went stale. Authoritative today + interview date should win — user will correct.',
            logs: [{ kind: 'info', text: 'used stale days-left memory' }],
          },
          enableFeedback: true,
          feedbackNote: 'Today is Aug 31. Interview is Sep 10.',
          autoFeedback: 'bad',
        },
        {
          stage: 'evaluate',
          delay: 600,
          chat: { role: 'system', text: '/bad Today is Aug 31. Interview is Sep 10.' },
          inspector: {
            kicker: 'Evaluate',
            title: 'Note triggers fact correction',
            body: '/bad without a note only writes behavior lessons. With a note, correct_facts deletes contradicted memories and adds fixes.',
            logs: [{ kind: 'info', text: 'outcome=bad · note has date corrections' }],
          },
        },
        {
          stage: 'reflect',
          delay: 700,
          inspector: {
            kicker: 'Reflect',
            title: 'Behavior lessons',
            body: 'Still extract imperative lessons — separate from fact surgery.',
            logs: [
              { kind: 'keep', text: 'Prefer today\'s date + stored interview date over stale day-count estimates.' },
            ],
          },
        },
        {
          stage: 'write_lessons',
          delay: 700,
          memories: {
            add: [
              {
                id: 'l3',
                kind: 'lesson',
                text: 'Prefer today\'s date + stored interview date over stale day-count estimates.',
                source: 'feedback',
                outcome: 'bad',
              },
            ],
            strike: ['f3'],
            addAfterStrike: [
              { id: 'f5', kind: 'fact', text: 'Today is August 31, 2026.', source: 'correction' },
              { id: 'f6', kind: 'fact', text: 'Interview is on September 10, 2026.', source: 'correction' },
            ],
          },
          inspector: {
            kicker: 'Correct facts',
            title: 'Delete wrong · add fixes',
            body: 'correct_facts: DELETE derived estimates that depended on the wrong premise; ADD short corrected facts. Prefer deleting contradictions over leaving both.',
            logs: [
              { kind: 'drop', text: 'DELETE: …12 days left until the interview…' },
              { kind: 'keep', text: 'ADD fact: Today is August 31, 2026.' },
              { kind: 'keep', text: 'ADD fact: Interview is on September 10, 2026.' },
              { kind: 'keep', text: 'STORE lesson: Prefer today\'s date + …' },
            ],
          },
        },
      ],
    },
    {
      id: 'promote',
      label: 'Promote a skill',
      blurb: 'Two similar lessons cluster → one skill playbook.',
      seed: [
        {
          id: 'l1',
          kind: 'lesson',
          text: 'Keep answers under 5 sentences.',
          source: 'feedback',
          outcome: 'bad',
        },
        {
          id: 'l2',
          kind: 'lesson',
          text: 'Lead with the direct answer, then one clarifying detail max.',
          source: 'feedback',
          outcome: 'bad',
        },
        {
          id: 'l4',
          kind: 'lesson',
          text: 'When writing Python tests, prefer pytest over unittest.',
          source: 'feedback',
          outcome: 'good',
        },
        {
          id: 'l5',
          kind: 'lesson',
          text: 'For Python tests, use pytest fixtures instead of setUp.',
          source: 'feedback',
          outcome: 'good',
        },
      ],
      steps: [
        {
          stage: 'promote',
          delay: 900,
          chat: { role: 'system', text: '/promote' },
          inspector: {
            kicker: 'Promote',
            title: 'Cluster lessons → skills',
            body: 'cluster_lessons by topic + token overlap. Clusters with ≥2 lessons become a named playbook (name / when / steps).',
            logs: [
              { kind: 'info', text: 'cluster A (2): brevity lessons' },
              { kind: 'info', text: 'cluster B (2): pytest lessons' },
            ],
          },
        },
        {
          stage: 'promote',
          delay: 1000,
          memories: {
            add: [
              {
                id: 's1',
                kind: 'skill',
                text: 'Skill: Concise replies. When: User asks an explanatory question. Steps:\n1. Answer in ≤5 sentences\n2. Lead with the direct answer\n3. Add at most one clarifying detail',
                source: 'promotion',
              },
              {
                id: 's2',
                kind: 'skill',
                text: 'Skill: Pytest first. When: Writing or discussing Python tests. Steps:\n1. Prefer pytest over unittest\n2. Use fixtures instead of setUp\n3. Keep examples short',
                source: 'promotion',
              },
            ],
          },
          inspector: {
            kicker: 'Promote',
            title: 'Skills written',
            body: 'type=skill, source=promotion, from_lessons=N. Maintenance (/maintain) runs promote + consolidate — not on the hot chat path.',
            logs: [
              { kind: 'keep', text: 'STORE skill: Concise replies' },
              { kind: 'keep', text: 'STORE skill: Pytest first' },
            ],
          },
        },
        {
          stage: 'retrieve',
          delay: 700,
          chat: { role: 'user', text: 'Explain pagination briefly.' },
          inspector: {
            kicker: 'Retrieve',
            title: 'Skill injects as [skill]',
            body: 'Skills ride alongside lessons in the act prompt as "[skill] …" — reusable playbooks from repeated feedback.',
            logs: [
              { kind: 'keep', text: 'KEEP hard | type=skill | Concise replies…' },
              { kind: 'drop', text: 'DROP irrelevant | type=skill | Pytest first (no test cue)' },
            ],
          },
        },
        {
          stage: 'act',
          delay: 700,
          chat: {
            role: 'ai',
            text: 'Pagination splits large result sets into pages via limit/offset or cursors so clients fetch a slice at a time.',
          },
          inspector: {
            kicker: 'Act',
            title: 'Playbook applied',
            body: 'Concise-replies skill fired; pytest skill stayed gated. Same retrieve rules for skills as for lessons.',
            logs: [{ kind: 'info', text: 'skill Concise replies applied' }],
          },
          enableFeedback: true,
        },
      ],
    },
  ];

  /* ── State ─────────────────────────────────────────────────── */

  var state = {
    scenarioId: 'remember',
    memories: [],
    playing: false,
    timers: [],
    completedStages: {},
    activeStage: null,
    feedbackEnabled: false,
    pendingFeedback: null,
  };

  /* ── DOM helpers ───────────────────────────────────────────── */

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function clearTimers() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
  }

  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    state.timers.push(t);
    return t;
  }

  function scenarioById(id) {
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return SCENARIOS[0];
  }

  /* ── Render: scenarios / rail / chat / memories / inspector ── */

  function renderScenarios() {
    var wrap = $('slaScenarios');
    if (!wrap) return;
    wrap.innerHTML = '';
    SCENARIOS.forEach(function (s) {
      var btn = el('button', 'sla-chip' + (s.id === state.scenarioId ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', s.id === state.scenarioId ? 'true' : 'false');
      btn.textContent = s.label;
      btn.title = s.blurb;
      btn.addEventListener('click', function () {
        if (state.playing) return;
        selectScenario(s.id);
      });
      wrap.appendChild(btn);
    });
  }

  function renderRail() {
    var rail = $('slaRail');
    if (!rail) return;
    rail.innerHTML = '';
    STAGES.forEach(function (st, i) {
      if (i > 0) {
        var conn = el('div', 'sla-conn');
        if (state.completedStages[STAGES[i - 1].id]) conn.classList.add('done');
        if (state.activeStage === st.id) conn.classList.add('active');
        rail.appendChild(conn);
      }
      var node = el('button', 'sla-stage');
      node.type = 'button';
      node.setAttribute('role', 'listitem');
      node.dataset.stage = st.id;
      if (state.activeStage === st.id) node.classList.add('active');
      if (state.completedStages[st.id]) node.classList.add('done');
      node.innerHTML =
        '<span class="sla-stage-idx">' +
        (state.completedStages[st.id] ? '✓' : String(i + 1)) +
        '</span><span class="sla-stage-label">' +
        st.label +
        '</span>';
      node.addEventListener('click', function () {
        showStageInfo(st.id);
      });
      rail.appendChild(node);
    });
  }

  function showStageInfo(id) {
    var info = STAGE_INFO[id];
    if (!info) return;
    setInspector({
      kicker: 'Stage',
      title: info.title,
      body: info.body,
      logs: [],
    });
    state.activeStage = id;
    renderRail();
  }

  function setInspector(payload) {
    var k = $('slaInspKicker');
    var t = $('slaInspTitle');
    var b = $('slaInspBody');
    var log = $('slaInspLog');
    if (k) k.textContent = payload.kicker || 'Explore';
    if (t) t.textContent = payload.title || '';
    if (b) b.textContent = payload.body || '';
    if (log) {
      log.innerHTML = '';
      (payload.logs || []).forEach(function (line) {
        var row = el('div', 'sla-log ' + (line.kind || 'info'));
        row.textContent = line.text;
        log.appendChild(row);
      });
    }
  }

  function appendChat(msg) {
    var win = $('slaChat');
    if (!win) return;
    if (msg.role === 'system') {
      var sys = el('div', 'sla-sys-msg');
      sys.textContent = msg.text;
      win.appendChild(sys);
    } else {
      var row = el('div', 'chat-msg ' + (msg.role === 'user' ? 'user' : ''));
      var av = el(
        'div',
        'chat-avatar' + (msg.role === 'user' ? ' user' : ''),
        msg.role === 'user' ? 'U' : 'AI'
      );
      var bubble = el('div', 'chat-bubble');
      bubble.textContent = msg.text;
      row.appendChild(av);
      row.appendChild(bubble);
      win.appendChild(row);
    }
    win.scrollTop = win.scrollHeight;
  }

  function clearChat() {
    var win = $('slaChat');
    if (win) win.innerHTML = '';
  }

  function renderMemories() {
    var buckets = { fact: $('slaFacts'), lesson: $('slaLessons'), skill: $('slaSkills') };
    Object.keys(buckets).forEach(function (k) {
      if (buckets[k]) buckets[k].innerHTML = '';
    });
    var counts = { fact: 0, lesson: 0, skill: 0 };
    state.memories.forEach(function (m) {
      var col = buckets[m.kind];
      if (!col) return;
      counts[m.kind]++;
      var card = el('div', 'sla-card' + (m.struck ? ' struck' : '') + (m.fresh ? ' fresh' : ''));
      card.dataset.id = m.id;
      var meta = m.source || m.outcome || '';
      card.innerHTML =
        '<div class="sla-card-text">' +
        escapeHtml(m.text) +
        '</div>' +
        (meta ? '<div class="sla-card-meta">' + escapeHtml(meta) + '</div>' : '');
      col.appendChild(card);
      if (m.fresh) {
        later(function () {
          card.classList.remove('fresh');
          m.fresh = false;
        }, 1200);
      }
    });
    Object.keys(buckets).forEach(function (k) {
      if (buckets[k] && counts[k] === 0) {
        buckets[k].appendChild(el('div', 'sla-empty', '(none)'));
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function setFeedback(enabled, note) {
    state.feedbackEnabled = !!enabled;
    var g = $('slaGood');
    var b = $('slaBad');
    var n = $('slaFeedbackNote');
    if (g) g.disabled = !enabled;
    if (b) b.disabled = !enabled;
    if (n) n.textContent = note ? 'note: “' + note + '”' : '';
  }

  /* ── Scenario control ──────────────────────────────────────── */

  function selectScenario(id) {
    clearTimers();
    state.playing = false;
    state.scenarioId = id;
    state.completedStages = {};
    state.activeStage = null;
    state.pendingFeedback = null;
    var sc = scenarioById(id);
    state.memories = (sc.seed || []).map(function (m) {
      return Object.assign({}, m, { struck: false, fresh: false });
    });
    clearChat();
    renderScenarios();
    renderRail();
    renderMemories();
    setFeedback(false);
    setInspector({
      kicker: 'Scenario',
      title: sc.label,
      body: sc.blurb + ' Press Play to walk the loop.',
      logs: [],
    });
    var play = $('slaPlay');
    if (play) play.textContent = '▶ Play';
  }

  function applyMemories(patch) {
    if (!patch) return;
    (patch.strike || []).forEach(function (id) {
      state.memories.forEach(function (m) {
        if (m.id === id) m.struck = true;
      });
    });
    (patch.add || []).forEach(function (m) {
      state.memories.push(Object.assign({}, m, { struck: false, fresh: true }));
    });
    (patch.addAfterStrike || []).forEach(function (m) {
      state.memories.push(Object.assign({}, m, { struck: false, fresh: true }));
    });
    renderMemories();
  }

  function runStep(sc, idx) {
    if (idx >= sc.steps.length) {
      state.playing = false;
      state.activeStage = null;
      renderRail();
      var play = $('slaPlay');
      if (play) play.textContent = '▶ Replay';
      setInspector({
        kicker: 'Done',
        title: sc.label + ' complete',
        body: 'Try another scenario, or click a stage to inspect KEEP/DROP rules and writes.',
        logs: [],
      });
      return;
    }

    var step = sc.steps[idx];
    state.activeStage = step.stage;
    renderRail();

    if (step.chat) appendChat(step.chat);
    if (step.inspector) setInspector(step.inspector);
    if (step.memories) applyMemories(step.memories);

    if (step.enableFeedback) {
      setFeedback(true, step.feedbackNote || '');
      state.pendingFeedback = step.autoFeedback || null;
    } else {
      setFeedback(false);
    }

    later(function () {
      state.completedStages[step.stage] = true;
      renderRail();
      runStep(sc, idx + 1);
    }, step.delay || 800);
  }

  function play() {
    if (state.playing) return;
    var sc = scenarioById(state.scenarioId);
    clearTimers();
    state.playing = true;
    state.completedStages = {};
    state.activeStage = null;
    state.memories = (sc.seed || []).map(function (m) {
      return Object.assign({}, m, { struck: false, fresh: false });
    });
    clearChat();
    renderMemories();
    renderRail();
    setFeedback(false);
    var playBtn = $('slaPlay');
    if (playBtn) playBtn.textContent = 'Playing…';
    runStep(sc, 0);
  }

  /* ── Manual Good / Bad (when enabled mid-scenario, mostly cosmetic) */

  function manualFeedback(outcome) {
    if (!state.feedbackEnabled || state.playing) return;
    appendChat({
      role: 'system',
      text: '/' + outcome + (state.pendingFeedback ? '' : ''),
    });
    setFeedback(false);
    setInspector({
      kicker: 'Evaluate',
      title: '/' + outcome,
      body: 'In the live CLI this triggers evaluate_and_learn → reflect → write_lesson. Use Play on “Too long → /bad” or “Correct a fact” to see the full write path.',
      logs: [{ kind: 'info', text: 'outcome=' + outcome }],
    });
  }

  /* ── Scale ladder ──────────────────────────────────────────── */

  function renderLadder(mode) {
    var wrap = $('slaLadder');
    if (!wrap) return;
    wrap.innerHTML = '';
    LADDER.forEach(function (row) {
      var item = el('div', 'sla-ladder-row');
      item.innerHTML =
        '<div class="sla-ladder-layer">' +
        escapeHtml(row.layer) +
        '</div><div class="sla-ladder-val">' +
        escapeHtml(mode === 'prod' ? row.prod : row.local) +
        '</div>';
      wrap.appendChild(item);
    });
  }

  function setScaleMode(mode) {
    var localBtn = $('slaModeLocal');
    var prodBtn = $('slaModeProd');
    if (localBtn) localBtn.classList.toggle('active', mode === 'local');
    if (prodBtn) prodBtn.classList.toggle('active', mode === 'prod');
    renderLadder(mode);
  }

  /* ── Init ──────────────────────────────────────────────────── */

  function initAgent() {
    if (!$('slaRail')) return;

    renderScenarios();
    renderRail();
    selectScenario('remember');
    setScaleMode('local');

    var playBtn = $('slaPlay');
    var resetBtn = $('slaReset');
    if (playBtn) playBtn.addEventListener('click', play);
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        selectScenario(state.scenarioId);
      });
    }
    var good = $('slaGood');
    var bad = $('slaBad');
    if (good) good.addEventListener('click', function () { manualFeedback('good'); });
    if (bad) bad.addEventListener('click', function () { manualFeedback('bad'); });

    var localBtn = $('slaModeLocal');
    var prodBtn = $('slaModeProd');
    if (localBtn) localBtn.addEventListener('click', function () { setScaleMode('local'); });
    if (prodBtn) prodBtn.addEventListener('click', function () { setScaleMode('prod'); });
  }

  window.initAgent = initAgent;
})();
