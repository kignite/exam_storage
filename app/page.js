'use client';

import { useEffect, useMemo, useState } from 'react';

const MODES = {
  MEMORIZE: 'memorize',
  QUIZ: 'quiz'
};

const ALL_CATEGORY = '__ALL__';
const QUIZ_COUNTS = [25, 50, 80];
const MEMORIZE_PAGE_SIZES = [5, 10, 20];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const DATA_SOURCES = [
  { subject: '美容丙級', file: 'questions_美容丙級.json' },
  { subject: '共同科目', file: 'questions_共同科目.json' }
];

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(totalSec) {
  const sec = Math.max(0, totalSec);
  const mins = String(Math.floor(sec / 60)).padStart(2, '0');
  const secs = String(sec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function clampQuizCount(value) {
  if (!Number.isFinite(value)) return 25;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

export default function HomePage() {
  const [allData, setAllData] = useState(null);
  const [subject, setSubject] = useState('美容丙級');
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [mode, setMode] = useState(MODES.MEMORIZE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [memorizeOrder, setMemorizeOrder] = useState([]);
  const [memorizePage, setMemorizePage] = useState(0);
  const [memorizePageSize, setMemorizePageSize] = useState(5);

  const [quizCount, setQuizCount] = useState(25);
  const [quizCountMode, setQuizCountMode] = useState('25');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizSelections, setQuizSelections] = useState({});
  const [quizElapsedSec, setQuizElapsedSec] = useState(0);
  const [quizStartedAt, setQuizStartedAt] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        const loaded = await Promise.all(
          DATA_SOURCES.map(async ({ subject: s, file }) => {
            const res = await fetch(`${BASE_PATH}/data/${file}`, { cache: 'no-store' });
            if (!res.ok) {
              throw new Error(`failed_to_fetch_${file}`);
            }
            const questions = await res.json();
            return [s, questions];
          })
        );
        const json = Object.fromEntries(loaded);
        if (!active) return;
        setAllData(json);
        const firstSubject = Object.keys(json)[0];
        if (firstSubject) {
          setSubject(firstSubject);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'unknown_error');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const subjects = useMemo(() => Object.keys(allData || {}), [allData]);
  const subjectQuestions = allData?.[subject] || [];

  const categories = useMemo(() => {
    const seen = new Set();
    for (const q of subjectQuestions) {
      seen.add(q.category || '未分類');
    }
    return Array.from(seen);
  }, [subjectQuestions]);

  const filteredQuestions = useMemo(() => {
    if (category === ALL_CATEGORY) return subjectQuestions;
    return subjectQuestions.filter((q) => (q.category || '未分類') === category);
  }, [subjectQuestions, category]);

  useEffect(() => {
    if (!categories.length) {
      setCategory(ALL_CATEGORY);
      return;
    }
    if (category !== ALL_CATEGORY && !categories.includes(category)) {
      setCategory(ALL_CATEGORY);
    }
  }, [categories, category]);

  useEffect(() => {
    const nextOrder = filteredQuestions.map((_, i) => i);
    setMemorizeOrder(nextOrder);
    setMemorizePage(0);

    setQuizStarted(false);
    setQuizFinished(false);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizElapsedSec(0);
    setQuizStartedAt(0);
  }, [subject, category, filteredQuestions.length]);

  useEffect(() => {
    if (!quizStarted || quizFinished || !quizStartedAt) return undefined;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - quizStartedAt) / 1000);
      setQuizElapsedSec(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizFinished, quizStartedAt]);

  const memorizeStart = memorizePage * memorizePageSize;
  const currentMemorizeQuestions = memorizeOrder
    .slice(memorizeStart, memorizeStart + memorizePageSize)
    .map((i) => filteredQuestions[i])
    .filter(Boolean);
  const memorizeTotalPages = Math.max(1, Math.ceil(memorizeOrder.length / memorizePageSize));
  const currentQuizQuestion = quizQuestions[quizIndex];

  const quizAnsweredCount = useMemo(() => Object.keys(quizSelections).length, [quizSelections]);

  const quizCorrectCount = useMemo(() => {
    return quizQuestions.reduce((acc, q) => {
      const row = quizSelections[q.question_id];
      if (row && row.selected === q.answer) return acc + 1;
      return acc;
    }, 0);
  }, [quizQuestions, quizSelections]);

  const quizWrongItems = useMemo(() => {
    return quizQuestions
      .map((q) => {
        const row = quizSelections[q.question_id];
        if (!row || row.selected === q.answer) return null;
        return {
          question_id: q.question_id,
          category: q.category || '未分類',
          question: q.question,
          selected: row.selected,
          answer: q.answer,
          options: q.options
        };
      })
      .filter(Boolean);
  }, [quizQuestions, quizSelections]);

  const quizWrongByCategory = useMemo(() => {
    return quizWrongItems.reduce((acc, item) => {
      const key = item.category || '未分類';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [quizWrongItems]);

  function handleModeChange(nextMode) {
    setMode(nextMode);
  }

  function handleMemorizeShuffle() {
    if (!filteredQuestions.length) return;
    setMemorizeOrder(shuffle(filteredQuestions.map((_, i) => i)));
    setMemorizePage(0);
  }

  function goMemorizeNextPage() {
    if (memorizePage + 1 < memorizeTotalPages) {
      setMemorizePage((v) => v + 1);
      return;
    }
    setMemorizePage(0);
  }

  function goMemorizePrevPage() {
    if (memorizePage - 1 >= 0) {
      setMemorizePage((v) => v - 1);
      return;
    }
    setMemorizePage(memorizeTotalPages - 1);
  }

  function startQuiz() {
    if (!filteredQuestions.length) return;
    const count = Math.min(normalizedQuizCount, filteredQuestions.length);
    const picked = shuffle(filteredQuestions).slice(0, count);
    setQuizQuestions(picked);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizFinished(false);
    setQuizStarted(true);
    setQuizElapsedSec(0);
    setQuizStartedAt(Date.now());
  }

  function restartQuiz() {
    setQuizStarted(false);
    setQuizFinished(false);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizElapsedSec(0);
    setQuizStartedAt(0);
  }

  function submitQuizAnswer(option) {
    if (!currentQuizQuestion) return;
    setQuizSelections((prev) => ({
      ...prev,
      [currentQuizQuestion.question_id]: { selected: option }
    }));
  }

  function goQuizNext() {
    if (!quizQuestions.length) return;
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((v) => v + 1);
      return;
    }
    setQuizFinished(true);
  }

  const maxQuizCount = filteredQuestions.length;
  const normalizedQuizCount = clampQuizCount(quizCount);
  const effectiveQuizCount = Math.min(normalizedQuizCount, maxQuizCount);
  const isSpecificCategory = category !== ALL_CATEGORY;
  const lockQuizCountSelection = isSpecificCategory && maxQuizCount < 50;
  const quizAccuracy = quizAnsweredCount
    ? Math.round((quizCorrectCount / quizAnsweredCount) * 100)
    : 0;
  const pointsPerQuestion = quizQuestions.length ? 100 / quizQuestions.length : 0;
  const quizScore = Math.round(quizCorrectCount * pointsPerQuestion * 100) / 100;

  return (
    <main className="page">
      <div className="container">
        <h1>題庫練習</h1>

        {loading && <p>載入中...</p>}
        {error && <p className="error">載入失敗：{error}</p>}

        {!loading && !error && (
          <>
            <section className="toolbar">
              <label>
                科目
                <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                分類
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value={ALL_CATEGORY}>不分類（全部）</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                模式
                <select value={mode} onChange={(e) => handleModeChange(e.target.value)}>
                  <option value={MODES.MEMORIZE}>背誦模式</option>
                  <option value={MODES.QUIZ}>考試模式</option>
                </select>
              </label>
            </section>

            {mode === MODES.MEMORIZE && (
              <>
                <section className="stats">
                  <span>
                    頁數：{memorizeOrder.length ? `${memorizePage + 1} / ${memorizeTotalPages}` : '0 / 0'}
                  </span>
                  <span>目前題庫數：{filteredQuestions.length}</span>
                  <span>
                    <label>
                      每頁題數
                      <select
                        value={memorizePageSize}
                        onChange={(e) => {
                          setMemorizePageSize(Number(e.target.value));
                          setMemorizePage(0);
                        }}
                      >
                        {MEMORIZE_PAGE_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                  </span>
                </section>

                {currentMemorizeQuestions.length ? (
                  <section className="card">
                    <div className="memorizeList">
                      {currentMemorizeQuestions.map((q) => (
                        <article key={q.question_id} className="memorizeItem">
                          <h2>{q.question}</h2>
                          <p className="meta">科目：{subject} / 分類：{q.category || '未分類'}</p>
                          <ul className="plainList">
                            {Object.entries(q.options).map(([key, text]) => (
                              <li key={key}>{key}. {text}</li>
                            ))}
                          </ul>
                          <p className="answer">
                            正確答案：{q.answer}. {q.options?.[q.answer] || ''}
                          </p>
                        </article>
                      ))}
                    </div>

                    <div className="actions">
                      <button type="button" onClick={goMemorizePrevPage}>上一頁</button>
                      <button type="button" onClick={handleMemorizeShuffle}>隨機順序</button>
                      <button type="button" onClick={goMemorizeNextPage}>下一頁</button>
                    </div>
                  </section>
                ) : (
                  <p>此範圍尚無題目資料。</p>
                )}
              </>
            )}

            {mode === MODES.QUIZ && (
              <>
                {!quizStarted && (
                  <section className="card">
                    <h2>考試設定</h2>
                    <p className="meta">目前可用題數：{filteredQuestions.length}</p>

                    <div className="quizConfig">
                      <label>
                        題目數
                        <select
                          value={
                            lockQuizCountSelection
                              ? String(effectiveQuizCount)
                              : quizCountMode
                          }
                          onChange={(e) => {
                            const nextMode = e.target.value;
                            setQuizCountMode(nextMode);
                            if (nextMode !== 'custom') {
                              setQuizCount(clampQuizCount(Number(nextMode)));
                            }
                          }}
                          disabled={lockQuizCountSelection}
                        >
                          {lockQuizCountSelection ? (
                            <option value={effectiveQuizCount}>{effectiveQuizCount}</option>
                          ) : (
                            <>
                              {QUIZ_COUNTS.map((count) => (
                                <option key={count} value={count}>
                                  {count}
                                </option>
                              ))}
                              <option value="custom">自訂（請輸入）</option>
                            </>
                          )}
                        </select>
                      </label>
                      {!lockQuizCountSelection && quizCountMode === 'custom' && (
                        <label>
                          自訂題數（1~100）
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={normalizedQuizCount}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isNaN(next)) {
                                setQuizCount(next);
                              }
                            }}
                            onBlur={() => setQuizCount(clampQuizCount(quizCount))}
                          />
                        </label>
                      )}

                      <p className="meta">
                        實際出題：{effectiveQuizCount} 題
                        {maxQuizCount < normalizedQuizCount ? '（因題庫不足，自動調整）' : ''}
                      </p>
                      {lockQuizCountSelection && (
                        <p className="meta">此分類題數少於 50 題，題目數已鎖定為該分類全部題目。</p>
                      )}
                      <p className="meta">
                        分數規則：滿分 100 分，每題 {effectiveQuizCount ? (100 / effectiveQuizCount).toFixed(2) : '0.00'} 分
                      </p>
                    </div>

                    <button type="button" onClick={startQuiz} disabled={!filteredQuestions.length}>
                      開始測驗
                    </button>
                  </section>
                )}

                {quizStarted && (
                  <>
                    <section className="stats">
                      <span>
                        進度：{quizFinished ? `${quizQuestions.length} / ${quizQuestions.length}` : `${quizIndex + 1} / ${quizQuestions.length}`}
                      </span>
                      <span>已作答：{quizAnsweredCount}</span>
                      <span>
                        用時：{formatSeconds(quizElapsedSec)}{' '}
                        <button type="button" onClick={restartQuiz}>重設測驗</button>
                      </span>
                    </section>

                    {!quizFinished && currentQuizQuestion && (
                      <section className="card">
                        <h2>{currentQuizQuestion.question}</h2>
                        <p className="meta">
                          科目：{subject} / 分類：{currentQuizQuestion.category || '未分類'}
                        </p>

                        <div className="options">
                          {Object.entries(currentQuizQuestion.options).map(([key, text]) => {
                            const row = quizSelections[currentQuizQuestion.question_id];
                            const selected = row?.selected;
                            const classNames = [
                              'option',
                              selected === key ? 'selected' : ''
                            ]
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <button
                                key={key}
                                type="button"
                                className={classNames}
                                onClick={() => submitQuizAnswer(key)}
                              >
                                <strong>{key}.</strong> {text}
                              </button>
                            );
                          })}
                        </div>

                        <div className="actions">
                          <button
                            type="button"
                            onClick={goQuizNext}
                            disabled={!quizSelections[currentQuizQuestion.question_id]}
                          >
                            {quizIndex + 1 === quizQuestions.length ? '交卷' : '下一題'}
                          </button>
                        </div>
                      </section>
                    )}

                    {quizFinished && (
                      <section className="card">
                        <h2>測驗結果</h2>
                        <div className="resultSummary">
                          <p className="meta">總題數：{quizQuestions.length}</p>
                          <p className="meta">
                            <span className="resultIcon resultIcon-correct" aria-hidden="true">●</span>
                            答對：{quizCorrectCount}
                          </p>
                          <p className="meta">
                            <span className="resultIcon resultIcon-wrong" aria-hidden="true">✕</span>
                            答錯：{quizWrongItems.length}
                          </p>
                          <p className="meta">
                            <span className="resultIcon resultIcon-score" aria-hidden="true">★</span>
                            正確率：{quizAccuracy}%
                          </p>
                          <p className="meta">
                            <span className="resultIcon resultIcon-score" aria-hidden="true">★</span>
                            分數：{quizScore} / 100
                          </p>
                          <p className="meta">總用時：{formatSeconds(quizElapsedSec)}</p>
                        </div>

                        <h3>答錯分類統計</h3>
                        {Object.keys(quizWrongByCategory).length ? (
                          <ul className="plainList">
                            {Object.entries(quizWrongByCategory).map(([cat, count]) => (
                              <li key={cat}>{cat}：{count} 題</li>
                            ))}
                          </ul>
                        ) : (
                          <p>本次全對。</p>
                        )}

                        <h3>錯誤題目</h3>
                        {quizWrongItems.length ? (
                          <ol className="wrongList">
                            {quizWrongItems.map((item) => (
                              <li key={item.question_id}>
                                <p className="meta">分類：{item.category}</p>
                                <p>{item.question}</p>
                                <ul className="plainList">
                                  {Object.entries(item.options || {}).map(([key, text]) => (
                                    <li
                                      key={key}
                                      className={[
                                        item.selected === key ? 'review-option-wrong' : '',
                                        item.answer === key ? 'review-option-correct' : ''
                                      ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    >
                                      {key}. {text}
                                      {item.selected === key ? '（你的答案）' : ''}
                                      {item.answer === key ? '（正確答案）' : ''}
                                    </li>
                                  ))}
                                </ul>
                                <p>你的答案：{item.selected || '未作答'} / 正確答案：{item.answer}</p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p>沒有錯題。</p>
                        )}

                        <div className="actions">
                          <button type="button" onClick={startQuiz}>同設定再考一次</button>
                          <button type="button" onClick={restartQuiz}>回到考試設定</button>
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
