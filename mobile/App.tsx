import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Question = {
  subject: string;
  source_question_number?: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  source_pages?: number[];
  question_id?: string | number;
  category?: string;
};

type SubjectSource = {
  key: string;
  label: string;
  questions: Question[];
};

type QuizSelection = {
  selected: string;
};

const ALL_CATEGORY = '__ALL__';
const MODES = {
  MEMORIZE: 'memorize',
  QUIZ: 'quiz',
} as const;
const QUIZ_COUNTS = [25, 50, 80];
const MEMORIZE_PAGE_SIZES = [5, 10, 20];

const beautyQuestions = require('./src/data/questions_美容丙級.json') as Question[];
const commonQuestions = require('./src/data/questions_共同科目.json') as Question[];

const SUBJECTS: SubjectSource[] = [
  {key: 'beauty', label: '美容丙級', questions: beautyQuestions},
  {key: 'common', label: '共同科目', questions: commonQuestions},
];

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clampQuizCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 25;
  }
  return Math.min(100, Math.max(1, Math.floor(value)));
}

function formatSeconds(totalSec: number): string {
  const sec = Math.max(0, totalSec);
  const mins = String(Math.floor(sec / 60)).padStart(2, '0');
  const seconds = String(sec % 60).padStart(2, '0');
  return `${mins}:${seconds}`;
}

function getQuestionId(question: Question, index: number): string {
  if (question.question_id !== undefined && question.question_id !== null) {
    return String(question.question_id);
  }
  return `${question.subject}-${index}`;
}

function App(): React.JSX.Element {
  const [subjectKey, setSubjectKey] = useState(SUBJECTS[0].key);
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [mode, setMode] = useState<(typeof MODES)[keyof typeof MODES]>(MODES.MEMORIZE);

  const [memorizeOrder, setMemorizeOrder] = useState<number[]>([]);
  const [memorizePage, setMemorizePage] = useState(0);
  const [memorizePageSize, setMemorizePageSize] = useState(5);

  const [quizCount, setQuizCount] = useState(25);
  const [quizCountMode, setQuizCountMode] = useState('25');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizSelections, setQuizSelections] = useState<Record<string, QuizSelection>>({});
  const [quizElapsedSec, setQuizElapsedSec] = useState(0);
  const [quizStartedAt, setQuizStartedAt] = useState(0);

  const activeSubject = useMemo(
    () => SUBJECTS.find(item => item.key === subjectKey) ?? SUBJECTS[0],
    [subjectKey],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeSubject.questions.forEach(item => {
      set.add(item.category || '未分類');
    });
    return Array.from(set);
  }, [activeSubject.questions]);

  const filteredQuestions = useMemo(() => {
    if (category === ALL_CATEGORY) {
      return activeSubject.questions;
    }
    return activeSubject.questions.filter(item => (item.category || '未分類') === category);
  }, [activeSubject.questions, category]);

  useEffect(() => {
    if (category !== ALL_CATEGORY && !categories.includes(category)) {
      setCategory(ALL_CATEGORY);
    }
  }, [category, categories]);

  useEffect(() => {
    setMemorizeOrder(filteredQuestions.map((_, index) => index));
    setMemorizePage(0);

    setQuizStarted(false);
    setQuizFinished(false);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizElapsedSec(0);
    setQuizStartedAt(0);
  }, [subjectKey, category, filteredQuestions]);

  useEffect(() => {
    if (!quizStarted || quizFinished || !quizStartedAt) {
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - quizStartedAt) / 1000);
      setQuizElapsedSec(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizFinished, quizStartedAt]);

  const memorizeStart = memorizePage * memorizePageSize;
  const memorizeTotalPages = Math.max(1, Math.ceil(memorizeOrder.length / memorizePageSize));
  const currentMemorizeQuestions = memorizeOrder
    .slice(memorizeStart, memorizeStart + memorizePageSize)
    .map(index => filteredQuestions[index])
    .filter(Boolean);

  const currentQuizQuestion = quizQuestions[quizIndex];
  const currentQuizQuestionId = currentQuizQuestion
    ? getQuestionId(currentQuizQuestion, quizIndex)
    : '';

  const maxQuizCount = filteredQuestions.length;
  const normalizedQuizCount = clampQuizCount(quizCount);
  const effectiveQuizCount = Math.min(normalizedQuizCount, maxQuizCount);
  const isSpecificCategory = category !== ALL_CATEGORY;
  const lockQuizCountSelection = isSpecificCategory && maxQuizCount < 50;

  const quizAnsweredCount = useMemo(
    () => Object.keys(quizSelections).length,
    [quizSelections],
  );

  const quizCorrectCount = useMemo(() => {
    return quizQuestions.reduce((acc, question, index) => {
      const id = getQuestionId(question, index);
      const selected = quizSelections[id]?.selected;
      if (selected === question.answer) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [quizQuestions, quizSelections]);

  const quizWrongItems = useMemo(() => {
    return quizQuestions
      .map((question, index) => {
        const id = getQuestionId(question, index);
        const selected = quizSelections[id]?.selected;
        if (!selected || selected === question.answer) {
          return null;
        }
        return {
          id,
          question,
          selected,
        };
      })
      .filter(Boolean) as Array<{id: string; question: Question; selected: string}>;
  }, [quizQuestions, quizSelections]);

  const quizWrongByCategory = useMemo(() => {
    return quizWrongItems.reduce<Record<string, number>>((acc, item) => {
      const key = item.question.category || '未分類';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [quizWrongItems]);

  const quizAccuracy = quizAnsweredCount
    ? Math.round((quizCorrectCount / quizAnsweredCount) * 100)
    : 0;
  const pointsPerQuestion = quizQuestions.length ? 100 / quizQuestions.length : 0;
  const quizScore = Math.round(quizCorrectCount * pointsPerQuestion * 100) / 100;

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizFinished(false);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizElapsedSec(0);
    setQuizStartedAt(0);
  };

  const startQuiz = () => {
    if (!filteredQuestions.length) {
      return;
    }
    const count = Math.min(normalizedQuizCount, filteredQuestions.length);
    const picked = shuffle(filteredQuestions).slice(0, count);
    setQuizQuestions(picked);
    setQuizIndex(0);
    setQuizSelections({});
    setQuizFinished(false);
    setQuizStarted(true);
    setQuizElapsedSec(0);
    setQuizStartedAt(Date.now());
  };

  const submitQuizAnswer = (option: string) => {
    if (!currentQuizQuestion) {
      return;
    }
    setQuizSelections(prev => ({
      ...prev,
      [currentQuizQuestionId]: {selected: option},
    }));
  };

  const goQuizNext = () => {
    if (!quizQuestions.length) {
      return;
    }
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex(prev => prev + 1);
      return;
    }
    setQuizFinished(true);
  };

  const goMemorizeNextPage = () => {
    if (memorizePage + 1 < memorizeTotalPages) {
      setMemorizePage(prev => prev + 1);
      return;
    }
    setMemorizePage(0);
  };

  const goMemorizePrevPage = () => {
    if (memorizePage - 1 >= 0) {
      setMemorizePage(prev => prev - 1);
      return;
    }
    setMemorizePage(memorizeTotalPages - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7fb" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>阿肥的題庫</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>科目</Text>
          <View style={styles.rowWrap}>
            {SUBJECTS.map(item => {
              const active = item.key === subjectKey;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSubjectKey(item.key)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>分類</Text>
          <View style={styles.rowWrap}>
            <Pressable
              style={[styles.chip, category === ALL_CATEGORY && styles.chipActive]}
              onPress={() => setCategory(ALL_CATEGORY)}>
              <Text
                style={[
                  styles.chipText,
                  category === ALL_CATEGORY && styles.chipTextActive,
                ]}>
                不分類（全部）
              </Text>
            </Pressable>
            {categories.map(item => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>模式</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, mode === MODES.MEMORIZE && styles.modeButtonActive]}
              onPress={() => setMode(MODES.MEMORIZE)}>
              <Text
                style={[
                  styles.modeButtonText,
                  mode === MODES.MEMORIZE && styles.modeButtonTextActive,
                ]}>
                記憶模式
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === MODES.QUIZ && styles.modeButtonActive]}
              onPress={() => setMode(MODES.QUIZ)}>
              <Text
                style={[
                  styles.modeButtonText,
                  mode === MODES.QUIZ && styles.modeButtonTextActive,
                ]}>
                出題模式
              </Text>
            </Pressable>
          </View>
        </View>

        {mode === MODES.MEMORIZE && (
          <View style={styles.card}>
            <Text style={styles.meta}>
              共 {filteredQuestions.length} 題，頁數 {memorizeOrder.length ? memorizePage + 1 : 0}/
              {memorizeTotalPages}
            </Text>

            <View style={styles.rowWrap}>
              {MEMORIZE_PAGE_SIZES.map(size => {
                const active = memorizePageSize === size;
                return (
                  <Pressable
                    key={size}
                    style={[styles.smallChip, active && styles.smallChipActive]}
                    onPress={() => {
                      setMemorizePageSize(size);
                      setMemorizePage(0);
                    }}>
                    <Text
                      style={[
                        styles.smallChipText,
                        active && styles.smallChipTextActive,
                      ]}>
                      每頁 {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={goMemorizePrevPage}>
                <Text style={styles.secondaryButtonText}>上一頁</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setMemorizeOrder(shuffle(filteredQuestions.map((_, index) => index)));
                  setMemorizePage(0);
                }}>
                <Text style={styles.secondaryButtonText}>隨機</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={goMemorizeNextPage}>
                <Text style={styles.primaryButtonText}>下一頁</Text>
              </Pressable>
            </View>

            {currentMemorizeQuestions.length === 0 ? (
              <Text style={styles.meta}>此範圍沒有題目。</Text>
            ) : (
              currentMemorizeQuestions.map((question, index) => (
                <View
                  key={getQuestionId(question, memorizeStart + index)}
                  style={styles.questionCard}>
                  <Text style={styles.meta}>分類：{question.category || '未分類'}</Text>
                  <Text style={styles.questionText}>{question.question}</Text>
                  <View style={styles.optionsWrap}>
                    {Object.entries(question.options || {}).map(([key, value]) => (
                      <Text key={key} style={styles.optionText}>
                        {key}. {value}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.answerTextInline}>
                    正確答案：{question.answer}. {question.options?.[question.answer] || ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {mode === MODES.QUIZ && !quizStarted && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>出題設定</Text>
            <Text style={styles.meta}>目前可用題數：{filteredQuestions.length}</Text>

            <View style={styles.rowWrap}>
              {(lockQuizCountSelection ? [effectiveQuizCount] : QUIZ_COUNTS).map(count => {
                const active = Number(quizCountMode) === count;
                return (
                  <Pressable
                    key={count}
                    style={[styles.smallChip, active && styles.smallChipActive]}
                    onPress={() => {
                      setQuizCountMode(String(count));
                      setQuizCount(count);
                    }}
                    disabled={lockQuizCountSelection}>
                    <Text
                      style={[
                        styles.smallChipText,
                        active && styles.smallChipTextActive,
                      ]}>
                      {count} 題
                    </Text>
                  </Pressable>
                );
              })}
              {!lockQuizCountSelection && (
                <Pressable
                  style={[
                    styles.smallChip,
                    quizCountMode === 'custom' && styles.smallChipActive,
                  ]}
                  onPress={() => setQuizCountMode('custom')}>
                  <Text
                    style={[
                      styles.smallChipText,
                      quizCountMode === 'custom' && styles.smallChipTextActive,
                    ]}>
                    自訂
                  </Text>
                </Pressable>
              )}
            </View>

            {!lockQuizCountSelection && quizCountMode === 'custom' && (
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(normalizedQuizCount)}
                placeholder="輸入 1~100"
                onChangeText={text => {
                  const next = Number(text);
                  if (!Number.isNaN(next)) {
                    setQuizCount(next);
                  }
                }}
                onBlur={() => setQuizCount(clampQuizCount(quizCount))}
              />
            )}

            <Text style={styles.meta}>
              實際出題：{effectiveQuizCount} 題
              {maxQuizCount < normalizedQuizCount ? '（題庫不足已自動調整）' : ''}
            </Text>
            {lockQuizCountSelection && (
              <Text style={styles.meta}>此分類題數少於 50 題，題目數鎖定為該分類全部。</Text>
            )}
            <Text style={styles.meta}>
              分數規則：每題 {effectiveQuizCount ? (100 / effectiveQuizCount).toFixed(2) : '0.00'} 分
            </Text>

            <Pressable
              style={[styles.primaryButton, !filteredQuestions.length && styles.buttonDisabled]}
              onPress={startQuiz}
              disabled={!filteredQuestions.length}>
              <Text style={styles.primaryButtonText}>開始測驗</Text>
            </Pressable>
          </View>
        )}

        {mode === MODES.QUIZ && quizStarted && (
          <>
            <View style={styles.card}>
              <Text style={styles.meta}>
                進度：
                {quizFinished
                  ? `${quizQuestions.length}/${quizQuestions.length}`
                  : `${quizIndex + 1}/${quizQuestions.length}`}
              </Text>
              <Text style={styles.meta}>已作答：{quizAnsweredCount}</Text>
              <Text style={styles.meta}>用時：{formatSeconds(quizElapsedSec)}</Text>
              <Pressable style={styles.secondaryButton} onPress={resetQuiz}>
                <Text style={styles.secondaryButtonText}>重設測驗</Text>
              </Pressable>
            </View>

            {!quizFinished && currentQuizQuestion && (
              <View style={styles.card}>
                <Text style={styles.meta}>分類：{currentQuizQuestion.category || '未分類'}</Text>
                <Text style={styles.questionText}>{currentQuizQuestion.question}</Text>

                <View style={styles.optionsWrap}>
                  {Object.entries(currentQuizQuestion.options || {}).map(([key, value]) => {
                    const selected = quizSelections[currentQuizQuestionId]?.selected;
                    return (
                      <Pressable
                        key={key}
                        style={[
                          styles.optionButton,
                          selected === key && styles.optionButtonSelected,
                        ]}
                        onPress={() => submitQuizAnswer(key)}>
                        <Text style={styles.optionTextStrong}>
                          {key}. {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    !quizSelections[currentQuizQuestionId] && styles.buttonDisabled,
                  ]}
                  onPress={goQuizNext}
                  disabled={!quizSelections[currentQuizQuestionId]}>
                  <Text style={styles.primaryButtonText}>
                    {quizIndex + 1 === quizQuestions.length ? '交卷' : '下一題'}
                  </Text>
                </Pressable>
              </View>
            )}

            {quizFinished && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>測驗結果</Text>
                <Text style={styles.meta}>總題數：{quizQuestions.length}</Text>
                <Text style={styles.meta}>答對：{quizCorrectCount}</Text>
                <Text style={styles.meta}>答錯：{quizWrongItems.length}</Text>
                <Text style={styles.meta}>正確率：{quizAccuracy}%</Text>
                <Text style={styles.meta}>分數：{quizScore} / 100</Text>
                <Text style={styles.meta}>總用時：{formatSeconds(quizElapsedSec)}</Text>

                <Text style={styles.sectionTitle}>答錯分類統計</Text>
                {Object.keys(quizWrongByCategory).length ? (
                  Object.entries(quizWrongByCategory).map(([cat, count]) => (
                    <Text key={cat} style={styles.meta}>
                      {cat}：{count} 題
                    </Text>
                  ))
                ) : (
                  <Text style={styles.meta}>本次全對。</Text>
                )}

                <Text style={styles.sectionTitle}>錯誤題目</Text>
                {quizWrongItems.length ? (
                  quizWrongItems.map(item => (
                    <View key={item.id} style={styles.questionCard}>
                      <Text style={styles.meta}>分類：{item.question.category || '未分類'}</Text>
                      <Text style={styles.questionText}>{item.question.question}</Text>
                      {Object.entries(item.question.options || {}).map(([key, value]) => (
                        <Text
                          key={key}
                          style={[
                            styles.optionText,
                            key === item.selected && styles.wrongOption,
                            key === item.question.answer && styles.correctOption,
                          ]}>
                          {key}. {value}
                          {key === item.selected ? '（你的答案）' : ''}
                          {key === item.question.answer ? '（正確答案）' : ''}
                        </Text>
                      ))}
                    </View>
                  ))
                ) : (
                  <Text style={styles.meta}>沒有錯題。</Text>
                )}

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryButton} onPress={startQuiz}>
                    <Text style={styles.primaryButtonText}>同設定再考一次</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={resetQuiz}>
                    <Text style={styles.secondaryButtonText}>回到設定</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#0369a1',
    backgroundColor: '#e0f2fe',
  },
  chipText: {
    color: '#374151',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#075985',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  modeButtonActive: {
    backgroundColor: '#0369a1',
    borderColor: '#0369a1',
  },
  modeButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  smallChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  smallChipActive: {
    borderColor: '#0284c7',
    backgroundColor: '#e0f2fe',
  },
  smallChipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
  smallChipTextActive: {
    color: '#075985',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0369a1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  questionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 27,
    color: '#111827',
    fontWeight: '700',
  },
  optionsWrap: {
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#e0f2fe',
  },
  optionText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 21,
  },
  optionTextStrong: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    fontWeight: '600',
  },
  answerTextInline: {
    fontSize: 15,
    color: '#14532d',
    fontWeight: '700',
  },
  wrongOption: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  correctOption: {
    color: '#166534',
    fontWeight: '700',
  },
});

export default App;
