import assert from "node:assert/strict";
import test from "node:test";

import {
  WAREHOUSE_PROGRESS_VERSION,
  buildBinaryTrace,
  calculateShiftSummary,
  createHuntRun,
  defaultWarehouseProgress,
  evaluateGuidedCode,
  parseWarehouseProgress,
  scanShelf,
  tokenizeGuidedLine,
  warehouseShipments,
} from "../app/binary-search-engine.mjs";

test("ships deterministic 7/15/31 shelf fixtures with 3/4/5 budgets", () => {
  assert.deepEqual(
    warehouseShipments.map((shipment) => shipment.shelves.length),
    [7, 15, 31],
  );
  assert.deepEqual(
    warehouseShipments.map((shipment) => shipment.scanBudget),
    [3, 4, 5],
  );
  assert.deepEqual(
    warehouseShipments.map((shipment) =>
      buildBinaryTrace(shipment.shelves, shipment.target).length,
    ),
    [3, 4, 5],
  );
});

test("creates a hunt and auto-eliminates the impossible range", () => {
  const shipment = warehouseShipments[0];
  const initial = createHuntRun(0);
  assert.deepEqual(initial, {
    shipmentIndex: 0,
    low: 0,
    high: 6,
    batteries: 3,
    status: "searching",
    scannedIndices: [],
    history: [],
    lastScan: null,
  });

  const afterLowShelf = scanShelf(initial, 3);
  assert.equal(afterLowShelf.lastScan.value, shipment.shelves[3]);
  assert.equal(afterLowShelf.lastScan.relation, "lower");
  assert.equal(afterLowShelf.low, 4);
  assert.equal(afterLowShelf.high, 6);
  assert.equal(afterLowShelf.batteries, 2);

  const afterHighShelf = scanShelf(afterLowShelf, 5);
  assert.equal(afterHighShelf.lastScan.relation, "higher");
  assert.equal(afterHighShelf.low, 4);
  assert.equal(afterHighShelf.high, 4);
  assert.equal(afterHighShelf.batteries, 1);

  const found = scanShelf(afterHighShelf, 4);
  assert.equal(found.status, "found");
  assert.equal(found.batteries, 0);
  assert.deepEqual(found.scannedIndices, [3, 5, 4]);
  assert.equal(found.history.length, 3);
});

test("player-selected scans can differ from midpoint and invalid scans are identity no-ops", () => {
  const initial = createHuntRun(0);
  const selected = scanShelf(initial, 0);
  assert.equal(selected.low, 1);
  assert.equal(selected.lastScan.index, 0);

  assert.strictEqual(scanShelf(selected, 0), selected, "opened shelf");
  assert.strictEqual(scanShelf(selected, -1), selected, "negative index");
  assert.strictEqual(scanShelf(selected, 99), selected, "outside range");
  assert.strictEqual(scanShelf(selected, 1.5), selected, "fractional index");
});

test("exhausting the scan batteries fails and inactive runs remain unchanged", () => {
  let run = createHuntRun(0);
  run = scanShelf(run, 0);
  run = scanShelf(run, 1);
  run = scanShelf(run, 2);

  assert.equal(run.batteries, 0);
  assert.equal(run.status, "failed");
  assert.strictEqual(scanShelf(run, 4), run);
});

test("validates shipment indexes", () => {
  assert.throws(() => createHuntRun(-1), RangeError);
  assert.throws(() => createHuntRun(warehouseShipments.length), RangeError);
  assert.throws(() => createHuntRun(0.5), RangeError);
});

test("calculates bounded scores and stars", () => {
  const perfect = calculateShiftSummary(
    warehouseShipments.map((shipment) => ({
      scans: shipment.scanBudget,
      unusedBatteries: 0,
      secondsLeft: shipment.bonusSeconds,
    })),
    0,
  );
  assert.deepEqual(perfect, {
    score: 4_350,
    stars: 3,
    shipmentsCompleted: 3,
    totalScans: 12,
    unusedBatteries: 0,
    secondsLeft: 135,
    failures: 0,
  });

  const withFailure = calculateShiftSummary(
    [
      { scans: 1, unusedBatteries: 99, secondsLeft: 999 },
      { scans: 4, unusedBatteries: 0, secondsLeft: 0 },
      { scans: 5, unusedBatteries: 0, secondsLeft: 0 },
    ],
    2,
  );
  assert.equal(withFailure.score, 3_300);
  assert.equal(withFailure.unusedBatteries, 2);
  assert.equal(withFailure.secondsLeft, 30);
  assert.equal(withFailure.stars, 2);

  const partial = calculateShiftSummary(
    [{ scans: 3, unusedBatteries: 0, secondsLeft: 0 }],
    0,
  );
  assert.equal(partial.stars, 1);
  assert.throws(() => calculateShiftSummary([], -1), TypeError);
});

test("builds pure canonical traces for found and missing targets", () => {
  const shelves = [2, 5, 9, 12, 18, 27];
  const snapshot = [...shelves];
  const found = buildBinaryTrace(shelves, 27);
  assert.deepEqual(shelves, snapshot, "input must not be mutated");
  assert.equal(found.at(-1).relation, "equal");
  assert.equal(found.at(-1).mid, 5);
  assert.ok(found.every((frame) => frame.mid >= frame.low));
  assert.ok(found.every((frame) => frame.mid <= frame.high));

  const missing = buildBinaryTrace(shelves, 10);
  assert.notEqual(missing.length, 0);
  assert.notEqual(missing.at(-1).relation, "equal");
  assert.ok(missing.at(-1).lowAfter > missing.at(-1).highAfter);
  assert.deepEqual(buildBinaryTrace([], 10), []);
  assert.throws(() => buildBinaryTrace([2, 1], 1), RangeError);
  assert.throws(() => buildBinaryTrace([1, Number.NaN], 1), TypeError);
});

test("tokenizer accepts the guided grammar and rejects executable Python", () => {
  assert.deepEqual(
    tokenizeGuidedLine("left + (right - left) // 2")
      .filter((token) => token.type !== "eof")
      .map((token) => token.value),
    ["left", "+", "(", "right", "-", "left", ")", "//", 2],
  );
  assert.throws(
    () => tokenizeGuidedLine("__import__('os').system('id')"),
    SyntaxError,
  );
  assert.throws(() => tokenizeGuidedLine("left / 2"), SyntaxError);
  assert.throws(() => tokenizeGuidedLine("left; right"), SyntaxError);
});

test("guided Python evaluator accepts safe equivalent midpoint syntax", () => {
  const canonical = evaluateGuidedCode({
    mid: "left + (right - left) // 2",
    left: "left = mid + 1",
    right: "right = mid - 1",
  });
  assert.equal(canonical.passed, true);
  assert.deepEqual(canonical.slotErrors, {});
  assert.ok(canonical.cases.every((result) => result.passed));

  const equivalent = evaluateGuidedCode({
    mid: "(left + right) // 2",
    left: "left = 1 + mid",
    right: "right = mid - 1",
  });
  assert.equal(equivalent.passed, true);
});

test("guided evaluator reports syntax and assignment-target errors per slot", () => {
  const result = evaluateGuidedCode({
    mid: "__import__ + 1",
    left: "right = mid + 1",
    right: "right == mid - 1",
  });
  assert.equal(result.passed, false);
  assert.match(result.slotErrors.mid, /not available/i);
  assert.match(result.slotErrors.left, /assign to left/i);
  assert.match(result.slotErrors.right, /assignment operator/i);
  assert.ok(result.cases.every((testCase) => testCase.actual === null));
});

test("each wrong semantic slot is identified and fails hidden behavior cases", () => {
  const wrongMid = evaluateGuidedCode({
    mid: "left",
    left: "left = mid + 1",
    right: "right = mid - 1",
  });
  assert.match(wrongMid.slotErrors.mid, /middle index/i);
  assert.ok(wrongMid.cases.some((testCase) => !testCase.passed));

  const stuckLeft = evaluateGuidedCode({
    mid: "(left + right) // 2",
    left: "left = mid",
    right: "right = mid - 1",
  });
  assert.match(stuckLeft.slotErrors.left, /mid \+ 1/i);
  assert.ok(stuckLeft.cases.some((testCase) => testCase.actual === null));

  const stuckRight = evaluateGuidedCode({
    mid: "(left + right) // 2",
    left: "left = mid + 1",
    right: "right = mid",
  });
  assert.match(stuckRight.slotErrors.right, /mid - 1/i);
  assert.ok(stuckRight.cases.some((testCase) => testCase.actual === null));
});

test("duplicate targets accept any matching returned index", () => {
  const result = evaluateGuidedCode({
    mid: "(left + right) // 2",
    left: "left = mid + 1",
    right: "right = mid - 1",
  });
  const duplicate = result.cases.find(
    (testCase) => testCase.name === "duplicate shipment id",
  );
  assert.ok(duplicate);
  assert.equal(duplicate.passed, true);
  assert.equal([1, 4, 4, 4, 9][duplicate.actual], 4);
});

test("parses, bounds, filters, and versions warehouse progress", () => {
  const firstScanPath = buildBinaryTrace(
    warehouseShipments[0].shelves,
    warehouseShipments[0].target,
  ).map((frame) => frame.mid);
  const secondScanPath = buildBinaryTrace(
    warehouseShipments[1].shelves,
    warehouseShipments[1].target,
  ).map((frame) => frame.mid);
  const stored = JSON.stringify({
    version: WAREHOUSE_PROGRESS_VERSION,
    currentShipmentIndex: 99,
    unlockedStage: "python",
    completedShipments: [
      {
        shipmentIndex: 0,
        scannedIndices: firstScanPath,
        secondsLeft: 999,
      },
      {
        shipmentIndex: 1,
        scannedIndices: secondScanPath,
        secondsLeft: 22.9,
      },
    ],
    completedShipmentIds: ["not-trusted"],
    failures: 4.9,
    bestScore: 12_345.9,
    bestStars: 9,
    revealCompleted: true,
    pythonCompleted: false,
  });
  assert.deepEqual(parseWarehouseProgress(stored), {
    version: 1,
    currentShipmentIndex: 2,
    unlockedStage: "python",
    completedShipments: [
      {
        shipmentIndex: 0,
        scannedIndices: firstScanPath,
        secondsLeft: 30,
      },
      {
        shipmentIndex: 1,
        scannedIndices: secondScanPath,
        secondsLeft: 22,
      },
    ],
    completedShipmentIds: ["starter-bay", "sorting-aisle"],
    failures: 4,
    bestScore: 12_345,
    bestStars: 3,
    revealCompleted: true,
    pythonCompleted: false,
  });

  assert.deepEqual(parseWarehouseProgress("not json"), {
    ...defaultWarehouseProgress,
    completedShipments: [],
    completedShipmentIds: [],
  });
  assert.deepEqual(parseWarehouseProgress({ version: 999 }), {
    ...defaultWarehouseProgress,
    completedShipments: [],
    completedShipmentIds: [],
  });
  assert.deepEqual(parseWarehouseProgress(null), {
    ...defaultWarehouseProgress,
    completedShipments: [],
    completedShipmentIds: [],
  });
});

test("reconstructs only a sequential prefix of found shipment checkpoints", () => {
  const scanPaths = warehouseShipments.map((shipment) =>
    buildBinaryTrace(shipment.shelves, shipment.target).map(
      (frame) => frame.mid,
    ),
  );
  const parsed = parseWarehouseProgress({
    version: 1,
    completedShipments: scanPaths.map((scannedIndices, shipmentIndex) => ({
      shipmentIndex,
      scannedIndices,
      secondsLeft: warehouseShipments[shipmentIndex].bonusSeconds,
    })),
    completedShipmentIds: [],
    currentShipmentIndex: 0,
    failures: 10_000,
  });

  assert.deepEqual(
    parsed.completedShipments.map((checkpoint) => checkpoint.shipmentIndex),
    [0, 1, 2],
  );
  assert.deepEqual(
    parsed.completedShipmentIds,
    warehouseShipments.map((shipment) => shipment.id),
  );
  assert.equal(parsed.currentShipmentIndex, 2);
  assert.equal(parsed.failures, 999);
});

test("drops malicious, out-of-order, and unfinished checkpoint suffixes", () => {
  const firstPath = buildBinaryTrace(
    warehouseShipments[0].shelves,
    warehouseShipments[0].target,
  ).map((frame) => frame.mid);
  const secondPath = buildBinaryTrace(
    warehouseShipments[1].shelves,
    warehouseShipments[1].target,
  ).map((frame) => frame.mid);

  const partialFirst = parseWarehouseProgress({
    version: 1,
    completedShipments: [
      { shipmentIndex: 0, scannedIndices: firstPath.slice(0, 1), secondsLeft: 8 },
      { shipmentIndex: 1, scannedIndices: secondPath, secondsLeft: 8 },
    ],
    completedShipmentIds: ["starter-bay", "sorting-aisle"],
    currentShipmentIndex: 2,
    failures: -5,
  });
  assert.deepEqual(partialFirst.completedShipments, []);
  assert.deepEqual(partialFirst.completedShipmentIds, []);
  assert.equal(partialFirst.currentShipmentIndex, 0);
  assert.equal(partialFirst.failures, 0);

  const maliciousSuffix = parseWarehouseProgress({
    version: 1,
    completedShipments: [
      { shipmentIndex: 0, scannedIndices: firstPath, secondsLeft: 8 },
      {
        shipmentIndex: 1,
        scannedIndices: [secondPath[0], secondPath[0], ...secondPath.slice(1)],
        secondsLeft: 8,
      },
      { shipmentIndex: 2, scannedIndices: [22], secondsLeft: 8 },
    ],
  });
  assert.equal(maliciousSuffix.completedShipments.length, 1);
  assert.deepEqual(maliciousSuffix.completedShipmentIds, ["starter-bay"]);
  assert.equal(maliciousSuffix.currentShipmentIndex, 1);

  const outOfOrder = parseWarehouseProgress({
    version: 1,
    completedShipments: [
      { shipmentIndex: 1, scannedIndices: secondPath, secondsLeft: 8 },
    ],
  });
  assert.deepEqual(outOfOrder.completedShipments, []);
});
