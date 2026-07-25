"use client";

import { useEffect, useReducer, useRef, useState } from "react";

const examplePrices = [7, 1, 5, 3, 6, 4];

const challengeLevels = [
  {
    id: "clear-valley",
    title: "Clear Valley",
    lesson: "Find a low price before a later rise.",
    prices: [8, 3, 6, 2, 7, 4],
    hint: "The cheapest price is useful only if a higher price comes after it.",
  },
  {
    id: "multiple-peaks",
    title: "False Peak",
    lesson: "The first profit is not always the best profit.",
    prices: [3, 7, 2, 5, 1, 9],
    hint: "A later valley can create a much larger trade.",
  },
  {
    id: "order-constraint",
    title: "Time Arrow",
    lesson: "A sell must always happen after the buy.",
    prices: [8, 2, 7, 1, 6, 3],
    hint: "Do not pair a cheap price with a peak that already passed.",
  },
  {
    id: "declining",
    title: "No Trade",
    lesson: "Sometimes zero is the strongest answer.",
    prices: [9, 7, 5, 3, 1],
    hint: "You never have to lock in a loss.",
  },
  {
    id: "recovery",
    title: "Recovery",
    lesson: "Hold through noise when a stronger exit may appear.",
    prices: [5, 3, 4, 2, 8, 6],
    hint: "Compare every new opportunity with the best one you have seen.",
  },
  {
    id: "long-run",
    title: "Long Run",
    lesson: "Carry the same memory across a larger array.",
    prices: [7, 2, 5, 1, 4, 9, 3, 10],
    hint: "Remember one low price and one best profit.",
  },
];

type GameView = "challenge" | "result" | "debrief" | "debrief-complete";
type TradeAction = "buy" | "wait" | "hold" | "sell";
type DebriefAction = "min" | "max" | "keep";

type LockedTrade = {
  buyIndex: number;
  sellIndex: number;
  profit: number;
};

type AttemptResult = {
  attempt: number;
  profit: number;
  stars: number;
  score: number;
  trade: LockedTrade | null;
};

type LevelProgress = {
  unlocked: boolean;
  completed: boolean;
  bestStars: number;
  bestScore: number;
};

type DebriefState = {
  index: number;
  minPrice: number;
  minIndex: number;
  maxProfit: number;
  bestBuy: number | null;
  bestSell: number | null;
  resolved: boolean;
  lastAction: DebriefAction | null;
  feedback: string;
};

type GameState = {
  view: GameView;
  levelIndex: number;
  attempt: number;
  currentIndex: number;
  revealedThrough: number;
  holding: { buyIndex: number; buyPrice: number; maxSeenProfit: number } | null;
  trade: LockedTrade | null;
  profit: number;
  attemptHistory: AttemptResult[];
  progress: LevelProgress[];
  score: number;
  reaction: string;
  recordPulseId: number;
  hintUsed: boolean;
  debrief: DebriefState | null;
};

type GameAction =
  | { type: "TRADE_ACTION"; action: TradeAction }
  | { type: "FINISH_NO_TRADE" }
  | { type: "RETRY" }
  | { type: "USE_HINT" }
  | { type: "START_DEBRIEF" }
  | { type: "DEBRIEF_CHOOSE"; action: DebriefAction }
  | { type: "DEBRIEF_NEXT" }
  | { type: "SELECT_LEVEL"; levelIndex: number }
  | { type: "NEXT_LEVEL" }
  | {
      type: "HYDRATE_PROGRESS";
      progress: LevelProgress[];
      score: number;
      levelIndex: number;
    };

function findOptimalTrade(prices: number[]) {
  if (prices.length < 2) {
    return { profit: 0, buyIndex: null, sellIndex: null };
  }

  let minPrice = prices[0];
  let minIndex = 0;
  let profit = 0;
  let buyIndex: number | null = null;
  let sellIndex: number | null = null;

  for (let index = 1; index < prices.length; index += 1) {
    const candidate = prices[index] - minPrice;
    if (candidate > profit) {
      profit = candidate;
      buyIndex = minIndex;
      sellIndex = index;
    }
    if (prices[index] < minPrice) {
      minPrice = prices[index];
      minIndex = index;
    }
  }

  return { profit, buyIndex, sellIndex };
}

function rateAttempt(profit: number, optimalProfit: number) {
  if (optimalProfit === 0 && profit === 0) return 3;
  if (profit === optimalProfit && profit > 0) return 3;
  if (profit > 0) return 2;
  if (profit === 0) return 1;
  return 0;
}

function scoreAttempt(profit: number, optimalProfit: number, attempt: number) {
  const ratio =
    optimalProfit === 0
      ? profit === 0
        ? 1
        : 0
      : Math.max(0, Math.min(1, profit / optimalProfit));
  const perfectBonus =
    ratio === 1 ? ([300, 150, 50][Math.min(attempt - 1, 2)] ?? 0) : 0;
  return Math.round(ratio * 1000) + perfectBonus;
}

function createProgress(): LevelProgress[] {
  return challengeLevels.map((_, index) => ({
    unlocked: index === 0,
    completed: false,
    bestStars: 0,
    bestScore: 0,
  }));
}

const initialGameState: GameState = {
  view: "challenge",
  levelIndex: 0,
  attempt: 1,
  currentIndex: 0,
  revealedThrough: 0,
  holding: null,
  trade: null,
  profit: 0,
  attemptHistory: [],
  progress: createProgress(),
  score: 0,
  reaction:
    "The first price is visible. Future prices are hidden—choose carefully.",
  recordPulseId: 0,
  hintUsed: false,
  debrief: null,
};

function resetLevel(
  state: GameState,
  levelIndex: number,
  keepHistory = false,
): GameState {
  return {
    ...state,
    view: "challenge",
    levelIndex,
    attempt: keepHistory ? state.attempt + 1 : 1,
    currentIndex: 0,
    revealedThrough: keepHistory ? state.revealedThrough : 0,
    holding: null,
    trade: null,
    profit: 0,
    attemptHistory: keepHistory ? state.attemptHistory : [],
    reaction: keepHistory
      ? "You remember the prices you uncovered. Try a stronger trade."
      : "A new market is open. The future is hidden.",
    hintUsed: false,
    debrief: null,
  };
}

function finishAttempt(
  state: GameState,
  trade: LockedTrade | null,
  profit: number,
): GameState {
  const level = challengeLevels[state.levelIndex];
  const optimal = findOptimalTrade(level.prices);
  const stars = rateAttempt(profit, optimal.profit);
  const attemptScore = scoreAttempt(profit, optimal.profit, state.attempt);
  const result: AttemptResult = {
    attempt: state.attempt,
    profit,
    stars,
    score: attemptScore,
    trade,
  };
  const progress = state.progress.map((item) => ({ ...item }));
  const previousBest = progress[state.levelIndex].bestScore;

  progress[state.levelIndex] = {
    ...progress[state.levelIndex],
    bestStars: Math.max(progress[state.levelIndex].bestStars, stars),
    bestScore: Math.max(previousBest, attemptScore),
  };

  if (stars >= 1 && state.levelIndex < progress.length - 1) {
    progress[state.levelIndex + 1].unlocked = true;
  }

  return {
    ...state,
    view: "result",
    holding: null,
    trade,
    profit,
    attemptHistory: [...state.attemptHistory, result],
    progress,
    score: state.score + Math.max(0, attemptScore - previousBest),
    reaction:
      stars === 3
        ? "You found the strongest possible trade!"
        : stars === 2
          ? "You made a profit. There is still a stronger path."
          : stars === 1
            ? "You protected the zero-profit floor. Try to find the hidden opportunity."
            : "That trade lost value. Retry with what the market revealed.",
  };
}

function expectedDebriefAction(
  debrief: DebriefState,
  prices: number[],
): DebriefAction {
  const price = prices[debrief.index];
  if (price < debrief.minPrice) return "min";
  if (price - debrief.minPrice > debrief.maxProfit) return "max";
  return "keep";
}

function gameReducer(state: GameState, action: GameAction): GameState {
  const level = challengeLevels[state.levelIndex];
  const prices = level.prices;
  const lastIndex = prices.length - 1;

  if (action.type === "TRADE_ACTION" && state.view === "challenge") {
    const currentPrice = prices[state.currentIndex];

    if (action.action === "buy" && !state.holding && state.currentIndex < lastIndex) {
      const nextIndex = state.currentIndex + 1;
      const nextCandidate = Math.max(0, prices[nextIndex] - currentPrice);
      return {
        ...state,
        currentIndex: nextIndex,
        revealedThrough: Math.max(state.revealedThrough, nextIndex),
        holding: {
          buyIndex: state.currentIndex,
          buyPrice: currentPrice,
          maxSeenProfit: nextCandidate,
        },
        recordPulseId:
          nextCandidate > 0 ? state.recordPulseId + 1 : state.recordPulseId,
        reaction: `Bit bought at $${currentPrice}. Index ${nextIndex} revealed $${prices[nextIndex]}.`,
      };
    }

    if (action.action === "wait" && !state.holding) {
      if (state.currentIndex === lastIndex) {
        return finishAttempt(state, null, 0);
      }
      const nextIndex = state.currentIndex + 1;
      return {
        ...state,
        currentIndex: nextIndex,
        revealedThrough: Math.max(state.revealedThrough, nextIndex),
        reaction: `Bit waited. Index ${nextIndex} revealed $${prices[nextIndex]}.`,
      };
    }

    if (action.action === "hold" && state.holding) {
      if (state.currentIndex === lastIndex) {
        return state;
      }
      const nextIndex = state.currentIndex + 1;
      const nextCandidate = prices[nextIndex] - state.holding.buyPrice;
      const nextMax = Math.max(
        0,
        state.holding.maxSeenProfit,
        nextCandidate,
      );
      return {
        ...state,
        currentIndex: nextIndex,
        revealedThrough: Math.max(state.revealedThrough, nextIndex),
        holding: {
          ...state.holding,
          maxSeenProfit: nextMax,
        },
        recordPulseId:
          nextMax > state.holding.maxSeenProfit
            ? state.recordPulseId + 1
            : state.recordPulseId,
        reaction: `Bit held the stock. Index ${nextIndex} revealed $${prices[nextIndex]}.`,
      };
    }

    if (action.action === "sell" && state.holding) {
      const trade: LockedTrade = {
        buyIndex: state.holding.buyIndex,
        sellIndex: state.currentIndex,
        profit: currentPrice - state.holding.buyPrice,
      };
      return finishAttempt(state, trade, trade.profit);
    }
  }

  if (
    action.type === "FINISH_NO_TRADE" &&
    state.view === "challenge" &&
    !state.holding &&
    state.currentIndex === lastIndex
  ) {
    return finishAttempt(state, null, 0);
  }

  if (
    action.type === "RETRY" &&
    state.view === "result" &&
    state.attempt < 3
  ) {
    return resetLevel(state, state.levelIndex, true);
  }

  if (action.type === "USE_HINT" && state.view === "challenge") {
    return {
      ...state,
      hintUsed: true,
      reaction: level.hint,
    };
  }

  if (action.type === "START_DEBRIEF" && state.view === "result") {
    if (prices.length < 2) {
      return { ...state, view: "debrief-complete" };
    }
    return {
      ...state,
      view: "debrief",
      currentIndex: 1,
      debrief: {
        index: 1,
        minPrice: prices[0],
        minIndex: 0,
        maxProfit: 0,
        bestBuy: null,
        bestSell: null,
        resolved: false,
        lastAction: null,
        feedback:
          "Bit remembers the first price, then compares every new day with it.",
      },
      reaction:
        "Now teach Bit the rule that guarantees the best answer in one pass.",
    };
  }

  if (
    action.type === "DEBRIEF_CHOOSE" &&
    state.view === "debrief" &&
    state.debrief &&
    !state.debrief.resolved
  ) {
    const expected = expectedDebriefAction(state.debrief, prices);
    if (action.action !== expected) {
      return {
        ...state,
        debrief: {
          ...state.debrief,
          feedback:
            expected === "min"
              ? "This price is lower than Bit’s remembered minimum."
              : expected === "max"
                ? "This candidate beats maxProfit and should be saved."
                : "Neither memory value needs to change on this day.",
        },
      };
    }

    const price = prices[state.debrief.index];
    const candidate = price - state.debrief.minPrice;
    if (expected === "min") {
      return {
        ...state,
        debrief: {
          ...state.debrief,
          minPrice: price,
          minIndex: state.debrief.index,
          resolved: true,
          lastAction: "min",
          feedback: `Correct. Bit replaced minPrice with $${price}.`,
        },
      };
    }
    if (expected === "max") {
      return {
        ...state,
        recordPulseId: state.recordPulseId + 1,
        debrief: {
          ...state.debrief,
          maxProfit: candidate,
          bestBuy: state.debrief.minIndex,
          bestSell: state.debrief.index,
          resolved: true,
          lastAction: "max",
          feedback: `New record! Bit saved maxProfit = $${candidate}.`,
        },
      };
    }
    return {
      ...state,
      debrief: {
        ...state.debrief,
        resolved: true,
        lastAction: "keep",
        feedback: "Correct. Bit kept both memory values unchanged.",
      },
    };
  }

  if (
    action.type === "DEBRIEF_NEXT" &&
    state.view === "debrief" &&
    state.debrief &&
    state.debrief.resolved
  ) {
    if (state.debrief.index >= lastIndex) {
      const progress = state.progress.map((item) => ({ ...item }));
      const levelCompleted =
        progress[state.levelIndex].bestStars >= 1 || state.attempt >= 3;
      progress[state.levelIndex].completed = levelCompleted;
      if (
        state.levelIndex < progress.length - 1 &&
        levelCompleted
      ) {
        progress[state.levelIndex + 1].unlocked = true;
      }
      return {
        ...state,
        view: "debrief-complete",
        progress,
        reaction: "Bit learned the rule and can now guarantee the answer.",
      };
    }
    const nextIndex = state.debrief.index + 1;
    return {
      ...state,
      currentIndex: nextIndex,
      debrief: {
        ...state.debrief,
        index: nextIndex,
        resolved: false,
        lastAction: null,
        feedback: "A new day is ready. Which memory should Bit change?",
      },
      reaction: `Bit moved to index ${nextIndex}.`,
    };
  }

  if (action.type === "SELECT_LEVEL") {
    if (!state.progress[action.levelIndex]?.unlocked) return state;
    return resetLevel(state, action.levelIndex);
  }

  if (action.type === "NEXT_LEVEL") {
    if (
      state.view === "debrief-complete" &&
      !state.progress[state.levelIndex].completed
    ) {
      if (state.attempt < 3) {
        return resetLevel(state, state.levelIndex, true);
      }
      return state;
    }
    const nextIndex =
      state.levelIndex < challengeLevels.length - 1
        ? state.levelIndex + 1
        : 0;
    if (!state.progress[nextIndex]?.unlocked && nextIndex !== 0) {
      if (state.attempt < 3) {
        return resetLevel(state, state.levelIndex, true);
      }
      return state;
    }
    return resetLevel(state, nextIndex);
  }

  if (
    action.type === "HYDRATE_PROGRESS" &&
    action.progress.length === challengeLevels.length
  ) {
    const savedLevelIsValid =
      action.levelIndex >= 0 &&
      action.levelIndex < challengeLevels.length &&
      action.progress[action.levelIndex]?.unlocked;
    return {
      ...state,
      levelIndex: savedLevelIsValid ? action.levelIndex : 0,
      progress: action.progress,
      score: action.score,
      reaction: "Your saved level is ready. The future is hidden.",
    };
  }

  return state;
}

function formatProfit(value: number) {
  if (value > 0) return `+$${value}`;
  if (value < 0) return `−$${Math.abs(value)}`;
  return "$0";
}

export function ConceptWalkthrough() {
  const [step, setStep] = useState(0);
  const [game, dispatch] = useReducer(gameReducer, initialGameState);
  const [soundOn, setSoundOn] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundTimersRef = useRef<number[]>([]);
  const marketScrollRef = useRef<HTMLDivElement | null>(null);
  const actionLockRef = useRef(false);
  const bitThoughtRef = useRef<HTMLDivElement | null>(null);
  const focusAfterActionRef = useRef(false);

  const level = challengeLevels[game.levelIndex];
  const prices = level.prices;
  const optimal = findOptimalTrade(prices);
  const currentPrice = prices[game.currentIndex];
  const liveProfit = game.holding
    ? currentPrice - game.holding.buyPrice
    : 0;
  const maxSeenProfit = game.holding?.maxSeenProfit ?? 0;
  const previousSeenProfit = game.holding
    ? Math.max(
        0,
        ...prices
          .slice(game.holding.buyIndex + 1, game.currentIndex)
          .map((price) => price - game.holding!.buyPrice),
      )
    : 0;
  const maxJustChanged =
    Boolean(game.holding) &&
    liveProfit > 0 &&
    liveProfit > previousSeenProfit;
  const bestAttemptProfit = Math.max(
    0,
    ...game.attemptHistory.map((result) => result.profit),
  );
  const activeIndex =
    game.view === "debrief" && game.debrief
      ? game.debrief.index
        : game.currentIndex;
  const daysReached =
    game.view === "challenge" ? game.currentIndex + 1 : prices.length;
  const displayedProfit =
    game.view === "challenge" && game.holding ? liveProfit : game.profit;
  const rigAlignment =
    activeIndex === 0
      ? "is-start"
      : activeIndex === prices.length - 1
        ? "is-end"
        : "is-center";
  const activePercent = ((activeIndex + 0.5) / prices.length) * 100;
  const currentResult = game.attemptHistory.at(-1);
  const resultCanRetry =
    game.view === "result" &&
    game.attempt < 3 &&
    (currentResult?.stars ?? 0) < 3;
  const revealSolution =
    game.view === "debrief" ||
    game.view === "debrief-complete" ||
    (game.view === "result" && !resultCanRetry);
  const nextLevelIndex =
    game.levelIndex < challengeLevels.length - 1
      ? game.levelIndex + 1
      : 0;
  const nextLevelUnlocked =
    nextLevelIndex === 0 || game.progress[nextLevelIndex].unlocked;
  const canAdvanceFromLevel =
    game.progress[game.levelIndex].completed && nextLevelUnlocked;
  const debriefCandidate =
    game.debrief && game.view === "debrief"
      ? prices[game.debrief.index] - game.debrief.minPrice
      : 0;
  const debriefExpected =
    game.debrief && game.view === "debrief"
      ? expectedDebriefAction(game.debrief, prices)
      : null;

  useEffect(() => {
    const soundTimers = soundTimersRef.current;
    const storedSound = window.localStorage.getItem("leetgame-sound");
    const storedProgress = window.localStorage.getItem("leetgame-progress");
    const preferenceTimer = window.setTimeout(() => {
      if (storedSound !== null) setSoundOn(storedSound === "on");
      if (storedProgress) {
        try {
          const saved = JSON.parse(storedProgress) as {
            progress?: LevelProgress[];
            score?: number;
            levelIndex?: number;
          };
          if (
            Array.isArray(saved.progress) &&
            saved.progress.length === challengeLevels.length
          ) {
            dispatch({
              type: "HYDRATE_PROGRESS",
              progress: saved.progress,
              score: typeof saved.score === "number" ? saved.score : 0,
              levelIndex:
                typeof saved.levelIndex === "number" ? saved.levelIndex : 0,
            });
          }
        } catch {
          window.localStorage.removeItem("leetgame-progress");
        }
      }
    }, 0);
    return () => {
      window.clearTimeout(preferenceTimer);
      soundTimers.forEach((timer) => window.clearTimeout(timer));
      if (audioContextRef.current) void audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "leetgame-progress",
      JSON.stringify({
        progress: game.progress,
        score: game.score,
        levelIndex: game.levelIndex,
      }),
    );
  }, [game.levelIndex, game.progress, game.score]);

  useEffect(() => {
    if (step !== 2 || !marketScrollRef.current) return;
    const scroller = marketScrollRef.current;
    const frame = window.requestAnimationFrame(() => {
      const target =
        (activeIndex + 0.5) * (scroller.scrollWidth / prices.length) -
        scroller.clientWidth / 2;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      scroller.scrollTo({
        left: Math.max(0, target),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, game.view, prices.length, step]);

  useEffect(() => {
    if (!focusAfterActionRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      bitThoughtRef.current?.focus({ preventScroll: true });
      focusAfterActionRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activeIndex,
    game.attempt,
    game.debrief?.resolved,
    game.hintUsed,
    game.view,
  ]);

  function playSound(
    tone:
      | "think"
      | "move"
      | "buy"
      | "sell"
      | "record"
      | "wrong"
      | "finish" = "think",
    force = false,
  ) {
    if ((!soundOn && !force) || typeof window === "undefined") return;

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const toneMap: Record<string, [number, number, number]> = {
      think: [390, 560, 0.19],
      move: [260, 340, 0.1],
      buy: [320, 470, 0.14],
      sell: [520, 820, 0.2],
      record: [620, 980, 0.24],
      wrong: [210, 155, 0.18],
      finish: [480, 880, 0.26],
    };
    const [startFrequency, endFrequency, duration] = toneMap[tone];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = tone === "think" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      now + duration * 0.84,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  function queueThoughtSound() {
    const timer = window.setTimeout(() => playSound("think"), 150);
    soundTimersRef.current.push(timer);
  }

  function claimActionLock() {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    const timer = window.setTimeout(() => {
      actionLockRef.current = false;
    }, 360);
    soundTimersRef.current.push(timer);
    return true;
  }

  function goTo(nextStep: number) {
    setStep(nextStep);
    if (nextStep === 2) {
      playSound("think");
      navigator.vibrate?.(10);
    }
  }

  function handleTradeAction(action: TradeAction) {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound(action === "buy" ? "buy" : action === "sell" ? "sell" : "move");
    navigator.vibrate?.(action === "sell" ? [12, 20, 16] : 10);
    dispatch({ type: "TRADE_ACTION", action });
    if (action !== "sell") queueThoughtSound();
  }

  function handleNoTrade() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("finish");
    navigator.vibrate?.(12);
    dispatch({ type: "FINISH_NO_TRADE" });
  }

  function handleDebriefChoice(action: DebriefAction) {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    if (!game.debrief || debriefExpected === null) return;
    if (action === debriefExpected) {
      playSound(action === "max" ? "record" : "move");
      navigator.vibrate?.(action === "max" ? [18, 25, 28] : 10);
    } else {
      playSound("wrong");
    }
    dispatch({ type: "DEBRIEF_CHOOSE", action });
  }

  function handleRetry() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("move");
    dispatch({ type: "RETRY" });
    queueThoughtSound();
  }

  function handleStartDebrief() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("think");
    dispatch({ type: "START_DEBRIEF" });
  }

  function handleUseHint() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("think");
    dispatch({ type: "USE_HINT" });
  }

  function handleDebriefNext() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("move");
    dispatch({ type: "DEBRIEF_NEXT" });
    queueThoughtSound();
  }

  function handleNextLevel() {
    if (!claimActionLock()) return;
    focusAfterActionRef.current = true;
    playSound("finish");
    dispatch({ type: "NEXT_LEVEL" });
    queueThoughtSound();
  }

  function handleToggleSound() {
    const nextSound = !soundOn;
    setSoundOn(nextSound);
    window.localStorage.setItem(
      "leetgame-sound",
      nextSound ? "on" : "off",
    );
    if (nextSound) playSound("think", true);
  }

  function renderMascot() {
    return (
      <div className="bit-mascot bit-rig-mascot" aria-hidden="true">
        <span className="bit-antenna" />
        <span className="bit-face">
          <i />
          <i />
        </span>
        <small>BIT</small>
      </div>
    );
  }

  function renderChallengeThought() {
    const isLastDay = game.currentIndex === prices.length - 1;
    return (
      <div
        className="bit-thought-content"
        key={`challenge-${game.attempt}-${game.currentIndex}-${game.holding?.buyIndex ?? "flat"}`}
      >
        <span className="decision-kicker">
          DAY {game.currentIndex + 1} · PRICE REVEALED
        </span>
        <h3>
          {game.holding
            ? `“I bought at $${game.holding.buyPrice}. Selling now gives ${formatProfit(liveProfit)}.”`
            : isLastDay
              ? `“This is the last price: $${currentPrice}.”`
              : `“Today’s price is $${currentPrice}. Should I buy or wait?”`}
        </h3>

        <div className="bit-memory">
          <div>
            <span>POSITION</span>
            <strong>
              {game.holding
                ? `BOUGHT @ $${game.holding.buyPrice}`
                : "NO STOCK"}
            </strong>
          </div>
          <div>
            <span>LIVE P/L</span>
            <strong>{game.holding ? formatProfit(liveProfit) : "—"}</strong>
          </div>
          <div
            className={`memory-max ${maxJustChanged ? "is-new-record" : ""}`}
            key={`record-${game.recordPulseId}`}
          >
            <span>MAX SO FAR</span>
            <strong>${maxSeenProfit}</strong>
            {maxJustChanged ? (
              <em>NEW RECORD</em>
            ) : null}
          </div>
        </div>

        {game.attempt === 3 && !game.hintUsed ? (
          <button
            type="button"
            className="hint-button"
            onClick={handleUseHint}
            tabIndex={step === 2 ? 0 : -1}
          >
            Need one hint?
          </button>
        ) : null}

        {game.hintUsed ? <p className="game-hint">{level.hint}</p> : null}

        <div className="trade-actions">
          {!game.holding && !isLastDay ? (
            <>
              <button
                type="button"
                className="trade-action trade-action--primary"
                onClick={() => handleTradeAction("buy")}
                tabIndex={step === 2 ? 0 : -1}
              >
                <span>LOCK THIS PRICE</span>
                Buy for ${currentPrice}
              </button>
              <button
                type="button"
                className="trade-action"
                onClick={() => handleTradeAction("wait")}
                tabIndex={step === 2 ? 0 : -1}
              >
                <span>REVEAL NEXT DAY</span>
                Wait
              </button>
            </>
          ) : game.holding && isLastDay ? (
            <button
              type="button"
              className="trade-action trade-action--sell trade-action--wide"
              onClick={() => handleTradeAction("sell")}
              tabIndex={step === 2 ? 0 : -1}
            >
              <span>FINAL DAY · CLOSE THE POSITION</span>
              Sell now · {formatProfit(liveProfit)}
            </button>
          ) : game.holding ? (
            <>
              <button
                type="button"
                className="trade-action trade-action--sell"
                onClick={() => handleTradeAction("sell")}
                tabIndex={step === 2 ? 0 : -1}
              >
                <span>END THE TRADE</span>
                Sell · {formatProfit(liveProfit)}
              </button>
              <button
                type="button"
                className="trade-action"
                onClick={() => handleTradeAction("hold")}
                tabIndex={step === 2 ? 0 : -1}
              >
                <span>REVEAL NEXT DAY</span>
                Hold
              </button>
            </>
          ) : (
            <button
              type="button"
              className="trade-action trade-action--primary trade-action--wide"
              onClick={handleNoTrade}
              tabIndex={step === 2 ? 0 : -1}
            >
              <span>NO LATER SELL EXISTS</span>
              Finish with no trade
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderResultThought() {
    const stars = currentResult?.stars ?? 0;
    return (
      <div
        className="bit-thought-content result-thought"
        key={`result-${game.attempt}-${game.profit}`}
      >
        <span className="decision-kicker">MARKET CLOSED · ATTEMPT {game.attempt}</span>
        <div
          className="result-stars"
          role="img"
          aria-label={`${stars} out of 3 stars`}
        >
          {[0, 1, 2].map((star) => (
            <span className={star < stars ? "is-earned" : ""} key={star}>
              ★
            </span>
          ))}
        </div>
        <h3>
          You made <strong>{formatProfit(game.profit)}</strong>.
        </h3>
        <div className="result-comparison">
          <div>
            <span>YOUR TRADE</span>
            <strong>
              {game.trade
                ? `[${game.trade.buyIndex} → ${game.trade.sellIndex}]`
                : "NO TRADE"}
            </strong>
            <small>{formatProfit(game.profit)}</small>
          </div>
          <div className="is-optimal">
            <span>{resultCanRetry ? "SOLUTION" : "BEST POSSIBLE"}</span>
            <strong>
              {resultCanRetry
                ? "HIDDEN FOR RETRY"
                : optimal.buyIndex === null
                  ? "NO TRADE"
                  : `[${optimal.buyIndex} → ${optimal.sellIndex}]`}
            </strong>
            <small>
              {resultCanRetry ? "TRY AGAIN" : formatProfit(optimal.profit)}
            </small>
          </div>
        </div>
        <p>{game.reaction}</p>
        <div className="result-actions">
          {resultCanRetry ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={handleRetry}
              tabIndex={step === 2 ? 0 : -1}
            >
              Retry this market
            </button>
          ) : null}
          <button
            type="button"
            className="button button-primary"
            onClick={handleStartDebrief}
            tabIndex={step === 2 ? 0 : -1}
          >
            See how Bit guarantees it
          </button>
        </div>
      </div>
    );
  }

  function renderDebriefThought() {
    if (!game.debrief) return null;
    const price = prices[game.debrief.index];
    const maxChanged =
      game.debrief.resolved && game.debrief.lastAction === "max";
    return (
      <div
        className="bit-thought-content debrief-thought"
        key={`debrief-${game.debrief.index}-${game.debrief.resolved}`}
      >
        <span className="decision-kicker">ONE-PASS REPLAY · INDEX {game.debrief.index}</span>
        <h3>“Today is ${price}. Which memory should I change?”</h3>
        <div className="bit-memory bit-memory--algorithm">
          <div>
            <span>MIN PRICE</span>
            <strong>
              ${game.debrief.minPrice} <small>@ {game.debrief.minIndex}</small>
            </strong>
          </div>
          <div>
            <span>TODAY − MIN</span>
            <strong>{formatProfit(debriefCandidate)}</strong>
          </div>
          <div
            className={`memory-max ${maxChanged ? "is-new-record" : ""}`}
            key={`debrief-record-${game.recordPulseId}`}
          >
            <span>MAX SO FAR</span>
            <strong>${game.debrief.maxProfit}</strong>
            {maxChanged ? <em>NEW RECORD</em> : null}
          </div>
        </div>
        <p className="debrief-feedback" role="status">
          {game.debrief.feedback}
        </p>
        {!game.debrief.resolved ? (
          <div className="debrief-actions">
            <button
              type="button"
              onClick={() => handleDebriefChoice("min")}
              tabIndex={step === 2 ? 0 : -1}
            >
              <span>LOWER PRICE?</span>
              Replace min
            </button>
            <button
              type="button"
              onClick={() => handleDebriefChoice("max")}
              tabIndex={step === 2 ? 0 : -1}
            >
              <span>BETTER PROFIT?</span>
              Update max
            </button>
            <button
              type="button"
              onClick={() => handleDebriefChoice("keep")}
              tabIndex={step === 2 ? 0 : -1}
            >
              <span>NO RECORD</span>
              Keep memory
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button button-primary debrief-next"
            onClick={handleDebriefNext}
            tabIndex={step === 2 ? 0 : -1}
          >
            {game.debrief.index === prices.length - 1
              ? "Finish the replay"
              : `Move to index ${game.debrief.index + 1}`}
          </button>
        )}
      </div>
    );
  }

  function renderDebriefCompleteThought() {
    const earnedStars = game.progress[game.levelIndex].bestStars;
    return (
      <div className="bit-thought-content result-thought" key="debrief-complete">
        <span className="decision-kicker">
          {canAdvanceFromLevel
            ? "RULE LEARNED · LEVEL COMPLETE"
            : "RULE LEARNED · ONE MORE TRY"}
        </span>
        <div
          className="result-stars"
          role="img"
          aria-label={`${earnedStars} out of 3 stars`}
        >
          {[0, 1, 2].map((star) => (
            <span
              className={star < earnedStars ? "is-earned" : ""}
              aria-hidden="true"
              key={star}
            >
              ★
            </span>
          ))}
        </div>
        <h3>
          Bit can guarantee <strong>{formatProfit(optimal.profit)}</strong>.
        </h3>
        <p>
          Remember the lowest price seen. Compare today with that minimum. Save
          only a profit that beats maxProfit.
        </p>
        <div className="algorithm-rule">
          <code>minPrice = min(minPrice, today)</code>
          <code>maxProfit = max(maxProfit, today − minPrice)</code>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={handleNextLevel}
          tabIndex={step === 2 ? 0 : -1}
        >
          {canAdvanceFromLevel
            ? game.levelIndex === challengeLevels.length - 1
              ? "Replay from level 1"
              : "Play the next market"
            : "Retry this market"}
        </button>
      </div>
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
        {["Problem", "Rules", "Play"].map((label, index) => (
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
                Choose one day to buy and one later day to sell. Make the
                highest possible profit—or return zero when every trade loses.
              </p>
              <button
                type="button"
                className="button button-primary button-large concept-next"
                onClick={() => goTo(1)}
                tabIndex={step === 0 ? 0 : -1}
              >
                Learn the rules <span aria-hidden="true">→</span>
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
            className="concept-slide thinking-slide rules-slide"
            aria-hidden={step !== 1}
          >
            <div className="thinking-intro">
              <p className="game-kicker">Your mission</p>
              <h2>The future stays hidden.</h2>
              <p>
                Bit reveals one array value at a time. You may buy once, sell
                once, or make no trade. Your choices are judged only when the
                market closes—there is no fake “wrong” answer before then.
              </p>
            </div>

            <div className="thinking-compare">
              <article className="thinking-card thinking-card--human">
                <div className="thinking-card-heading">
                  <span>WHAT YOU SEE</span>
                  <strong>Only the revealed past</strong>
                </div>
                <div className="human-prices hidden-prices" aria-hidden="true">
                  {[8, 3, "?", "?", "?", "?"].map((price, index) => (
                    <span className={index === 1 ? "is-buy" : ""} key={index}>
                      {price}
                    </span>
                  ))}
                </div>
                <p>“Do I lock this price—or risk waiting for something better?”</p>
              </article>

              <article className="thinking-card thinking-card--machine">
                <div className="thinking-card-heading">
                  <span>YOUR CONTROLS</span>
                  <strong>One trade. Three attempts.</strong>
                </div>
                <div className="rule-actions" aria-hidden="true">
                  <span>BUY</span>
                  <span>WAIT</span>
                  <span>HOLD</span>
                  <span>SELL</span>
                </div>
                <p>
                  First play by instinct. After the round, teach Bit the rule
                  that guarantees the answer.
                </p>
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
                Open the market <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section
            className="concept-slide play-slide market-play-slide"
            aria-hidden={step !== 2}
          >
            <div className="market-game-header">
              <div>
                <span className="game-kicker">
                  Level {game.levelIndex + 1} · {level.title}
                </span>
                <h2>Can you beat the market?</h2>
                <p>{level.lesson} Future prices stay hidden until Bit moves.</p>
              </div>
              <div className="market-stats" aria-label="Current game statistics">
                <div>
                  <span>ATTEMPT</span>
                  <strong>{game.attempt}/3</strong>
                </div>
                <div>
                  <span>CURRENT</span>
                  <strong>{formatProfit(displayedProfit)}</strong>
                </div>
                <div>
                  <span>BEST RUN</span>
                  <strong>{formatProfit(bestAttemptProfit)}</strong>
                </div>
                <div>
                  <span>SCORE</span>
                  <strong>{game.score}</strong>
                </div>
              </div>
              <div
                className="market-progress"
                aria-label={`${daysReached} of ${prices.length} days reached`}
              >
                <span
                  style={{
                    width: `${(daysReached / prices.length) * 100}%`,
                  }}
                />
              </div>
              <div className="game-tools">
                <button
                  type="button"
                  className="sound-toggle"
                  aria-pressed={soundOn}
                  onClick={handleToggleSound}
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
                  ← Review rules
                </button>
              </div>
            </div>

            <nav className="level-path" aria-label="Market levels">
              {challengeLevels.map((challenge, index) => {
                const progress = game.progress[index];
                const canSelect =
                  progress.unlocked &&
                  index !== game.levelIndex &&
                  game.view === "debrief-complete";
                return (
                  <button
                    type="button"
                    className={[
                      index === game.levelIndex ? "is-current" : "",
                      progress.completed ? "is-complete" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!canSelect}
                    onClick={() => {
                      playSound("move");
                      dispatch({ type: "SELECT_LEVEL", levelIndex: index });
                      queueThoughtSound();
                    }}
                    tabIndex={step === 2 ? 0 : -1}
                    aria-label={`${challenge.title}${
                      progress.completed
                        ? ", complete"
                        : progress.unlocked
                          ? ", unlocked"
                          : ", locked"
                    }`}
                    key={challenge.id}
                  >
                    <span>{progress.completed ? "✓" : index + 1}</span>
                    <small>{challenge.title}</small>
                  </button>
                );
              })}
            </nav>

            <div className="market-arena">
              <div className="market-scroll" ref={marketScrollRef}>
                <div className="market-track">
                  <div
                    className={`bit-rig ${rigAlignment}`}
                    style={{ left: `${activePercent}%` }}
                    role="group"
                    aria-label={`Bit is at index ${activeIndex}`}
                  >
                    <div
                      className="bit-thought"
                      ref={bitThoughtRef}
                      tabIndex={-1}
                    >
                      {game.view === "challenge"
                        ? renderChallengeThought()
                        : game.view === "result"
                          ? renderResultThought()
                          : game.view === "debrief"
                            ? renderDebriefThought()
                            : renderDebriefCompleteThought()}
                    </div>
                    {renderMascot()}
                  </div>

                  <div
                    className="market-array"
                    role="list"
                    aria-label="Stock price array"
                    style={{
                      gridTemplateColumns: `repeat(${prices.length}, minmax(68px, 1fr))`,
                    }}
                  >
                    {prices.map((price, index) => {
                      const showAll = revealSolution;
                      const revealed =
                        showAll ||
                        index <= game.currentIndex ||
                        index <= game.revealedThrough;
                      const remembered =
                        game.view === "challenge" &&
                        index > game.currentIndex &&
                        index <= game.revealedThrough;
                      const isOptimal =
                        showAll &&
                        (index === optimal.buyIndex ||
                          index === optimal.sellIndex);
                      const isDebriefMin =
                        game.view === "debrief" &&
                        index === game.debrief?.minIndex;
                      return (
                        <div
                          className={[
                            "market-cell",
                            !revealed ? "is-hidden" : "",
                            remembered ? "is-memory" : "",
                            index === activeIndex ? "is-current" : "",
                            index ===
                            (game.holding?.buyIndex ?? game.trade?.buyIndex)
                              ? "is-bought"
                              : "",
                            index === game.trade?.sellIndex ? "is-sold" : "",
                            isOptimal ? "is-optimal" : "",
                            isDebriefMin ? "is-min" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          role="listitem"
                          aria-label={
                            revealed
                              ? `Index ${index}, stock price $${price}`
                              : `Index ${index}, price hidden`
                          }
                          key={`${level.id}-${index}`}
                        >
                          <small>INDEX {index}</small>
                          <strong>{revealed ? `$${price}` : "?"}</strong>
                          <em>
                            {index ===
                            (game.holding?.buyIndex ?? game.trade?.buyIndex)
                              ? "BOUGHT"
                              : index === game.trade?.sellIndex
                                ? "SOLD"
                                : isDebriefMin
                                  ? "MIN"
                                  : !revealed
                                    ? "LOCKED"
                                    : ""}
                          </em>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="market-narrator"
              role={game.view === "debrief" ? undefined : "status"}
              aria-live={game.view === "debrief" ? undefined : "polite"}
            >
              <span>BIT SAYS</span>
              <p>{game.reaction}</p>
            </div>

            {game.attemptHistory.length > 0 ? (
              <div className="attempt-history">
                <span>RUN HISTORY</span>
                <div
                  className="attempt-trail"
                  role="list"
                  aria-label="Attempt history"
                >
                  {game.attemptHistory.map((attempt) => (
                    <div role="listitem" key={attempt.attempt}>
                      <small>TRY {attempt.attempt}</small>
                      <strong>{formatProfit(attempt.profit)}</strong>
                      <em>{"★".repeat(attempt.stars) || "—"}</em>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
