/* ── Curated portfolio data ──────────────────────────────────── */

const SOCIAL = {
  github:   'https://github.com/gouravdangi',
  linkedin: 'https://www.linkedin.com/in/gouravdangi',
  leetcode: 'https://leetcode.com/u/gouravdangi2002/',
  email:    'mailto:gouravdangi.work@gmail.com',
};

const EXPERIENCE = [
  {
    company: 'Respo Financial Limited',
    role: 'SDE 2 — AI / ML',
    dates: 'Jun 2025 – Present',
    icon: '🚀',
    bullets: [
      'Built a GraphRAG-based customer support automation service that handles <strong>77%</strong> of total support tickets end-to-end, cutting first-response time from 48 h to under 1 minute.',
      'Designed scalable AI microservices for retrieval, orchestration & workflow automation, integrating local LLM inference via <strong>Ollama</strong> for cost-efficient on-prem serving.',
      'Developed AI voice-calling agents (Sarvam STT/TTS) for debt collection & EMI reminders, completing <strong>3,000+ automated calls daily</strong> — equivalent to 30+ human agents.',
      'Built operational dashboards to monitor call outcomes, escalation metrics, and bot performance across AI-driven support workflows.',
    ],
  },
  {
    company: 'JM Financial',
    role: 'Data Scientist',
    dates: 'Jun 2023 – May 2025',
    icon: '📊',
    bullets: [
      'Deployed a RAG chatbot using spaCy (intent + NER) that resolves <strong>86%</strong> of preliminary customer-support queries before routing to a human agent.',
      'Designed a <strong>Graph Neural Network</strong> on a user–product interaction graph to predict link existence, capturing complex recommendation relationships.',
      'Developed a Lead Scoring model with high recall, boosting conversion rates by <strong>10%</strong> via targeted marketing and optimised lead prioritisation.',
    ],
  },
  {
    company: 'AgriVision4u',
    role: 'Backend Developer Intern',
    dates: 'Dec 2021 – May 2022',
    icon: '🌱',
    bullets: [
      "Developed chatbot workflows using Google Dialogflow for automated customer query resolution.",
      "Built backend APIs to integrate Dialogflow intents with the product's agricultural advisory platform.",
    ],
  },
];

const PROJECTS = [
  {
    id: 'snake',
    index: '01',
    title: 'Snake Game — Human vs AI Race',
    summary: 'Play snake against a BFS/DQN agent in real-time split-screen.',
    badge: 'Play Live',
    interactive: true,
    href: 'projects/snake.html',
    tags: ['Reinforcement Learning', 'Deep Q-Network', 'PyTorch', 'Python'],
    description: 'A reinforcement-learning agent (Deep Q-Network) learns to play Snake from scratch. Challenge it on a split-screen race — your board vs the AI, seeded with the same food sequence.',
    links: [{ label: 'GitHub', href: 'https://github.com/gouravdangi/Sanke_game_AI' }],
  },
  {
    id: 'falcon',
    index: '02',
    title: 'Falcon 9 Cost Predictor',
    summary: 'Predict launch cost & landing probability from payload, orbit, and reuse data.',
    badge: 'Interactive Demo',
    interactive: true,
    href: 'projects/falcon.html',
    tags: ['Python', 'Decision Tree', 'scikit-learn', 'SpaceX API', 'Web Scraping'],
    description: 'Predicts Falcon 9 launch cost and landing probability using payload mass, orbit type, and booster reuse. Decision-tree model trained at 87.5% accuracy on historical launches.',
    links: [{ label: 'GitHub', href: 'https://github.com/gouravdangi/rocket-cost-prediction' }],
  },
  {
    id: 'chatbot',
    index: '03',
    title: 'Agri RAG Chatbot',
    summary: 'Intent-aware agricultural advisory chatbot backed by a RAG knowledge base.',
    badge: 'Try it',
    interactive: true,
    href: 'projects/chatbot.html',
    tags: ['JavaScript', 'Dialogflow', 'NLP', 'RAG', 'Node.js'],
    description: 'Agricultural advisory chatbot built with Google Dialogflow. Intent classification and entity recognition surface contextual answers to farmers\' queries.',
    links: [{ label: 'GitHub', href: 'https://github.com/gouravdangi/Agri_chatbox' }],
  },
  {
    id: 'bandit',
    index: '04',
    title: 'Multi-Armed Bandit — Nudge Timing',
    summary: 'Epsilon-greedy bandit learns the best hour to trigger a push notification.',
    badge: 'Run Demo',
    interactive: true,
    href: 'projects/bandit.html',
    tags: ['Python', 'RLHF', 'Epsilon-Greedy', 'Bayesian Bandits'],
    description: 'Identifies the best hour to trigger a push notification so users are most likely to engage. Raised CTR from 2.4% to 7.4% in production.',
    links: [],
  },
  {
    id: 'graphrag',
    index: '05',
    title: 'GraphRAG Customer Support',
    summary: 'End-to-end support automation pipeline serving 77% of tickets without human touch.',
    badge: 'Production',
    interactive: false,
    href: 'projects/graphrag.html',
    tags: ['GraphRAG', 'LangGraph', 'Ollama', 'Neo4j', 'Microservices'],
    description: 'GraphRAG retrieves contextual knowledge, generates first-response emails, and surfaces CX summaries — automating 77% of tickets at Respo Financial.',
    links: [],
  },
  {
    id: 'anomaly',
    index: '06',
    title: 'Anomaly Detection via Whisper + LLM',
    summary: 'Detects mis-selling in call recordings using STT and an LLM compliance pipeline.',
    badge: 'ML Pipeline',
    interactive: false,
    href: 'projects/anomaly.html',
    tags: ['Whisper STT', 'LangChain', 'NLP', 'Python', 'Plotly'],
    description: 'Analyses call recordings between sales agents and customers using Whisper STT, then an LLM pipeline flags potential mis-selling and auto-generates compliance reports.',
    links: [],
  },
  {
    id: 'airpollution',
    index: '07',
    title: 'Air Pollution Hotspot Mapping',
    summary: 'Spatial analysis of PM and gaseous pollutants — B.Tech thesis at IIT Guwahati.',
    badge: 'Research',
    interactive: false,
    href: 'projects/air-pollution.html',
    tags: ['GIS', 'Spatial Analysis', 'Python', 'Folium', 'Seaborn'],
    description: 'Identification and spatial analysis of particulate-matter and gaseous-pollutant hotspots. B.Tech thesis under Dr. Sharad Gokhale at IIT Guwahati.',
    links: [{ label: 'GitHub', href: 'https://github.com/gouravdangi/Air-Pollution-Hotepot' }],
  },
];

const SKILLS = [
  { group: 'Programming',         items: ['Python', 'TypeScript', 'SQL', 'C++'] },
  { group: 'Databases',           items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Pinecone', 'Neo4j'] },
  { group: 'AI / ML',             items: ['PyTorch', 'TensorFlow', 'scikit-learn', 'spaCy', 'LangGraph', 'SmolAgents', 'NLP', 'RLHF'] },
  { group: 'GenAI & AI Systems',  items: ['RAG', 'GraphRAG', 'Fine-Tuning', 'AI Agents', 'Ollama', 'Prompt Engineering', 'STT/TTS Systems'] },
  { group: 'Core Competencies',   items: ['Applied AI', 'Conversational AI', 'Voice AI', 'Latency Optimisation', 'Graph ML', 'Model Deployment'] },
];

const ACHIEVEMENTS = [
  { icon: '🏆', title: 'BlinkX Rodies Achiever Award',        desc: 'Employee of the quarter equivalent in the AI/ML domain — Q4 2023' },
  { icon: '🎖️', title: 'Institute Secretary — Volleyball',    desc: 'Elected secretary of the volleyball club at IIT Guwahati for 2020-21' },
  { icon: '💻', title: 'LeetCode Rating 1750+',               desc: 'Competitive programming', link: 'https://leetcode.com/u/gouravdangi2002/' },
  { icon: '🎭', title: 'Inter-IIT Cultural Meet — 3rd Place', desc: 'Theatre module among 23 IITs at IIT Bombay (2019)' },
];
