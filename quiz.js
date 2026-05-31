// HGVC ARCHETYPE QUIZ — v3
// Methodology: The Viral Archetype Funnel (Sarah Marilyn)
//
// v3 adds: per-archetype portraits + OG share cards, WhatsApp invite reveal flow,
//          and anonymized archetype distribution tracking for PR data.
(function () {
  'use strict';

  // ============================
  // CONFIG — wire these to real services
  // ============================
  // Formspree endpoint for WhatsApp signups (captures phone + archetype + qual)
  // TODO: replace with real Formspree endpoint after creating form at formspree.io
  const WHATSAPP_FORM_ENDPOINT = 'https://formspree.io/f/REPLACE_ME_WHATSAPP';

  // Formspree endpoint for anonymized distribution tracking (NO phone, NO PII)
  // TODO: replace with real Formspree endpoint after creating form at formspree.io
  const TRACKING_ENDPOINT = 'https://formspree.io/f/REPLACE_ME_TRACKING';

  // Public WhatsApp group invite link (chat.whatsapp.com/...)
  // TODO: create group in WhatsApp, get invite link, paste here
  const WHATSAPP_GROUP_INVITE = 'https://chat.whatsapp.com/REPLACE_ME_INVITE_CODE';

  // ============================
  // ARCHETYPES (4 personality types)
  // ============================
  // V = Visionary Founder, A = Aesthetic Engineer, C = Chaos Shipper, S = Strategist

  // ============================
  // QUESTIONS
  // 8 questions, alternating modes:
  //   E = emotional reflection
  //   O = operational self-assessment
  //   I = identity recognition
  //   F = future projection
  //   X = social comparison
  // Some questions ALSO capture hidden qualification data (role/stage/marketing-ready)
  // ============================
  const QUESTIONS = [
    {
      // Q1 — Identity tension opener (E)
      mode: 'E',
      q: "Honestly, when you're building something — what's the feeling you're chasing?",
      options: [
        { label: "The moment someone says 'wait, you built that?'", weights: { V: 2, A: 1 } },
        { label: "The quiet pride of opening a thing I made and it just… works", weights: { A: 2, C: 1 } },
        { label: "The high of shipping at 3am when I should be asleep", weights: { C: 2 } },
        { label: "The clarity of finally proving something I knew was true", weights: { S: 2, V: 1 } }
      ]
    },
    {
      // Q2 — Identity recognition (I) — HIDDEN QUAL: role/stage
      mode: 'I',
      q: "Where are you actually in your build journey right now?",
      qual: { type: 'stage' },
      options: [
        { label: "I have ten ideas and zero shipped — this is my year", weights: { V: 2, C: 1 }, qual: 'idea_stage' },
        { label: "I'm building something real but nobody's using it yet", weights: { A: 1, C: 1, S: 1, V: 1 }, qual: 'building' },
        { label: "I have a thing live and I'm trying to get traction", weights: { S: 2, V: 1 }, qual: 'traction' },
        { label: "I'm shipping inside a company / agency, this is my side energy", weights: { S: 1, A: 1, C: 1 }, qual: 'employed' }
      ]
    },
    {
      // Q3 — Operational self-assessment (O)
      mode: 'O',
      q: "Pick the workflow that's *most* you when you sit down to build:",
      options: [
        { label: "Open Figma → fall down a Pinterest hole → finally start coding two hours later", weights: { A: 2 } },
        { label: "Voice memo my idea to Claude, let it draft, then surgically edit", weights: { S: 2, V: 1 } },
        { label: "Skip planning. Open Cursor. Vibe my way to a working thing", weights: { C: 2 } },
        { label: "Pitch the idea to a friend first. If their eyes light up, I build it.", weights: { V: 2 } }
      ]
    },
    {
      // Q4 — Emotional reflection (E)
      mode: 'E',
      q: "Be honest. What stops you from shipping more?",
      options: [
        { label: "I get bored once the vision is clear — I want the next thing", weights: { V: 2 } },
        { label: "I can't ship it if it's ugly. I'd rather not release than release something I'm embarrassed by", weights: { A: 2 } },
        { label: "Nothing stops me. I ship too much. Half of it's broken", weights: { C: 2 } },
        { label: "I overthink the move. I want to be sure it's the *right* thing to build", weights: { S: 2 } }
      ]
    },
    {
      // Q5 — Future projection (F) — HIDDEN QUAL: what they want
      mode: 'F',
      q: "Twelve months from now, the best-case version of you is:",
      qual: { type: 'goal' },
      options: [
        { label: "Running my own thing, with a team, actually paying myself", weights: { V: 2, S: 1 }, qual: 'founder_track' },
        { label: "Known for the taste of what I make — people DM me asking how I did it", weights: { A: 2 }, qual: 'creator_track' },
        { label: "Shipped 12+ products, killed most of them, found the one that worked", weights: { C: 2 }, qual: 'experimenter' },
        { label: "Bigger seat at the table — operator/exec at a company I helped scale", weights: { S: 2 }, qual: 'operator_track' }
      ]
    },
    {
      // Q6 — Social comparison (X) — viral fuel
      mode: 'X',
      q: "Look around your group chat. Who are you, vs. them?",
      options: [
        { label: "The one with the wildest pitch, who somehow ends up convincing everyone", weights: { V: 2 } },
        { label: "The one whose screenshots make everyone else want to redo their portfolio", weights: { A: 2 } },
        { label: "The one who DMs at 2am: 'wait look what i just made'", weights: { C: 2 } },
        { label: "The one everyone asks before making a big move", weights: { S: 2 } }
      ]
    },
    {
      // Q7 — Operational + hidden qual: marketing-readiness signal
      mode: 'O',
      q: "Once you ship something, what actually happens?",
      qual: { type: 'marketing_ready' },
      options: [
        { label: "I post about it once, maybe twice, then move on", weights: { C: 2 }, qual: 'low' },
        { label: "I make it beautiful and quietly hope the right people notice", weights: { A: 2 }, qual: 'low' },
        { label: "I tell my network, get warm intros, build momentum from there", weights: { V: 2, S: 1 }, qual: 'medium' },
        { label: "I have a real plan — content, channels, the whole thing — I just need it to run", weights: { S: 2, V: 1 }, qual: 'high' }
      ]
    },
    {
      // Q8 — Future projection + identity (F/I) — capstone
      mode: 'F',
      q: "What's the *one* thing you want from being part of the Hot Girl Vibe Coding world?",
      options: [
        { label: "Cofounders, investors, the people who'll bet on what I'm building", weights: { V: 2, S: 1 } },
        { label: "A community of women who actually get the design + craft obsession", weights: { A: 2 } },
        { label: "Permission to ship faster and weirder than everywhere else lets me", weights: { C: 2 } },
        { label: "Sharper thinking. Better strategy. Rooms where everyone's playing to win", weights: { S: 2 } }
      ]
    }
  ];

  // ============================
  // ARCHETYPES — with monetization data
  // ============================
  const ARCHETYPES = {
    V: {
      name: "The Visionary Founder",
      tag: "You don't build features. You build futures.",
      portrait: './assets/archetypes/archetype_visionary.png',
      ogImage: './assets/archetypes/og_visionary.png',
      desc: "You walk in with a story and leave with a team. You can describe a product so clearly that other people start building it for you. Vibe coding isn't your end goal — it's how you finally get the thing out of your head and into the world fast enough to matter.",
      power: "Magnetic clarity. You make people believe.",
      gift: "You see the company three years out, and you can describe it like it already exists.",
      shadow: "You get bored at execution. Polishing isn't your love language — and that's why you need the right systems around you.",
      lovablePitch: "Lovable is the fastest way to put your vision in front of a real human and watch their face change. Skip the 'we're building it' phase. Build the actual thing.",
      lovableProject: "Build a landing page + waitlist for the company you've been describing at every dinner this year. One prompt. Live URL in 20 minutes. Send it to the next person who asks 'so what are you working on?'",
      community: "You belong in rooms with operators, designers, and at least one person who'll quit their job when you ask. The HGVC Inner Circle is that room.",
      viralizeFit: true,   // High-value Viralize lead if marketing-ready
      viralizePitch: "If you're at the 'I have a real thing and I need it to *move*' stage, this is where Viralize comes in — organic growth infrastructure built for founders who can't afford to wait for word-of-mouth."
    },
    A: {
      name: "The Aesthetic Engineer",
      tag: "If it's not beautiful, it's not shipped.",
      portrait: './assets/archetypes/archetype_aesthetic.png',
      ogImage: './assets/archetypes/og_aesthetic.png',
      desc: "You believe taste is a feature. Your products feel different the second someone opens them — the spacing, the type, the micro-interactions. Vibe coding finally lets you ship as fast as you can design, and that's changing what's even possible.",
      power: "Taste at velocity. You make tools people want to touch.",
      gift: "You can tell within 3 seconds why a product feels cheap. That's a superpower most VCs can't even articulate.",
      shadow: "Perfect is the enemy of posted. Sometimes the world needs the v0.5, not the v3.",
      lovablePitch: "Lovable is what happens when your taste finally has a build environment that can keep up. Prompt it like you'd brief a junior designer who never sleeps.",
      lovableProject: "Build the gorgeous single-page micro-product you've been mood-boarding — portfolio, link-in-bio that doesn't look like Linktree, weird beautiful tool. The one you wouldn't be embarrassed to put on your About page.",
      community: "You belong with the other designers-who-code, the frontend obsessives, the people who notice the easing curve on your hover state. That's HGVC Inner Circle.",
      viralizeFit: false,
      viralizePitch: null
    },
    C: {
      name: "The Chaos Shipper",
      tag: "Done is hotter than perfect.",
      portrait: './assets/archetypes/archetype_chaos.png',
      ogImage: './assets/archetypes/og_chaos.png',
      desc: "You ship. You break. You ship again. While other people are still wireframing, you've already deployed three things, killed two, and accidentally invented the fourth. Vibe coding was made for you — you were doing this energy before it had a name.",
      power: "Velocity. You finish things other people only talk about.",
      gift: "You have a higher tolerance for ugly-but-working than 99% of people. That tolerance is what lets you actually find product-market fit.",
      shadow: "You ship so fast you forget to tell anyone. Half your best ideas die in your own GitHub.",
      lovablePitch: "Lovable was basically designed for your psychology. Prompt the thing. Ship the thing. If it sucks, prompt a new thing. Repeat until something hits.",
      lovableProject: "Pick the dumbest, smallest idea in your Notes app right now. Build it tonight. Post the link tomorrow. Don't fix anything. That's the assignment.",
      community: "You belong with the other shippers, the hackers, the people who'll DM you 'WAIT this is real?' at 2am. HGVC Inner Circle exists for exactly this.",
      viralizeFit: false,
      viralizePitch: null
    },
    S: {
      name: "The Strategist",
      tag: "Every line of code is a chess move.",
      portrait: './assets/archetypes/archetype_strategist.png',
      ogImage: './assets/archetypes/og_strategist.png',
      desc: "You don't build to build. You build because you saw the angle nobody else did. You're quietly mapping the market while everyone else is fighting over the hype. Vibe coding lets you test a thesis in hours instead of months — and that changes the game entirely.",
      power: "Pattern recognition. You see the move three steps ahead.",
      gift: "You can tell which trends are going to be infrastructure and which are going to be cringe in 18 months. That's worth a lot of money to the right people.",
      shadow: "Analysis can become procrastination dressed up in a suit. At some point you have to ship the bet.",
      lovablePitch: "Lovable is your fastest path from thesis → proof. Stop arguing with people about whether the idea works. Build the prototype and let the data argue for you.",
      lovableProject: "Build a working prototype of the thesis you've been sitting on. Not a deck. Not a Notion doc. A *thing people can use*. Then watch what they actually do with it.",
      community: "You belong with founders who are 6 months ahead of you, the investor who'll get it, and the friend who'll tell you the truth. HGVC Inner Circle is curated for exactly this.",
      viralizeFit: true,
      viralizePitch: "If you're sitting on a real thesis and you've already validated it, this is where Viralize comes in — organic growth infrastructure for the people quietly building category leaders."
    }
  };

  // ============================
  // STATE
  // ============================
  const state = {
    current: 0,
    answers: new Array(QUESTIONS.length).fill(null),
    scores: { V: 0, A: 0, C: 0, S: 0 },
    qual: { stage: null, goal: null, marketing_ready: null }
  };

  // ============================
  // ELEMENTS
  // ============================
  const root = document.getElementById('quiz');
  if (!root) return;

  const screens = {
    intro: root.querySelector('[data-screen="intro"]'),
    game: root.querySelector('[data-screen="game"]'),
    result: root.querySelector('[data-screen="result"]')
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $('quizStart'),
    step: $('quizStep'),
    question: $('quizQuestion'),
    options: $('quizOptions'),
    back: $('quizBack'),
    hint: $('quizHint'),
    progressBar: $('quizProgressBar'),

    resultName: $('resultName'),
    resultTag: $('resultTag'),
    resultDesc: $('resultDesc'),
    resultGift: $('resultGift'),
    resultShadow: $('resultShadow'),
    resultPower: $('resultPower'),

    // Lovable block
    lovablePitch: $('lovablePitch'),
    lovableProject: $('lovableProject'),
    lovableCta: $('lovableCta'),

    // Result portrait
    resultPortrait: $('resultPortrait'),

    // OG meta tags (dynamic)
    ogImage: $('ogImage'),
    ogTitle: $('ogTitle'),
    ogDesc: $('ogDesc'),
    twImage: $('twImage'),
    twTitle: $('twTitle'),
    twDesc: $('twDesc'),

    // Community block
    communityCopy: $('communityCopy'),
    whatsappForm: $('whatsappForm'),
    whatsappPhone: $('whatsappPhone'),
    whatsappNote: $('whatsappNote'),
    whatsappSuccess: $('whatsappSuccess'),
    whatsappInvite: $('whatsappInvite'),

    // Viralize block (gated)
    viralizeBlock: $('viralizeBlock'),
    viralizePitch: $('viralizePitch'),

    // Restart + share
    restart: $('quizRestart'),
    shareTwitter: $('shareTwitter'),
    shareCopy: $('shareCopy')
  };

  // ============================
  // RENDER
  // ============================
  function show(screenName) {
    Object.entries(screens).forEach(([name, el]) => {
      if (!el) return;
      el.hidden = name !== screenName;
    });
    root.dataset.state = screenName;
    const top = root.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function renderQuestion() {
    const q = QUESTIONS[state.current];
    els.step.textContent = `Question ${state.current + 1} of ${QUESTIONS.length}`;
    els.question.textContent = q.q;

    const pct = (state.current / QUESTIONS.length) * 100;
    els.progressBar.style.width = pct + '%';

    els.options.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz__option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.answers[state.current] === i ? 'true' : 'false');
      btn.dataset.index = String(i);
      btn.innerHTML = `
        <span class="quiz__option-marker" aria-hidden="true"></span>
        <span class="quiz__option-text">${opt.label}</span>
      `;
      if (state.answers[state.current] === i) btn.classList.add('is-selected');
      btn.addEventListener('click', () => selectOption(i));
      els.options.appendChild(btn);
    });

    els.back.disabled = state.current === 0;
    els.back.style.visibility = state.current === 0 ? 'hidden' : 'visible';
    els.hint.textContent = state.current === QUESTIONS.length - 1
      ? 'Pick one to see your archetype'
      : 'Pick one to continue';
  }

  function selectOption(index) {
    state.answers[state.current] = index;
    const buttons = els.options.querySelectorAll('.quiz__option');
    buttons.forEach((b, i) => {
      b.classList.toggle('is-selected', i === index);
      b.setAttribute('aria-checked', i === index ? 'true' : 'false');
    });

    setTimeout(() => {
      if (state.current < QUESTIONS.length - 1) {
        state.current += 1;
        renderQuestion();
      } else {
        finish();
      }
    }, 280);
  }

  function goBack() {
    if (state.current === 0) return;
    state.current -= 1;
    renderQuestion();
  }

  function tally() {
    state.scores = { V: 0, A: 0, C: 0, S: 0 };
    state.qual = { stage: null, goal: null, marketing_ready: null };
    state.answers.forEach((ansIdx, qIdx) => {
      if (ansIdx === null) return;
      const q = QUESTIONS[qIdx];
      const opt = q.options[ansIdx];
      // scores
      Object.entries(opt.weights).forEach(([k, v]) => { state.scores[k] += v; });
      // hidden qual
      if (q.qual && opt.qual) {
        state.qual[q.qual.type] = opt.qual;
      }
    });
  }

  function winner() {
    let best = 'V';
    let max = -1;
    Object.entries(state.scores).forEach(([k, v]) => {
      if (v > max) { max = v; best = k; }
    });
    return best;
  }

  // Determines if user qualifies for the Viralize Wave Call CTA.
  // Rules: must be (a) at a real-thing stage, (b) on a founder/operator track,
  //        AND (c) marketing-ready signal medium or high.
  //        Idea-stage / pure experimenter users do NOT see the call CTA.
  function qualifiesForViralizeCall(archetypeKey) {
    if (!ARCHETYPES[archetypeKey].viralizeFit) return false;
    const { stage, goal, marketing_ready } = state.qual;
    const realStage = (stage === 'traction' || stage === 'building' || stage === 'employed');
    const seriousGoal = (goal === 'founder_track' || goal === 'operator_track' || goal === 'creator_track');
    const ready = (marketing_ready === 'medium' || marketing_ready === 'high');
    return realStage && seriousGoal && ready;
  }

  // ============================
  // Apply archetype visuals: portrait img + OG/Twitter meta tags
  // Called by both finish() (real completion) and renderDeepLinkResult() (?result=)
  // ============================
  function applyArchetypeVisuals(key) {
    const arc = ARCHETYPES[key];
    if (!arc) return;

    // Portrait
    if (els.resultPortrait) {
      els.resultPortrait.src = arc.portrait;
      els.resultPortrait.alt = `Illustrated portrait — ${arc.name}`;
    }

    // Dynamic OG / Twitter meta (helps client-side-aware crawlers + shows correct preview on re-share)
    const shareTitle = `I'm ${arc.name} — ${arc.tag}`;
    const shareDesc = arc.power;
    // Use absolute URL for OG image so social scrapers can resolve it
    const absOg = new URL(arc.ogImage, window.location.href).href;
    if (els.ogImage) els.ogImage.setAttribute('content', absOg);
    if (els.ogTitle) els.ogTitle.setAttribute('content', shareTitle);
    if (els.ogDesc) els.ogDesc.setAttribute('content', shareDesc);
    if (els.twImage) els.twImage.setAttribute('content', absOg);
    if (els.twTitle) els.twTitle.setAttribute('content', shareTitle);
    if (els.twDesc) els.twDesc.setAttribute('content', shareDesc);
  }

  // ============================
  // Fire-and-forget anonymized distribution tracking
  // Captures: archetype + qual signals. NO phone, NO PII.
  // Powers the PR angle: 'X% of women in AI identify as Chaos Shippers' etc.
  // ============================
  function trackArchetype(key, source) {
    if (!TRACKING_ENDPOINT || TRACKING_ENDPOINT.indexOf('REPLACE_ME') !== -1) return;
    try {
      const payload = {
        archetype: key,
        archetype_name: ARCHETYPES[key] && ARCHETYPES[key].name,
        source: source || 'quiz_complete',  // 'quiz_complete' vs 'deep_link'
        stage: state.qual.stage || null,
        goal: state.qual.goal || null,
        marketing_ready: state.qual.marketing_ready || null,
        scores: state.scores,
        referrer: document.referrer || null,
        at: new Date().toISOString()
      };
      // Use sendBeacon if available (won't block / survives page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(TRACKING_ENDPOINT, blob);
      } else {
        fetch(TRACKING_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch (_) {}
  }

  function finish() {
    tally();
    const key = winner();
    const arc = ARCHETYPES[key];

    els.progressBar.style.width = '100%';
    applyArchetypeVisuals(key);
    els.resultName.textContent = arc.name;
    els.resultTag.textContent = arc.tag;
    els.resultDesc.textContent = arc.desc;
    els.resultGift.textContent = arc.gift;
    els.resultShadow.textContent = arc.shadow;
    els.resultPower.textContent = arc.power;

    // Lovable block — same affiliate URL for all, archetype-specific framing
    els.lovablePitch.textContent = arc.lovablePitch;
    els.lovableProject.textContent = arc.lovableProject;
    // Lovable referral URL — replace LOVABLE_REF_URL with your real affiliate link
    els.lovableCta.href = 'https://lovable.dev/?via=hotgirlvibecoding';

    // Community block — same for all
    els.communityCopy.textContent = arc.community;

    // Viralize gated CTA
    if (qualifiesForViralizeCall(key)) {
      els.viralizeBlock.hidden = false;
      els.viralizePitch.textContent = arc.viralizePitch;
    } else {
      els.viralizeBlock.hidden = true;
    }

    // Share URLs
    const shareUrl = window.location.origin + window.location.pathname + '?result=' + key;
    const tweet = `I'm ${arc.name} — ${arc.tag} 💅\n\nWhat kind of Hot Girl Vibe Coder are you?`;
    els.shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`;

    // Update URL without reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('result', key);
      window.history.replaceState({}, '', url);
    } catch (_) {}

    // Anonymized distribution tracking for PR angle
    trackArchetype(key, 'quiz_complete');

    show('result');
  }

  function restart() {
    state.current = 0;
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.scores = { V: 0, A: 0, C: 0, S: 0 };
    state.qual = { stage: null, goal: null, marketing_ready: null };
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('result');
      window.history.replaceState({}, '', url);
    } catch (_) {}
    renderQuestion();
    show('game');
  }

  // ============================
  // WHATSAPP / COMMUNITY CAPTURE
  // Submit phone to Formspree, then reveal the public group invite link.
  // ============================
  function handleWhatsapp(e) {
    e.preventDefault();
    const phone = (els.whatsappPhone.value || '').trim();
    // Loose validation — accepts +countrycode, parentheses, spaces, dashes
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      els.whatsappNote.textContent = "Hmm, that number doesn't look right. Try again?";
      els.whatsappNote.style.color = 'var(--color-primary)';
      return;
    }

    const submitBtn = els.whatsappForm.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const archetype = winner();
    const payload = {
      phone: phone,
      archetype: archetype,
      archetype_name: ARCHETYPES[archetype] && ARCHETYPES[archetype].name,
      stage: state.qual.stage || null,
      goal: state.qual.goal || null,
      marketing_ready: state.qual.marketing_ready || null,
      source: 'hgvc_quiz',
      at: new Date().toISOString()
    };

    // Always keep a local backup so nothing is ever lost
    try {
      const captured = JSON.parse(localStorage.getItem('hgvc_circle_signups') || '[]');
      captured.push(payload);
      localStorage.setItem('hgvc_circle_signups', JSON.stringify(captured));
    } catch (_) {}

    const revealInvite = () => {
      els.whatsappForm.hidden = true;
      els.whatsappSuccess.hidden = false;
      els.whatsappInvite.href = WHATSAPP_GROUP_INVITE;
      // Scroll the success block into view
      try { els.whatsappSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    };

    // If endpoint isn't wired yet, still reveal the invite (local backup is captured)
    if (!WHATSAPP_FORM_ENDPOINT || WHATSAPP_FORM_ENDPOINT.indexOf('REPLACE_ME') !== -1) {
      revealInvite();
      return;
    }

    fetch(WHATSAPP_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Network');
        revealInvite();
      })
      .catch(() => {
        // Still reveal the invite — we have the local backup, don't punish the user for a network blip
        revealInvite();
      });
  }

  // ============================
  // SHARE
  // ============================
  function copyLink() {
    const url = window.location.href;
    const reset = () => setTimeout(() => { els.shareCopy.textContent = 'Copy link'; }, 1800);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        els.shareCopy.textContent = 'Copied ✓';
        reset();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      els.shareCopy.textContent = 'Copied ✓';
      reset();
    }
  }

  // ============================
  // DEEP LINK RESULT (?result=V|A|C|S)
  // For shared links — shows result without scoring. Qual block hidden because
  // we have no signal from a deep-linked visitor.
  // ============================
  function renderDeepLinkResult(key) {
    const arc = ARCHETYPES[key];
    applyArchetypeVisuals(key);
    els.resultName.textContent = arc.name;
    els.resultTag.textContent = arc.tag;
    els.resultDesc.textContent = arc.desc;
    els.resultGift.textContent = arc.gift;
    els.resultShadow.textContent = arc.shadow;
    els.resultPower.textContent = arc.power;
    els.lovablePitch.textContent = arc.lovablePitch;
    els.lovableProject.textContent = arc.lovableProject;
    els.lovableCta.href = 'https://lovable.dev/?via=hotgirlvibecoding';
    els.communityCopy.textContent = arc.community;
    els.viralizeBlock.hidden = true;  // can't qualify without quiz data
    const shareUrl = window.location.href;
    const tweet = `I'm ${arc.name} — ${arc.tag} 💅\n\nWhat kind of Hot Girl Vibe Coder are you?`;
    els.shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`;
    els.progressBar.style.width = '100%';
    // Track deep-link views separately so we can distinguish viral reach from quiz takers
    trackArchetype(key, 'deep_link');
    show('result');
  }

  // ============================
  // INIT
  // ============================
  els.start.addEventListener('click', () => {
    renderQuestion();
    show('game');
  });
  els.back.addEventListener('click', goBack);
  els.restart.addEventListener('click', restart);
  els.whatsappForm.addEventListener('submit', handleWhatsapp);
  els.shareCopy.addEventListener('click', copyLink);

  const params = new URLSearchParams(window.location.search);
  const preset = params.get('result');
  if (preset && ARCHETYPES[preset]) {
    renderDeepLinkResult(preset);
  }
})();
