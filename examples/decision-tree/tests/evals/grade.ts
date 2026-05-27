/**
 * Programmatic graders for the decision-tree eval suite.
 *
 * Each scenario id in evals.json maps to a grader. Each grader returns
 * Assertion[] - one entry per objectively-verifiable check. The CLI
 * iterates per-condition runs and writes grading.json.
 *
 * Universal assertions (apply to every scenario):
 *   - meta.activated matches expected_activation
 *   - if activated: no leaked {{TOKEN}} in widget.html
 *   - if activated: response.md is the lead-in, not the duplicated draft
 *
 * Skill-specific assertions cover widget shape: branch grid present,
 * three L0 cards rendered, DECISION 1 OF 3 marker, etc.
 */

import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Assertion, Grading, RunOutputs } from './shared.js';
import { activatedAssertion, assertion, loadOutputs, summarize } from './shared.js';

const noLeakedTokens = (outputs: RunOutputs): Assertion => {
  const widget = outputs.widget;
  const tokens = widget.match(/\{\{+[^}]+\}\}+/g) ?? [];
  return assertion(
    'no_leaked_tokens: rendered widget has no remaining {{...}} placeholders',
    tokens.length === 0,
    tokens.length ? `leaked: ${tokens.slice(0, 3).join(', ')}` : 'clean',
  );
};

interface TreeBranch {
  id?: string;
  title?: string;
  summary?: string;
  next_hint?: string | null;
  sub?: TreeNode | null;
}

interface TreeNode {
  question?: string;
  basis?: string;
  branches?: TreeBranch[];
}

interface NavigatorPayload {
  topic?: string;
  submit_instruction?: string;
  tree?: TreeNode;
}

const extractNavigatorPayload = (widget: string): NavigatorPayload | null => {
  const match = widget.match(
    /<script\s+id="navigator-data"\s+type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1] ?? '') as NavigatorPayload;
  } catch {
    return null;
  }
};

const countTreeNodes = (node: TreeNode | null | undefined): number => {
  if (!node || !node.branches) return 0;
  return node.branches.reduce((total, branch) => {
    return total + 1 + countTreeNodes(branch.sub ?? null);
  }, 0);
};

const treeMaxDepth = (node: TreeNode | null | undefined, current = 0): number => {
  if (!node || !node.branches || node.branches.length === 0) return current;
  const subDepths = node.branches.map((branch) => treeMaxDepth(branch.sub ?? null, current + 1));
  return Math.max(...subDepths);
};

const l1VarianceAssertion = (payload: NavigatorPayload | null, label: string): Assertion => {
  const l0Branches = payload?.tree?.branches ?? [];
  const l1Questions = l0Branches
    .map((branch) => branch.sub?.question?.trim().toLowerCase() ?? '')
    .filter((text) => text.length > 0);
  const unique = new Set(l1Questions);
  const allUnique = l1Questions.length >= 2 && unique.size === l1Questions.length;
  return assertion(
    `${label}_l1_variance: L1 questions under different L0 branches are textually distinct`,
    allUnique,
    allUnique
      ? `${unique.size} unique L1 questions`
      : `${l1Questions.length} L1 questions, ${unique.size} unique`,
  );
};

const VAGUE_PHRASES = [
  'your choice',
  'appropriate',
  'depending on what you',
  'whichever makes sense',
  'as needed',
  '[insert',
  '[specific',
  'tbd',
  'to be determined',
  'something that fits',
  'pick whichever',
];

const collectLeafSummaries = (node: TreeNode | null | undefined): string[] => {
  if (!node?.branches) return [];
  return node.branches.flatMap((branch) => {
    if (!branch.sub || !branch.sub.branches?.length) {
      return branch.summary ? [branch.summary.toLowerCase()] : [];
    }
    return collectLeafSummaries(branch.sub);
  });
};

const l2ConcreteAssertion = (payload: NavigatorPayload | null, label: string): Assertion => {
  const summaries = collectLeafSummaries(payload?.tree);
  const offenders = summaries.flatMap((summary, index) =>
    VAGUE_PHRASES.filter((phrase) => summary.includes(phrase)).map(
      (phrase) => `leaf ${index}: "${phrase}"`,
    ),
  );
  const passed = offenders.length === 0 && summaries.length > 0;
  return assertion(
    `${label}_l2_concrete: L2 leaf summaries avoid placeholder/vague phrasing`,
    passed,
    passed ? `${summaries.length} concrete leaves` : offenders.slice(0, 3).join('; '),
  );
};

const fullExplorationAssertion = (payload: NavigatorPayload | null, label: string): Assertion => {
  const issues: string[] = [];
  const l0Branches = payload?.tree?.branches ?? [];
  l0Branches.forEach((l0, l0Index) => {
    if (!l0.sub?.branches?.length) {
      issues.push(`L0[${l0Index}] (${l0.title ?? '?'}) missing L1`);
      return;
    }
    l0.sub.branches.forEach((l1, l1Index) => {
      if (!l1.sub?.branches?.length) {
        issues.push(`L1[${l0Index}.${l1Index}] (${l1.title ?? '?'}) missing L2`);
        return;
      }
      l1.sub.branches.forEach((l2, l2Index) => {
        if (l2.sub && (l2.sub.branches?.length ?? 0) > 0) {
          issues.push(`L2[${l0Index}.${l1Index}.${l2Index}] has unexpected sub-tree`);
        }
      });
    });
  });
  const passed = issues.length === 0 && l0Branches.length > 0;
  return assertion(
    `${label}_full_exploration: every L0 has L1, every L1 has L2, L2 is terminal`,
    passed,
    passed ? 'fully explored' : issues.slice(0, 3).join('; '),
  );
};

const widgetShape = (outputs: RunOutputs, label: string): Assertion[] => {
  const widget = outputs.widget;
  const payload = extractNavigatorPayload(widget);
  const tree = payload?.tree;
  const l0BranchCount = tree?.branches?.length ?? 0;
  const totalNodes = countTreeNodes(tree);
  const depth = treeMaxDepth(tree);
  return [
    assertion(
      `${label}_has_navigator_data_script: bundled widget contains the inline navigator-data JSON`,
      payload !== null,
      payload ? 'parsed ok' : 'missing or invalid JSON',
    ),
    assertion(
      `${label}_payload_has_topic: navigator-data carries a non-empty topic string`,
      Boolean(payload?.topic && payload.topic.length > 0),
      payload?.topic ? `topic: "${payload.topic}"` : 'no topic',
    ),
    assertion(
      `${label}_l0_branch_count: tree has 2 to 4 L0 branches`,
      l0BranchCount >= 2 && l0BranchCount <= 4,
      `L0 branches: ${l0BranchCount}`,
    ),
    assertion(
      `${label}_tree_depth: tree depth is exactly 3 levels`,
      depth === 3,
      `depth: ${depth}`,
    ),
    assertion(
      `${label}_node_count: tree has a reasonable node count for a 2-4 branched 3-level tree`,
      totalNodes >= 8 && totalNodes <= 84,
      `nodes: ${totalNodes}`,
    ),
    l1VarianceAssertion(payload, label),
    l2ConcreteAssertion(payload, label),
    fullExplorationAssertion(payload, label),
  ];
};

const gradeFireScenario = (runDir: string, isBaseline: boolean): Assertion[] => {
  const outputs = loadOutputs(runDir);
  if (isBaseline) {
    return [activatedAssertion(outputs.meta, false, 'baseline_did_not_activate')];
  }
  return [
    activatedAssertion(outputs.meta, true, 'activated_meta_true: meta.activated=true'),
    noLeakedTokens(outputs),
    ...widgetShape(outputs, 'fire'),
  ];
};

const gradeSkipScenario = (runDir: string, isBaseline: boolean): Assertion[] => {
  const outputs = loadOutputs(runDir);
  if (isBaseline) {
    return [activatedAssertion(outputs.meta, false, 'baseline_did_not_activate')];
  }
  const widget = outputs.widget;
  return [
    activatedAssertion(outputs.meta, false, 'skipped_meta_false: meta.activated=false'),
    assertion(
      'no_widget_for_skip: skipped scenarios should not produce widget HTML',
      widget.trim().length === 0,
      widget.trim().length ? `widget has ${widget.length} bytes` : 'empty',
    ),
  ];
};

const GRADERS: Record<string, (runDir: string, isBaseline: boolean) => Assertion[]> = {
  'fire-auth-strategy': gradeFireScenario,
  'fire-micro-saas-ideation': gradeFireScenario,
  'fire-store-model': gradeFireScenario,
  'fire-weekend-trip': gradeFireScenario,
  'fire-database-choice': gradeFireScenario,
  'fire-monorepo-structure': gradeFireScenario,
  'fire-windfall-allocation': gradeFireScenario,
  'fire-runtime-strategy': gradeFireScenario,
  'fire-binary-choice': gradeFireScenario,
  'skip-naming-exercise': gradeSkipScenario,
  'skip-flat-recommendation': gradeSkipScenario,
  'skip-cascading-deps': gradeSkipScenario,
  'skip-open-ended': gradeSkipScenario,
  'skip-conversation-request': gradeSkipScenario,
  'skip-honeymoon-trio': gradeSkipScenario,
  'skip-style-direction': gradeSkipScenario,
  'skip-factual-question': gradeSkipScenario,
};

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

const gradeOneRun = (
  scenarioId: string,
  condition: 'with_skill' | 'without_skill',
  runDir: string,
): Grading | null => {
  const grader = GRADERS[scenarioId];
  if (!grader) {
    console.warn(`[grade] no grader for scenario ${scenarioId}`);
    return null;
  }
  const expectations = grader(runDir, condition === 'without_skill');
  return { expectations, summary: summarize(expectations) };
};

const hasRunOutputs = (runDir: string): boolean => {
  const outputsDir = join(runDir, 'outputs');
  if (!isDirectory(outputsDir)) return false;
  // Treat a run as "run" only if at least meta.json or response.md exists.
  return existsSync(join(outputsDir, 'meta.json')) || existsSync(join(outputsDir, 'response.md'));
};

const gradeIteration = (iterationDir: string): void => {
  const absolute = resolve(iterationDir);
  const evalDirs = readdirSync(absolute)
    .filter((name) => name.startsWith('eval-'))
    .filter((name) => isDirectory(join(absolute, name)));

  const lines: string[] = [];
  evalDirs.forEach((dirName) => {
    const scenarioId = dirName.replace(/^eval-/, '');
    const evalDir = join(absolute, dirName);
    (['with_skill', 'without_skill'] as const).forEach((condition) => {
      const runDir = join(evalDir, condition, 'run-1');
      if (!isDirectory(runDir)) return;
      if (!hasRunOutputs(runDir)) {
        lines.push(`${scenarioId.padEnd(32)} ${condition.padEnd(14)} (no outputs, skipped)`);
        return;
      }
      const grading = gradeOneRun(scenarioId, condition, runDir);
      if (!grading) return;
      writeFileSync(join(runDir, 'grading.json'), JSON.stringify(grading, null, 2));
      lines.push(
        `${scenarioId.padEnd(32)} ${condition.padEnd(14)} ${grading.summary.passed}/${grading.summary.total} passed (${Math.round(grading.summary.pass_rate * 100)}%)`,
      );
    });
  });

  console.log(lines.join('\n'));
};

const main = (): void => {
  const iterationDir = process.argv[2];
  if (!iterationDir) {
    console.error('Usage: pnpm eval:grade <iteration-dir>');
    process.exit(1);
  }
  gradeIteration(iterationDir);
};

main();
