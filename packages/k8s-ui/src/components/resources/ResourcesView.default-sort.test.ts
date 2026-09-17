import { describe, expect, it } from 'vitest'
import {
  BUILTIN_SORTABLE_COLUMN_KEYS,
  CROSS_KIND_SORT_COLUMNS,
  isColumnSortable,
  resolveDefaultSort,
  sortColumnLabel,
} from './ResourcesView'

// What a Pods table renders as sortable, and what a ConfigMaps table does.
const PODS = ['name', 'namespace', 'containers', 'status', 'cpu', 'memory', 'restarts', 'age']
const CONFIGMAPS = ['name', 'namespace', 'age']

describe('resolveDefaultSort', () => {
  it('returns no sort when there is no preference', () => {
    expect(resolveDefaultSort(null, PODS)).toEqual({ column: null, direction: null })
    expect(resolveDefaultSort(undefined, PODS)).toEqual({ column: null, direction: null })
  })

  it('applies a column this table renders as sortable', () => {
    expect(resolveDefaultSort({ column: 'restarts', direction: 'desc' }, PODS)).toEqual({
      column: 'restarts',
      direction: 'desc',
    })
  })

  it('yields to the built-in order when this table does not offer the column', () => {
    // Restarts exists on Pods, not on ConfigMaps. Sorting by it there would
    // order rows by an absent value with no header arrow to undo it from.
    expect(resolveDefaultSort({ column: 'restarts', direction: 'desc' }, CONFIGMAPS)).toEqual({
      column: null,
      direction: null,
    })
    // An uncurated CRD shows its printer columns instead of the generic Status,
    // so a status preference must not sort a table with no Status header.
    expect(resolveDefaultSort({ column: 'status', direction: 'asc' }, ['name', 'namespace', 'phase', 'age'])).toEqual({
      column: null,
      direction: null,
    })
  })

  it('accepts a user-defined or host-injected column the table renders', () => {
    expect(resolveDefaultSort({ column: 'label:app', direction: 'asc' }, [...PODS, 'label:app'])).toEqual({
      column: 'label:app',
      direction: 'asc',
    })
  })
})

describe('sort column labels', () => {
  it('matches the header for keys that de-camel-casing gets wrong', () => {
    // The table header renders "CPU" and "Up-to-date"; deriving the label from
    // the key would show "Cpu" and "Up To Date" in Settings for the same column.
    expect(sortColumnLabel('cpu')).toBe('CPU')
    expect(sortColumnLabel('upToDate')).toBe('Up-to-date')
  })

  it('names every built-in sortable column', () => {
    // Two lists that must not drift: add a sortable column and Settings would
    // fall back to de-camel-casing its key, which is how "Cpu" happens.
    const unnamed = [...BUILTIN_SORTABLE_COLUMN_KEYS].filter((k) => sortColumnLabel(k) === undefined)
    expect(unnamed).toEqual([])
  })

  it('returns undefined for columns it cannot name, so callers can fall back', () => {
    expect(sortColumnLabel('label:app')).toBeUndefined()
    expect(sortColumnLabel('cluster')).toBeUndefined()
  })

  it('offers only kind-agnostic columns for the cross-kind setting, all sortable', () => {
    expect(CROSS_KIND_SORT_COLUMNS.map((c) => c.key)).toEqual(['name', 'namespace', 'status', 'age'])
    for (const c of CROSS_KIND_SORT_COLUMNS) {
      expect(c.label).toBeTruthy()
      expect(isColumnSortable({ key: c.key, label: c.label })).toBe(true)
    }
  })
})
