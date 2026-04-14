// Simple study guide — come back here when stuck
function viewGuide() {
  app.innerHTML = `
    <button class="drill-back" id="guide-back">← Tools</button>
    <h1 class="page-title" style="margin-bottom:4px">How to Study</h1>
    <p class="page-subtitle">Come back here when you feel stuck</p>

    <div class="guide">
      <section class="guide-section">
        <h2>The learning loop</h2>
        <p>Every word goes through 3 stages. Most learners plateau at stage 1 because recognition <em>feels</em> like progress.</p>
        <ol class="guide-stages">
          <li>
            <span class="stage-num">1</span>
            <div>
              <strong>Recognize</strong> — you see 老师, know it means "teacher"
              <div class="guide-tool">→ Use <strong>Words tab</strong>, <strong>Word Spotter</strong></div>
            </div>
          </li>
          <li>
            <span class="stage-num">2</span>
            <div>
              <strong>Recall</strong> — you see "teacher", produce 老师 · lǎoshī
              <div class="guide-tool">→ Use <strong>Type It</strong>, <strong>Dictation</strong></div>
              <div class="guide-note">Recall is 10× harder than recognition. <strong>This is where real learning happens.</strong></div>
            </div>
          </li>
          <li>
            <span class="stage-num">3</span>
            <div>
              <strong>Produce</strong> — you use 老师 naturally in a sentence
              <div class="guide-tool">→ Use your tutor sessions, speak out loud</div>
            </div>
          </li>
        </ol>
      </section>

      <section class="guide-section">
        <h2>Daily drills by energy level</h2>
        <p class="guide-hint">Pick the routine that matches how you feel today. Consistency beats intensity.</p>

        <div class="routine-block">
          <div class="routine-head">
            <span class="routine-time">15 min</span>
            <span class="routine-mood">🪫 Low energy · keep the streak</span>
          </div>
          <table class="guide-table">
            <tr><td>2 min</td><td>Open <strong>Words</strong> tab → tap ▶ on 5-10 words (passive listening)</td></tr>
            <tr><td>8 min</td><td><strong>Dictation</strong> (1 session, 5 words) — pick a familiar pack from <strong>Packs</strong></td></tr>
            <tr><td>5 min</td><td><strong>Word Spotter</strong> (1 session, easy fonts only) — pattern practice</td></tr>
          </table>
        </div>

        <div class="routine-block">
          <div class="routine-head">
            <span class="routine-time">30 min</span>
            <span class="routine-mood">🔋 Normal day · balanced session</span>
          </div>
          <table class="guide-table">
            <tr><td>3 min</td><td><strong>Words</strong> tab → scroll red/orange badges, tap ▶ to re-hear</td></tr>
            <tr><td>8 min</td><td><strong>Tone Ear</strong> or <strong>Tone Drill</strong> (Space = replay, 1-4 = answer)</td></tr>
            <tr><td>10 min</td><td><strong>Dictation</strong> on a new topic pack (2 sessions = 10 words)</td></tr>
            <tr><td>5 min</td><td><strong>Type It</strong> — recall from meaning → pinyin → character</td></tr>
            <tr><td>4 min</td><td><strong>Stroke Order</strong> — pick 3-4 new characters, watch + trace</td></tr>
          </table>
        </div>

        <div class="routine-block">
          <div class="routine-head">
            <span class="routine-time">60 min</span>
            <span class="routine-mood">⚡ High energy · push through</span>
          </div>
          <table class="guide-table">
            <tr><td>5 min</td><td>Warm-up: <strong>Minimal Pairs</strong> (n/ng, z/zh, x/sh)</td></tr>
            <tr><td>10 min</td><td><strong>Tone Drill</strong> — all 410 syllables, random voices</td></tr>
            <tr><td>10 min</td><td><strong>Syllable Build</strong> (initial + final + tone) — the hardest drill</td></tr>
            <tr><td>15 min</td><td><strong>Dictation</strong> × 3 sessions on 3 different packs (interleave)</td></tr>
            <tr><td>8 min</td><td><strong>Word Spotter</strong> with medium/hard fonts enabled</td></tr>
            <tr><td>8 min</td><td><strong>Type It</strong> recall drills (focus on red-badge words)</td></tr>
            <tr><td>4 min</td><td><strong>Stroke Order</strong> trace mode on 2-3 tricky characters</td></tr>
          </table>
        </div>

        <div class="routine-block routine-tutor">
          <div class="routine-head">
            <span class="routine-time">Tutor day</span>
            <span class="routine-mood">🎓 Before Barbora's lesson</span>
          </div>
          <table class="guide-table">
            <tr><td>10 min</td><td><strong>Packs</strong> → scroll to <strong>Tutor Lessons</strong> → open the lesson she'll cover</td></tr>
            <tr><td>10 min</td><td>In that sheet: tap <strong>🎧 Practice Dictation with this pack</strong></td></tr>
            <tr><td>5 min</td><td>Repeat Dictation on the same pack until ≥80% score</td></tr>
          </table>
        </div>

        <div class="routine-block routine-stuck">
          <div class="routine-head">
            <span class="routine-time">5 min</span>
            <span class="routine-mood">😴 Barely any energy · just show up</span>
          </div>
          <table class="guide-table">
            <tr><td>5 min</td><td>Open <strong>Words</strong> tab, tap ▶ on 10 words. No quiz, no pressure. Just exposure.</td></tr>
          </table>
        </div>
      </section>

      <section class="guide-section">
        <h2>Weekly rhythm</h2>
        <table class="guide-table">
          <tr><td>Mon-Fri</td><td>15-30 min daily (pick by energy)</td></tr>
          <tr><td>Sat</td><td>60 min deep session + tutor prep if Sunday's your lesson</td></tr>
          <tr><td>Sun</td><td>Rest OR 5-min passive exposure only</td></tr>
        </table>
      </section>

      <section class="guide-section">
        <h2>Three rules that matter</h2>
        <ol class="guide-rules">
          <li><strong>Frequency &gt; duration</strong><div class="guide-note">15 min × 30 days beats 4 hours once. Sleep consolidates memory — more sleep cycles between sessions = better retention.</div></li>
          <li><strong>Desirable difficulty</strong><div class="guide-note">If recall feels easy, you're rehearsing, not learning. Dictation frustration <em>is</em> the learning.</div></li>
          <li><strong>Interleave topics</strong><div class="guide-note">Don't drill Numbers for 20 min. Do 5 min Numbers + 5 min Family + 5 min Verbs. Your brain learns the distinction, not just the items.</div></li>
        </ol>
      </section>

      <section class="guide-section">
        <h2>Which tool for what?</h2>
        <dl class="guide-dl">
          <dt>I can't hear the tones</dt>
          <dd>Tone Ear (HSK 1) → Tone Drill (all 410) when comfortable</dd>

          <dt>I confuse n/ng, z/zh, x/sh</dt>
          <dd>Minimal Pairs</dd>

          <dt>I can't remember word meanings</dt>
          <dd>Word Spotter · Words tab (tap ▶ to hear)</dd>

          <dt>I can't produce pinyin from memory</dt>
          <dd>Type It, Dictation</dd>

          <dt>My tutor tested me and I flopped</dt>
          <dd>Packs → Tutor Lessons → pick lesson → Practice Dictation</dd>

          <dt>I can read but can't write characters</dt>
          <dd>Stroke Order (watch + trace mode)</dd>

          <dt>Characters all look the same</dt>
          <dd>Radical Spotter, Stroke Order</dd>
        </dl>
      </section>

      <section class="guide-section">
        <h2>For dyslexia specifically</h2>
        <ul class="guide-list">
          <li>Say words <strong>out loud</strong> when drilling — audio-motor encoding beats visual-only</li>
          <li>Anchor words to <strong>Czech cognates or images</strong>, not just English</li>
          <li>Use Packs — your brain remembers clusters ("Family words") better than flat lists</li>
          <li>Trust the <strong>accuracy badges</strong>: red (&lt;50%) is your real study list</li>
          <li>Characters might feel <em>easier</em> than pinyin — visual-spatial plays to your strengths</li>
        </ul>
      </section>

      <section class="guide-section">
        <h2>Avoid</h2>
        <ul class="guide-list guide-avoid">
          <li>Rewatching drills you already pass (feels productive, teaches nothing)</li>
          <li>Adding new drills when old ones are still red — go narrower, not wider</li>
          <li>Studying when tired — encoding quality drops ~60%</li>
        </ul>
      </section>

      <section class="guide-section guide-goal">
        <h2>6-month goal</h2>
        <p>Read a simple picture book = ~250-300 characters at 80% accuracy.</p>
        <p><strong>Daily target:</strong> 1-2 new words + 10-15 reviews. Nothing more.</p>
      </section>
    </div>
  `;

  app.querySelector('#guide-back').addEventListener('click', backToTools);
}
