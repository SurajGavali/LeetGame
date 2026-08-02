import { ConceptWalkthrough } from "./concept-walkthrough";

const githubUrl = "https://github.com/SurajGavali/LeetGame";

const challenges = [
  {
    number: "07",
    label: "Search",
    title: "Warehouse Hunt",
    copy: "Track down one parcel across sorted shelves before dispatch closes. The winning route unlocks a strategy built for instant search.",
    className: "challenge-card challenge-card--violet",
    visual: (
      <div className="node-track" aria-hidden="true">
        <span>118</span>
        <i />
        <span>742</span>
        <i />
        <span>980</span>
      </div>
    ),
  },
  {
    number: "BFS",
    label: "Graphs",
    title: "Courier Rescue",
    copy: "Route a courier through blocked streets and reach every urgent stop. The rescue uncovers a repeatable way to explore every route.",
    className: "challenge-card challenge-card--surface",
    visual: (
      <div className="roadmap-visual" aria-hidden="true">
        <span>Depot</span>
        <span>A3</span>
        <span>B7</span>
        <span>Rescue</span>
      </div>
    ),
  },
  {
    number: "FIFO",
    label: "Queues",
    title: "Kitchen Queue",
    copy: "Keep a rush-hour kitchen moving without losing an order. The service rhythm unlocks the rule behind fair, ordered work.",
    className: "challenge-card challenge-card--surface",
    visual: (
      <div className="digit-sequence" aria-hidden="true">
        <span>01</span>
        <span>02</span>
        <span>03</span>
        <b>→</b>
        <span className="digit-accent">GO</span>
      </div>
    ),
  },
  {
    number: "122",
    label: "Greedy",
    title: "Market Replay",
    copy: "Trade with tomorrow hidden, then replay the choices that created the strongest result and uncover the decision pattern.",
    className: "challenge-card challenge-card--orange",
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
];

const principles = [
  {
    step: "01",
    title: "Start inside a real mission.",
    copy: "A warehouse, street map, kitchen, or market gives every decision a purpose before technical language appears.",
  },
  {
    step: "02",
    title: "Reveal the strategy you discovered.",
    copy: "After the win, LeetGame replays your choices, exposes the pattern, and gives the strategy its algorithmic name.",
  },
  {
    step: "03",
    title: "Carry the pattern into code.",
    copy: "The mission becomes state, invariants, operations, and complexity—principles you can implement in any language.",
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
          <a href="#challenges">Missions</a>
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
            Play a mission
          </a>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">Menu</summary>
            <nav aria-label="Mobile navigation">
              <a href="#why">Why it works</a>
              <a href="#challenges">Missions</a>
              <a href="#roadmap">Roadmap</a>
              <a href={githubUrl}>GitHub</a>
            </nav>
          </details>
        </div>
      </header>

      <section className="hero section-shell" id="top">
        <p className="eyebrow">Real missions. Hidden algorithms. Transferable code.</p>
        <h1>
          Play the problem.
          <br />
          <span>Code the pattern.</span>
        </h1>
        <div className="hero-bottom">
          <p className="hero-copy">
            LeetGame puts you inside fast, real-world missions. Make the
            decisions, win the level, reveal the algorithm, and carry its
            principles into code.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="#experience">
              Play Warehouse Hunt
              <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#why">
              See the learning loop <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <section className="experience section-shell" id="experience">
        <ConceptWalkthrough />
        <p className="experience-note">
          No lecture before the win.
          <span> Play first. Reveal the strategy. Then connect it to code.</span>
        </p>
      </section>

      <section className="manifesto section-shell" id="why">
        <p className="eyebrow">The learning loop</p>
        <h2>
          Mission first. Strategy second.
          <br />
          Code that lasts.
        </h2>
        <div className="manifesto-copy">
          <p>
            A concrete mission creates the need to search, route, queue, or
            optimize. You learn through decisions and consequences before a
            definition can turn the lesson abstract.
          </p>
          <p>
            Once you win, LeetGame replays the path you discovered, names the
            algorithm behind it, and translates the same pattern into code-ready
            principles.
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
            <p className="eyebrow">The mission library</p>
            <h2>Every algorithm starts as a world.</h2>
          </div>
          <p>
            Search a warehouse, rescue a courier, run a kitchen, or replay a
            market. The strategy is waiting inside the mission—not above it in
            a lecture.
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
          <span className="score-number">01</span>
          <p>real mission before any explanation</p>
        </div>
        <div>
          <span className="score-number">03</span>
          <p>beats in every lesson: play, reveal, code</p>
        </div>
        <div>
          <span className="score-number">∞</span>
          <p>algorithms waiting to become worlds</p>
        </div>
      </section>

      <section className="roadmap section-shell" id="roadmap">
        <div className="roadmap-card">
          <div className="roadmap-copy">
            <p className="eyebrow">Built for transfer</p>
            <h2>Win the world. Name the pattern. Write the code.</h2>
            <p>
              Warehouse Hunt begins the path with sorted search. Future missions
              turn queues, graphs, greedy choices, recursion, trees, heaps, and
              dynamic programming into the same repeatable loop: play, reveal,
              reason, code.
            </p>
            <a
              className="button button-translucent"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              Follow the missions on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="skill-tree" aria-label="LeetGame learning roadmap">
            <span className="skill-node skill-node--active">Play</span>
            <i />
            <div>
              <span className="skill-node">Reveal</span>
              <span className="skill-node">Reason</span>
            </div>
            <i />
            <div>
              <span className="skill-node">Code</span>
              <span className="skill-node">Optimize</span>
            </div>
            <i />
            <span className="skill-node skill-node--final">Transfer</span>
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
              No. The mission comes first, the strategy reveal comes after the
              win, and code is the final transfer step. LeetGame builds the
              mental model that makes an editor useful.
            </p>
          </details>
          <details>
            <summary>
              Do I need to know the algorithm first?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              No. There is no lecture before the win. Each mission gives you a
              goal, clear actions, and immediate feedback so you can discover
              the useful strategy before LeetGame names it.
            </p>
          </details>
          <details>
            <summary>
              What happens after I complete a mission?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Bit replays the decisive moments, shows why the strategy worked,
              introduces the algorithmic vocabulary, and connects each move to
              state, invariants, complexity, and implementation.
            </p>
          </details>
          <details>
            <summary>
              Which worlds are on the roadmap?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Warehouse Hunt leads with sorted search. Courier Rescue explores
              graphs, Kitchen Queue makes FIFO behavior physical, and Market
              Replay turns hidden information into a greedy decision game.
            </p>
          </details>
          <details>
            <summary>
              Does this replace coding practice?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              No. It makes coding practice transfer better. You leave each
              mission with a strategy you have already used, language-neutral
              principles, and a clearer reason for every line you write.
            </p>
          </details>
        </div>
      </section>

      <section className="final-cta section-shell">
        <div>
          <p className="eyebrow">Your first shift is ready</p>
          <h2>Play it before someone explains it.</h2>
          <h2 className="muted-line">Reveal it. Reason about it. Code it.</h2>
        </div>
        <a
          className="button button-primary button-large"
          href="#experience"
        >
          Start Warehouse Hunt <span aria-hidden="true">↑</span>
        </a>
      </section>

      <footer className="footer section-shell">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            <img src="/leetgame-symbol.svg" alt="" />
          </span>
          <span>LeetGame</span>
        </a>
        <p>Play the problem. Reveal the strategy. Code the pattern.</p>
        <div className="footer-links">
          <a href="#why">Why it works</a>
          <a href="#challenges">Missions</a>
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
