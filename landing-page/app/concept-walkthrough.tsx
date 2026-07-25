"use client";

import { useState } from "react";

const examplePrices = [7, 1, 5, 3, 6, 4];
const challengeRounds = [
  { prices: [8, 3, 6, 2, 7, 4], answer: 5 },
  { prices: [5, 2, 4, 1, 8, 3], answer: 7 },
  { prices: [9, 6, 4, 5, 3, 7], answer: 4 },
];

type MachinePhase = "minimum" | "profit" | "complete";

export function ConceptWalkthrough() {
  const [step, setStep] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [day, setDay] = useState(0);
  const [phase, setPhase] = useState<MachinePhase>("minimum");
  const [minimum, setMinimum] = useState(Number.POSITIVE_INFINITY);
  const [minimumDay, setMinimumDay] = useState<number | null>(null);
  const [bestProfit, setBestProfit] = useState(0);
  const [bestBuyDay, setBestBuyDay] = useState<number | null>(null);
  const [bestSellDay, setBestSellDay] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState(
    "Inspect today’s price. First, decide what belongs in minimum memory.",
  );

  const round = challengeRounds[roundIndex];
  const currentPrice = round.prices[day];
  const currentDifference = Number.isFinite(minimum)
    ? currentPrice - minimum
    : 0;
  const completedChecks =
    day * 2 + (phase === "profit" ? 1 : phase === "complete" ? 2 : 0);
  const totalChecks = round.prices.length * 2;
  const attempts = completedChecks + mistakes;
  const accuracy =
    attempts === 0 ? 100 : Math.round((completedChecks / attempts) * 100);

  function goTo(nextStep: number) {
    setStep(nextStep);
  }

  function resetMachine(nextRound = false) {
    if (nextRound) {
      setRoundIndex((currentRound) => {
        return (currentRound + 1) % challengeRounds.length;
      });
    }
    setDay(0);
    setPhase("minimum");
    setMinimum(Number.POSITIVE_INFINITY);
    setMinimumDay(null);
    setBestProfit(0);
    setBestBuyDay(null);
    setBestSellDay(null);
    setScore(0);
    setStreak(0);
    setMistakes(0);
    setMessage(
      "New hidden stream loaded. Decide what belongs in minimum memory.",
    );
  }

  function reward() {
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setScore((currentScore) => currentScore + 100 + (nextStreak - 1) * 20);
  }

  function miss(nextMessage: string) {
    setMistakes((currentMistakes) => currentMistakes + 1);
    setStreak(0);
    setMessage(nextMessage);
  }

  function chooseMinimum(replace: boolean) {
    if (phase !== "minimum") return;

    const shouldReplace = currentPrice < minimum;
    if (replace !== shouldReplace) {
      miss(
        shouldReplace
          ? `$${currentPrice} is lower than ${
              Number.isFinite(minimum) ? `$${minimum}` : "∞"
            }. The machine must replace its minimum.`
          : `$${minimum} is still lower than $${currentPrice}. Keep the existing minimum.`,
      );
      return;
    }

    reward();
    if (shouldReplace) {
      setMinimum(currentPrice);
      setMinimumDay(day);
      setMessage(
        `Minimum updated to $${currentPrice}. Now calculate today’s difference and compare it with best profit.`,
      );
    } else {
      setMessage(
        `Minimum stays $${minimum}. Now calculate $${currentPrice} − $${minimum} and compare it with best profit.`,
      );
    }
    setPhase("profit");
  }

  function chooseProfit(replace: boolean) {
    if (phase !== "profit") return;

    const shouldReplace = currentDifference > bestProfit;
    if (replace !== shouldReplace) {
      miss(
        shouldReplace
          ? `$${currentDifference} beats the stored best of $${bestProfit}. Replace best profit.`
          : `$${currentDifference} does not beat $${bestProfit}. Keep the existing best.`,
      );
      return;
    }

    reward();
    const nextBest = shouldReplace ? currentDifference : bestProfit;
    if (shouldReplace) {
      setBestProfit(currentDifference);
      setBestBuyDay(minimumDay);
      setBestSellDay(day);
    }

    if (day === round.prices.length - 1) {
      setPhase("complete");
      setMessage(
        `Scan complete. Bit visited every price once and returned the optimal profit: $${nextBest}.`,
      );
      return;
    }

    setDay((currentDay) => currentDay + 1);
    setPhase("minimum");
    setMessage(
      `State locked. Bit advanced to day ${day + 2}; the next price is now visible.`,
    );
  }

  return (
    <div className="product-frame concept-frame">
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
        <span className="toolbar-meta">STEP {step + 1} / 03</span>
      </div>

      <div className="concept-progress" aria-label="Walkthrough progress">
        {["Problem", "Thinking", "Try it"].map((label, index) => (
          <button
            type="button"
            className={index === step ? "is-current" : ""}
            aria-current={index === step ? "step" : undefined}
            onClick={() => goTo(index)}
            key={label}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="concept-viewport">
        <div
          className="concept-track"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          <section
            className="concept-slide problem-slide"
            aria-hidden={step !== 0}
          >
            <div className="problem-copy">
              <div className="challenge-tags">
                <span>Easy</span>
                <span>Array · Greedy</span>
              </div>
              <p className="game-kicker">The interview problem</p>
              <h2>Best Time to Buy and Sell Stock</h2>
              <p>
                You are given six daily prices. Choose one day to buy and a
                later day to sell. Return the maximum profit. If no profitable
                trade exists, return zero.
              </p>
              <button
                type="button"
                className="button button-primary button-large concept-next"
                onClick={() => goTo(1)}
                tabIndex={step === 0 ? 0 : -1}
              >
                Solve it <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="problem-example">
              <span className="example-label">EXAMPLE 01</span>
              <div className="example-row">
                <span>Input</span>
                <code>prices = [7, 1, 5, 3, 6, 4]</code>
              </div>
              <div className="example-row">
                <span>Output</span>
                <code>5</code>
              </div>
              <div className="price-strip" aria-label="Prices by day">
                {examplePrices.map((price, index) => (
                  <div
                    className={
                      index === 1
                        ? "is-buy"
                        : index === 4
                          ? "is-sell"
                          : ""
                    }
                    key={`${price}-${index}`}
                  >
                    <small>D{index + 1}</small>
                    <strong>${price}</strong>
                  </div>
                ))}
              </div>
              <p>
                Buy on day 2 at <strong>$1</strong>. Sell on day 5 at{" "}
                <strong>$6</strong>. Profit: <strong>$5</strong>.
              </p>
            </div>
          </section>

          <section
            className="concept-slide thinking-slide"
            aria-hidden={step !== 1}
          >
            <div className="thinking-intro">
              <p className="game-kicker">The learning gap</p>
              <h2>Your eyes cheat. The machine cannot.</h2>
              <p>
                A human sees the entire chart and spots the low point and later
                high point instantly. A computer receives one value at a time.
                It must create the answer through memory and comparison.
              </p>
            </div>

            <div className="thinking-compare">
              <article className="thinking-card thinking-card--human">
                <div className="thinking-card-heading">
                  <span>HUMAN VIEW</span>
                  <strong>Sees the pattern</strong>
                </div>
                <div className="human-prices" aria-hidden="true">
                  {examplePrices.map((price, index) => (
                    <span
                      className={
                        index === 1
                          ? "is-buy"
                          : index === 4
                            ? "is-sell"
                            : ""
                      }
                      key={`${price}-${index}`}
                    >
                      {price}
                    </span>
                  ))}
                </div>
                <p>“That is the valley. That later point is the peak.”</p>
              </article>

              <article className="thinking-card thinking-card--machine">
                <div className="thinking-card-heading">
                  <span>MACHINE VIEW</span>
                  <strong>Builds the pattern</strong>
                </div>
                <div className="machine-state">
                  <div>
                    <span>currentPrice</span>
                    <strong>7</strong>
                  </div>
                  <div>
                    <span>minPrice</span>
                    <strong>∞</strong>
                  </div>
                  <div>
                    <span>bestProfit</span>
                    <strong>0</strong>
                  </div>
                </div>
                <p>Read → compare → remember → advance. Then repeat.</p>
              </article>
            </div>

            <div className="concept-slide-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => goTo(0)}
                tabIndex={step === 1 ? 0 : -1}
              >
                Back
              </button>
              <button
                type="button"
                className="button button-primary button-large"
                onClick={() => goTo(2)}
                tabIndex={step === 1 ? 0 : -1}
              >
                Think like the machine <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section
            className="concept-slide play-slide"
            aria-hidden={step !== 2}
          >
            <div className="game-copy machine-game-copy">
              <span className="game-kicker">Algorithm mode · future sealed</span>
              <h2>Become the loop.</h2>
              <p>
                No trading guesses. Make the exact two state decisions the
                one-pass solution makes. Bit moves only when your machine state
                is correct.
              </p>
              <div className="run-stats" aria-label="Current run statistics">
                <div>
                  <span>SCORE</span>
                  <strong>{score}</strong>
                </div>
                <div>
                  <span>STREAK</span>
                  <strong>{streak}×</strong>
                </div>
                <div>
                  <span>ACCURACY</span>
                  <strong>{accuracy}%</strong>
                </div>
              </div>
              <div className="run-progress" aria-label={`${completedChecks} of ${totalChecks} state checks complete`}>
                <span
                  style={{ width: `${(completedChecks / totalChecks) * 100}%` }}
                />
              </div>
              <p className="run-progress-label">
                {completedChecks} / {totalChecks} state checks
              </p>
              <button
                type="button"
                className="concept-back-link"
                onClick={() => goTo(1)}
                tabIndex={step === 2 ? 0 : -1}
              >
                ← Review the mental model
              </button>
            </div>

            <div className="game-board machine-board" aria-label="Playable one-pass algorithm challenge">
              <div className="runner-lane" aria-label={`Bit is processing day ${day + 1}`}>
                <div
                  className="bit-mascot"
                  style={{
                    left: `${((day + 0.5) / round.prices.length) * 100}%`,
                  }}
                >
                  <span className="bit-antenna" aria-hidden="true" />
                  <span className="bit-face" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                  <small>BIT</small>
                </div>
                <div className="day-track">
                  {round.prices.map((_, index) => (
                    <div
                      className={[
                        "day-node",
                        index < day ? "is-visited" : "",
                        index === day ? "is-current" : "",
                        index > day ? "is-locked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={`day-${index}`}
                    >
                      <small>DAY {index + 1}</small>
                      {index < day ? (
                        <span aria-label="Processed">✓</span>
                      ) : index === day ? (
                        <strong>${currentPrice}</strong>
                      ) : (
                        <span aria-label="Future price hidden">?</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="memory-rack" aria-label="Machine memory">
                <div className={phase === "minimum" ? "is-active" : ""}>
                  <span>MINIMUM</span>
                  <strong>{Number.isFinite(minimum) ? `$${minimum}` : "∞"}</strong>
                </div>
                <div className={phase === "profit" ? "is-active" : ""}>
                  <span>DIFFERENCE</span>
                  <strong>
                    {phase === "profit" || phase === "complete"
                      ? `$${currentDifference}`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>BEST PROFIT</span>
                  <strong>${bestProfit}</strong>
                </div>
              </div>

              {phase === "complete" ? (
                <div className="machine-complete">
                  <span className="decision-kicker">RUN COMPLETE · O(n)</span>
                  <h3>Bit found the optimum.</h3>
                  <p>
                    Buy day {bestBuyDay === null ? "—" : bestBuyDay + 1} at{" "}
                    <strong>
                      {bestBuyDay === null
                        ? "—"
                        : `$${round.prices[bestBuyDay]}`}
                    </strong>
                    , sell day{" "}
                    {bestSellDay === null ? "—" : bestSellDay + 1} at{" "}
                    <strong>
                      {bestSellDay === null
                        ? "—"
                        : `$${round.prices[bestSellDay]}`}
                    </strong>
                    .
                  </p>
                  <div className="completion-metrics">
                    <div>
                      <span>RETURN</span>
                      <strong>${bestProfit}</strong>
                    </div>
                    <div>
                      <span>EXPECTED</span>
                      <strong>${round.answer}</strong>
                    </div>
                    <div>
                      <span>ACCURACY</span>
                      <strong>{accuracy}%</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button button-primary button-large"
                    onClick={() => resetMachine(true)}
                    tabIndex={step === 2 ? 0 : -1}
                  >
                    Load a new hidden stream
                  </button>
                </div>
              ) : (
                <div className="decision-console">
                  {phase === "minimum" ? (
                    <>
                      <span className="decision-kicker">
                        CHECK 1 OF 2 · MINIMUM MEMORY
                      </span>
                      <h3>Is today&apos;s ${currentPrice} a new minimum?</h3>
                      <code>
                        ${currentPrice} &lt;{" "}
                        {Number.isFinite(minimum) ? `$${minimum}` : "∞"} ?
                      </code>
                      <div className="state-actions">
                        <button
                          type="button"
                          onClick={() => chooseMinimum(false)}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          <span>KEEP</span>
                          {Number.isFinite(minimum)
                            ? `Minimum $${minimum}`
                            : "Minimum ∞"}
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseMinimum(true)}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          <span>REPLACE</span>
                          Minimum ${currentPrice}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="decision-kicker">
                        CHECK 2 OF 2 · BEST PROFIT MEMORY
                      </span>
                      <h3>Does today&apos;s difference beat the best?</h3>
                      <code>
                        ${currentPrice} − ${minimum} = ${currentDifference}
                      </code>
                      <div className="state-actions">
                        <button
                          type="button"
                          onClick={() => chooseProfit(false)}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          <span>KEEP</span>
                          Best ${bestProfit}
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseProfit(true)}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          <span>REPLACE</span>
                          Best ${currentDifference}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <p className="game-message" role="status" aria-live="polite">
                {message}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
