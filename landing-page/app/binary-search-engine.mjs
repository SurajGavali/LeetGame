/**
 * Pure game rules for the Warehouse Hunt binary-search lesson.
 *
 * This module deliberately has no React, DOM, timer, or storage dependencies.
 * The guided-code evaluator parses a tiny Python-shaped language and never
 * passes player input to eval(), Function(), or a subprocess.
 */

export const WAREHOUSE_PROGRESS_VERSION = 1;

const makeShelves = (length, start, step) =>
  Object.freeze(
    Array.from({ length }, (_, index) => start + index * step),
  );

const sevenShelves = makeShelves(7, 100, 17);
const fifteenShelves = makeShelves(15, 200, 13);
const thirtyOneShelves = makeShelves(31, 500, 11);

/**
 * Each target takes exactly the advertised scan budget when classic binary
 * search is used: 3, 4, and 5 comparisons respectively.
 */
export const warehouseShipments = Object.freeze([
  Object.freeze({
    id: "starter-bay",
    title: "Starter Bay",
    shelves: sevenShelves,
    target: sevenShelves[4],
    scanBudget: 3,
    bonusSeconds: 30,
  }),
  Object.freeze({
    id: "sorting-aisle",
    title: "Sorting Aisle",
    shelves: fifteenShelves,
    target: fifteenShelves[10],
    scanBudget: 4,
    bonusSeconds: 45,
  }),
  Object.freeze({
    id: "megastore-grid",
    title: "Megastore Grid",
    shelves: thirtyOneShelves,
    target: thirtyOneShelves[22],
    scanBudget: 5,
    bonusSeconds: 60,
  }),
]);

/**
 * @typedef {'lower' | 'equal' | 'higher'} Relation
 * A relation compares the scanned shelf value to the shipment target.
 */

/**
 * @typedef {object} ScanRecord
 * @property {number} index
 * @property {number} value
 * @property {Relation} relation
 * @property {number} lowBefore
 * @property {number} highBefore
 * @property {number} lowAfter
 * @property {number} highAfter
 */

/**
 * @typedef {object} HuntRun
 * @property {number} shipmentIndex
 * @property {number} low
 * @property {number} high
 * @property {number} batteries
 * @property {'searching' | 'found' | 'failed'} status
 * @property {number[]} scannedIndices
 * @property {ScanRecord[]} history
 * @property {ScanRecord | null} lastScan
 */

/**
 * @param {number} shipmentIndex
 * @returns {HuntRun}
 */
export function createHuntRun(shipmentIndex) {
  if (
    !Number.isInteger(shipmentIndex) ||
    shipmentIndex < 0 ||
    shipmentIndex >= warehouseShipments.length
  ) {
    throw new RangeError("shipmentIndex must identify a warehouse shipment");
  }

  const shipment = warehouseShipments[shipmentIndex];
  return {
    shipmentIndex,
    low: 0,
    high: shipment.shelves.length - 1,
    batteries: shipment.scanBudget,
    status: "searching",
    scannedIndices: [],
    history: [],
    lastScan: null,
  };
}

function assertHuntRun(run) {
  if (
    !run ||
    typeof run !== "object" ||
    !Number.isInteger(run.shipmentIndex) ||
    !warehouseShipments[run.shipmentIndex]
  ) {
    throw new TypeError("run must be created by createHuntRun()");
  }
}

/**
 * Scan one player-selected shelf. Invalid choices are deliberate no-ops and
 * preserve object identity, which makes double-click/stale-action rejection
 * straightforward in a reducer.
 *
 * @param {HuntRun} run
 * @param {number} index
 * @returns {HuntRun}
 */
export function scanShelf(run, index) {
  assertHuntRun(run);

  if (
    run.status !== "searching" ||
    !Number.isInteger(index) ||
    index < run.low ||
    index > run.high ||
    run.scannedIndices.includes(index)
  ) {
    return run;
  }

  const shipment = warehouseShipments[run.shipmentIndex];
  const value = shipment.shelves[index];
  const relation =
    value < shipment.target
      ? "lower"
      : value > shipment.target
        ? "higher"
        : "equal";
  const batteries = run.batteries - 1;
  let lowAfter = run.low;
  let highAfter = run.high;

  if (relation === "lower") lowAfter = index + 1;
  if (relation === "higher") highAfter = index - 1;

  /** @type {ScanRecord} */
  const record = {
    index,
    value,
    relation,
    lowBefore: run.low,
    highBefore: run.high,
    lowAfter,
    highAfter,
  };

  const status =
    relation === "equal"
      ? "found"
      : batteries <= 0 || lowAfter > highAfter
        ? "failed"
        : "searching";

  return {
    ...run,
    low: lowAfter,
    high: highAfter,
    batteries,
    status,
    scannedIndices: [...run.scannedIndices, index],
    history: [...run.history, record],
    lastScan: record,
  };
}

/**
 * @typedef {object} ShiftResult
 * @property {number} scans
 * @property {number} unusedBatteries
 * @property {number} secondsLeft
 */

/**
 * Score completed shipments. Supplied bonuses are clamped to what each
 * deterministic fixture can actually award, preventing persisted/UI values
 * from inflating the score.
 *
 * @param {ShiftResult[]} results
 * @param {number} failures
 */
export function calculateShiftSummary(results, failures) {
  if (!Array.isArray(results)) {
    throw new TypeError("results must be an array");
  }
  if (!Number.isInteger(failures) || failures < 0) {
    throw new TypeError("failures must be a non-negative integer");
  }

  const acceptedResults = results.slice(0, warehouseShipments.length);
  let totalScans = 0;
  let unusedBatteries = 0;
  let secondsLeft = 0;
  let score = 0;

  acceptedResults.forEach((result, index) => {
    if (!result || typeof result !== "object") {
      throw new TypeError(`result ${index} must be an object`);
    }

    const shipment = warehouseShipments[index];
    const scans = Number.isFinite(result.scans)
      ? Math.max(1, Math.min(shipment.scanBudget, Math.trunc(result.scans)))
      : shipment.scanBudget;
    const maximumUnused = Math.max(0, shipment.scanBudget - scans);
    const unused = Number.isFinite(result.unusedBatteries)
      ? Math.max(
          0,
          Math.min(maximumUnused, Math.trunc(result.unusedBatteries)),
        )
      : 0;
    const seconds = Number.isFinite(result.secondsLeft)
      ? Math.max(
          0,
          Math.min(shipment.bonusSeconds, Math.trunc(result.secondsLeft)),
        )
      : 0;

    totalScans += scans;
    unusedBatteries += unused;
    secondsLeft += seconds;
    score += 1_000 + unused * 200 + seconds * 10;
  });

  score = Math.max(0, score - failures * 200);
  const shipmentsCompleted = acceptedResults.length;
  const stars =
    shipmentsCompleted === warehouseShipments.length && failures === 0
      ? 3
      : shipmentsCompleted === warehouseShipments.length
        ? 2
        : shipmentsCompleted > 0
          ? 1
          : 0;

  return {
    score,
    stars,
    shipmentsCompleted,
    totalScans,
    unusedBatteries,
    secondsLeft,
    failures,
  };
}

function assertSortedShelves(shelves) {
  if (!Array.isArray(shelves)) {
    throw new TypeError("shelves must be an array");
  }
  for (let index = 0; index < shelves.length; index += 1) {
    if (!Number.isFinite(shelves[index])) {
      throw new TypeError("every shelf value must be a finite number");
    }
    if (index > 0 && shelves[index] < shelves[index - 1]) {
      throw new RangeError("shelves must be sorted in ascending order");
    }
  }
  if (!Number.isFinite(shelves.length)) {
    throw new TypeError("invalid shelf collection");
  }
}

/**
 * @typedef {object} SearchFrame
 * @property {number} step
 * @property {number} low
 * @property {number} high
 * @property {number} mid
 * @property {number} value
 * @property {Relation} relation
 * @property {number} lowAfter
 * @property {number} highAfter
 */

/**
 * Build the canonical binary-search replay without mutating its input.
 *
 * @param {number[]} shelves
 * @param {number} target
 * @returns {SearchFrame[]}
 */
export function buildBinaryTrace(shelves, target) {
  assertSortedShelves(shelves);
  if (!Number.isFinite(target)) {
    throw new TypeError("target must be a finite number");
  }

  /** @type {SearchFrame[]} */
  const trace = [];
  let low = 0;
  let high = shelves.length - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = shelves[mid];
    const relation =
      value < target ? "lower" : value > target ? "higher" : "equal";
    let lowAfter = low;
    let highAfter = high;
    if (relation === "lower") lowAfter = mid + 1;
    if (relation === "higher") highAfter = mid - 1;

    trace.push({
      step: trace.length + 1,
      low,
      high,
      mid,
      value,
      relation,
      lowAfter,
      highAfter,
    });

    if (relation === "equal") break;
    low = lowAfter;
    high = highAfter;
  }

  return trace;
}

const TOKEN_LIMIT = 96;
const SOURCE_LIMIT = 240;

/**
 * Tokenize the restricted Python-shaped slot language.
 *
 * @param {string} source
 */
export function tokenizeGuidedLine(source) {
  if (typeof source !== "string") {
    throw new SyntaxError("Code must be text");
  }
  if (source.length === 0 || source.length > SOURCE_LIMIT) {
    throw new SyntaxError("Code line is empty or too long");
  }

  const tokens = [];
  let cursor = 0;

  while (cursor < source.length) {
    const character = source[cursor];
    if (/\s/u.test(character)) {
      cursor += 1;
      continue;
    }

    if (/[0-9]/u.test(character)) {
      const start = cursor;
      while (cursor < source.length && /[0-9]/u.test(source[cursor])) {
        cursor += 1;
      }
      const literal = source.slice(start, cursor);
      const value = Number(literal);
      if (!Number.isSafeInteger(value) || value > 1_000_000) {
        throw new SyntaxError("Integer literal is too large");
      }
      tokens.push({ type: "number", value, position: start });
    } else if (/[A-Za-z_]/u.test(character)) {
      const start = cursor;
      while (
        cursor < source.length &&
        /[A-Za-z0-9_]/u.test(source[cursor])
      ) {
        cursor += 1;
      }
      tokens.push({
        type: "name",
        value: source.slice(start, cursor),
        position: start,
      });
    } else if (character === "/" && source[cursor + 1] === "/") {
      tokens.push({ type: "operator", value: "//", position: cursor });
      cursor += 2;
    } else if ("+-()=".includes(character)) {
      tokens.push({
        type: character === "(" || character === ")" ? "paren" : "operator",
        value: character,
        position: cursor,
      });
      cursor += 1;
    } else {
      throw new SyntaxError(`Unsupported token at column ${cursor + 1}`);
    }

    if (tokens.length > TOKEN_LIMIT) {
      throw new SyntaxError("Code line contains too many tokens");
    }
  }

  tokens.push({ type: "eof", value: "", position: source.length });
  return tokens;
}

class ExpressionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  current() {
    return this.tokens[this.cursor];
  }

  consume(value) {
    if (this.current().value !== value) return false;
    this.cursor += 1;
    return true;
  }

  expect(value, message) {
    if (!this.consume(value)) throw new SyntaxError(message);
  }

  parseExpression() {
    return this.parseAdditive();
  }

  parseAdditive() {
    let node = this.parseDivision();
    while (this.current().value === "+" || this.current().value === "-") {
      const operator = this.current().value;
      this.cursor += 1;
      node = {
        type: "binary",
        operator,
        left: node,
        right: this.parseDivision(),
      };
    }
    return node;
  }

  parseDivision() {
    let node = this.parsePrimary();
    while (this.current().value === "//") {
      this.cursor += 1;
      node = {
        type: "binary",
        operator: "//",
        left: node,
        right: this.parsePrimary(),
      };
    }
    return node;
  }

  parsePrimary() {
    const token = this.current();
    if (token.type === "number") {
      this.cursor += 1;
      return { type: "number", value: token.value };
    }
    if (token.type === "name") {
      this.cursor += 1;
      return { type: "name", name: token.value };
    }
    if (this.consume("(")) {
      const expression = this.parseExpression();
      this.expect(")", "Close the parenthesized expression");
      return expression;
    }
    throw new SyntaxError(`Expected a value at column ${token.position + 1}`);
  }

  finish() {
    if (this.current().type !== "eof") {
      throw new SyntaxError(
        `Unexpected token at column ${this.current().position + 1}`,
      );
    }
  }
}

function collectNames(node, names = new Set()) {
  if (node.type === "name") names.add(node.name);
  if (node.type === "binary") {
    collectNames(node.left, names);
    collectNames(node.right, names);
  }
  return names;
}

function assertAllowedNames(node, allowedNames) {
  for (const name of collectNames(node)) {
    if (!allowedNames.has(name)) {
      throw new SyntaxError(`Name '${name}' is not available in this slot`);
    }
  }
}

function parseExpressionSlot(source, allowedNames) {
  const parser = new ExpressionParser(tokenizeGuidedLine(source));
  const expression = parser.parseExpression();
  parser.finish();
  assertAllowedNames(expression, allowedNames);
  return expression;
}

function parseAssignmentSlot(source, expectedTarget) {
  const parser = new ExpressionParser(tokenizeGuidedLine(source));
  const target = parser.current();
  if (target.type !== "name" || target.value !== expectedTarget) {
    throw new SyntaxError(`This line must assign to ${expectedTarget}`);
  }
  parser.cursor += 1;
  parser.expect("=", `Add '=' after ${expectedTarget}`);
  if (parser.current().value === "=") {
    throw new SyntaxError("Use one '=' assignment operator");
  }
  const expression = parser.parseExpression();
  parser.finish();
  assertAllowedNames(expression, new Set(["left", "right", "mid"]));
  return expression;
}

function evaluateAst(node, environment) {
  if (node.type === "number") return node.value;
  if (node.type === "name") return environment[node.name];

  const left = evaluateAst(node.left, environment);
  const right = evaluateAst(node.right, environment);
  let result;
  if (node.operator === "+") result = left + right;
  else if (node.operator === "-") result = left - right;
  else {
    if (right === 0) throw new RangeError("Floor division by zero");
    result = Math.floor(left / right);
  }
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Expression did not produce a safe integer");
  }
  return result;
}

function slotSemanticErrors(midAst, leftAst, rightAst) {
  const errors = {};
  const boundSamples = [
    [0, 0],
    [0, 1],
    [0, 6],
    [2, 9],
    [17, 31],
    [1_000, 9_000],
  ];

  try {
    const valid = boundSamples.every(([left, right]) => {
      const actual = evaluateAst(midAst, { left, right, mid: 0 });
      return actual === left + Math.floor((right - left) / 2);
    });
    if (!valid) errors.mid = "Calculate the middle index from left and right.";
  } catch {
    errors.mid = "The middle expression must always produce a valid index.";
  }

  try {
    const valid = [0, 1, 7, 31].every((mid) =>
      [0, 3].every(
        (left) =>
          evaluateAst(leftAst, { left, right: mid + 10, mid }) === mid + 1,
      ),
    );
    if (!valid) errors.left = "Move left to exactly mid + 1.";
  } catch {
    errors.left = "The left update must produce a valid index.";
  }

  try {
    const valid = [0, 1, 7, 31].every((mid) =>
      [mid, mid + 10].every(
        (right) =>
          evaluateAst(rightAst, { left: 0, right, mid }) === mid - 1,
      ),
    );
    if (!valid) errors.right = "Move right to exactly mid - 1.";
  } catch {
    errors.right = "The right update must produce a valid index.";
  }

  return errors;
}

const guidedCases = Object.freeze([
  Object.freeze({ name: "empty warehouse", shelves: [], target: 4 }),
  Object.freeze({ name: "single hit", shelves: [8], target: 8 }),
  Object.freeze({ name: "single miss", shelves: [8], target: 7 }),
  Object.freeze({
    name: "first shelf",
    shelves: [-9, -2, 0, 4, 11],
    target: -9,
  }),
  Object.freeze({
    name: "middle shelf",
    shelves: [-9, -2, 0, 4, 11],
    target: 0,
  }),
  Object.freeze({
    name: "last shelf",
    shelves: [2, 5, 9, 12, 18, 27],
    target: 27,
  }),
  Object.freeze({
    name: "missing between shelves",
    shelves: [2, 5, 9, 12, 18, 27],
    target: 10,
  }),
  Object.freeze({
    name: "missing above range",
    shelves: [2, 5, 9, 12, 18, 27],
    target: 40,
  }),
  Object.freeze({
    name: "duplicate shipment id",
    shelves: [1, 4, 4, 4, 9],
    target: 4,
  }),
  Object.freeze({
    name: "large final shelf",
    shelves: thirtyOneShelves,
    target: thirtyOneShelves.at(-1),
  }),
]);

function oracleResult(shelves, target) {
  const trace = buildBinaryTrace(shelves, target);
  const last = trace.at(-1);
  return last?.relation === "equal" ? last.mid : -1;
}

function executeGuidedCase(testCase, midAst, leftAst, rightAst) {
  const { shelves, target } = testCase;
  const expected = oracleResult(shelves, target);
  /** @type {SearchFrame[]} */
  const trace = [];
  let low = 0;
  let high = shelves.length - 1;
  let actual = -1;
  const maxSteps =
    4 * Math.ceil(Math.log2(Math.max(1, shelves.length) + 1)) + 8;

  try {
    while (low <= high) {
      if (trace.length >= maxSteps) throw new RangeError("Search timed out");
      const mid = evaluateAst(midAst, { left: low, right: high, mid: 0 });
      if (!Number.isInteger(mid) || mid < low || mid > high) {
        throw new RangeError("Middle index left the active range");
      }

      const value = shelves[mid];
      const relation =
        value < target ? "lower" : value > target ? "higher" : "equal";
      let lowAfter = low;
      let highAfter = high;

      if (relation === "lower") {
        lowAfter = evaluateAst(leftAst, { left: low, right: high, mid });
        if (lowAfter <= low) throw new RangeError("Left bound did not advance");
      } else if (relation === "higher") {
        highAfter = evaluateAst(rightAst, { left: low, right: high, mid });
        if (highAfter >= high) {
          throw new RangeError("Right bound did not retreat");
        }
      }

      trace.push({
        step: trace.length + 1,
        low,
        high,
        mid,
        value,
        relation,
        lowAfter,
        highAfter,
      });

      if (relation === "equal") {
        actual = mid;
        break;
      }
      low = lowAfter;
      high = highAfter;
    }
  } catch {
    return {
      name: testCase.name,
      passed: false,
      expected,
      actual: null,
      trace,
    };
  }

  const validDuplicateMatch =
    actual >= 0 && actual < shelves.length && shelves[actual] === target;
  const passed =
    expected === -1 ? actual === -1 : actual === expected || validDuplicateMatch;
  return { name: testCase.name, passed, expected, actual, trace };
}

/**
 * Parse and behaviorally evaluate the three editable Python slots.
 *
 * `mid` is an expression. `left` and `right` are complete assignment lines.
 *
 * @param {{mid:string, left:string, right:string}} draft
 */
export function evaluateGuidedCode(draft) {
  const slotErrors = {};
  let midAst = null;
  let leftAst = null;
  let rightAst = null;

  try {
    midAst = parseExpressionSlot(
      draft?.mid,
      new Set(["left", "right"]),
    );
  } catch (error) {
    slotErrors.mid =
      error instanceof Error ? error.message : "Invalid middle expression";
  }
  try {
    leftAst = parseAssignmentSlot(draft?.left, "left");
  } catch (error) {
    slotErrors.left =
      error instanceof Error ? error.message : "Invalid left update";
  }
  try {
    rightAst = parseAssignmentSlot(draft?.right, "right");
  } catch (error) {
    slotErrors.right =
      error instanceof Error ? error.message : "Invalid right update";
  }

  if (midAst && leftAst && rightAst) {
    Object.assign(
      slotErrors,
      slotSemanticErrors(midAst, leftAst, rightAst),
    );
  }

  const cases =
    midAst && leftAst && rightAst
      ? guidedCases.map((testCase) =>
          executeGuidedCase(testCase, midAst, leftAst, rightAst),
        )
      : guidedCases.map((testCase) => ({
          name: testCase.name,
          passed: false,
          expected: oracleResult(testCase.shelves, testCase.target),
          actual: null,
          trace: [],
        }));

  return {
    passed: Object.keys(slotErrors).length === 0 && cases.every((test) => test.passed),
    slotErrors,
    cases,
  };
}

const progressStages = new Set(["hunt", "reveal", "python", "complete"]);

export const defaultWarehouseProgress = Object.freeze({
  version: WAREHOUSE_PROGRESS_VERSION,
  currentShipmentIndex: 0,
  unlockedStage: "hunt",
  completedShipments: Object.freeze([]),
  completedShipmentIds: Object.freeze([]),
  failures: 0,
  bestScore: 0,
  bestStars: 0,
  revealCompleted: false,
  pythonCompleted: false,
});

function freshDefaultProgress() {
  return {
    ...defaultWarehouseProgress,
    completedShipments: [],
    completedShipmentIds: [],
  };
}

const MAX_PERSISTED_FAILURES = 999;

function sanitizeCompletedShipments(value) {
  if (!Array.isArray(value)) return [];

  const completed = [];
  const maximumCheckpoints = Math.min(
    value.length,
    warehouseShipments.length,
  );

  for (
    let expectedShipmentIndex = 0;
    expectedShipmentIndex < maximumCheckpoints;
    expectedShipmentIndex += 1
  ) {
    const checkpoint = value[expectedShipmentIndex];
    if (
      !checkpoint ||
      typeof checkpoint !== "object" ||
      checkpoint.shipmentIndex !== expectedShipmentIndex ||
      !Array.isArray(checkpoint.scannedIndices)
    ) {
      break;
    }

    let run = createHuntRun(expectedShipmentIndex);
    let valid = checkpoint.scannedIndices.length > 0;
    for (const scannedIndex of checkpoint.scannedIndices) {
      const nextRun = scanShelf(run, scannedIndex);
      if (nextRun === run) {
        valid = false;
        break;
      }
      run = nextRun;
    }

    if (!valid || run.status !== "found") break;

    const shipment = warehouseShipments[expectedShipmentIndex];
    const secondsLeft = Number.isFinite(checkpoint.secondsLeft)
      ? Math.max(
          0,
          Math.min(
            shipment.bonusSeconds,
            Math.trunc(checkpoint.secondsLeft),
          ),
        )
      : 0;

    completed.push({
      shipmentIndex: expectedShipmentIndex,
      scannedIndices: [...checkpoint.scannedIndices],
      secondsLeft,
    });
  }

  return completed;
}

/**
 * Parse untrusted localStorage data into a versioned, bounded progress object.
 * Unknown/old versions and malformed JSON safely start a new game.
 *
 * @param {unknown} value
 */
export function parseWarehouseProgress(value) {
  let parsed = value;
  try {
    if (typeof value === "string") parsed = JSON.parse(value);
  } catch {
    return freshDefaultProgress();
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.version !== WAREHOUSE_PROGRESS_VERSION
  ) {
    return freshDefaultProgress();
  }

  const completedShipments = sanitizeCompletedShipments(
    parsed.completedShipments,
  );
  const completedShipmentIds = completedShipments.map(
    ({ shipmentIndex }) => warehouseShipments[shipmentIndex].id,
  );
  const currentShipmentIndex = Math.min(
    completedShipments.length,
    warehouseShipments.length - 1,
  );
  const failures = Number.isFinite(parsed.failures)
    ? Math.max(
        0,
        Math.min(MAX_PERSISTED_FAILURES, Math.trunc(parsed.failures)),
      )
    : 0;
  const bestScore = Number.isFinite(parsed.bestScore)
    ? Math.max(0, Math.min(10_000_000, Math.trunc(parsed.bestScore)))
    : 0;
  const bestStars = Number.isFinite(parsed.bestStars)
    ? Math.max(0, Math.min(3, Math.trunc(parsed.bestStars)))
    : 0;
  const unlockedStage = progressStages.has(parsed.unlockedStage)
    ? parsed.unlockedStage
    : "hunt";

  return {
    version: WAREHOUSE_PROGRESS_VERSION,
    currentShipmentIndex,
    unlockedStage,
    completedShipments,
    completedShipmentIds,
    failures,
    bestScore,
    bestStars,
    revealCompleted: parsed.revealCompleted === true,
    pythonCompleted: parsed.pythonCompleted === true,
  };
}
