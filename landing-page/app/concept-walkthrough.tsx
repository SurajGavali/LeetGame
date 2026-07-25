"use client";

import { useState } from "react";

const prices = [7, 1, 5, 3, 6, 4];
const barHeights = [82, 18, 58, 40, 76, 52];

export function ConceptWalkthrough() {
  const [step, setStep] = useState(0);
  const [day, setDay] = useState(0);
  const [holding, setHolding] = useState(false);
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [buyDay, setBuyDay] = useState<number | null>(null);
  const [sellDay, setSellDay] = useState<number | null>(null);
  const [profit, setProfit] = useState(0);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState(
    "Read today’s price, then choose one legal move.",
  );

  const currentPrice = prices[day];

  function goTo(nextStep: number) {
    setStep(nextStep);
  }

  function resetGame() {
    setDay(0);
    setHolding(false);
    setBuyPrice(null);
    setBuyDay(null);
    setSellDay(null);
    setProfit(0);
    setComplete(false);
    setMessage("Read today’s price, then choose one legal move.");
  }

  function moveForward(nextMessage: string) {
    if (day < prices.length - 1) {
      setDay((currentDay) => currentDay + 1);
      setMessage(nextMessage);
      return;
    }

    setComplete(true);
    setMessage(
      holding
        ? "The week ended while you were holding the stock. Try again and sell before the final day."
        : "The week ended without a trade. Try again and look for a low price before a later high.",
    );
  }

  function buy() {
    if (holding || complete || day === prices.length - 1) return;

    setHolding(true);
    setBuyPrice(currentPrice);
    setBuyDay(day);
    moveForward(
      `Bought at $${currentPrice}. The machine remembers that price and advances one day.`,
    );
  }

  function sell() {
    if (!holding || buyPrice === null || complete) return;

    const earned = currentPrice - buyPrice;
    setProfit(earned);
    setSellDay(day);
    setHolding(false);
    setComplete(true);
    setMessage(
      earned === 5
        ? "Perfect. You found the optimal $5 profit using only the state available to the machine."
        : `You made $${earned}. The optimal profit is $5—restart and see if you can buy at $1 and sell at $6.`,
    );
  }

  function skip() {
    if (complete) return;
    moveForward(
      holding
        ? `Held the stock through day ${day + 1}. Compare the next price with your $${buyPrice} buy price.`
        : `Skipped day ${day + 1}. The machine carries no stock into the next day.`,
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
                {prices.map((price, index) => (
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
                  {prices.map((price, index) => (
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
            <div className="game-copy">
              <span className="game-kicker">Your turn · future hidden</span>
              <h2>You can only see today.</h2>
              <p>
                Read the current price, update your state, and choose one move.
                Find the best profit without seeing what comes next.
              </p>
              <div className="state-readout" aria-label="Current game state">
                <div>
                  <span>DAY</span>
                  <strong>
                    {String(day + 1).padStart(2, "0")} / 06
                  </strong>
                </div>
                <div>
                  <span>PRICE</span>
                  <strong>${currentPrice}</strong>
                </div>
                <div>
                  <span>STATE</span>
                  <strong>{holding ? `Holding $${buyPrice}` : "Cash"}</strong>
                </div>
              </div>
              <button
                type="button"
                className="concept-back-link"
                onClick={() => goTo(1)}
                tabIndex={step === 2 ? 0 : -1}
              >
                ← Why is the future hidden?
              </button>
            </div>

            <div className="game-board" aria-label="Playable stock challenge">
              <div className="chart-grid" aria-label="Revealed prices by day">
                {prices.map((price, index) => (
                  <div className="bar-slot" key={`${price}-${index}`}>
                    <span
                      className={[
                        index === day ? "bar-current" : "",
                        index > day ? "bar-hidden" : "",
                        index === buyDay ? "bar-bought" : "",
                        index === sellDay ? "bar-sold" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ height: `${barHeights[index]}%` }}
                    />
                    <small>
                      D{index + 1}
                      {index <= day ? ` · $${price}` : ""}
                    </small>
                  </div>
                ))}
              </div>

              <p className="game-message" role="status" aria-live="polite">
                {message}
              </p>

              {complete ? (
                <div className="game-result">
                  <div>
                    <span>YOUR PROFIT</span>
                    <strong>${profit}</strong>
                  </div>
                  <div>
                    <span>BEST POSSIBLE</span>
                    <strong>$5</strong>
                  </div>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={resetGame}
                    tabIndex={step === 2 ? 0 : -1}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="move-row">
                  <button
                    type="button"
                    className="move-button move-button--buy"
                    onClick={buy}
                    disabled={holding || day === prices.length - 1}
                    tabIndex={step === 2 ? 0 : -1}
                  >
                    <span>↗</span> Buy
                  </button>
                  <button
                    type="button"
                    className="move-button move-button--sell"
                    onClick={sell}
                    disabled={!holding}
                    tabIndex={step === 2 ? 0 : -1}
                  >
                    <span>↘</span> Sell
                  </button>
                  <button
                    type="button"
                    className="move-button"
                    onClick={skip}
                    tabIndex={step === 2 ? 0 : -1}
                  >
                    <span>→</span> Skip
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
