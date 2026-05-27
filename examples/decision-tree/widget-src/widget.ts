/*
 * Decision tree navigator widget.
 *
 * The tree, topic, and submit instruction are baked in at render time via
 * chevron (Mustache) substitution in render.py. The placeholders
 * {{{topic_json}}}, {{{submit_instruction_json}}}, and {{{tree_json}}}
 * live inside the inline navigator-data JSON script tag in widget.html;
 * widget.ts reads that script's textContent and JSON.parses it.
 *
 * render.py auto-derives the *_json variants from each top-level payload
 * key so authors only construct { topic, submit_instruction, tree }.
 *
 * Inline onclick handlers in the rendered HTML reach functions through
 * window.* assignments at the end of main(). Function-scope names would
 * not otherwise be visible to inline handlers.
 *
 * main() runs after the DOM is parsed via readyDOM() so the inline
 * navigator-data JSON script is in the DOM regardless of where the
 * bundler placed our module script. Widget hosts that strip
 * type="module" or run scripts eagerly would otherwise race the data
 * script.
 */

import { readDataIsland, readyDOM, requireElement, sendPrompt } from 'visill';

interface Branch {
  id: string;
  title: string;
  summary: string;
  next_hint: string | null;
  sub: Tree | null;
}

interface Tree {
  question: string;
  basis: string;
  branches: Branch[];
}

interface NavigatorData {
  topic: string;
  submit_instruction: string;
  tree: Tree;
}

interface NavigatorState {
  picks: string[];
  annotations: Record<string, string>;
  explored: Set<string>;
  noteEditing: string | null;
  committed: boolean;
}

const main = (): void => {
  const {
    topic: TOPIC,
    submit_instruction: SUBMIT_INSTRUCTION,
    tree,
  } = readDataIsland<NavigatorData>('navigator-data');

  const treeContainer = requireElement<HTMLElement>('#tree');

  const state: NavigatorState = {
    picks: [],
    annotations: {},
    explored: new Set<string>(),
    noteEditing: null,
    committed: false,
  };

  const getLevelData = (level: number): Tree | null => {
    if (level === 0) return tree;
    return state.picks.slice(0, level).reduce<Tree | null>((current, pickId) => {
      if (current === null) return null;
      const branch = current.branches.find((candidate) => candidate.id === pickId);
      if (branch === undefined || branch.sub === null) return null;
      return branch.sub;
    }, tree);
  };

  const maxDepth = (node: Tree | null, current = 1): number => {
    if (node === null || node.branches.length === 0) return current;
    const subDepths = node.branches.map((branch) =>
      branch.sub ? maxDepth(branch.sub, current + 1) : current,
    );
    return Math.max(...subDepths);
  };

  const findBranchById = (id: string): Branch | null => {
    const walk = (node: Tree | null): Branch | null => {
      if (node === null) return null;
      return node.branches.reduce<Branch | null>((found, branch) => {
        if (found) return found;
        if (branch.id === id) return branch;
        if (branch.sub) return walk(branch.sub);
        return null;
      }, null);
    };
    return walk(tree);
  };

  const selectBranch = (level: number, id: string): void => {
    if (state.committed) return;
    if (state.picks[level] && state.picks[level] !== id) {
      state.explored.add(state.picks[level]);
      state.picks = state.picks.slice(0, level);
    }
    state.picks[level] = id;
    render();
  };

  const toggleNote = (branchId: string): void => {
    state.noteEditing = state.noteEditing === branchId ? null : branchId;
    render();
    if (state.noteEditing) {
      const input = document.getElementById('ni-' + branchId);
      if (input) input.focus();
    }
  };

  const saveNote = (branchId: string, value: string): void => {
    const trimmed = value.trim();
    if (trimmed) state.annotations[branchId] = trimmed;
    else delete state.annotations[branchId];
    state.noteEditing = null;
    render();
  };

  const commitAndSubmit = (): void => {
    state.committed = true;
    render();
    submitDecision();
  };

  const renderBranch = (branch: Branch, level: number, activeId: string | undefined): string => {
    const isActive = branch.id === activeId;
    const someoneActive = activeId !== undefined && activeId !== null;
    const classes = ['b'];
    if (state.committed && isActive) classes.push('committed');
    else if (isActive) classes.push('active');
    else if (someoneActive) classes.push('dim');
    const note = state.annotations[branch.id];
    const editing = state.noteEditing === branch.id;
    const noteBadge =
      note && editing === false
        ? `<div class="bn" onclick="event.stopPropagation(); toggleNote('${branch.id}')"><i class="ti ti-note" style="font-size: 12px; margin-right: 4px;" aria-hidden="true"></i>${note}</div>`
        : '';
    const editor = editing
      ? `<textarea class="ni" id="ni-${branch.id}" placeholder="Drop a note (constraint, prior art, hesitation)" onblur="saveNote('${branch.id}', this.value)">${note || ''}</textarea>`
      : '';
    const hint = branch.next_hint
      ? `<div class="bp"><i class="ti ti-arrow-down-right" style="font-size: 12px;" aria-hidden="true"></i> next: ${branch.next_hint}</div>`
      : '';
    // Once a pick is made at this level, hide "add note" on the other
    // branches - annotation is only meaningful on the branch the user
    // committed to walking down. Before any pick, all branches show
    // "add note" so the user can mark a constraint they want considered
    // before choosing.
    const canAddNote =
      note === undefined &&
      editing === false &&
      state.committed === false &&
      (someoneActive === false || isActive);
    const addNoteButton = canAddNote
      ? `<button class="nb" onclick="event.stopPropagation(); toggleNote('${branch.id}')"><i class="ti ti-plus" style="font-size: 11px;" aria-hidden="true"></i> add note</button>`
      : '';
    return `
    <div class="${classes.join(' ')}" onclick="if(event.target.closest('.nb,.ni,.bn'))return; selectBranch(${level}, '${branch.id}')">
      <div class="bt">${branch.title}</div>
      <div class="bs">${branch.summary}</div>
      ${noteBadge}
      ${editor}
      ${hint}
      ${addNoteButton}
    </div>
  `;
  };

  const renderLevel = (level: number): string => {
    const data = getLevelData(level);
    if (data === null) return '';
    const wrapClass = level > 0 ? 'lv rule' : 'lv';
    const activeId = state.picks[level];
    const branches = data.branches.map((branch) => renderBranch(branch, level, activeId)).join('');
    const isLeafLevel = data.branches.every((branch) => branch.sub === null);
    const showCommit = isLeafLevel && activeId && state.committed === false;
    const showSent = isLeafLevel && activeId && state.committed;
    const totalLevels = maxDepth(tree);
    const commitRow = showCommit
      ? `<div class="cr"><i class="ti ti-flag" style="font-size: 18px; color: #3B6D11;" aria-hidden="true"></i><div style="flex: 1; font-size: 13px; color: var(--color-text-secondary);">Lock this in and send the brief to chat?</div><button onclick="commitAndSubmit()" style="font-weight: 500;">Commit and send ↗</button></div>`
      : '';
    const sentRow = showSent
      ? `<div class="cr" style="background: #EAF3DE;"><i class="ti ti-check" style="font-size: 18px; color: #3B6D11;" aria-hidden="true"></i><div style="font-size: 13px; color: #173404; font-weight: 500;">Sent to chat</div></div>`
      : '';
    return `
    <div class="${wrapClass}">
      <div class="lm">DECISION ${level + 1} OF ${totalLevels}${isLeafLevel ? ' (FINAL)' : ''}</div>
      <h4 class="lq">${data.question}</h4>
      <div class="lbasis">${data.basis}</div>
      <div class="bg">${branches}</div>
      ${commitRow}
      ${sentRow}
    </div>
  `;
  };

  const renderTree = (): string => {
    const depth = maxDepth(tree);
    const levelIndices = Array.from({ length: depth }, (_unused, index) => index);
    return levelIndices
      .filter((index) => index === 0 || Boolean(state.picks[index - 1]))
      .map((index) => renderLevel(index))
      .join('');
  };

  const render = (): void => {
    treeContainer.innerHTML = renderTree();
  };

  const submitDecision = (): void => {
    const pathLines = state.picks.reduce<{ lines: string[]; current: Tree | null }>(
      (accumulator, pickId, index) => {
        if (accumulator.current === null) return accumulator;
        const branch = accumulator.current.branches.find((candidate) => candidate.id === pickId);
        if (branch === undefined) return accumulator;
        const line =
          index +
          1 +
          '. ' +
          accumulator.current.question +
          ' -> ' +
          branch.title +
          '\n   ' +
          branch.summary;
        return { lines: [...accumulator.lines, line], current: branch.sub };
      },
      { lines: [], current: tree },
    ).lines;

    const annotationEntries = Object.entries(state.annotations);
    const annotationLines = annotationEntries
      .map(([id, note]) => {
        const branch = findBranchById(id);
        return branch ? '- ' + branch.title + ': "' + note + '"' : '';
      })
      .filter((line) => line.length > 0);

    const exploredLines = Array.from(state.explored)
      .map((id) => {
        const branch = findBranchById(id);
        return branch ? '- ' + branch.title : '';
      })
      .filter((line) => line.length > 0);

    const sections: string[] = [
      'Decision navigator submission (' + TOPIC + '):',
      '',
      'Committed path:',
      ...pathLines,
    ];

    if (annotationLines.length) {
      sections.push('', 'Annotations:', ...annotationLines);
    }
    if (exploredLines.length) {
      sections.push('', 'Also explored:', ...exploredLines);
    }
    sections.push('', SUBMIT_INSTRUCTION);

    sendPrompt(sections.join('\n'));
  };

  // Inline onclick handlers in the rendered HTML need these on the global
  // scope. Module top-level names are not global by default.
  interface NavigatorGlobals {
    selectBranch: typeof selectBranch;
    toggleNote: typeof toggleNote;
    saveNote: typeof saveNote;
    commitAndSubmit: typeof commitAndSubmit;
  }
  const globalScope = window as unknown as Window & NavigatorGlobals;
  globalScope.selectBranch = selectBranch;
  globalScope.toggleNote = toggleNote;
  globalScope.saveNote = saveNote;
  globalScope.commitAndSubmit = commitAndSubmit;

  render();
};

readyDOM(main);
