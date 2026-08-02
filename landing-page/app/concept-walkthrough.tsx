"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  buildBinaryTrace,
  calculateShiftSummary,
  createHuntRun,
  evaluateGuidedCode,
  parseWarehouseProgress,
  scanShelf,
  warehouseShipments,
} from "./binary-search-engine.mjs";

type Stage =
  | "briefing"
  | "hunt"
  | "shipment-result"
  | "shift-result"
  | "reveal"
  | "python"
  | "complete";

type Relation = "lower" | "equal" | "higher";

type ScanRecord = {
  index: number;
  value: number;
  relation: Relation;
  lowBefore: number;
  highBefore: number;
  lowAfter: number;
  highAfter: number;
};

type HuntRun = {
  shipmentIndex: number;
  low: number;
  high: number;
  batteries: number;
  status: "searching" | "found" | "failed";
  scannedIndices: number[];
  history: ScanRecord[];
  lastScan: ScanRecord | null;
};

type ShipmentResult = {
  shipmentIndex: number;
  scans: number;
  unusedBatteries: number;
  secondsLeft: number;
  history: ScanRecord[];
};

type ShiftSummary = {
  score: number;
  stars: number;
  totalScans: number;
  unusedBatteries: number;
  secondsLeft: number;
};

type CodeCase = {
  name: string;
  passed: boolean;
  expected: number;
  actual: number | null;
};

type CodeEvaluation = {
  passed: boolean;
  slotErrors: Partial<Record<"mid" | "left" | "right", string>>;
  cases: CodeCase[];
};

type CodeDraft = {
  mid: string;
  left: string;
  right: string;
};

type UnlockedStage = "hunt" | "reveal" | "python" | "complete";

type WarehouseProgress = {
  version: number;
  currentShipmentIndex: number;
  unlockedStage: UnlockedStage;
  completedShipmentIds: string[];
  completedShipments: {
    shipmentIndex: number;
    scannedIndices: number[];
    secondsLeft: number;
  }[];
  failures: number;
  bestScore: number;
  bestStars: number;
  revealCompleted: boolean;
  pythonCompleted: boolean;
};

type GameState = {
  stage: Stage;
  shipmentIndex: number;
  run: HuntRun;
  results: ShipmentResult[];
  failures: number;
  roundToken: number;
  reaction: string;
  summary: ShiftSummary | null;
  revealStep: number;
  code: CodeDraft;
  codeAttempts: number;
  codeEvaluation: CodeEvaluation | null;
  unlockedStage: UnlockedStage;
  bestScore: number;
  bestStars: number;
  hydrated: boolean;
};

type GameAction =
  | { type: "START_SHIFT" }
  | { type: "SCAN"; index: number; secondsLeft: number }
  | { type: "NEXT_SHIPMENT" }
  | { type: "RETRY_SHIPMENT" }
  | { type: "START_REVEAL" }
  | { type: "NEXT_REVEAL" }
  | { type: "START_PYTHON" }
  | { type: "SET_CODE"; slot: keyof CodeDraft; value: string }
  | { type: "RUN_CODE"; evaluation: CodeEvaluation }
  | { type: "SHOW_SOLUTION" }
  | { type: "RESTART" }
  | { type: "RESUME" }
  | {
      type: "HYDRATE";
      progress: WarehouseProgress;
    };

const progressKey = "leetgame.warehouse.v1";
const soundKey = "leetgame-sound";
const stageLabels = ["Mission", "Discovery", "Code"];
const canonicalCode: CodeDraft = {
  mid: "left + (right - left) // 2",
  left: "left = mid + 1",
  right: "right = mid - 1",
};

function createInitialState(): GameState {
  return {
    stage: "briefing",
    shipmentIndex: 0,
    run: createHuntRun(0) as HuntRun,
    results: [],
    failures: 0,
    roundToken: 0,
    reaction: "A rush manifest just arrived. Bit is ready to scan.",
    summary: null,
    revealStep: 0,
    code: { mid: "", left: "", right: "" },
    codeAttempts: 0,
    codeEvaluation: null,
    unlockedStage: "hunt",
    bestScore: 0,
    bestStars: 0,
    hydrated: false,
  };
}

function restoreShipmentResults(progress: WarehouseProgress): ShipmentResult[] {
  return (progress.completedShipments ?? []).map((checkpoint) => {
    let run = createHuntRun(checkpoint.shipmentIndex) as HuntRun;
    checkpoint.scannedIndices.forEach((index) => {
      run = scanShelf(run, index) as HuntRun;
    });
    return {
      shipmentIndex: checkpoint.shipmentIndex,
      scans: run.history.length,
      unusedBatteries: run.batteries,
      secondsLeft: checkpoint.secondsLeft,
      history: run.history,
    };
  });
}

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "START_SHIFT") {
    return {
      ...createInitialState(),
      stage: "hunt",
      run: createHuntRun(0) as HuntRun,
      roundToken: state.roundToken + 1,
      unlockedStage: state.unlockedStage,
      bestScore: state.bestScore,
      bestStars: state.bestStars,
      hydrated: state.hydrated,
      reaction: "Shipment one is live. Choose a shelf to scan.",
    };
  }

  if (action.type === "SCAN" && state.stage === "hunt") {
    const nextRun = scanShelf(state.run, action.index) as HuntRun;
    if (nextRun === state.run) return state;

    const shipment = warehouseShipments[state.shipmentIndex];
    const scanned = nextRun.lastScan;
    let reaction = "Bit scanned a shelf.";
    if (scanned?.relation === "lower") {
      reaction = `${scanned.value} is lower than ${shipment.target}. Lower racks cleared.`;
    } else if (scanned?.relation === "higher") {
      reaction = `${scanned.value} is higher than ${shipment.target}. Higher racks cleared.`;
    } else if (scanned?.relation === "equal") {
      reaction = `Parcel P-${shipment.target} secured!`;
    }

    if (nextRun.status === "found") {
      const result: ShipmentResult = {
        shipmentIndex: state.shipmentIndex,
        scans: nextRun.history.length,
        unusedBatteries: nextRun.batteries,
        secondsLeft: action.secondsLeft,
        history: nextRun.history,
      };
      return {
        ...state,
        stage: "shipment-result",
        run: nextRun,
        results: [...state.results, result],
        reaction,
      };
    }

    if (nextRun.status === "failed") {
      return {
        ...state,
        stage: "shipment-result",
        run: nextRun,
        reaction:
          "Scanner battery empty. The parcel is still somewhere in the active racks.",
      };
    }

    return { ...state, run: nextRun, reaction };
  }

  if (
    action.type === "NEXT_SHIPMENT" &&
    state.stage === "shipment-result" &&
    state.run.status === "found"
  ) {
    if (state.shipmentIndex === warehouseShipments.length - 1) {
      const summary = calculateShiftSummary(
        state.results,
        state.failures,
      ) as ShiftSummary;
      return {
        ...state,
        stage: "shift-result",
        summary,
        unlockedStage: "reveal",
        bestScore: Math.max(state.bestScore, summary.score),
        bestStars: Math.max(state.bestStars, summary.stars),
        reaction: "All three parcels made the truck. Shift cleared.",
      };
    }

    const shipmentIndex = state.shipmentIndex + 1;
    return {
      ...state,
      stage: "hunt",
      shipmentIndex,
      run: createHuntRun(shipmentIndex) as HuntRun,
      roundToken: state.roundToken + 1,
      reaction: `Shipment ${shipmentIndex + 1} is live. Find the next parcel.`,
    };
  }

  if (
    action.type === "RETRY_SHIPMENT" &&
    state.stage === "shipment-result" &&
    state.run.status === "failed"
  ) {
    return {
      ...state,
      stage: "hunt",
      run: createHuntRun(state.shipmentIndex) as HuntRun,
      failures: state.failures + 1,
      roundToken: state.roundToken + 1,
      reaction:
        "Fresh scanner loaded. Try to clear as many shelves as possible with each scan.",
    };
  }

  if (action.type === "START_REVEAL" && state.stage === "shift-result") {
    return {
      ...state,
      stage: "reveal",
      revealStep: 0,
      reaction: "Now let’s name the strategy hiding inside your shift.",
    };
  }

  if (action.type === "NEXT_REVEAL" && state.stage === "reveal") {
    if (state.revealStep < 3) {
      return { ...state, revealStep: state.revealStep + 1 };
    }
    return {
      ...state,
      stage: "python",
      unlockedStage: "python",
      reaction: "Turn the warehouse strategy into three lines of Python.",
    };
  }

  if (action.type === "START_PYTHON") {
    return {
      ...state,
      stage: "python",
      unlockedStage: "python",
      reaction: "The function is ready. Complete the three decisions you made.",
    };
  }

  if (action.type === "SET_CODE" && state.stage === "python") {
    return {
      ...state,
      code: { ...state.code, [action.slot]: action.value },
      codeEvaluation: null,
    };
  }

  if (action.type === "RUN_CODE" && state.stage === "python") {
    const attempts = state.codeAttempts + 1;
    if (action.evaluation.passed) {
      return {
        ...state,
        stage: "complete",
        codeAttempts: attempts,
        codeEvaluation: action.evaluation,
        unlockedStage: "complete",
        reaction: "Every mission test passed. You can now code the strategy.",
      };
    }
    return {
      ...state,
      codeAttempts: attempts,
      codeEvaluation: action.evaluation,
      reaction: "One of the warehouse rules does not match your code yet.",
    };
  }

  if (action.type === "SHOW_SOLUTION" && state.stage === "python") {
    return {
      ...state,
      code: canonicalCode,
      codeEvaluation: null,
      reaction: "Solution loaded. Run it once to watch Bit prove every case.",
    };
  }

  if (action.type === "RESUME") {
    if (state.unlockedStage === "complete") {
      return { ...state, stage: "complete" };
    }
    if (state.unlockedStage === "python") {
      return { ...state, stage: "python" };
    }
    if (state.unlockedStage === "reveal") {
      return { ...state, stage: "reveal", revealStep: 0 };
    }
    if (state.results.length === warehouseShipments.length) {
      const summary = calculateShiftSummary(
        state.results,
        state.failures,
      ) as ShiftSummary;
      return {
        ...state,
        stage: "shift-result",
        summary,
        unlockedStage: "reveal",
        bestScore: Math.max(state.bestScore, summary.score),
        bestStars: Math.max(state.bestStars, summary.stars),
      };
    }
    if (state.results.length > 0) {
      return {
        ...state,
        stage: "hunt",
        run: createHuntRun(state.shipmentIndex) as HuntRun,
        roundToken: state.roundToken + 1,
        reaction: `Shipment ${state.shipmentIndex + 1} is ready to resume.`,
      };
    }
    return gameReducer(state, { type: "START_SHIFT" });
  }

  if (action.type === "RESTART") {
    return {
      ...createInitialState(),
      stage: "hunt",
      run: createHuntRun(0) as HuntRun,
      roundToken: state.roundToken + 1,
      unlockedStage: state.unlockedStage,
      bestScore: state.bestScore,
      bestStars: state.bestStars,
      hydrated: state.hydrated,
    };
  }

  if (action.type === "HYDRATE") {
    const results = restoreShipmentResults(action.progress);
    const shipmentIndex = Math.min(
      results.length,
      warehouseShipments.length - 1,
    );
    return {
      ...state,
      shipmentIndex,
      run: createHuntRun(shipmentIndex) as HuntRun,
      results,
      failures: action.progress.failures ?? 0,
      unlockedStage: action.progress.unlockedStage,
      bestScore: action.progress.bestScore,
      bestStars: action.progress.bestStars,
      hydrated: true,
    };
  }

  return state;
}

function stageIndex(stage: Stage) {
  if (stage === "briefing" || stage === "hunt" || stage === "shipment-result") {
    return 0;
  }
  if (stage === "shift-result" || stage === "reveal") return 1;
  return 2;
}

function formatTime(milliseconds: number) {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}

function BitMascot({ mood = "ready" }: { mood?: "ready" | "scan" | "win" }) {
  return (
    <div className={`warehouse-bit is-${mood}`} aria-hidden="true">
      <span className="warehouse-bit-antenna" />
      <span className="warehouse-bit-face">
        <i />
        <i />
      </span>
      <small>BIT</small>
    </div>
  );
}

export function ConceptWalkthrough() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [soundOn, setSoundOn] = useState(true);
  const [remainingMs, setRemainingMs] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerDeadlineRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const actionLockRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const stageFocusRef = useRef<HTMLHeadingElement | null>(null);
  const pythonEditorRef = useRef<HTMLDivElement | null>(null);

  const shipment = warehouseShipments[game.shipmentIndex];
  const finalShipment = warehouseShipments[warehouseShipments.length - 1]!;
  const trace = useMemo(
    () =>
      buildBinaryTrace(
        [...finalShipment.shelves],
        finalShipment.target,
      ),
    [finalShipment],
  );
  const currentStageIndex = stageIndex(game.stage);
  const visibleScore =
    game.summary?.score ??
    Math.max(
      0,
      game.results.reduce(
        (score, result) =>
          score +
          1_000 +
          result.unusedBatteries * 200 +
          result.secondsLeft * 10,
        0,
      ) -
        game.failures * 200,
    );

  useEffect(() => {
    const storedSound = window.localStorage.getItem(soundKey);
    const soundFrame =
      storedSound === null
        ? null
        : window.requestAnimationFrame(() => setSoundOn(storedSound === "on"));

    const saved = parseWarehouseProgress(
      window.localStorage.getItem(progressKey),
    ) as WarehouseProgress;
    dispatch({ type: "HYDRATE", progress: saved });

    return () => {
      if (soundFrame !== null) window.cancelAnimationFrame(soundFrame);
      if (lockTimerRef.current !== null) window.clearTimeout(lockTimerRef.current);
      if (audioContextRef.current) void audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!game.hydrated) return;
    window.localStorage.setItem(
      progressKey,
      JSON.stringify({
        version: 1,
        currentShipmentIndex: game.shipmentIndex,
        unlockedStage: game.unlockedStage,
        completedShipmentIds: game.results.map(
          (result) => warehouseShipments[result.shipmentIndex].id,
        ),
        completedShipments: game.results.map((result) => ({
          shipmentIndex: result.shipmentIndex,
          scannedIndices: result.history.map((scan) => scan.index),
          secondsLeft: result.secondsLeft,
        })),
        failures: game.failures,
        bestScore: game.bestScore,
        bestStars: game.bestStars,
        revealCompleted:
          game.unlockedStage === "python" || game.unlockedStage === "complete",
        pythonCompleted: game.unlockedStage === "complete",
      }),
    );
  }, [
    game.bestScore,
    game.bestStars,
    game.codeAttempts,
    game.failures,
    game.hydrated,
    game.results,
    game.shipmentIndex,
    game.unlockedStage,
  ]);

  useEffect(() => {
    if (game.stage !== "hunt" || shipment.bonusSeconds <= 0) {
      return;
    }

    timerDeadlineRef.current = performance.now() + shipment.bonusSeconds * 1000;

    const update = () => {
      if (pausedAtRef.current !== null) return;
      setRemainingMs(Math.max(0, timerDeadlineRef.current - performance.now()));
    };
    const initialFrame = window.requestAnimationFrame(update);
    const interval = window.setInterval(update, 100);
    const onVisibility = () => {
      if (document.hidden) {
        pausedAtRef.current = performance.now();
      } else if (pausedAtRef.current !== null) {
        timerDeadlineRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
        update();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      timerDeadlineRef.current = 0;
      pausedAtRef.current = null;
    };
  }, [game.roundToken, game.stage, shipment.bonusSeconds]);

  useEffect(() => {
    if (game.stage === "hunt" && game.run.status === "searching") {
      const focusIndex =
        game.run.lastScan?.relation === "higher" ? game.run.high : game.run.low;
      const frame = window.requestAnimationFrame(() => {
        rackRef.current
          ?.querySelector<HTMLButtonElement>(
            `[data-shelf-index="${focusIndex}"]`,
          )
          ?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (
      game.stage === "shipment-result" ||
      game.stage === "shift-result" ||
      game.stage === "reveal" ||
      game.stage === "python" ||
      game.stage === "complete"
    ) {
      const frame = window.requestAnimationFrame(() => {
        stageFocusRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [
    game.revealStep,
    game.run.high,
    game.run.lastScan?.relation,
    game.run.low,
    game.run.status,
    game.stage,
  ]);

  useEffect(() => {
    if (
      game.stage !== "python" ||
      !game.codeEvaluation ||
      game.codeEvaluation.passed
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      pythonEditorRef.current
        ?.querySelector<HTMLInputElement>(".has-error input")
        ?.focus({ preventScroll: false });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [game.codeEvaluation, game.stage]);

  function claimActionLock(duration = 420) {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    lockTimerRef.current = window.setTimeout(() => {
      actionLockRef.current = false;
    }, duration);
    return true;
  }

  function playSound(
    tone: "scan" | "clear" | "fail" | "win" | "code" = "scan",
  ) {
    if (!soundOn || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const notes: Record<typeof tone, [number, number, number]> = {
      scan: [340, 520, 0.12],
      clear: [280, 430, 0.16],
      fail: [210, 145, 0.2],
      win: [520, 920, 0.28],
      code: [440, 720, 0.2],
    };
    const [start, end, duration] = notes[tone];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = tone === "fail" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function handleShelfClick(event: MouseEvent<HTMLButtonElement>) {
    const index = Number(event.currentTarget.dataset.shelfIndex);
    if (!Number.isInteger(index)) return;
    if (!claimActionLock()) return;
    const preview = scanShelf(game.run, index) as HuntRun;
    if (preview === game.run) return;
    const feedback =
      preview.status === "found"
        ? "win"
        : preview.status === "failed"
          ? "fail"
          : "clear";
    playSound(feedback);
    navigator.vibrate?.(
      feedback === "win"
        ? [15, 24, 28]
        : feedback === "fail"
          ? [22, 28, 22]
          : 10,
    );
    const liveRemainingMs = timerDeadlineRef.current
      ? Math.max(0, timerDeadlineRef.current - performance.now())
      : remainingMs;
    dispatch({
      type: "SCAN",
      index,
      secondsLeft: formatTime(liveRemainingMs),
    });
  }

  function handleShelfKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.shelfIndex);
    if (!Number.isInteger(index)) return;
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    let next = index + direction;
    while (next >= game.run.low && next <= game.run.high) {
      if (!game.run.scannedIndices.includes(next)) {
        rackRef.current
          ?.querySelector<HTMLButtonElement>(`[data-shelf-index="${next}"]`)
          ?.focus();
        return;
      }
      next += direction;
    }
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem(soundKey, next ? "on" : "off");
    if (next) window.setTimeout(() => playSound("scan"), 0);
  }

  function handleRunCode() {
    const evaluation = evaluateGuidedCode(game.code) as CodeEvaluation;
    playSound(evaluation.passed ? "code" : "fail");
    navigator.vibrate?.(evaluation.passed ? [12, 18, 20] : [18, 24, 18]);
    dispatch({ type: "RUN_CODE", evaluation });
  }

  function renderBriefing() {
    const canResume =
      game.unlockedStage !== "hunt" || game.results.length > 0;
    return (
      <section className="warehouse-briefing" aria-labelledby="warehouse-title">
        <div className="warehouse-briefing-copy">
          <span className="warehouse-kicker">WAREHOUSE HUNT · DISPATCH 07</span>
          <h2 id="warehouse-title">Find the parcel before the scanner dies.</h2>
          <p>
            Parcel IDs rise from the lowest rack to the highest. Bit has one
            rush manifest and only a few scans. Where would you look first?
          </p>
          <div className="warehouse-briefing-actions">
            <button
              type="button"
              className="button button-primary button-large"
              onClick={() => {
                playSound("scan");
                dispatch({ type: "START_SHIFT" });
              }}
            >
              Clock in <span aria-hidden="true">→</span>
            </button>
            {canResume ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => dispatch({ type: "RESUME" })}
              >
                Resume mastery
              </button>
            ) : null}
          </div>
          <div className="warehouse-briefing-meta" aria-label="Mission format">
            <span>3 shipments</span>
            <span>7 → 15 → 31 racks</span>
            <span>No lecture</span>
          </div>
        </div>

        <div className="warehouse-briefing-scene" aria-hidden="true">
          <div className="manifest-card">
            <span>RUSH MANIFEST</span>
            <strong>FIND P-{warehouseShipments[0].target}</strong>
            <small>TRUCK 07 · BAY C</small>
          </div>
          <div className="briefing-racks">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index}>
                <i />
                ?
              </span>
            ))}
          </div>
          <BitMascot />
          <div className="warehouse-direction">
            <span>LOW IDS</span>
            <i />
            <span>HIGH IDS</span>
          </div>
        </div>
      </section>
    );
  }

  function renderHunt() {
    const bonusSeconds = formatTime(remainingMs);
    return (
      <section className="warehouse-hunt" aria-labelledby="hunt-title">
        <div className="warehouse-hud">
          <div>
            <span>SHIPMENT</span>
            <strong>
              {game.shipmentIndex + 1}/{warehouseShipments.length}
            </strong>
          </div>
          <div>
            <span>SCANNER</span>
            <strong
              role="img"
              aria-label={`${game.run.batteries} scanner charges left`}
            >
              {Array.from({ length: shipment.scanBudget }, (_, index) => (
                <i
                  aria-hidden="true"
                  className={index < game.run.batteries ? "is-live" : ""}
                  key={index}
                />
              ))}
            </strong>
          </div>
          <div>
            <span>BONUS CLOCK</span>
            <strong>{shipment.bonusSeconds ? `${bonusSeconds}s` : "PRACTICE"}</strong>
          </div>
          <div>
            <span>SCORE</span>
            <strong>{visibleScore}</strong>
          </div>
          <button
            type="button"
            className="warehouse-sound"
            aria-pressed={soundOn}
            onClick={handleToggleSound}
          >
            {soundOn ? "Sound on" : "Sound off"}
          </button>
        </div>

        <div className="warehouse-mission-line">
          <div>
            <span className="warehouse-kicker">{shipment.title}</span>
            <h2 id="hunt-title">Find P-{shipment.target}</h2>
          </div>
          <div className="mission-bit">
            <BitMascot mood={game.run.lastScan ? "scan" : "ready"} />
            <p>Tap a sealed shelf. One scan can clear an entire side.</p>
          </div>
        </div>

        <div className="warehouse-rack-frame">
          <div className="rack-signage" aria-hidden="true">
            <span>LOW PARCEL IDS</span>
            <i />
            <span>HIGH PARCEL IDS</span>
          </div>
          <div
            className={`warehouse-racks rack-count-${shipment.shelves.length}`}
            role="group"
            aria-label={`Ordered rack with ${shipment.shelves.length} sealed shelves`}
            ref={rackRef}
          >
            {shipment.shelves.map((value: number, index: number) => {
              const scanned = game.run.scannedIndices.includes(index);
              const active =
                game.run.status === "searching" &&
                index >= game.run.low &&
                index <= game.run.high &&
                !scanned;
              const eliminated = index < game.run.low || index > game.run.high;
              const current = game.run.lastScan?.index === index;
              const found = current && value === shipment.target;
              return (
                <button
                  type="button"
                  className={[
                    "warehouse-shelf",
                    active ? "is-active" : "",
                    scanned ? "is-scanned" : "",
                    eliminated ? "is-cleared" : "",
                    current ? "is-current" : "",
                    found ? "is-found" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!active}
                  data-shelf-index={index}
                  aria-label={
                    scanned
                      ? `Shelf ${index + 1}, scanned parcel ${value}`
                      : eliminated
                        ? `Shelf ${index + 1}, cleared`
                        : `Shelf ${index + 1}, sealed`
                  }
                  onClick={handleShelfClick}
                  onKeyDown={handleShelfKeyDown}
                  key={`${shipment.id}-${index}`}
                >
                  {current ? <span className="scanner-beam" /> : null}
                  <small>S{String(index + 1).padStart(2, "0")}</small>
                  <strong>{scanned ? `P-${value}` : "?"}</strong>
                  <em>
                    {found ? "SECURED" : eliminated ? "CLEARED" : "SEALED"}
                  </em>
                </button>
              );
            })}
          </div>
        </div>

        <div className="warehouse-status" role="status" aria-live="polite" aria-atomic="true">
          <span>DISPATCH</span>
          <p>{game.reaction}</p>
        </div>
      </section>
    );
  }

  function renderShipmentResult() {
    const found = game.run.status === "found";
    const result = game.results.at(-1);
    return (
      <section className={`shipment-result ${found ? "is-win" : "is-fail"}`}>
        <BitMascot mood={found ? "win" : "ready"} />
        <span className="warehouse-kicker">
          {found ? "PARCEL SECURED" : "SCANNER EMPTY"}
        </span>
        <h2 ref={stageFocusRef} tabIndex={-1}>
          {found
            ? `P-${shipment.target} made the truck.`
            : `P-${shipment.target} is still in the racks.`}
        </h2>
        <p>
          {found
            ? `Bit found it in ${result?.scans ?? game.run.history.length} scans with ${result?.unusedBatteries ?? 0} charge left.`
            : "Choose scans that remove the largest possible section. Your next scanner is ready."}
        </p>
        <div className="shipment-result-stats">
          <div>
            <span>SCANS</span>
            <strong>{game.run.history.length}/{shipment.scanBudget}</strong>
          </div>
          <div>
            <span>SHIFT SCORE</span>
            <strong>{visibleScore}</strong>
          </div>
        </div>
        <button
          type="button"
          className="button button-primary button-large"
          onClick={() => {
            if (found) {
              playSound("win");
              dispatch({ type: "NEXT_SHIPMENT" });
            } else {
              playSound("scan");
              dispatch({ type: "RETRY_SHIPMENT" });
            }
          }}
        >
          {found
            ? game.shipmentIndex === warehouseShipments.length - 1
              ? "Close the shift"
              : "Load next shipment"
            : "Retry shipment"}
        </button>
      </section>
    );
  }

  function renderShiftResult() {
    const summary = game.summary;
    return (
      <section className="shift-result">
        <div className="shift-result-celebration" aria-hidden="true">
          <BitMascot mood="win" />
          <span>✓</span>
        </div>
        <span className="warehouse-kicker">SHIFT CLEARED · TRUCK 07 DEPARTED</span>
        <h2 ref={stageFocusRef} tabIndex={-1}>Three parcels. One sharp instinct.</h2>
        <div
          className="warehouse-stars"
          role="img"
          aria-label={`${summary?.stars ?? 1} out of 3 stars`}
        >
          {[0, 1, 2].map((star) => (
            <span className={star < (summary?.stars ?? 1) ? "is-earned" : ""} key={star}>
              ★
            </span>
          ))}
        </div>
        <div className="shift-score-grid">
          <div><span>SCORE</span><strong>{summary?.score ?? visibleScore}</strong></div>
          <div><span>TOTAL SCANS</span><strong>{summary?.totalScans ?? 0}</strong></div>
          <div><span>RETRIES</span><strong>{game.failures}</strong></div>
          <div><span>BEST</span><strong>{Math.max(game.bestScore, summary?.score ?? 0)}</strong></div>
        </div>
        <p>
          You did not need every shelf. Now see the repeatable strategy hiding
          inside your choices.
        </p>
        <div className="shift-result-actions">
          <button
            type="button"
            className="button button-primary button-large"
            onClick={() => dispatch({ type: "START_REVEAL" })}
          >
            Reveal Bit&apos;s trick <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => dispatch({ type: "RESTART" })}
          >
            Run the shift again
          </button>
        </div>
      </section>
    );
  }

  function renderReveal() {
    const playerRun = game.results.at(-1);
    const playerHistory = playerRun?.history ?? [];
    const showingPlayerRoute = game.revealStep === 0 && playerHistory.length > 0;
    const canonicalProgress = [0, Math.floor((trace.length - 1) / 2), trace.length - 1];
    const canonicalFrameIndex = canonicalProgress[
      Math.max(0, game.revealStep - 1)
    ];
    const visibleReplay = showingPlayerRoute
      ? playerHistory
      : trace.slice(0, canonicalFrameIndex + 1);
    const activeReplayFrame = visibleReplay.at(-1);
    const activeIndex = showingPlayerRoute
      ? (activeReplayFrame as ScanRecord | undefined)?.index
      : (activeReplayFrame as { mid: number } | undefined)?.mid;
    const activeLow = activeReplayFrame?.lowAfter ?? 0;
    const activeHigh = activeReplayFrame?.highAfter ?? finalShipment.shelves.length - 1;
    const checkedIndices = new Set(
      visibleReplay.map((frame) =>
        showingPlayerRoute
          ? (frame as ScanRecord).index
          : (frame as { mid: number }).mid,
      ),
    );
    const revealCopy = [
      {
        kicker: playerHistory.length
          ? "YOUR SHIFT, REPLAYED"
          : "YOUR CLEARED SHIFT",
        title: playerHistory.length
          ? "This is the route you actually took."
          : "You searched a fraction of the warehouse.",
        body: playerHistory.length
          ? `${finalShipment.shelves.length} shelves were waiting. Your ${playerRun?.scans} scans are highlighted in the order you played them.`
          : "Your win is saved. Bit rebuilt a clean route so you can inspect the strategy behind it.",
      },
      {
        kicker: "THE REPEATABLE TRICK",
        title: "A centered scan protects you from the worst case.",
        body: "Compare one parcel, discard the side that cannot contain the target, then center the scanner in what remains.",
      },
      {
        kicker: "PATTERN UNLOCKED",
        title: "That strategy is Binary Search.",
        body: "It turns a sorted warehouse into a shrinking search range instead of a shelf-by-shelf hunt.",
      },
      {
        kicker: "WHY IT SCALES",
        title: "31 shelves → 5 scans. 1,023 shelves → 10.",
        body: "Each comparison removes roughly half of the remaining work. That growth rate is O(log n).",
      },
    ][game.revealStep];

    return (
      <section className="warehouse-reveal" aria-labelledby="reveal-title">
        <div className="reveal-copy">
          <span className="warehouse-kicker">{revealCopy.kicker}</span>
          <h2
            id="reveal-title"
            ref={stageFocusRef}
            tabIndex={-1}
            aria-live="polite"
          >
            {revealCopy.title}
          </h2>
          <p>{revealCopy.body}</p>
          {game.revealStep >= 2 ? (
            <div className="pattern-name">
              <span>LEETCODE 704</span>
              <strong>BINARY SEARCH</strong>
            </div>
          ) : null}
          <button
            type="button"
            className="button button-primary button-large"
            onClick={() => dispatch({ type: "NEXT_REVEAL" })}
          >
            {game.revealStep === 3 ? "Write the strategy" : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="reveal-board">
          <div className="reveal-range-labels">
            <span>left</span>
            <span>{showingPlayerRoute ? "your route" : "repeatable route"}</span>
            <span>right</span>
          </div>
          <div
            className="reveal-shelves"
            aria-label={showingPlayerRoute ? "Your shelf scan replay" : "Strategy replay"}
          >
            {finalShipment.shelves.map((value: number, index: number) => {
              const checkedOrder = visibleReplay.findIndex((frame) =>
                showingPlayerRoute
                  ? (frame as ScanRecord).index === index
                  : (frame as { mid: number }).mid === index,
              );
              const outside =
                index < activeLow || index > activeHigh;
              return (
                <span
                  className={[
                    checkedIndices.has(index) ? "is-checked" : "",
                    outside ? "is-discarded" : "",
                    index === activeIndex ? "is-middle" : "",
                  ].filter(Boolean).join(" ")}
                  key={index}
                >
                  <small>
                    {checkedOrder >= 0 ? `SCAN ${checkedOrder + 1}` : index}
                  </small>
                  <strong>{value}</strong>
                </span>
              );
            })}
          </div>
          <div className="concept-mapping">
            <div><span>WAREHOUSE</span><strong>sorted array</strong></div>
            <div><span>ACTIVE RACK</span><strong>left ↔ right</strong></div>
            <div><span>SAFEST SCAN</span><strong>middle</strong></div>
            <div><span>CLEARED SIDE</span><strong>discard half</strong></div>
          </div>
        </div>
      </section>
    );
  }

  function renderPython() {
    const errors = game.codeEvaluation?.slotErrors ?? {};
    return (
      <section className="python-bridge" aria-labelledby="python-title">
        <div className="python-copy">
          <span className="warehouse-kicker">FROM INSTINCT TO PYTHON</span>
          <h2 id="python-title" ref={stageFocusRef} tabIndex={-1}>
            Code the shift you just mastered.
          </h2>
          <p>
            The warehouse loop is already here. Complete the three lines that
            choose the center and clear either side.
          </p>
          <div className="python-test-summary" aria-live="polite">
            <span>ATTEMPT {game.codeAttempts + 1}</span>
            <strong>
              {game.codeEvaluation
                ? game.codeEvaluation.passed
                  ? "ALL TESTS PASSED"
                  : "KEEP DEBUGGING"
                : "MISSION TESTS READY"}
            </strong>
          </div>
          {game.codeEvaluation ? (
            <div className="python-cases" role="list" aria-label="Code test results">
              {game.codeEvaluation.cases.map((testCase) => (
                <div className={testCase.passed ? "is-pass" : "is-fail"} role="listitem" key={testCase.name}>
                  <span>{testCase.passed ? "✓" : "×"}</span>
                  <strong>{testCase.name}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="python-editor"
          aria-label="Guided Python editor"
          ref={pythonEditorRef}
        >
          <div className="python-editor-bar">
            <span><i /> find_parcel.py</span>
            <small>PYTHON</small>
          </div>
          <div className="python-code">
            <code><b>def</b> binary_search(shelves, target):</code>
            <code>    left, right = 0, len(shelves) - 1</code>
            <code>    <b>while</b> left &lt;= right:</code>
            <label className={errors.mid ? "has-error" : ""}>
              <span>        mid = </span>
              <input
                value={game.code.mid}
                onChange={(event) => dispatch({ type: "SET_CODE", slot: "mid", value: event.target.value })}
                placeholder="center expression"
                aria-label="Python expression for the middle shelf"
                aria-describedby={errors.mid ? "mid-error" : undefined}
              />
            </label>
            {errors.mid ? <small id="mid-error">{errors.mid}</small> : null}
            <code>        <b>if</b> shelves[mid] == target:</code>
            <code>            <b>return</b> mid</code>
            <code>        <b>if</b> shelves[mid] &lt; target:</code>
            <label className={errors.left ? "has-error" : ""}>
              <span>            </span>
              <input
                value={game.code.left}
                onChange={(event) => dispatch({ type: "SET_CODE", slot: "left", value: event.target.value })}
                placeholder="move the left edge"
                aria-label="Python line for moving the left edge"
                aria-describedby={errors.left ? "left-error" : undefined}
              />
            </label>
            {errors.left ? <small id="left-error">{errors.left}</small> : null}
            <code>        <b>else</b>:</code>
            <label className={errors.right ? "has-error" : ""}>
              <span>            </span>
              <input
                value={game.code.right}
                onChange={(event) => dispatch({ type: "SET_CODE", slot: "right", value: event.target.value })}
                placeholder="move the right edge"
                aria-label="Python line for moving the right edge"
                aria-describedby={errors.right ? "right-error" : undefined}
              />
            </label>
            {errors.right ? <small id="right-error">{errors.right}</small> : null}
            <code>    <b>return</b> -1</code>
          </div>
          <div className="python-editor-actions">
            {game.codeAttempts >= 2 ? (
              <button type="button" className="button button-secondary" onClick={() => dispatch({ type: "SHOW_SOLUTION" })}>
                Show assisted solution
              </button>
            ) : <span />}
            <button type="button" className="button button-primary" onClick={handleRunCode}>
              Run mission tests <span aria-hidden="true">▶</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderComplete() {
    const summary = game.summary;
    return (
      <section className="mastery-complete">
        <div className="mastery-badge" aria-hidden="true">
          <BitMascot mood="win" />
          <span>704</span>
        </div>
        <span className="warehouse-kicker">MISSION MASTERED</span>
        <h2 ref={stageFocusRef} tabIndex={-1}>
          You played it. You named it. You coded it.
        </h2>
        <p>
          Binary Search now has a real memory attached to it: scan the center,
          clear half the warehouse, and repeat.
        </p>
        <div className="mastery-stats">
          <div><span>SHIFT SCORE</span><strong>{summary?.score ?? game.bestScore}</strong></div>
          <div><span>CODE ATTEMPTS</span><strong>{game.codeAttempts}</strong></div>
          <div><span>COMPLEXITY</span><strong>O(log n)</strong></div>
        </div>
        <pre aria-label="Completed Python Binary Search solution"><code>{`def binary_search(shelves, target):
    left, right = 0, len(shelves) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if shelves[mid] == target:
            return mid
        if shelves[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`}</code></pre>
        <div className="mastery-actions">
          <button type="button" className="button button-secondary" onClick={() => dispatch({ type: "RESTART" })}>
            Replay Warehouse Hunt
          </button>
          <a
            className="button button-primary"
            href="https://leetcode.com/problems/binary-search/"
            target="_blank"
            rel="noreferrer"
          >
            Solve LeetCode 704 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <div className="product-frame concept-frame warehouse-frame">
      <div className="product-toolbar">
        <div className="traffic-lights" aria-hidden="true"><span /><span /><span /></div>
        <div className="product-title"><span className="status-dot" />Warehouse Hunt · Dispatch 07</div>
        <button
          type="button"
          className="toolbar-sound"
          aria-label={soundOn ? "Turn game sound off" : "Turn game sound on"}
          aria-pressed={soundOn}
          onClick={handleToggleSound}
        >
          {soundOn ? "◖))" : "◖×"}
        </button>
      </div>

      <ol className="warehouse-stage-rail" aria-label="Learning journey">
        {stageLabels.map((label, index) => (
          <li
            className={index === currentStageIndex ? "is-current" : index < currentStageIndex ? "is-complete" : ""}
            aria-current={index === currentStageIndex ? "step" : undefined}
            key={label}
          >
            <span>{index < currentStageIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="warehouse-stage">
        {game.stage === "briefing" ? renderBriefing() : null}
        {game.stage === "hunt" ? renderHunt() : null}
        {game.stage === "shipment-result" ? renderShipmentResult() : null}
        {game.stage === "shift-result" ? renderShiftResult() : null}
        {game.stage === "reveal" ? renderReveal() : null}
        {game.stage === "python" ? renderPython() : null}
        {game.stage === "complete" ? renderComplete() : null}
      </div>
    </div>
  );
}
