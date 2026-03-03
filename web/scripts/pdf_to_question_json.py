#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pypdf import PdfReader


NOISE_KEYWORDS = [
    "掃描左",
    "QR Code",
    "Line ID",
    "加入我們的 Line",
    "官網",
    "免費註冊成為會員",
    "Shopee ID",
    "queen60388@gmail.com",
    "陳秀慈",
    "⾦融市場常識與職業道德免費線上測驗呦",
    "險、考試、信⽤卡或銀⾏⼯作相關的問題喔",
]

OPTION_RE = re.compile(r"\((1|2|3|4)\)\s*")
QUESTION_LINE_RE = re.compile(r"^(\d{1,3})(.*)$")
ANSWER_ONLY_RE = re.compile(r"^[1-4]$")
WS_RE = re.compile(r"\s+")


@dataclass
class RawQuestion:
    number: int
    lines: List[str] = field(default_factory=list)
    answer_hint: Optional[str] = None
    source_pages: List[int] = field(default_factory=list)


def clean_line(line: str) -> str:
    line = line.replace("\u3000", " ")
    line = WS_RE.sub(" ", line).strip()
    return line


def normalize_text(text: str) -> str:
    return unicodedata.normalize("NFKC", text).strip()


def is_noise_line(line: str) -> bool:
    if not line:
        return True
    if line in {"題號", "解答", "題號 解答", "解答題號"}:
        return True
    if "題號" in line and "解答" in line:
        return True
    if any(k in line for k in NOISE_KEYWORDS):
        return True
    if re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", line):
        return True
    if re.fullmatch(r"\d{1,2}", line):
        return False
    return False


def extract_pdf_lines(pdf_path: Path) -> List[Tuple[int, str]]:
    reader = PdfReader(str(pdf_path))
    out: List[Tuple[int, str]] = []
    for page_idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for raw in text.splitlines():
            line = clean_line(raw)
            if is_noise_line(line):
                continue
            out.append((page_idx, line))
    return out


def extract_page_categories(pdf_path: Path) -> Dict[int, str]:
    reader = PdfReader(str(pdf_path))
    page_to_category: Dict[int, str] = {}
    prev: Optional[str] = None

    for page_idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        lines = [clean_line(raw) for raw in text.splitlines() if clean_line(raw)]
        category: Optional[str] = None

        for line in lines[:14]:
            m = re.search(r"題號\s*(.*?)\s*解答", line)
            if m and m.group(1).strip():
                category = normalize_text(m.group(1))
                break

        if not category:
            for line in lines[-18:]:
                m = re.search(r"^(.*?)\s*解答題號", line)
                if m and m.group(1).strip() and "|" not in m.group(1):
                    category = normalize_text(m.group(1))
                    break

        if not category:
            category = prev

        page_to_category[page_idx] = category or "未分類"
        prev = page_to_category[page_idx]

    return page_to_category


def parse_raw_questions(lines_with_pages: List[Tuple[int, str]]) -> List[RawQuestion]:
    questions: List[RawQuestion] = []
    current: Optional[RawQuestion] = None

    i = 0
    n = len(lines_with_pages)
    while i < n:
        page, line = lines_with_pages[i]
        m = QUESTION_LINE_RE.match(line)
        if not m:
            if current:
                current.lines.append(line)
                current.source_pages.append(page)
            i += 1
            continue

        num = int(m.group(1))
        rest = m.group(2).strip()

        if current and ANSWER_ONLY_RE.match(line) and current.answer_hint is None:
            if OPTION_RE.search(" ".join(current.lines)):
                next_line = lines_with_pages[i + 1][1] if i + 1 < n else ""
                # Pattern on some pages: answer line "2" then next question starts with "2 ..."
                if num == current.number + 1 and next_line.startswith(line):
                    current.answer_hint = line
                    i += 1
                    continue
                # Otherwise still treat isolated single digit as answer when options already complete.
                if num != current.number + 1:
                    current.answer_hint = line
                    i += 1
                    continue

        start_new = False
        if current is None:
            start_new = True
        elif num == current.number + 1:
            start_new = True
        elif num == 1 and current.number > 1:
            start_new = True
        elif rest and num >= 5 and num != current.number:
            start_new = True

        if start_new:
            if current is not None:
                questions.append(current)
            current = RawQuestion(number=num, source_pages=[page])
            if rest:
                current.lines.append(rest)
            else:
                if i + 1 < n:
                    _, next_line = lines_with_pages[i + 1]
                    if not OPTION_RE.match(next_line):
                        current.lines.append(next_line)
                        i += 1
            i += 1
            continue

        if current:
            current.lines.append(line)
            current.source_pages.append(page)
        i += 1

    if current is not None:
        questions.append(current)
    return questions


def parse_one_question(
    raw: RawQuestion, subject: str, page_categories: Dict[int, str]
) -> Tuple[Optional[dict], Optional[dict]]:
    text = clean_line(" ".join(raw.lines))
    if not text:
        return None, {"question_number": raw.number, "reason": "empty_text"}
    if re.fullmatch(r"[1-4]", text) or len(text) <= 6:
        return None, {"question_number": raw.number, "reason": "skip_fragment"}
    if text in {"萬元以下罰鍰"}:
        return None, {"question_number": raw.number, "reason": "skip_fragment"}

    matches = list(OPTION_RE.finditer(text))
    if len(matches) < 4:
        return None, {
            "question_number": raw.number,
            "reason": "options_not_found",
            "raw_text": text[:300],
        }
    if len(matches) > 4:
        matches = matches[:4]

    stem = text[: matches[0].start()].strip(" ：:")
    if not stem:
        return None, {
            "question_number": raw.number,
            "reason": "empty_stem",
            "raw_text": text[:300],
        }

    options: Dict[str, str] = {}
    answer_from_option_tail: Optional[str] = None
    labels = {"1": "A", "2": "B", "3": "C", "4": "D"}

    for idx, m in enumerate(matches):
        num = m.group(1)
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        seg = text[start:end].strip()
        if idx == len(matches) - 1:
            tail = re.search(
                r"\s([1-4])(?:\s+\d{1,3})?(?:\s+Powered by TCPDF.*)?\s*$",
                seg,
            )
            if tail:
                answer_from_option_tail = tail.group(1)
                seg = seg[: tail.start()].strip()
            else:
                tail_no_space = re.search(r"）([1-4])(?:\s+\d{1,3})\s*$", seg)
                if tail_no_space:
                    answer_from_option_tail = tail_no_space.group(1)
                    seg = seg[: tail_no_space.start()].strip()
                # Some lines contain: "(4) ... 4 下列何者..." where next question text is appended.
                if answer_from_option_tail is None:
                    mid = re.search(r"^(.*?)\s([1-4])\s+(.+)$", seg)
                    if mid:
                        trailing = mid.group(3)
                        if "(1)" in trailing or "下列何者" in trailing or "？" in trailing:
                            answer_from_option_tail = mid.group(2)
                            seg = mid.group(1).strip()
        options[labels[num]] = seg

    if any(not options.get(k) for k in ("A", "B", "C", "D")):
        return None, {
            "question_number": raw.number,
            "reason": "missing_option_text",
            "raw_text": text[:300],
        }

    answer_num = raw.answer_hint or answer_from_option_tail
    answer = labels.get(answer_num, "")
    if not answer:
        return None, {
            "question_number": raw.number,
            "reason": "answer_not_found",
            "raw_text": text[:300],
        }

    stem = re.sub(rf"^{raw.number}\s+", "", stem).strip()

    record = {
        "subject": subject,
        "category": page_categories.get(raw.source_pages[0], "未分類")
        if raw.source_pages
        else "未分類",
        "source_question_number": raw.number,
        "question": stem,
        "options": options,
        "answer": answer,
        "source_pages": sorted(set(raw.source_pages)),
    }
    return record, None


def convert_pdf(pdf_path: Path, output_dir: Path) -> Tuple[Path, Path, int, int]:
    subject = pdf_path.stem
    page_categories = extract_page_categories(pdf_path)
    lines = extract_pdf_lines(pdf_path)
    raws = parse_raw_questions(lines)

    valid: List[dict] = []
    invalid: List[dict] = []
    for raw in raws:
        record, err = parse_one_question(raw, subject, page_categories)
        if record:
            valid.append(record)
        elif err and err.get("reason") != "skip_fragment":
            invalid.append(err)

    for idx, row in enumerate(valid, start=1):
        row["question_id"] = f"{subject}-{idx:05d}"

    q_path = output_dir / f"questions_{subject}.json"
    bad_path = output_dir / f"invalid_{subject}.json"
    q_path.write_text(json.dumps(valid, ensure_ascii=False, indent=2), encoding="utf-8")
    bad_path.write_text(json.dumps(invalid, ensure_ascii=False, indent=2), encoding="utf-8")
    return q_path, bad_path, len(valid), len(invalid)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert exam PDFs to JSON question bank.")
    parser.add_argument("pdfs", nargs="+", type=Path, help="PDF files to convert")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("output"),
        help="Output directory (default: output)",
    )
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    for pdf in args.pdfs:
        if not pdf.exists():
            print(f"[SKIP] file not found: {pdf}")
            continue
        q_path, bad_path, ok_count, bad_count = convert_pdf(pdf, args.output_dir)
        print(f"[DONE] {pdf.name}")
        print(f"  questions: {ok_count} -> {q_path}")
        print(f"  invalid  : {bad_count} -> {bad_path}")


if __name__ == "__main__":
    main()
