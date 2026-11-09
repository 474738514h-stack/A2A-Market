import type { JsonSchema } from './types'

// Minimal JSON Schema (draft-07 subset) validator. eval/run_eval.py implements the same
// keywords, check order and error strings so both sides report identical errors.
// Supported: type, enum, minimum, maximum, minLength, maxLength, required, properties,
// additionalProperties:false, items, $ref (resolved from `refs` by $id).

function typeOf(v: unknown): string[] {
  if (v === null) return ['null']
  if (Array.isArray(v)) return ['array']
  if (typeof v === 'boolean') return ['boolean']
  if (typeof v === 'number') return Number.isInteger(v) ? ['number', 'integer'] : ['number']
  if (typeof v === 'string') return ['string']
  if (typeof v === 'object') return ['object']
  return ['unknown']
}

export function validate(schema: JsonSchema, data: unknown, refs: Record<string, JsonSchema> = {}, path = '$'): string[] {
  const ref = schema['$ref']
  if (typeof ref === 'string') {
    const target = refs[ref]
    if (!target) return [`${path}: unresolved $ref ${ref}`]
    return validate(target, data, refs, path)
  }
  const errors: string[] = []
  const t = schema['type']
  if (t !== undefined) {
    const allowed = Array.isArray(t) ? (t as string[]) : [t as string]
    const actual = typeOf(data)
    if (!allowed.some((a) => actual.includes(a))) {
      return [`${path}: expected type ${allowed.join('|')}`]
    }
  }
  const en = schema['enum']
  if (Array.isArray(en) && !en.includes(data as never)) errors.push(`${path}: not in enum`)
  if (typeof data === 'number') {
    if (typeof schema['minimum'] === 'number' && data < (schema['minimum'] as number))
      errors.push(`${path}: below minimum ${schema['minimum']}`)
    if (typeof schema['maximum'] === 'number' && data > (schema['maximum'] as number))
      errors.push(`${path}: above maximum ${schema['maximum']}`)
  }
  if (typeof data === 'string') {
    if (typeof schema['minLength'] === 'number' && data.length < (schema['minLength'] as number))
      errors.push(`${path}: shorter than ${schema['minLength']}`)
    if (typeof schema['maxLength'] === 'number' && data.length > (schema['maxLength'] as number))
      errors.push(`${path}: longer than ${schema['maxLength']}`)
  }
  if (typeOf(data)[0] === 'object') {
    const obj = data as Record<string, unknown>
    const props = (schema['properties'] ?? {}) as Record<string, JsonSchema>
    for (const key of (schema['required'] ?? []) as string[]) {
      if (!(key in obj)) errors.push(`${path}.${key}: required`)
    }
    for (const key of Object.keys(props)) {
      if (key in obj) errors.push(...validate(props[key], obj[key], refs, `${path}.${key}`))
    }
    if (schema['additionalProperties'] === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) errors.push(`${path}.${key}: additional property not allowed`)
      }
    }
  }
  if (Array.isArray(data) && schema['items']) {
    data.forEach((item, i) => errors.push(...validate(schema['items'] as JsonSchema, item, refs, `${path}[${i}]`)))
  }
  return errors
}
