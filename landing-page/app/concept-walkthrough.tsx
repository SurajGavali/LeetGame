"use client";

import { useEffect, useRef, useState } from "react";

const examplePrices = [7, 1, 5, 3, 6, 4];
const challengeRounds = [
  { prices: [8, 3, 6, 2, 7, 4], answer: 5 },
  { prices: [5, 2, 4, 1, 8, 3], answer: 7 },
  { prices: [9, 6, 4, 5, 3, 7], answer: 4 },
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
  const [soundOn, setSoundOn] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [message, setMessage] = useState(
    "i is pinned at index 0. Bit starts as j at index 1 and moves one array cell at a time.",
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

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  function playThoughtSound(
    tone: "think" | "answer" | "wrong" = "think",
    force = false,
  ) {
    if ((!soundOn && !force) || typeof window === "undefined") return;

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const frequencies =
      tone === "wrong"
        ? [210, 155]
        : tone === "answer"
          ? [520, 760]
          : [390, 560];

    oscillator.type = tone === "think" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequencies[0], now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequencies[1],
      now + 0.16,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  function goTo(nextStep: number) {
    setStep(nextStep);
    if (nextStep === 2) playThoughtSound();
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
      "New array loaded. i is pinned at index 0, and Bit starts checking with j at index 1.",
    );
    playThoughtSound();
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
      playThoughtSound("wrong");
      miss(
        shouldUpdate
          ? `$${candidateProfit} is greater than the current record of $${bestProfit}. Bit should update the maximum.`
          : `$${candidateProfit} is not greater than the current record of $${bestProfit}. Bit should skip it.`,
      );
      return;
    }

    playThoughtSound("answer");
    reward();
    setComparisons((currentComparisons) => currentComparisons + 1);
    setResolved(true);
    setResolvedVerdict(verdict);

    if (shouldUpdate) {
      setBestProfit(candidateProfit);
      setBestBuyDay(buyDay);
      setBestSellDay(sellDay);
      setMessage(
        `$${candidateProfit} beats the previous max of $${bestProfit}. Bit saved indexes [${buyDay}, ${sellDay}] as the new best pair.`,
      );
    } else if (candidateProfit < 0) {
      setMessage(
        `$${candidateProfit} is below the $0 floor. You helped Bit keep max at $${bestProfit} instead of saving a loss.`,
      );
    } else if (candidateProfit === 0) {
      setMessage(
        `The difference is $0, equal to the profit floor—not greater than max—so Bit skips this pair.`,
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
      playThoughtSound();
      setSellDay((currentSellDay) => currentSellDay + 1);
      setResolved(false);
      setResolvedVerdict(null);
      setMessage(
        `Bit moved j to index ${sellDay + 1}. It still remembers prices[i] = $${buyPrice} at i = ${buyDay}.`,
      );
      return;
    }

    if (buyDay < round.prices.length - 2) {
      playThoughtSound();
      const nextBuyDay = buyDay + 1;
      setBuyDay(nextBuyDay);
      setSellDay(nextBuyDay + 1);
      setResolved(false);
      setResolvedVerdict(null);
      setMessage(
        `Every j after i = ${buyDay} was checked. Bit moved i to ${nextBuyDay}, then starts the inner loop at j = ${nextBuyDay + 1}.`,
      );
      return;
    }

    playThoughtSound("answer");
    setComplete(true);
    setMessage(
      `All ${totalComparisons} legal index pairs were checked. Bit’s maximum is $${bestProfit}.`,
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
                pin buy index i, move sell index j through every cell to its
                right, remember the best, then repeat from the next i.
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
                    <span>buy index i</span>
                    <strong>0</strong>
                  </div>
                  <div>
                    <span>sell index j</span>
                    <strong>1</strong>
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
                <span className="game-kicker">Array quest · i / j pointers</span>
                <h2>Move Bit through the indexes.</h2>
                <p>
                  Pin <code>i</code> as the buy index. Move Bit as{" "}
                  <code>j</code> through every index to its right. Never let
                  profit fall below zero.
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
              <div className="game-tools">
                <button
                  type="button"
                  className="sound-toggle"
                  aria-pressed={soundOn}
                  onClick={() => {
                    const nextSoundOn = !soundOn;
                    setSoundOn(nextSoundOn);
                    if (nextSoundOn) playThoughtSound("think", true);
                  }}
                  tabIndex={step === 2 ? 0 : -1}
                >
                  <span aria-hidden="true">{soundOn ? "◖))" : "◖×"}</span>
                  Sound {soundOn ? "on" : "off"}
                </button>
                <button
                  type="button"
                  className="concept-back-link"
                  onClick={() => goTo(1)}
                  tabIndex={step === 2 ? 0 : -1}
                >
                  ← Review the mental model
                </button>
              </div>
            </div>

            <div className="candy-game-board">
              <aside
                className="thought-bubble thought-bubble--buy"
                key={`buy-thought-${buyDay}-${sellDay}`}
              >
                <span className="decision-kicker">
                  BIT&apos;S BUY MEMORY · OUTER LOOP
                </span>
                <h3>
                  “I&apos;m at i = {buyDay}. I bought prices[i] = ${buyPrice}.”
                </h3>
                <p>
                  I keep this index pinned while j checks every cell to its
                  right. My minimum possible answer is always zero.
                </p>
                <div className="thought-memory">
                  <div>
                    <span>PINNED BUY</span>
                    <strong>i = {buyDay} · ${buyPrice}</strong>
                  </div>
                  <div>
                    <span>MAX SO FAR</span>
                    <strong>${bestProfit}</strong>
                  </div>
                  <div>
                    <span>PROFIT FLOOR</span>
                    <strong>$0</strong>
                  </div>
                </div>
              </aside>

              <div
                className="array-stage"
                aria-label="Stock prices array with buy and sell indexes"
              >
                <div className="array-caption">
                  <code>prices</code>
                  <span>ARRAY · LENGTH {round.prices.length}</span>
                </div>
                <div className="array-scroll">
                  <div
                    className="array-track"
                    style={{
                      gridTemplateColumns: `repeat(${round.prices.length}, minmax(58px, 1fr))`,
                    }}
                  >
                    <div
                      className="bit-mascot array-bit"
                      style={{
                        left: `${((sellDay + 0.5) / round.prices.length) * 100}%`,
                      }}
                      aria-label={`Bit is the sell pointer at index ${sellDay}`}
                    >
                      <span className="bit-antenna" aria-hidden="true" />
                      <span className="bit-face" aria-hidden="true">
                        <i />
                        <i />
                      </span>
                      <small>BIT · j</small>
                    </div>

                    {round.prices.map((price, index) => (
                      <div
                        className={[
                          "array-cell",
                          index === buyDay ? "is-buy" : "",
                          index === sellDay && !complete ? "is-checking" : "",
                          index === bestBuyDay || index === bestSellDay
                            ? "is-record"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-label={`Index ${index}, stock price $${price}`}
                        key={`array-index-${index}`}
                      >
                        <small>INDEX {index}</small>
                        <strong>{price}</strong>
                      </div>
                    ))}

                    <div
                      className="array-pointer array-pointer--buy"
                      style={{
                        left: `${((buyDay + 0.5) / round.prices.length) * 100}%`,
                      }}
                    >
                      <i aria-hidden="true" />
                      i = {buyDay} · BUY
                    </div>
                    <div
                      className="array-pointer array-pointer--sell"
                      style={{
                        left: `${((sellDay + 0.5) / round.prices.length) * 100}%`,
                      }}
                    >
                      j = {sellDay} · SELL
                      <i aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <p className="array-rule">
                  <code>maxProfit = 0</code>
                  No trade—or buying and selling on the same day—sets the
                  zero-profit floor.
                </p>
              </div>

              <aside
                className="thought-bubble thought-bubble--sell"
                key={`sell-thought-${buyDay}-${sellDay}`}
              >
                {complete ? (
                  <div className="map-complete">
                    <span className="decision-kicker">
                      ARRAY SCAN COMPLETE · O(n²)
                    </span>
                    <h3>Bit checked every legal pair.</h3>
                    <p>
                      The maximum came from buying at index{" "}
                      {bestBuyDay === null ? "—" : bestBuyDay} and selling at
                      index {bestSellDay === null ? "—" : bestSellDay}.
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
                      Load a new array
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="decision-kicker">
                      CURRENT INDEX CHECK · INNER LOOP
                    </span>
                    <h3>
                      “I&apos;m at j = {sellDay}. If I sell prices[j] = $
                      {sellPrice}…”
                    </h3>
                    <code>
                      prices[{sellDay}] − prices[{buyDay}] = ${sellPrice} − $
                      {buyPrice} = <strong>${candidateProfit}</strong>
                    </code>

                    {!resolved ? (
                      <>
                        <p className="bit-question">
                          I got ${candidateProfit}. Is this greater than my
                          saved max of ${bestProfit}? What should I do?
                        </p>
                        {candidateProfit < 0 ? (
                          <p className="question-hint">
                            Remember: maxProfit can stay at $0, but it must never
                            become negative.
                          </p>
                        ) : null}
                        <div className="state-actions">
                          <button
                            type="button"
                            onClick={() => chooseVerdict("skip")}
                            tabIndex={step === 2 ? 0 : -1}
                          >
                            <span>KEEP MAX = ${bestProfit}</span>
                            Tell Bit: skip it
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseVerdict("update")}
                            tabIndex={step === 2 ? 0 : -1}
                          >
                            <span>SET MAX = ${candidateProfit}</span>
                            Tell Bit: update
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
                            : candidateProfit < 0
                              ? "Correct · the loss was not saved"
                              : "Correct · pair skipped"}
                        </span>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={advanceBit}
                          tabIndex={step === 2 ? 0 : -1}
                        >
                          {sellDay < round.prices.length - 1
                            ? `Help Bit move to index ${sellDay + 1}`
                            : buyDay < round.prices.length - 2
                              ? `Help Bit move i to ${buyDay + 1}`
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
