export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  slotResults?: boolean[];
}

function normalizeRo(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\u015f/g, "ș")
    .replace(/\u015e/g, "Ș")
    .replace(/\u0163/g, "ț")
    .replace(/\u0162/g, "Ț")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ro");
}

function stripDiacritics(value: string): string {
  return normalizeRo(value)
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

export function evaluateFillInBlanks(
  expectedBlanks: string[],
  submittedBlanks: string[],
): EvaluationResult {
  if (submittedBlanks.length !== expectedBlanks.length) {
    return {
      isCorrect: false,
      feedback: `Please fill in all ${expectedBlanks.length} blank(s).`,
    };
  }
  const slotResults = expectedBlanks.map(
    (expected, idx) =>
      normalizeRo(submittedBlanks[idx] ?? "") === normalizeRo(expected),
  );
  if (slotResults.every(Boolean)) {
    return {
      isCorrect: true,
      feedback: "Corect! Great job!",
      slotResults,
    };
  }
  const diacriticOnlyMiss = expectedBlanks.every(
    (expected, idx) =>
      stripDiacritics(submittedBlanks[idx] ?? "") === stripDiacritics(expected),
  );
  if (diacriticOnlyMiss) {
    return {
      isCorrect: false,
      feedback:
        "Almost! Check Romanian diacritics (ă, â, î, ș, ț) using the quick helper buttons.",
      slotResults,
    };
  }
  return {
    isCorrect: false,
    feedback: `Not quite yet (${slotResults.filter(Boolean).length}/${expectedBlanks.length} blank(s) right). Check the rule hint and try again!`,
    slotResults,
  };
}

export function evaluateMultipleChoice(
  correctOption: string,
  chosenOption: string,
  explanation?: string,
): EvaluationResult {
  const isCorrect = normalizeRo(chosenOption) === normalizeRo(correctOption);
  return {
    isCorrect,
    feedback: isCorrect
      ? `Corect! ${explanation ?? ""}`.trim()
      : `Not quite — try checking the verb ending rule and pick again.`,
  };
}

export function evaluateCategorySort(
  expectedGroups: Record<string, number>,
  submittedGroups: Record<string, number>,
): EvaluationResult {
  const keys = Object.keys(expectedGroups);
  let matched = 0;
  for (const verb of keys) {
    if (submittedGroups[verb] === expectedGroups[verb]) matched++;
  }
  const isCorrect = matched === keys.length;
  return {
    isCorrect,
    feedback: isCorrect
      ? `Spectacular! All ${keys.length} verbs sorted into the 4 Verb Kingdoms!`
      : `${matched}/${keys.length} verbs are in the right Kingdom. Remember: drop the front "a" and check -a, -ea, -e, or -i/-î.`,
  };
}

export interface KnowledgeNodeView {
  id: string;
  title: string;
  description: string;
  prerequisiteIds: string[];
  unmetPrerequisites: Array<{ id: string; title: string }>;
  status: "MASTERED" | "READY" | "PREREQUISITE_NEEDED";
  attemptsCount: number;
  correctCount: number;
}

export function computeKnowledgeGraph(
  nodes: Array<{ id: string; title: string; description: string }>,
  dependencies: Array<{ prerequisiteNodeId: string; dependentNodeId: string }>,
  states: Array<{
    knowledgeNodeId: string;
    attemptsCount: number;
    correctCount: number;
    mastered: boolean;
  }>,
): KnowledgeNodeView[] {
  const stateById = new Map(states.map((s) => [s.knowledgeNodeId, s]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return nodes.map((node) => {
    const prereqIds = dependencies
      .filter((d) => d.dependentNodeId === node.id)
      .map((d) => d.prerequisiteNodeId);
    const st = stateById.get(node.id);
    const unmet = prereqIds
      .filter((pid) => !stateById.get(pid)?.mastered)
      .map((pid) => ({
        id: pid,
        title: nodeById.get(pid)?.title ?? pid,
      }));
    const status = st?.mastered
      ? "MASTERED"
      : unmet.length === 0
        ? "READY"
        : "PREREQUISITE_NEEDED";
    return {
      id: node.id,
      title: node.title,
      description: node.description,
      prerequisiteIds: prereqIds,
      unmetPrerequisites: unmet,
      status,
      attemptsCount: st?.attemptsCount ?? 0,
      correctCount: st?.correctCount ?? 0,
    };
  });
}
