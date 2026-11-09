import { fenToYuan, parseYuanToFen } from './money'
import type { Book, Requirement } from './types'

const CN_DIGITS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }

const RE_TITLE = /《([^》]{1,40})》/
const RE_GRADE_NUM = /([0-9](?:\.[0-9])?)\s*成新/
const RE_GRADE_CN = /([一二三四五六七八九])成新/
const RE_GRADE_NEW = /全新/
const RE_NOTES_OK = /(笔记无所谓|有笔记也行|有笔记没关系|可以有笔记|笔记不限)/
const RE_NOTES_NO = /(无笔记|没有笔记|不要笔记|没笔记|无划线|不要划线|没有划线)/
const RE_BUDGET = /预算\s*[:：]?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|块)?/
const RE_PRICE = /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|块)(?:以内|以下|之内)?/

function findBook(books: Book[], title: string): Book | null {
  return books.find((b) => b.title === title || b.aliases.includes(title)) ?? null
}

/** Rule-based stand-in for LLM extraction. Deterministic; mirrored in eval/run_eval.py. */
export function parseRequirementText(text: string, books: Book[]): Requirement & { budgetFen: number | null } {
  let title: string | null = null
  let bookId: string | null = null
  let titleConf = 0
  let titleText: string | null = null
  const mt = RE_TITLE.exec(text)
  if (mt) {
    title = mt[1].trim()
    titleText = mt[0]
    const book = findBook(books, title)
    if (book) {
      bookId = book.id
      title = book.title
      titleConf = 0.98
    } else {
      titleConf = 0.6
    }
  } else {
    for (const b of books) {
      const name = [b.title, ...b.aliases].find((n) => text.includes(n))
      if (name) {
        title = b.title
        bookId = b.id
        titleText = name
        titleConf = 0.85
        break
      }
    }
  }

  let conditionMin: number | null = null
  let condConf = 0.5
  let condText: string | null = null
  const mg = RE_GRADE_NUM.exec(text)
  const mc = RE_GRADE_CN.exec(text)
  if (mg) {
    const [whole, frac = '0'] = mg[1].split('.')
    conditionMin = Number(whole) * 10 + Number(frac)
    condConf = 0.95
    condText = mg[0]
  } else if (RE_GRADE_NEW.test(text)) {
    conditionMin = 100
    condConf = 0.9
    condText = '全新'
  } else if (mc) {
    conditionMin = CN_DIGITS[mc[1]] * 10
    condConf = 0.9
    condText = mc[0]
  }

  let noNotes: boolean | null = null
  let notesConf = 0.6
  let notesText: string | null = null
  const mok = RE_NOTES_OK.exec(text)
  const mno = RE_NOTES_NO.exec(text)
  if (mok) {
    noNotes = false
    notesConf = 0.9
    notesText = mok[0]
  } else if (mno) {
    noNotes = true
    notesConf = 0.92
    notesText = mno[0]
  }

  let budgetFen: number | null = null
  let budgetConf = 0
  let budgetText: string | null = null
  const mb = RE_BUDGET.exec(text)
  const mp = RE_PRICE.exec(text)
  if (mb) {
    budgetFen = parseYuanToFen(mb[1])
    budgetConf = 0.97
    budgetText = mb[0].trim()
  } else if (mp) {
    budgetFen = parseYuanToFen(mp[1])
    budgetConf = 0.85
    budgetText = mp[0].trim()
  }
  if (budgetFen !== null && budgetFen <= 0) {
    budgetFen = null
    budgetConf = 0
  }

  const missing: Array<'title' | 'budget'> = []
  if (title === null) missing.push('title')
  if (budgetFen === null) missing.push('budget')

  return {
    title,
    bookId,
    conditionMin,
    noNotes,
    budget: budgetFen === null ? null : fenToYuan(budgetFen),
    budgetFen,
    confidence: { title: titleConf, condition: condConf, notes: notesConf, budget: budgetConf },
    matchedText: { title: titleText, condition: condText, notes: notesText, budget: budgetText },
    missing,
  }
}
