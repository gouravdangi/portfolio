/* ── Agri RAG Chatbot Mock ────────────────────────────────────── */
/*
 * Demonstrates the intent-classification + RAG pattern used at AgriVision4u.
 * Intent → canned contextual response, with a short simulated "thinking" delay.
 */

const KNOWLEDGE_BASE = [
  {
    intent: ['monsoon', 'rainy', 'kharif'],
    response: `For the <strong>Kharif (monsoon) season</strong>, top crops include:<br>
    • <strong>Rice</strong> — needs 1200–1800 mm rainfall, ideal for Punjab/West Bengal<br>
    • <strong>Cotton</strong> — warm, humid; sow May–June<br>
    • <strong>Maize</strong> — fast-growing, drought-tolerant<br>
    • <strong>Soybean</strong> — legume, fixes nitrogen; great for central India<br><br>
    Tip: Start land preparation 3–4 weeks before monsoon onset.`,
  },
  {
    intent: ['rabi', 'winter', 'wheat'],
    response: `<strong>Rabi (winter) crops</strong> sown Oct–Nov, harvested March–April:<br>
    • <strong>Wheat</strong> — most important Rabi crop; needs cool temperatures<br>
    • <strong>Mustard</strong> — drought-tolerant, 115–140 day cycle<br>
    • <strong>Chickpea (Gram)</strong> — nitrogen-fixer, low water demand<br>
    • <strong>Barley</strong> — handles saline/alkaline soils well<br><br>
    Best irrigation: 2–3 irrigations at crown root, tillering, and grain fill stages.`,
  },
  {
    intent: ['powdery mildew', 'mildew', 'fungal', 'fungus', 'white powder', 'disease'],
    response: `<strong>Powdery Mildew</strong> management:<br>
    • <em>Cultural:</em> Ensure good air circulation; avoid excess nitrogen<br>
    • <em>Organic:</em> Spray 1:9 baking-soda solution or neem oil (3 ml/L)<br>
    • <em>Chemical:</em> Triadimefon (0.1%) or Propiconazole (0.1%) foliar spray<br>
    • Apply at first sign; repeat every 7–10 days<br><br>
    <em>Identification:</em> White powdery patches on leaves, spreads in humid (but not wet) conditions.`,
  },
  {
    intent: ['nitrogen', 'fertilizer', 'urea', 'npk', 'nutrient'],
    response: `<strong>Nitrogen fertilizer timing</strong> for maximum efficiency:<br>
    • <em>Basal dose:</em> 1/3 at transplanting/sowing<br>
    • <em>First top-dressing:</em> 1/3 at tillering (3–4 weeks after sowing)<br>
    • <em>Second top-dressing:</em> 1/3 at panicle initiation / flowering<br><br>
    For <strong>split application</strong> of urea: reduces leaching losses by up to 30%.<br>
    Soil test recommendation: optimise N based on SOM %; avoid over-application.`,
  },
  {
    intent: ['drip', 'irrigation', 'water', 'tomato', 'tomatoes'],
    response: `<strong>Drip irrigation for tomatoes</strong>:<br>
    • Water requirement: 400–600 mm per crop cycle<br>
    • Drip saves 40–50% water vs. flood irrigation<br>
    • <em>Frequency:</em> Daily or every alternate day; maintain soil moisture at 50–70% field capacity<br>
    • <em>Critical stages:</em> Transplanting, flowering, and fruit development<br><br>
    Pair with <strong>fertigation</strong> — inject water-soluble NPK (19:19:19) through drip lines for 25–30% better uptake.`,
  },
  {
    intent: ['pest', 'wheat', 'aphid', 'insect', 'pesticide', 'pest control'],
    response: `<strong>Wheat pest management</strong>:<br>
    • <em>Aphids:</em> Yellow sticky traps; Imidacloprid 70 WS seed treatment<br>
    • <em>Rust (brown/yellow):</em> Propiconazole 25 EC spray at flag leaf stage<br>
    • <em>Termite:</em> Chlorpyrifos 20 EC soil drench at sowing<br>
    • <em>Loose smut:</em> Vitavax 200 (2.5 g/kg seed) seed treatment<br><br>
    IPM principle: monitor weekly; spray only if pest crosses economic threshold.`,
  },
  {
    intent: ['soil', 'ph', 'test', 'fertility'],
    response: `<strong>Soil health management</strong>:<br>
    • Ideal pH for most crops: <strong>6.0–7.5</strong><br>
    • If pH &lt; 5.5 (acidic): apply agricultural lime (2–4 t/ha)<br>
    • If pH &gt; 8.0 (alkaline): apply gypsum or elemental sulphur<br>
    • Organic matter: target >1.5% SOM for good structure<br><br>
    Soil testing every 2–3 years; collect samples from 0–15 cm depth.`,
  },
  {
    intent: ['hello', 'hi', 'hey', 'help', 'what can you do'],
    response: `Hello! 👋 I'm the <strong>AgriVision Advisory Bot</strong>.<br>
    I can help you with:<br>
    • Crop selection by season/region<br>
    • Pest & disease identification and management<br>
    • Fertilizer schedules and soil health<br>
    • Irrigation guidance<br><br>
    Ask me anything or pick a suggestion below!`,
  },
];

const DEFAULT_RESPONSE = `I don't have a specific answer for that in my knowledge base, but I can help with:
<strong>crops</strong>, <strong>pests & diseases</strong>, <strong>fertilizers</strong>, <strong>irrigation</strong>, and <strong>soil health</strong>.<br>
Try one of the suggested questions, or rephrase your query.`;

let inited = false;

function initChatbot() {
  if (inited) return;
  inited = true;

  const chatWindow = document.getElementById('chatWindow');
  const chatInput  = document.getElementById('chatInput');
  const chatSend   = document.getElementById('chatSend');
  const chipList   = document.getElementById('chatChips');

  if (!chatWindow) return;

  addMessage('bot', KNOWLEDGE_BASE.find(k => k.intent.includes('hello')).response);

  function addMessage(role, html) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    const avatar = role === 'bot'
      ? `<div class="chat-avatar" aria-hidden="true">🌱</div>`
      : `<div class="chat-avatar user" aria-hidden="true">GD</div>`;
    msg.innerHTML = `${role === 'bot' ? avatar : ''}<div class="chat-bubble">${html}</div>${role === 'user' ? avatar : ''}`;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function addThinking() {
    const dot = document.createElement('div');
    dot.className = 'chat-msg bot';
    dot.id = 'thinkingDot';
    dot.innerHTML = `<div class="chat-avatar" aria-hidden="true">🌱</div><div class="chat-bubble" style="color:var(--muted)">…</div>`;
    chatWindow.appendChild(dot);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return dot;
  }

  function matchIntent(text) {
    const lower = text.toLowerCase();
    for (const kb of KNOWLEDGE_BASE) {
      if (kb.intent.some(kw => lower.includes(kw))) return kb.response;
    }
    return DEFAULT_RESPONSE;
  }

  function handleSend() {
    const val = chatInput.value.trim();
    if (!val) return;
    addMessage('user', val);
    chatInput.value = '';
    const thinking = addThinking();
    const response = matchIntent(val);
    setTimeout(() => {
      thinking.remove();
      addMessage('bot', response);
    }, 600 + Math.random() * 500);
  }

  chatSend.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

  chipList?.querySelectorAll('.chat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.textContent;
      handleSend();
    });
  });
}
