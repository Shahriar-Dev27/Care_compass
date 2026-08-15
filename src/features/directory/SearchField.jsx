import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Stethoscope, HeartPulse, UserRound } from 'lucide-react'
import { suggest } from '../../domain/search'
import { INSURANCE } from '../../domain/taxonomy'
import { DOCTORS } from './api/doctors'
import { Select } from '../../ui'

const KIND_ICON = { Specialty: Stethoscope, Concern: HeartPulse, Doctor: UserRound }
const INSURANCE_OPTIONS = [
  { value: '', label: 'All insurance' },
  ...INSURANCE.map((name) => ({ value: name, label: name })),
]

/**
 * Free-text search with typo-tolerant autocomplete over specialties, plain
 * language concerns, and clinician names.
 */
export default function SearchField({ variant = 'hero', defaultValue = '', insurance = '', onInsurance, onSubmit, autoFocus = false }) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const navigate = useNavigate()
  const listId = useId()
  const wrap = useRef(null)

  const items = open ? suggest(DOCTORS, value) : []

  useEffect(() => setValue(defaultValue), [defaultValue])

  useEffect(() => {
    const away = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [])

  const go = (query) => {
    setOpen(false)
    setCursor(-1)
    if (onSubmit) onSubmit(query)
    else navigate(`/find?q=${encodeURIComponent(query)}`)
  }

  const pick = (item) => {
    if (item.slug) {
      setOpen(false)
      navigate(`/doctor/${item.slug}`)
      return
    }
    setValue(item.query)
    go(item.query)
  }

  const onKeyDown = (e) => {
    if (!items.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c <= 0 ? items.length - 1 : c - 1))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      pick(items[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  return (
    <form
      ref={wrap}
      className={`search-field search-${variant}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        go(value.trim())
      }}
    >
      <div className="search-main">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search by symptom, specialty, or doctor name
        </label>
        <Search size={19} aria-hidden="true" />
        <input
          id={`${listId}-input`}
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
          placeholder="Search a symptom, specialty, or doctor"
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
            setCursor(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {variant === 'hero' && (
        <div className="search-insurance">
          <label htmlFor={`${listId}-ins`} className="sr-only">
            Insurance
          </label>
          <Select
            id={`${listId}-ins`}
            value={insurance}
            onValueChange={onInsurance}
            placeholder="All insurance"
            options={INSURANCE_OPTIONS}
          />
        </div>
      )}

      <button type="submit" className={variant === 'hero' ? 'btn btn-accent btn-lg' : 'btn btn-primary'}>
        <Search size={18} aria-hidden="true" />
        <span>Find care</span>
      </button>

      {open && items.length > 0 && (
        <ul className="search-suggest" id={listId} role="listbox" aria-label="Search suggestions">
          {items.map((item, i) => {
            const Icon = KIND_ICON[item.kind] || Search
            return (
              <li key={`${item.kind}-${item.label}`} id={`${listId}-${i}`} role="option" aria-selected={i === cursor}>
                <button type="button" className={i === cursor ? 'is-cursor' : ''} onMouseEnter={() => setCursor(i)} onClick={() => pick(item)}>
                  <Icon size={17} aria-hidden="true" />
                  <span>
                    <b>{item.label}</b>
                    <small>{item.hint}</small>
                  </span>
                  <em>{item.kind}</em>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </form>
  )
}
