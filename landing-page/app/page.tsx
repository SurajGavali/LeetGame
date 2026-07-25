const githubUrl = "https://github.com/SurajGavali/LeetGame";

const challenges = [
  {
    number: "122",
    label: "Greedy",
    title: "Trade one day at a time.",
    copy: "See only the price a computer can see. Buy, sell, or wait—and discover why every uphill matters.",
    className: "challenge-card challenge-card--violet",
    visual: (
      <div className="mini-chart" aria-hidden="true">
        {[52, 18, 64, 38, 82, 47].map((height, index) => (
          <span
            key={height}
            className={index === 1 ? "is-buy" : index === 4 ? "is-sell" : ""}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    number: "007",
    label: "Math",
    title: "Reverse without seeing digits.",
    copy: "Extract, remove, and rebuild. Turn modulo and integer division into movements you can remember.",
    className: "challenge-card challenge-card--surface",
    visual: (
      <div className="digit-sequence" aria-hidden="true">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <b>→</b>
        <span className="digit-accent">3</span>
        <span className="digit-accent">2</span>
        <span className="digit-accent">1</span>
      </div>
    ),
  },
  {
    number: "NEXT",
    label: "Pointers",
    title: "Move like memory moves.",
    copy: "Traverse links, preserve references, and feel the exact order that keeps a data structure alive.",
    className: "challenge-card challenge-card--surface",
    visual: (
      <div className="node-track" aria-hidden="true">
        <span>7</span>
        <i />
        <span>12</span>
        <i />
        <span>4</span>
      </div>
    ),
  },
  {
    number: "ROADMAP",
    label: "The vision",
    title: "From arrays to graphs.",
    copy: "A growing playground for sliding windows, recursion, trees, heaps, dynamic programming, and beyond.",
    className: "challenge-card challenge-card--orange",
    visual: (
      <div className="roadmap-visual" aria-hidden="true">
        <span>Arrays</span>
        <span>Pointers</span>
        <span>Trees</span>
        <span>DP</span>
      </div>
    ),
  },
];

const principles = [
  {
    step: "01",
    title: "The interface removes shortcuts.",
    copy: "No omniscient view. You work with the same local information and limited operations an algorithm has.",
  },
  {
    step: "02",
    title: "Every action changes state.",
    copy: "Reads, writes, shifts, pointer moves, and stack operations become visible, deliberate decisions.",
  },
  {
    step: "03",
    title: "Efficiency becomes a score.",
    copy: "Your result earns the win. Your move count reveals whether you found the algorithmic pattern.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="LeetGame home">
          <span className="brand-mark" aria-hidden="true">
            <img src="/leetgame-symbol.svg" alt="" />
          </span>
          <span>LeetGame</span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#why">Why it works</a>
          <a href="#challenges">Challenges</a>
          <a href="#roadmap">Roadmap</a>
        </nav>

        <div className="header-actions">
          <a
            className="button button-secondary desktop-github"
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a className="button button-primary" href="#experience">
            Try the concept
          </a>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">Menu</summary>
            <nav aria-label="Mobile navigation">
              <a href="#why">Why it works</a>
              <a href="#challenges">Challenges</a>
              <a href="#roadmap">Roadmap</a>
              <a href={githubUrl}>GitHub</a>
            </nav>
          </details>
        </div>
      </header>

      <section className="hero section-shell" id="top">
        <p className="eyebrow">A new way to learn data structures &amp; algorithms</p>
        <h1>
          Don&apos;t just solve it.
          <br />
          <span>Feel how it works.</span>
        </h1>
        <div className="hero-bottom">
          <p className="hero-copy">
            LeetGame turns interview problems into tactile puzzles—so you learn
            to think in states, steps, and constraints before you write a line
            of code.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="#experience">
              Enter the playground
              <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#why">
              See how it teaches <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <section className="experience section-shell" id="experience">
        <div className="product-frame">
          <div className="product-toolbar">
            <div className="traffic-lights" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="product-title">
              <span className="status-dot" />
              Challenge #122 · Stock Trading
            </div>
            <span className="toolbar-meta">CASE 01</span>
          </div>

          <div className="game-preview">
            <div className="game-copy">
              <span className="game-kicker">Think like a computer</span>
              <h2>You can only see today.</h2>
              <p>
                The future is hidden. Read one price, update your state, and
                decide what the machine should do next.
              </p>
              <div className="state-readout">
                <div>
                  <span>DAY</span>
                  <strong>02 / 06</strong>
                </div>
                <div>
                  <span>PRICE</span>
                  <strong>$1</strong>
                </div>
                <div>
                  <span>STATE</span>
                  <strong>Cash</strong>
                </div>
              </div>
            </div>

            <div className="game-board" aria-label="Stock challenge preview">
              <div className="chart-grid" aria-hidden="true">
                {[72, 16, 40, 40, 40, 40].map((height, index) => (
                  <div className="bar-slot" key={`${height}-${index}`}>
                    <span className={index === 1 ? "bar-current" : index > 1 ? "bar-hidden" : ""} style={{ height: `${height}%` }} />
                    <small>D{index + 1}</small>
                  </div>
                ))}
              </div>
              <div className="move-row">
                <button type="button" className="move-button move-button--buy">
                  <span>↗</span> Buy
                </button>
                <button type="button" className="move-button" disabled>
                  <span>↘</span> Sell
                </button>
                <button type="button" className="move-button">
                  <span>→</span> Skip
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="experience-note">
          A product preview based on the working Flutter prototype.
          <span> No code editor. No syntax anxiety.</span>
        </p>
      </section>

      <section className="manifesto section-shell" id="why">
        <p className="eyebrow">The learning gap</p>
        <h2>
          Humans see the answer.
          <br />
          Computers earn it.
        </h2>
        <div className="manifesto-copy">
          <p>
            On a small array, your eyes can spot the maximum instantly. A
            computer cannot. It must read, compare, remember, and move—one
            operation at a time.
          </p>
          <p>
            LeetGame removes the visual shortcuts and makes algorithmic
            constraints physical. The abstract becomes a sequence you can feel.
          </p>
        </div>
      </section>

      <section className="principles section-shell" aria-label="How LeetGame teaches">
        {principles.map((principle) => (
          <article className="principle-row" key={principle.step}>
            <span className="principle-step">{principle.step}</span>
            <h3>{principle.title}</h3>
            <p>{principle.copy}</p>
          </article>
        ))}
      </section>

      <section className="challenge-showcase section-shell" id="challenges">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inside the playground</p>
            <h2>Algorithms become objects.</h2>
          </div>
          <p>
            Each challenge translates an invisible machine operation into a
            focused, constraint-driven interaction.
          </p>
        </div>

        <div className="challenge-grid">
          {challenges.map((challenge) => (
            <article className={challenge.className} key={challenge.number}>
              <div className="challenge-meta">
                <span>{challenge.label}</span>
                <span>{challenge.number}</span>
              </div>
              {challenge.visual}
              <div className="challenge-copy">
                <h3>{challenge.title}</h3>
                <p>{challenge.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="score-band section-shell">
        <div>
          <span className="score-number">3×</span>
          <p>operations per digit in Reverse Integer</p>
        </div>
        <div>
          <span className="score-number">1</span>
          <p>machine-visible decision at a time</p>
        </div>
        <div>
          <span className="score-number">∞</span>
          <p>patterns waiting to become playable</p>
        </div>
      </section>

      <section className="roadmap section-shell" id="roadmap">
        <div className="roadmap-card">
          <div className="roadmap-copy">
            <p className="eyebrow">Built for the full interview journey</p>
            <h2>Start with motion. End with mastery.</h2>
            <p>
              The prototype begins with greedy decisions and digit mechanics.
              The roadmap expands into arrays, pointers, sliding windows,
              recursion, trees, heaps, graphs, and dynamic programming.
            </p>
            <a
              className="button button-translucent"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              Follow the build on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="skill-tree" aria-label="LeetGame learning roadmap">
            <span className="skill-node skill-node--active">Foundations</span>
            <i />
            <div>
              <span className="skill-node">Arrays</span>
              <span className="skill-node">Pointers</span>
            </div>
            <i />
            <div>
              <span className="skill-node">Patterns</span>
              <span className="skill-node">Recursion</span>
            </div>
            <i />
            <span className="skill-node skill-node--final">Mastery</span>
          </div>
        </div>
      </section>

      <section className="faq section-shell">
        <div className="faq-heading">
          <p className="eyebrow">Questions, answered</p>
          <h2>Before you press play.</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>
              Is LeetGame another code editor?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              No. It is the layer before code: an interactive environment where
              you perform the algorithm&apos;s operations and build the right
              mental model first.
            </p>
          </details>
          <details>
            <summary>
              Who is it designed for?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Students and early-career developers preparing for technical
              interviews, especially anyone who understands a solution only
              after tracing it by hand.
            </p>
          </details>
          <details>
            <summary>
              Is there a working prototype?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Yes. The Flutter prototype currently includes Stock Trading II
              and Reverse Integer, with persistent XP, levels, and star scores.
            </p>
          </details>
          <details>
            <summary>
              What comes next?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              More challenge engines, accurate complexity-based scoring,
              structured learning paths, spaced repetition, and a stronger
              bridge from physical actions to production code.
            </p>
          </details>
        </div>
      </section>

      <section className="final-cta section-shell">
        <div>
          <p className="eyebrow">LeetGame is just getting started</p>
          <h2>Think less like a spectator.</h2>
          <h2 className="muted-line">Think more like a machine.</h2>
        </div>
        <a
          className="button button-primary button-large"
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
        >
          Explore the project <span aria-hidden="true">↗</span>
        </a>
      </section>

      <footer className="footer section-shell">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            <img src="/leetgame-symbol.svg" alt="" />
          </span>
          <span>LeetGame</span>
        </a>
        <p>Making algorithms tangible, one operation at a time.</p>
        <div className="footer-links">
          <a href="#why">Why it works</a>
          <a href="#challenges">Challenges</a>
          <a href="#roadmap">Roadmap</a>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
        <span className="copyright">© 2026 LeetGame</span>
      </footer>
    </main>
  );
}
