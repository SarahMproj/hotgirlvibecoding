// HGVC ARCHETYPE QUIZ
(function () {
  'use strict';

  // ============================
  // DATA
  // ============================
  // Each option contributes points to one or more archetypes.
  // Archetypes: V = Visionary Founder, A = Aesthetic Engineer,
  //             C = Chaos Shipper, S = Strategist
  const QUESTIONS = [
    {
      q: "It's 9pm on build night. You've just walked in. What's the first thing you do?",
      options: [
        { label: "Find the coffee, scan the room, identify the most interesting humans", weights: { V: 2, S: 1 } },
        { label: "Open a blank doc and start sketching the vision", weights: { V: 2, A: 1 } },
        { label: "Set up my workspace — playlist, snacks, lighting, vibes", weights: { A: 2 } },
        { label: "Skip setup. Open Cursor. Start typing immediately", weights: { C: 2 } }
      ]
    },
    {
      q: "Your idea machine is running. Where does it usually start?",
      options: [
        { label: "A problem I keep complaining about with my friends", weights: { V: 2, S: 1 } },
        { label: "Something I saw that was almost perfect — but uglier than it should be", weights: { A: 2 } },
        { label: "A 2am voice memo I sent myself that I can barely understand", weights: { C: 2, V: 1 } },
        { label: "A market gap I've been quietly tracking for months", weights: { S: 2 } }
      ]
    },
    {
      q: "How do you actually feel about code?",
      options: [
        { label: "It's a means to an end. Ship the vision.", weights: { V: 2, C: 1 } },
        { label: "It's a material. I care how it looks and feels.", weights: { A: 2 } },
        { label: "It's a puzzle I love losing sleep over", weights: { C: 2 } },
        { label: "It's leverage. The real work is what we build with it.", weights: { S: 2, V: 1 } }
      ]
    },
    {
      q: "Pick your AI sidekick energy:",
      options: [
        { label: "Claude — the thoughtful collaborator", weights: { S: 2, V: 1 } },
        { label: "Cursor — agentic and unhinged in the best way", weights: { C: 2 } },
        { label: "v0 / Lovable — make it pretty, make it now", weights: { A: 2 } },
        { label: "ChatGPT — the OG, still the workhorse", weights: { V: 1, S: 1, C: 1, A: 1 } }
      ]
    },
    {
      q: "You hit a wall at 1am. What happens?",
      options: [
        { label: "Pitch the wall to someone. Talking it out = solving it", weights: { V: 2 } },
        { label: "Redesign around it. The constraint is the feature now", weights: { A: 2, S: 1 } },
        { label: "Stack three more AI tools on top until it works", weights: { C: 2 } },
        { label: "Walk away, sketch the architecture on paper, come back", weights: { S: 2 } }
      ]
    },
    {
      q: "Your demo is in 30 minutes. The thing is 70% done. You:",
      options: [
        { label: "Polish the story. The narrative carries the demo", weights: { V: 2 } },
        { label: "Polish the UI. First impression is everything", weights: { A: 2 } },
        { label: "Push one more feature live. Live dangerously", weights: { C: 2 } },
        { label: "Cut scope to what works flawlessly. Show less, win more", weights: { S: 2 } }
      ]
    },
    {
      q: "Be honest — what do you secretly want from the night?",
      options: [
        { label: "A cofounder. Or at least someone who gets it", weights: { V: 2, S: 1 } },
        { label: "A product I'm genuinely proud to screenshot", weights: { A: 2 } },
        { label: "Proof I can ship the thing that lives in my head", weights: { C: 2, V: 1 } },
        { label: "The next move for something I'm already building", weights: { S: 2 } }
      ]
    },
    {
      q: "Your dream outcome by morning:",
      options: [
        { label: "Pitch deck + landing page + 3 warm intros lined up", weights: { V: 2, S: 1 } },
        { label: "A live site so beautiful I keep refreshing it", weights: { A: 2 } },
        { label: "A working prototype that does the thing — somehow", weights: { C: 2 } },
        { label: "A real plan for what I ship in the next 30 days", weights: { S: 2 } }
      ]
    }
  ];

  const ARCHETYPES = {
    V: {
      name: "The Visionary Founder",
      tag: "You don't build features. You build futures.",
      desc: "You walk in with a story, leave with a team. You're the one who can describe a product so clearly that other people start building it for you. Vibe coding isn't your end goal — it's the way you finally get the thing out of your head and into the world.",
      power: "Magnetic clarity. You make people believe.",
      build: "A landing page + waitlist for the company you've been describing at every dinner.",
      people: "Operators, designers, and at least one person who'll say yes when you ask them to quit their job."
    },
    A: {
      name: "The Aesthetic Engineer",
      tag: "If it's not beautiful, it's not shipped.",
      desc: "You believe taste is a feature. Your products feel different the second someone opens them — the spacing, the type, the micro-interactions. Vibe coding gives you the speed to match your standards, which is finally letting you ship as fast as you can design.",
      power: "Taste at velocity. You make tools people want to touch.",
      build: "A jaw-dropping single-page product — portfolio, mood board, micro-SaaS — that looks like it has a Series A.",
      people: "Other designers who code, frontend nerds, and the person who will hype your screenshots."
    },
    C: {
      name: "The Chaos Shipper",
      tag: "Done is hotter than perfect.",
      desc: "You ship. You break. You ship again. While other people are still wireframing, you've already deployed three things, killed two of them, and accidentally invented the fourth. Vibe coding was made for you — you were doing this energy before it had a name.",
      power: "Velocity. You finish things other people only talk about.",
      build: "Three small tools in one night — pick the one that gets the loudest reaction and double down.",
      people: "Other shippers, hackers, the friends who'll DM you 'WAIT this is real?' at 2am."
    },
    S: {
      name: "The Strategist",
      tag: "Every line of code is a chess move.",
      desc: "You don't build to build. You build because you saw the angle nobody else did. You're the one quietly mapping the market while everyone else is fighting over the hype. Vibe coding lets you test a thesis in hours instead of months — and that changes the game.",
      power: "Pattern recognition. You see the move three steps ahead.",
      build: "A working prototype of the thesis you've been sitting on — proof, not theater.",
      people: "Founders 6 months ahead of you, the investor who'll get it, the friend who'll tell you the truth."
    }
  };

  // ============================
  // STATE
  // ============================
  const state = {
    current: 0,
    answers: new Array(QUESTIONS.length).fill(null),
    scores: { V: 0, A: 0, C: 0, S: 0 }
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

  const els = {
    start: document.getElementById('quizStart'),
    step: document.getElementById('quizStep'),
    question: document.getElementById('quizQuestion'),
    options: document.getElementById('quizOptions'),
    back: document.getElementById('quizBack'),
    hint: document.getElementById('quizHint'),
    progressBar: document.getElementById('quizProgressBar'),
    resultName: document.getElementById('resultName'),
    resultTag: document.getElementById('resultTag'),
    resultDesc: document.getElementById('resultDesc'),
    resultPower: document.getElementById('resultPower'),
    resultBuild: document.getElementById('resultBuild'),
    resultPeople: document.getElementById('resultPeople'),
    restart: document.getElementById('quizRestart'),
    optin: document.getElementById('quizOptin'),
    email: document.getElementById('quizEmail'),
    optinNote: document.getElementById('quizOptinNote'),
    shareTwitter: document.getElementById('shareTwitter'),
    shareCopy: document.getElementById('shareCopy')
  };

  // ============================
  // RENDER
  // ============================
  function show(screenName) {
    Object.entries(screens).forEach(([name, el]) => {
      if (!el) return;
      if (name === screenName) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
    root.dataset.state = screenName;
    // Scroll quiz into view at top
    const top = root.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function renderQuestion() {
    const q = QUESTIONS[state.current];
    els.step.textContent = `Question ${state.current + 1} of ${QUESTIONS.length}`;
    els.question.textContent = q.q;

    const pct = ((state.current) / QUESTIONS.length) * 100;
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
      ? 'Pick one to see your result'
      : 'Pick one to continue';
  }

  function selectOption(index) {
    state.answers[state.current] = index;
    // Visual flash
    const buttons = els.options.querySelectorAll('.quiz__option');
    buttons.forEach((b, i) => {
      b.classList.toggle('is-selected', i === index);
      b.setAttribute('aria-checked', i === index ? 'true' : 'false');
    });

    // Auto-advance after brief delay
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

  function tallyScores() {
    state.scores = { V: 0, A: 0, C: 0, S: 0 };
    state.answers.forEach((ansIdx, qIdx) => {
      if (ansIdx === null) return;
      const w = QUESTIONS[qIdx].options[ansIdx].weights;
      Object.entries(w).forEach(([k, v]) => { state.scores[k] += v; });
    });
  }

  function winner() {
    tallyScores();
    let best = 'V';
    let max = -1;
    Object.entries(state.scores).forEach(([k, v]) => {
      if (v > max) { max = v; best = k; }
    });
    return best;
  }

  function finish() {
    const key = winner();
    const arc = ARCHETYPES[key];

    els.progressBar.style.width = '100%';
    els.resultName.textContent = arc.name;
    els.resultTag.textContent = arc.tag;
    els.resultDesc.textContent = arc.desc;
    els.resultPower.textContent = arc.power;
    els.resultBuild.textContent = arc.build;
    els.resultPeople.textContent = arc.people;

    // Share URLs
    const shareUrl = window.location.origin + window.location.pathname + '?result=' + key;
    const tweet = `I'm ${arc.name} — ${arc.tag} 💅\n\nWhat kind of Hot Girl Vibe Coder are you?`;
    els.shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`;

    // Update URL without reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('result', key);
      window.history.replaceState({}, '', url);
    } catch (_) { /* no-op */ }

    show('result');
  }

  function restart() {
    state.current = 0;
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.scores = { V: 0, A: 0, C: 0, S: 0 };
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('result');
      window.history.replaceState({}, '', url);
    } catch (_) {}
    renderQuestion();
    show('game');
  }

  // ============================
  // EMAIL OPT-IN (client-side stub)
  // ============================
  function handleOptin(e) {
    e.preventDefault();
    const email = (els.email.value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      els.optinNote.textContent = 'Hmm, that email doesn\'t look right. Try again?';
      els.optinNote.style.color = 'var(--color-primary)';
      return;
    }

    // Store locally; replace with real endpoint (Formspree, Resend, etc.) when ready.
    try {
      const captured = JSON.parse(localStorage.getItem('hgvc_optins') || '[]');
      captured.push({ email, archetype: winner(), at: new Date().toISOString() });
      localStorage.setItem('hgvc_optins', JSON.stringify(captured));
    } catch (_) {}

    els.optin.classList.add('is-submitted');
    els.optinNote.textContent = "You're in. Watch your inbox.";
    els.optinNote.style.color = 'var(--color-gold)';
    els.email.disabled = true;
    els.optin.querySelector('button[type="submit"]').disabled = true;
    els.optin.querySelector('button[type="submit"]').textContent = 'Sent ✓';
  }

  // ============================
  // SHARE
  // ============================
  function copyLink() {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        els.shareCopy.textContent = 'Copied ✓';
        setTimeout(() => { els.shareCopy.textContent = 'Copy link'; }, 1800);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      els.shareCopy.textContent = 'Copied ✓';
      setTimeout(() => { els.shareCopy.textContent = 'Copy link'; }, 1800);
    }
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
  els.optin.addEventListener('submit', handleOptin);
  els.shareCopy.addEventListener('click', copyLink);

  // Deep-link: ?result=V|A|C|S shows that result directly
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('result');
  if (preset && ARCHETYPES[preset]) {
    // Fill in result without scoring
    const arc = ARCHETYPES[preset];
    els.resultName.textContent = arc.name;
    els.resultTag.textContent = arc.tag;
    els.resultDesc.textContent = arc.desc;
    els.resultPower.textContent = arc.power;
    els.resultBuild.textContent = arc.build;
    els.resultPeople.textContent = arc.people;
    const shareUrl = window.location.href;
    const tweet = `I'm ${arc.name} — ${arc.tag} 💅\n\nWhat kind of Hot Girl Vibe Coder are you?`;
    els.shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`;
    els.progressBar.style.width = '100%';
    show('result');
  }
})();
