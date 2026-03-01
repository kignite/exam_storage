import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_FILES = {
  '美容丙級': path.join(ROOT, 'output', 'questions_美容丙級.json'),
  '共同科目': path.join(ROOT, 'output', 'questions_共同科目.json')
};

let cache = null;

async function loadAllQuestions() {
  if (cache) return cache;

  const subjects = Object.keys(DATA_FILES);
  const loaded = await Promise.all(
    subjects.map(async (subject) => {
      const text = await readFile(DATA_FILES[subject], 'utf8');
      const questions = JSON.parse(text);
      return [subject, questions];
    })
  );

  cache = Object.fromEntries(loaded);
  return cache;
}

export async function GET(request) {
  try {
    const data = await loadAllQuestions();
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    if (subject) {
      if (!data[subject]) {
        return Response.json({ error: 'Unknown subject' }, { status: 400 });
      }
      return Response.json({ subject, questions: data[subject] });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load question data',
        detail: error instanceof Error ? error.message : 'unknown_error'
      },
      { status: 500 }
    );
  }
}
