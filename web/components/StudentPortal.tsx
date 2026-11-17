import React, { useEffect, useRef, useState } from "react";
import {
  api,
  type LearnOverviewData,
  type LessonDetailData,
  type SanitizedExercise,
  type User,
} from "../client";
import { RomanianDiacriticsBar } from "./RomanianDiacriticsBar";

interface AttemptFeedback {
  isCorrect: boolean;
  feedback: string;
  slotResults?: boolean[];
}

export function StudentPortal({
  user,
  onLogout,
  onExitImpersonation,
}: {
  user: User;
  onLogout: () => Promise<void>;
  onExitImpersonation?: () => Promise<void>;
}) {
  const [overview, setOverview] = useState<LearnOverviewData | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [activeSeriesId, setActiveSeriesId] = useState<string>("");
  const [activeLessonId, setActiveLessonId] = useState<string>("");
  const [lesson, setLesson] = useState<LessonDetailData | null>(null);
  const [exercises, setExercises] = useState<SanitizedExercise[]>([]);
  const [seedOffset, setSeedOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // Exercise interaction states
  const [blankAnswers, setBlankAnswers] = useState<Record<string, string[]>>(
    {},
  );
  const [feedbackByEx, setFeedbackByEx] = useState<
    Record<string, AttemptFeedback>
  >({});
  const [verbFilter, setVerbFilter] = useState("");
  const [focusedSlot, setFocusedSlot] = useState<{
    exId: string;
    idx: number;
  } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Kingdom Sorting Game state
  const [selectedSortVerb, setSelectedSortVerb] = useState<string | null>(null);
  const [sortAssignments, setSortAssignments] = useState<
    Record<string, number>
  >({});

  // Numeral Explorer state
  const [explorerNum, setExplorerNum] = useState("125");
  const [explorerGender, setExplorerGender] = useState<
    "masculine" | "feminine" | "neuter"
  >("neuter");
  const [explorerResult, setExplorerResult] = useState<{
    wordsText: string;
    usesDe: boolean;
    actualGender: string;
  } | null>(null);

  const loadOverview = async (keepSelection = true) => {
    try {
      const data = await api<LearnOverviewData>("/learn/overview");
      setOverview(data);
      const selectedCur =
        data.curricula.find((c) => c.versionId === activeVersionId) ??
        data.curricula[0];
      const firstSeries = selectedCur?.series[0];
      const firstLesson = firstSeries?.lessons[0];
      if (!keepSelection || !activeVersionId) {
        if (selectedCur) setActiveVersionId(selectedCur.versionId);
      }
      if (!keepSelection || !activeSeriesId) {
        if (firstSeries) setActiveSeriesId(firstSeries.id);
        if (firstLesson) setActiveLessonId(firstLesson.id);
      }
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Could not load your approved lessons.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview(false);
  }, []);

  useEffect(() => {
    if (!activeLessonId) return;
    setNotice("");
    setFeedbackByEx({});
    setBlankAnswers({});
    setSortAssignments({});
    setSelectedSortVerb(null);
    setSeedOffset(0);
    void (async () => {
      try {
        const detail = await api<LessonDetailData>(
          `/learn/lessons/${activeLessonId}`,
        );
        setLesson(detail);
        setExercises(detail.exercises);
      } catch (err) {
        setNotice(
          err instanceof Error ? err.message : "Could not open lesson.",
        );
      }
    })();
  }, [activeLessonId]);

  useEffect(() => {
    if (!lesson?.contentJson?.showNumeralExplorer) return;
    const parsed = Number(explorerNum);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 50_000_000) return;
    const timer = setTimeout(() => {
      void api<{ wordsText: string; usesDe: boolean; actualGender: string }>(
        `/learn/numerals/preview?n=${parsed}&gender=${explorerGender}`,
      )
        .then(setExplorerResult)
        .catch(() => {});
    }, 120);
    return () => clearTimeout(timer);
  }, [lesson?.id, explorerNum, explorerGender]);

  function handleInsertDiacritic(ch: string) {
    if (!focusedSlot) return;
    const { exId, idx } = focusedSlot;
    const currentList = [...(blankAnswers[exId] ?? [])];
    const el = inputRefs.current[`${exId}:${idx}`];
    const existing = currentList[idx] ?? "";
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = existing.slice(0, start) + ch + existing.slice(end);
      currentList[idx] = next;
      setBlankAnswers((prev) => ({ ...prev, [exId]: currentList }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + 1, start + 1);
      });
    } else {
      currentList[idx] = existing + ch;
      setBlankAnswers((prev) => ({ ...prev, [exId]: currentList }));
    }
  }

  async function submitAttempt(
    exerciseId: string,
    answer: unknown,
  ): Promise<void> {
    if (!lesson) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await api<AttemptFeedback>("/learn/attempts", {
        clientEventId: crypto.randomUUID(),
        lessonId: lesson.id,
        exerciseId,
        answer,
      });
      setFeedbackByEx((prev) => ({ ...prev, [exerciseId]: result }));
      await loadOverview(true);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not check answer.");
    } finally {
      setBusy(false);
    }
  }

  async function generateFreshSheet() {
    if (!lesson) return;
    const nextSeed = seedOffset + 1;
    setBusy(true);
    setNotice("");
    try {
      const res = await api<{
        exercises: SanitizedExercise[];
        seedOffset: number;
      }>(`/learn/lessons/${lesson.id}/practice`, { seedOffset: nextSeed });
      setSeedOffset(res.seedOffset);
      setExercises(res.exercises);
      setBlankAnswers({});
      setFeedbackByEx({});
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not load a new sheet.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPreviewProgress() {
    setBusy(true);
    setNotice("");
    try {
      await api("/learn/preview/reset", {});
      setFeedbackByEx({});
      setBlankAnswers({});
      setSortAssignments({});
      await loadOverview(true);
      setNotice("Parent impersonation preview progress cleared.");
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Could not reset preview progress.",
      );
    } finally {
      setBusy(false);
    }
  }

  const curriculum =
    overview?.curricula.find((c) => c.versionId === activeVersionId) ??
    overview?.curricula[0];
  const activeSeries = curriculum?.series.find((s) => s.id === activeSeriesId);
  const masteredCount =
    overview?.knowledgeGraph.filter((n) => n.status === "MASTERED").length ?? 0;
  const totalNodes = overview?.knowledgeGraph.length ?? 6;

  function jumpToKnowledgeNode(nodeId: string) {
    if (!curriculum) return;
    for (const s of curriculum.series) {
      const found = s.lessons.find((l) => l.knowledgeNodeId === nodeId);
      if (found) {
        setActiveSeriesId(s.id);
        setActiveLessonId(found.id);
        return;
      }
    }
  }

  return (
    <div className="workspace student-workspace">
      <header className="topbar no-print">
        <div>
          <a className="brand dark-brand" href="/">
            a<span>i</span> / learning
          </a>
          <span className="role-pill student-pill">Romanian Studio</span>
        </div>
        <div className="topbar-actions">
          <span className="mastery-badge">
            {masteredCount} / {totalNodes} Skills Mastered
          </span>
          <span className="muted-inline small">
            Salut, <strong>{user.displayName ?? user.username}</strong>!
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
          >
            Print Worksheet
          </button>
          {onExitImpersonation ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void onExitImpersonation()}
            >
              Exit Impersonation
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void onLogout()}
            >
              Switch Student / Sign Out
            </button>
          )}
        </div>
      </header>

      {user.impersonation?.active && (
        <div
          role="region"
          aria-label="Impersonation preview banner"
          className="impersonation-banner no-print"
        >
          <div>
            <strong>
              Parent Impersonation Preview:{" "}
              {user.impersonation.kidDisplayName ??
                user.impersonation.kidUsername}
            </strong>
            <div className="small">
              Signed in via {user.impersonation.parentEmail}. Answers and
              mastery save to your separate parent preview sandbox without
              modifying this student’s real progress.
            </div>
          </div>
          <div className="impersonation-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void resetPreviewProgress()}
            >
              Reset Preview Progress
            </button>
            {onExitImpersonation && (
              <button
                type="button"
                className="btn-danger"
                disabled={busy}
                onClick={() => void onExitImpersonation()}
              >
                Exit Impersonation
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="notice workspace-notice no-print">
          {notice}
        </div>
      )}

      {loading ? (
        <section className="ws-card">
          <p>Loading your Romanian lessons…</p>
        </section>
      ) : !curriculum ? (
        <section className="ws-card">
          <h2>Waiting for Parent Approval</h2>
          <p className="muted">
            No curricula are approved for your account yet. Ask your parent to
            sign in and approve <strong>Learn Romanian Part 1 (v1.0.0)</strong>{" "}
            in their Parent Dashboard!
          </p>
        </section>
      ) : (
        <>
          <section className="ws-card no-print">
            <div className="kg-header">
              <div>
                <p className="eyebrow">KNOWLEDGE DEPENDENCY MAP</p>
                <h2>{curriculum.title}</h2>
                {overview && overview.curricula.length > 1 && (
                  <select
                    aria-label="Select approved curriculum"
                    value={curriculum.versionId}
                    onChange={(e) => {
                      const nextCur = overview.curricula.find(
                        (c) => c.versionId === e.target.value,
                      );
                      setActiveVersionId(e.target.value);
                      const firstSeries = nextCur?.series[0];
                      if (firstSeries) {
                        setActiveSeriesId(firstSeries.id);
                        if (firstSeries.lessons[0]) {
                          setActiveLessonId(firstSeries.lessons[0].id);
                        }
                      }
                    }}
                  >
                    {overview.curricula.map((c) => (
                      <option key={c.versionId} value={c.versionId}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span className="tag-pill">
                {curriculum.attribution} · {curriculum.license}
              </span>
            </div>
            <div className="kg-grid">
              {overview?.knowledgeGraph.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`kg-node kg-${node.status.toLowerCase()}`}
                  onClick={() => jumpToKnowledgeNode(node.id)}
                >
                  <div className="kg-node-top">
                    <strong>{node.title}</strong>
                    <span className="kg-pill">
                      {node.status === "MASTERED"
                        ? "Mastered"
                        : node.status === "READY"
                          ? "Ready"
                          : "Prereq First"}
                    </span>
                  </div>
                  <p className="hint">{node.description}</p>
                  {node.unmetPrerequisites.length > 0 && (
                    <div className="prereq-note">
                      Recommended first:{" "}
                      {node.unmetPrerequisites.map((p) => p.title).join(", ")}
                    </div>
                  )}
                  <div className="hint">
                    Score: {node.correctCount} correct ({node.attemptsCount}{" "}
                    tries)
                  </div>
                </button>
              ))}
            </div>
          </section>

          <nav className="chapter-tabs no-print" aria-label="Chapters">
            {curriculum.series.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  s.id === activeSeriesId ? "tab-btn active" : "tab-btn"
                }
                onClick={() => {
                  setActiveSeriesId(s.id);
                  if (s.lessons[0]) setActiveLessonId(s.lessons[0].id);
                }}
              >
                <strong>{s.title}</strong>
                <span>{s.subtitle}</span>
              </button>
            ))}
          </nav>

          {activeSeries && (
            <div className="lesson-shell">
              <aside className="lesson-sidebar no-print">
                <h3>Lessons in Chapter</h3>
                {activeSeries.lessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={
                      l.id === activeLessonId
                        ? "lesson-nav-btn active"
                        : "lesson-nav-btn"
                    }
                    onClick={() => setActiveLessonId(l.id)}
                  >
                    <span>
                      {l.orderIndex}. {l.title}
                    </span>
                    <small>
                      {l.kind.replace("_", " ")}
                      {l.solvedCount > 0 ? ` · ${l.solvedCount} solved` : ""}
                    </small>
                  </button>
                ))}
              </aside>

              <main className="lesson-stage">
                {lesson && (
                  <>
                    <div className="print-sheet-header">
                      <p className="eyebrow">
                        {lesson.seriesTitle} ·{" "}
                        {lesson.contentJson.badge ?? lesson.kind}
                      </p>
                      <h2>{lesson.contentJson.hero ?? lesson.title}</h2>
                      {lesson.contentJson.instructions && (
                        <p className="muted">
                          {lesson.contentJson.instructions}
                        </p>
                      )}
                    </div>

                    {lesson.contentJson.cards?.map((card) => (
                      <section key={card.heading} className="ws-card">
                        <h3>{card.heading}</h3>
                        <p className="lesson-body">{card.body}</p>
                        {card.highlights && (
                          <div className="highlight-grid">
                            {card.highlights.map((h) => (
                              <div key={h.ro} className="highlight-pair">
                                <strong className="ro-phrase">{h.ro}</strong>
                                <span>{h.en}</span>
                                {h.note && <small>{h.note}</small>}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}

                    {lesson.contentJson.showNumeralExplorer && (
                      <section className="ws-card explorer-card no-print">
                        <h3>Interactive Romanian Number Explorer</h3>
                        <p className="hint">
                          Test any number up to 50,000,000 and see gender + the
                          Magic "de" rule in action!
                        </p>
                        <div className="explorer-controls">
                          <label>
                            Number (0 – 50,000,000)
                            <input
                              type="number"
                              min={0}
                              max={50000000}
                              value={explorerNum}
                              onChange={(e) => setExplorerNum(e.target.value)}
                            />
                          </label>
                          <label>
                            Noun Gender
                            <select
                              value={explorerGender}
                              onChange={(e) =>
                                setExplorerGender(
                                  e.target.value as
                                    "masculine" | "feminine" | "neuter",
                                )
                              }
                            >
                              <option value="masculine">
                                Masculine (băiat / câine)
                              </option>
                              <option value="feminine">
                                Feminine (fată / stea)
                              </option>
                              <option value="neuter">
                                Neuter Copycat (măr / creion)
                              </option>
                            </select>
                          </label>
                        </div>
                        {explorerResult && (
                          <div className="explorer-output">
                            <strong>{explorerResult.wordsText}</strong>
                            <span className="hint">
                              Gender form: {explorerResult.actualGender} ·{" "}
                              {explorerResult.usesDe
                                ? 'Includes "de" before plural noun'
                                : 'No "de" needed (ends in 01–19 or 0)'}
                            </span>
                          </div>
                        )}
                      </section>
                    )}

                    {lesson.verbDeck && (
                      <section className="ws-card">
                        <div className="deck-header">
                          <h3>
                            Interactive Verb Cards ({lesson.verbDeck.length})
                          </h3>
                          <input
                            className="deck-search no-print"
                            type="search"
                            placeholder="Filter verbs (e.g. lucra, to read)..."
                            value={verbFilter}
                            onChange={(e) => setVerbFilter(e.target.value)}
                          />
                        </div>
                        <div className="verb-deck-grid">
                          {lesson.verbDeck
                            .filter((v) => {
                              const q = verbFilter.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                v.inf.toLowerCase().includes(q) ||
                                v.enInf.toLowerCase().includes(q)
                              );
                            })
                            .map((v) => (
                              <div key={v.inf} className="verb-mini-card">
                                <div className="verb-mini-head">
                                  <div>
                                    <strong>a {v.inf}</strong>
                                    <span className="hint">
                                      to {v.enInf}
                                      {v.path
                                        ? ` [${v.path}]`
                                        : ` · Group ${v.group}`}
                                    </span>
                                  </div>
                                  <span className="tag-pill">
                                    Part: {v.part}
                                  </span>
                                </div>
                                <ul className="conj-mini-list">
                                  <li>
                                    <span>Eu</span> <strong>{v.pres[0]}</strong>
                                  </li>
                                  <li>
                                    <span>Tu</span> <strong>{v.pres[1]}</strong>
                                  </li>
                                  <li>
                                    <span>El/Ea</span>{" "}
                                    <strong>{v.pres[2]}</strong>
                                  </li>
                                  <li>
                                    <span>Noi</span>{" "}
                                    <strong>{v.pres[3]}</strong>
                                  </li>
                                  <li>
                                    <span>Voi</span>{" "}
                                    <strong>{v.pres[4]}</strong>
                                  </li>
                                  <li>
                                    <span>Ei/Ele</span>{" "}
                                    <strong>{v.pres[5]}</strong>
                                  </li>
                                </ul>
                              </div>
                            ))}
                        </div>
                      </section>
                    )}

                    {exercises.length > 0 && (
                      <section className="ws-card">
                        <div className="worksheet-toolbar">
                          <h3>
                            Practice & Challenge
                            {lesson.kind === "PRACTICE_SHEET" && (
                              <span className="hint">
                                {" "}
                                (Sheet #{seedOffset + 1})
                              </span>
                            )}
                          </h3>
                          {lesson.kind === "PRACTICE_SHEET" && (
                            <button
                              type="button"
                              className="btn-secondary no-print"
                              disabled={busy}
                              onClick={() => void generateFreshSheet()}
                            >
                              New Practice Set
                            </button>
                          )}
                        </div>

                        {exercises.some(
                          (ex) => ex.exerciseType === "FILL_IN_BLANKS",
                        ) && (
                          <RomanianDiacriticsBar
                            onInsert={handleInsertDiacritic}
                          />
                        )}

                        <div className="exercises-list">
                          {exercises.map((ex) => {
                            const fb = feedbackByEx[ex.id];
                            if (ex.exerciseType === "CATEGORY_SORT") {
                              const allVerbs = ex.verbs ?? [];
                              const unassigned = allVerbs.filter(
                                (v) => !sortAssignments[v.ro],
                              );
                              return (
                                <div key={ex.id} className="exercise-box">
                                  <p>
                                    <strong>{ex.promptEn}</strong>
                                  </p>
                                  <p className="hint">
                                    1) Click a verb card below. 2) Click one of
                                    the 4 Kingdom bins to place it. Click a
                                    placed verb to move it back.
                                  </p>
                                  <div className="sort-pool">
                                    {unassigned.map((v) => (
                                      <button
                                        key={v.ro}
                                        type="button"
                                        className={
                                          selectedSortVerb === v.ro
                                            ? "sort-chip selected"
                                            : "sort-chip"
                                        }
                                        onClick={() =>
                                          setSelectedSortVerb(v.ro)
                                        }
                                      >
                                        <strong>{v.ro}</strong>
                                        <span>({v.en})</span>
                                      </button>
                                    ))}
                                  </div>
                                  <div className="bins-grid">
                                    {[
                                      { g: 1, title: "Kingdom I (-a)" },
                                      { g: 2, title: "Kingdom II (-ea)" },
                                      { g: 3, title: "Kingdom III (-e)" },
                                      { g: 4, title: "Kingdom IV (-i / -î)" },
                                    ].map((bin) => (
                                      <div
                                        key={bin.g}
                                        role="button"
                                        tabIndex={0}
                                        className={`sort-bin ${selectedSortVerb ? "target-ready" : ""}`}
                                        onClick={() => {
                                          if (!selectedSortVerb) return;
                                          setSortAssignments((prev) => ({
                                            ...prev,
                                            [selectedSortVerb]: bin.g,
                                          }));
                                          setSelectedSortVerb(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (
                                            (e.key === "Enter" ||
                                              e.key === " ") &&
                                            selectedSortVerb
                                          ) {
                                            e.preventDefault();
                                            setSortAssignments((prev) => ({
                                              ...prev,
                                              [selectedSortVerb]: bin.g,
                                            }));
                                            setSelectedSortVerb(null);
                                          }
                                        }}
                                      >
                                        <div className="bin-title">
                                          {bin.title}
                                        </div>
                                        <div className="bin-items">
                                          {allVerbs
                                            .filter(
                                              (v) =>
                                                sortAssignments[v.ro] === bin.g,
                                            )
                                            .map((v) => (
                                              <button
                                                key={v.ro}
                                                type="button"
                                                className="sort-chip placed"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSortAssignments((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[v.ro];
                                                    return copy;
                                                  });
                                                }}
                                              >
                                                {v.ro}
                                              </button>
                                            ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="exercise-actions no-print">
                                    <button
                                      type="button"
                                      disabled={
                                        busy ||
                                        Object.keys(sortAssignments).length <
                                          allVerbs.length
                                      }
                                      onClick={() =>
                                        void submitAttempt(
                                          ex.id,
                                          sortAssignments,
                                        )
                                      }
                                    >
                                      Check Kingdom Sort (
                                      {Object.keys(sortAssignments).length}/
                                      {allVerbs.length})
                                    </button>
                                  </div>
                                  {fb && (
                                    <div
                                      className={`fb-banner no-print ${fb.isCorrect ? "fb-ok" : "fb-miss"}`}
                                    >
                                      {fb.feedback}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            if (ex.exerciseType === "MULTIPLE_CHOICE") {
                              return (
                                <div key={ex.id} className="exercise-box">
                                  <div className="ex-head">
                                    <span className="ex-num">
                                      Q{ex.orderIndex}
                                    </span>
                                    <div>
                                      <div className="ro-sentence">
                                        {ex.promptRoTemplate}
                                      </div>
                                      <div className="hint">{ex.promptEn}</div>
                                    </div>
                                  </div>
                                  <div className="mcq-options">
                                    {(ex.options ?? []).map((opt) => (
                                      <button
                                        key={opt}
                                        type="button"
                                        disabled={busy}
                                        className="mcq-btn"
                                        onClick={() =>
                                          void submitAttempt(ex.id, opt)
                                        }
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                  {fb && (
                                    <div
                                      className={`fb-banner no-print ${fb.isCorrect ? "fb-ok" : "fb-miss"}`}
                                    >
                                      {fb.feedback}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // FILL_IN_BLANKS
                            const slots = blankAnswers[ex.id] ?? [];
                            return (
                              <div key={ex.id} className="exercise-box">
                                <div className="ex-head">
                                  <span className="ex-num">
                                    #{ex.orderIndex}
                                  </span>
                                  <div className="ex-content">
                                    <div className="en-sentence">
                                      {ex.promptEn}
                                    </div>
                                    <div className="ro-sentence">
                                      {(ex.roSegments ?? []).map((seg, sIdx) =>
                                        seg.type === "text" ? (
                                          <span key={sIdx}>{seg.value}</span>
                                        ) : (
                                          <span
                                            key={sIdx}
                                            className="blank-wrap"
                                          >
                                            <input
                                              ref={(el) => {
                                                inputRefs.current[
                                                  `${ex.id}:${seg.index}`
                                                ] = el;
                                              }}
                                              type="text"
                                              className={`blank-input ${
                                                fb?.slotResults
                                                  ? fb.slotResults[seg.index]
                                                    ? "slot-ok"
                                                    : "slot-miss"
                                                  : ""
                                              }`}
                                              aria-label={`Question ${ex.orderIndex} blank ${seg.index + 1}`}
                                              value={slots[seg.index] ?? ""}
                                              onFocus={() =>
                                                setFocusedSlot({
                                                  exId: ex.id,
                                                  idx: seg.index,
                                                })
                                              }
                                              onChange={(e) => {
                                                const copy = [...slots];
                                                copy[seg.index] =
                                                  e.target.value;
                                                setBlankAnswers((prev) => ({
                                                  ...prev,
                                                  [ex.id]: copy,
                                                }));
                                              }}
                                            />
                                            <span className="print-blank" />
                                          </span>
                                        ),
                                      )}
                                    </div>
                                    {ex.hint && (
                                      <div className="hint no-print">
                                        Hint: {ex.hint}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-check no-print"
                                    disabled={busy}
                                    onClick={() => {
                                      const filled = Array.from(
                                        { length: ex.blanksCount ?? 1 },
                                        (_, i) => (slots[i] ?? "").trim(),
                                      );
                                      void submitAttempt(ex.id, filled);
                                    }}
                                  >
                                    Check
                                  </button>
                                </div>
                                {fb && (
                                  <div
                                    className={`fb-banner no-print ${fb.isCorrect ? "fb-ok" : "fb-miss"}`}
                                  >
                                    {fb.feedback}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </main>
            </div>
          )}
        </>
      )}
    </div>
  );
}
