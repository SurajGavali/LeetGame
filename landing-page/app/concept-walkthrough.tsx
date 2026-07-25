"use client";

import { useState } from "react";

const examplePrices = [7, 1, 5, 3, 6, 4];
const challengeRounds = [
  { prices: [8, 3, 6, 2, 7, 4], answer: 5 },
  { prices: [5, 2, 4, 1, 8, 3], answer: 7 },
  { prices: [9, 6, 4, 5, 3, 7], answer: 4 },
];
const mapPoints = [
  { x: 52, y: 7 },
  { x: 28, y: 23 },
  { x: 68, y: 39 },
  { x: 33, y: 55 },
  { x: 70, y: 71 },
  { x: 44, y: 87 },
];

type Verdict = "skip" | "update";

export function ConceptWalkthrough() {
  const [step, setStep] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [buyDay, setBuyDay] = useState(0);
  const [sellDay, setSellDay] = useState(1);
  const [bestProfit, setBestProfit] = useState(0);
  const [bestBuyDay, setBestBuyDay] = useState<number | null>(null);
  const [bestSellDay, setBestSellDay] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const [resolvedVerdict, setResolvedVerdict] = useState<Verdict | null>(null);
  const [complete, setComplete] = useState(false);
  const [comparisons, setComparisons] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState(
    "Bit bought on day 1. Check every later sell day, one at a time.",
  );

  const round = challengeRounds[roundIndex];
  const buyPrice = round.prices[buyDay];
  const sellPrice = round.prices[sellDay];
  const candidateProfit = sellPrice - buyPrice;
  const shouldUpdate = candidateProfit > bestProfit;
  const totalComparisons =
    (round.prices.length * (round.prices.length - 1)) / 2;
  const attempts = comparisons + mistakes;
  const accuracy =
    attempts === 0 ? 100 : Math.round((comparisons / attempts) * 100);

  function goTo(nextStep: number) {
    setStep(nextStep);
  }

  function resetGame(nextRound = false) {
    if (nextRound) {
      setRoundIndex((currentRound) => {
        return (currentRound + 1) % challengeRounds.length;
      });
    }
    setBuyDay(0);
    setSellDay(1);
    setBestProfit(0);
    setBestBuyDay(null);
    setBestSellDay(null);
    setResolved(false);
    setResolvedVerdict(null);
    setComplete(false);
    setComparisons(0);
    setScore(0);
    setStreak(0);
    setMistakes(0);
    setMessage(
      "New map loaded. Bit bought on day 1 and will test every later sell day.",
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

  function chooseVerdict(verdict: Verdict) {
    if (resolved || complete) return;

    const expectedVerdict: Verdict = shouldUpdate ? "update" : "skip";
    if (verdict !== expectedVerdict) {
      miss(
        shouldUpdate
          ? `$${candidateProfit} is greater than the current record of $${bestProfit}. Bit should update the maximum.`
          : `$${candidateProfit} is not greater than the current record of $${bestProfit}. Bit should skip it.`,
      );
      return;
    }

    reward();
    setComparisons((currentComparisons) => currentComparisons + 1);
    setResolved(true);
    setResolvedVerdict(verdict);

    if (shouldUpdate) {
      setBestProfit(candidateProfit);
      setBestBuyDay(buyDay);
      setBestSellDay(sellDay);
      setMessage(
        `$${candidateProfit} beats the previous record of $${bestProfit}. Bit replaced max profit and saved this pair.`,
      );
    } else if (candidateProfit <= 0) {
      setMessage(
        `Selling today gives $${candidateProfit}. That is not profitable, so Bit skips this day.`,
      );
    } else {
      setMessage(
        `$${candidateProfit} is positive, but it does not beat the record of $${bestProfit}. Bit keeps the old maximum.`,
      );
    }
  }

  function advanceBit() {
    if (!resolved || complete) return;

    if (sellDay < round.prices.length - 1) {
      setSellDay((currentSellDay) => currentSellDay + 1);
      setResolved(false);
      setResolvedVerdict(null);
      setMessage(
        `Bit moved to day ${sellDay + 2}. It still remembers buying on day ${buyDay + 1} for $${buyPrice}.`,
      );
      return;
    }

    if (buyDay < round.prices.length - 2) {
      const nextBuyDay = buyDay + 1;
      setBuyDay(nextBuyDay);
      setSellDay(nextBuyDay + 1);
      setResolved(false);
      setResolvedVerdict(null);
      setMessage(
        `Every sell day after day ${buyDay + 1} was checked. Bit now buys on day ${nextBuyDay + 1} and starts the inner loop again.`,
      );
      return;
    }

    setComplete(true);
    setMessage(
      `All ${totalComparisons} legal buy–sell pairs were checked. Bit’s maximum is $${bestProfit}.`,
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
                high point instantly. Bit begins with a simpler machine plan:
                pin one buy day, test every later sell day, remember the best,
                then repeat from the next buy day.
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
                  <strong>Checks every legal pair</strong>
                </div>
                <div className="machine-state">
                  <div>
                    <span>buyDay</span>
                    <strong>D1</strong>
                  </div>
                  <div>
                    <span>sellDay</span>
                    <strong>D2</strong>
                  </div>
                  <div>
                    <span>maxProfit</span>
                    <strong>0</strong>
                  </div>
                </div>
                <p>Subtract → compare → remember → move. Two nested loops.</p>
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
                Walk every pair with Bit <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section
            className="concept-slide play-slide candy-play-slide"
            aria-hidden={step !== 2}
          >
            <div className="candy-game-header">
              <div>
                <span className="game-kicker">Pair quest · nested loops</span>
                <h2>Walk the stock map.</h2>
                <p>
                  Hold one buy day. Visit every later sell day. Keep only a
                  profit that beats Bit&apos;s current record.
                </p>
              </div>
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
                  <span>MAX</span>
                  <strong>${bestProfit}</strong>
                </div>
              </div>
              <div
                className="run-progress"
                aria-label={`${comparisons} of ${totalComparisons} pairs checked`}
              >
                <span
                  style={{
                    width: `${(comparisons / totalComparisons) * 100}%`,
                  }}
                />
              </div>
              <p className="run-progress-label">
                {comparisons} / {totalComparisons} legal pairs checked
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

            <div className="candy-game-board">
              <aside className="thought-bubble thought-bubble--buy">
                <span className="decision-kicker">
                  BIT&apos;S BUY MEMORY · OUTER LOOP
                </span>
                <h3>
                  “I bought on day {buyDay + 1} for ${buyPrice}.”
                </h3>
                <p>
                  I will keep this buy fixed while I try every sell day to its
                  right.
                </p>
                <div className="thought-memory">
                  <div>
                    <span>BUY</span>
                    <strong>D{buyDay + 1} · ${buyPrice}</strong>
                  </div>
                  <div>
                    <span>MAX SO FAR</span>
                    <strong>${bestProfit}</strong>
                  </div>
                </div>
              </aside>

              <div
                className="candy-map"
                aria-label="Winding stock-price map"
              >
                {mapPoints.slice(0, -1).map((_, index) => (
                  <span
                    className={`map-link map-link--${index + 1}`}
                    aria-hidden="true"
                    key={`link-${index}`}
                  />
                ))}

                {round.prices.map((price, index) => {
                  const point = mapPoints[index];
                  const nodeLabel =
                    index === buyDay
                      ? "BUY"
                      : index === sellDay && !complete
                        ? "CHECK"
                        : index === bestBuyDay
                          ? "BEST BUY"
                          : index === bestSellDay
                            ? "BEST SELL"
                            : "";

                  return (
                    <div
                      className={[
                        "map-node",
                        index === buyDay ? "is-buy" : "",
                        index === sellDay && !complete ? "is-checking" : "",
                        index === bestBuyDay || index === bestSellDay
                          ? "is-record"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      aria-label={`Day ${index + 1}, stock price $${price}${
                        nodeLabel ? `, ${nodeLabel}` : ""
                      }`}
                      key={`map-day-${index}`}
                    >
                      <small>D{index + 1}</small>
                      <strong>${price}</strong>
                      <em>{nodeLabel}</em>
                    </div>
                  );
                })}

                <div
                  className="bit-mascot map-bit"
                  style={{
                    left: `${mapPoints[sellDay].x}%`,
                    top: `${mapPoints[sellDay].y}%`,
                  }}
                  aria-label={`Bit is checking sell day ${sellDay + 1}`}
                >
                  <span className="bit-antenna" aria-hidden="true" />
                  <span className="bit-face" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                  <small>BIT</small>
                </div>
              </div>

              <aside className="thought-bubble thought-bubble--sell">
                {complete ? (
                  <div className="map-complete">
                    <span className="decision-kicker">
                      MAP COMPLETE · O(n²)
                    </span>
                    <h3>Bit checked every legal pair.</h3>
                    <p>
                      The maximum came from buying on day{" "}
                      {bestBuyDay === null ? "—" : bestBuyDay + 1} and selling
                      on day {bestSellDay === null ? "—" : bestSellDay + 1}.
                    </p>
                    <div className="completion-metrics">
                      <div>
                        <span>RETURN</span>
                        <strong>${bestProfit}</strong>
                      </div>
                      <div>
                        <span>PAIRS</span>
                        <strong>{comparisons}</strong>
                      </div>
                      <div>
                        <span>ACCURACY</span>
                        <strong>{accuracy}%</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => resetGame(true)}
                      tabIndex={step === 2 ? 0 : -1}
                    >
                      Load a new map
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="decision-kicker">
                      TODAY&apos;S CHECK · INNER LOOP
                    </span>
                    <h3>
                      “If I sell on day {sellDay + 1} for ${sellPrice}…”
                    </h3>
                    <code>
                      sell ${sellPrice} − buy ${buyPrice} ={" "}
                      <strong>${candidateProfit}</strong>
                    </code>

                    {!resolved ? (
                      <>
                        <p>
                          Is ${candidateProfit} greater than my saved maximum of
                          {" "}${bestProfit}?
                        </p>
                        <div className="state-actions">
                          <button
                            type="button"
                            onClick={() => chooseVerdict("skip")}
                            tabIndex={step === 2 ? 0 : -1}
                          >
                            <span>NOT GREATER</span>
                            Skip this pair
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseVerdict("update")}
                            tabIndex={step === 2 ? 0 : -1}
                          >
                            <span>NEW RECORD</span>
                            Update max
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="resolved-check">
                        <span
                          className={
                            resolvedVerdict === "update"
                              ? "is-update"
                              : "is-skip"
                          }
                        >
                          {resolvedVerdict === "update"
                            ? `New maximum: $${candidateProfit}`
                            : "Pair skipped"}
                        </span>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={advanceBit}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          {sellDay < round.prices.length - 1
                            ? `Move Bit to day ${sellDay + 2}`
                            : buyDay < round.prices.length - 2
                              ? `Now buy on day ${buyDay + 2}`
                              : "Finish the scan"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </aside>
            </div>

            <div className="map-narrator" role="status" aria-live="polite">
              <span>BIT THINKS</span>
              <p>{message}</p>
            </div>

            {complete ? (
              <p className="complexity-note">
                This first strategy is easy to understand but checks{" "}
                <strong>{totalComparisons} pairs</strong>. The next lesson can
                compress the same answer into one pass.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
