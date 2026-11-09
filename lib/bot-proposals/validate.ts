import { editableFields, type ContentFields, type FaqItem, type TargetType } from './types';

const MAX_TEXT = 20000;

function asFaqs(value: unknown): FaqItem[] | null {
  if (!Array.isArray(value)) return null;
  const faqs: FaqItem[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const { question, answer } = item as Record<string, unknown>;
    if (typeof question !== 'string' || typeof answer !== 'string') return null;
    if (question.trim() && answer.trim()) faqs.push({ question: question.trim(), answer: answer.trim() });
  }
  return faqs;
}

/**
 * Keep only the fields this page type can store, with the right shapes.
 * Returns the cleaned fields plus a list of problems for anything dropped.
 */
export function cleanFields(input: unknown, type: TargetType): { fields: ContentFields; problems: string[] } {
  const fields: ContentFields = {};
  const problems: string[] = [];
  if (typeof input !== 'object' || input === null) return { fields, problems: ['No proposed content'] };
  const allowed = editableFields(type);
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (!allowed.includes(name)) {
      problems.push(`${name} cannot be applied to a ${type} page`);
      continue;
    }
    if (name === 'faq_items') {
      const faqs = asFaqs(value);
      if (faqs) fields[name] = faqs;
      else problems.push('faq_items must be a list of { question, answer }');
    } else if (name === 'bullet_points') {
      const ok = Array.isArray(value) && value.every((b) => typeof b === 'string') && value.length <= 12;
      if (ok) fields[name] = (value as string[]).map((b) => b.trim()).filter(Boolean);
      else problems.push('bullet_points must be up to 12 lines of text');
    } else if (typeof value === 'string' && value.length <= MAX_TEXT) {
      fields[name] = value;
    } else {
      problems.push(`${name} must be text under ${MAX_TEXT} characters`);
    }
  }
  return { fields, problems };
}
