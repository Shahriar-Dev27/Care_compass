import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Accessibility, RotateCcw, SearchX, SlidersHorizontal, X } from 'lucide-react'
import SearchField from '../components/SearchField'
import DoctorCard from '../components/DoctorCard'
import BookingModal from '../components/BookingModal'
import { Empty, Select } from '../ui'
import { DEFAULT_FILTERS, searchDoctors, specialtyFor } from '../domain/search'
import { INSURANCE, LANGUAGES, SPECIALTIES } from '../domain/taxonomy'
import { DOCTORS } from '../features/directory/api/doctors'
import { useCare } from '../features/care/CareDataProvider'
import { lockScroll, useReveal } from '../lib/motion'

// Matches the breakpoint in find.css where the filter panel becomes a fixed
// drawer. GSAP reveals leave transforms on page sections, and a transformed
// ancestor makes position:fixed resolve against it instead of the viewport, so
// at this width the panel is portalled to <body> (same reason as Modal).
const DRAWER_WIDTH = '(max-width: 900px)'

const Detached = ({ portal, children }) => (portal ? createPortal(children, document.body) : <>{children}</>)

const SORTS = [
  ['best', 'Best match'],
  ['soonest', 'Soonest available'],
  ['rating', 'Highest rated'],
  ['distance', 'Closest'],
  ['fee', 'Lowest fee'],
]

const SORT_OPTIONS = SORTS.map(([value, label]) => ({ value, label }))
const SPECIALTY_OPTIONS = [
  { value: '', label: 'Any specialty' },
  ...SPECIALTIES.map(({ name }) => ({ value: name, label: name })),
]
const INSURANCE_OPTIONS = [
  { value: '', label: 'Any plan' },
  ...INSURANCE.map((name) => ({ value: name, label: name })),
]
const DISTANCE_OPTIONS = [
  { value: '', label: 'Any distance' },
  { value: '2', label: 'Within 2 miles' },
  { value: '5', label: 'Within 5 miles' },
  { value: '10', label: 'Within 10 miles' },
]
const LANGUAGE_OPTIONS = [
  { value: '', label: 'Any language' },
  ...LANGUAGES.map((name) => ({ value: name, label: name })),
]
const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4.5', label: '4.5 and above' },
  { value: '4.8', label: '4.8 and above' },
]

export default function FindCare() {
  const care = useCare()
  const [params, setParams] = useSearchParams()
  const [booking, setBooking] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia(DRAWER_WIDTH).matches)

  const q = params.get('q') ?? ''
  const filters = { ...DEFAULT_FILTERS }
  Object.keys(DEFAULT_FILTERS).forEach((key) => {
    const value = params.get(key)
    if (value !== null) filters[key] = key === 'accessible' ? value === 'true' : value
  })

  const results = useMemo(() => searchDoctors(DOCTORS, q, filters, care.takenFor), [q, params.toString(), care])
  const scope = useReveal([results.length, params.toString()])

  useEffect(() => {
    const mq = window.matchMedia(DRAWER_WIDTH)
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!filtersOpen) return undefined
    lockScroll(true)
    const onKey = (e) => e.key === 'Escape' && setFiltersOpen(false)
    document.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      document.removeEventListener('keydown', onKey)
    }
  }, [filtersOpen])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === DEFAULT_FILTERS[key]) next.delete(key)
    else next.set(key, String(value))
    setParams(next, { replace: true })
  }

  const clearAll = () => setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true })

  const activeCount = Object.keys(DEFAULT_FILTERS).filter((k) => k !== 'sort' && params.get(k) && params.get(k) !== 'false').length
  const mapped = specialtyFor(q)

  return (
    <div ref={scope}>
      <div className="find-top">
        <div className="container">
          <SearchField variant="compact" defaultValue={q} onSubmit={(value) => setFilter('q', value)} />
          <div className="find-summary">
            <p>
              <b>{results.length}</b> clinician{results.length === 1 ? '' : 's'}
              {q ? (
                <>
                  {' '}
                  for <b>“{q}”</b>
                  {mapped && ` · usually ${mapped.toLowerCase()}`}
                </>
              ) : (
                ' available'
              )}
            </p>
            <div className="find-controls">
              <button className="btn btn-quiet btn-sm find-filter-toggle" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={16} /> Filters{activeCount ? ` (${activeCount})` : ''}
              </button>
              <div className="sort-select">
                <Select
                  value={filters.sort}
                  onValueChange={(value) => setFilter('sort', value)}
                  placeholder="Best match"
                  options={SORT_OPTIONS}
                  variant="pill"
                  ariaLabel="Sort results"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container find-layout">
        <Detached portal={mobile}>
          <aside className={`filter-panel ${filtersOpen ? 'is-open' : ''}`} aria-label="Filter results">
          <div className="filter-head">
            <b>Filters</b>
            <button className="icon-btn filter-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <X size={18} />
            </button>
          </div>

          <div className="field">
            <label htmlFor="f-specialty">Specialty</label>
            <Select
              id="f-specialty"
              value={filters.specialty}
              onValueChange={(value) => setFilter('specialty', value)}
              placeholder="Any specialty"
              options={SPECIALTY_OPTIONS}
            />
          </div>

          <div className="field">
            <label htmlFor="f-insurance">Insurance</label>
            <Select
              id="f-insurance"
              value={filters.insurance}
              onValueChange={(value) => setFilter('insurance', value)}
              placeholder="Any plan"
              options={INSURANCE_OPTIONS}
            />
          </div>

          <fieldset className="field">
            <legend>Availability</legend>
            <div className="chips">
              {[
                ['any', 'Anytime'],
                ['today', 'Today'],
                ['week', 'This week'],
              ].map(([value, label]) => (
                <button key={value} type="button" className="chip" aria-pressed={filters.when === value} onClick={() => setFilter('when', value)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Visit type</legend>
            <div className="chips">
              {[
                ['any', 'Either'],
                ['video', 'Video'],
                ['in-person', 'In person'],
              ].map(([value, label]) => (
                <button key={value} type="button" className="chip" aria-pressed={filters.visit === value} onClick={() => setFilter('visit', value)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="f-distance">Distance</label>
            <Select
              id="f-distance"
              value={filters.distance}
              onValueChange={(value) => setFilter('distance', value)}
              placeholder="Any distance"
              options={DISTANCE_OPTIONS}
            />
          </div>

          <div className="field">
            <label htmlFor="f-language">Language spoken</label>
            <Select
              id="f-language"
              value={filters.language}
              onValueChange={(value) => setFilter('language', value)}
              placeholder="Any language"
              options={LANGUAGE_OPTIONS}
            />
          </div>

          <fieldset className="field">
            <legend>Clinician gender</legend>
            <div className="chips">
              {[
                ['', 'Any'],
                ['Female', 'Female'],
                ['Male', 'Male'],
              ].map(([value, label]) => (
                <button key={label} type="button" className="chip" aria-pressed={filters.gender === value} onClick={() => setFilter('gender', value)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="f-rating">Minimum rating</label>
            <Select
              id="f-rating"
              value={filters.rating}
              onValueChange={(value) => setFilter('rating', value)}
              placeholder="Any rating"
              options={RATING_OPTIONS}
            />
          </div>

          <label className="checkbox">
            <input type="checkbox" checked={filters.accessible} onChange={(e) => setFilter('accessible', e.target.checked ? 'true' : '')} />
            <span>
              <Accessibility size={15} aria-hidden="true" /> Accessibility accommodations (step-free access, ASL, sensory-friendly rooms)
            </span>
          </label>

          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            <RotateCcw size={15} /> Clear filters
          </button>
          </aside>

          {filtersOpen && <button className="filter-scrim" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
        </Detached>

        <div className="results">
          {results.length === 0 ? (
            <Empty
              icon={SearchX}
              title="No clinicians match all of those filters"
              action={
                <button className="btn btn-primary" onClick={clearAll}>
                  Clear filters and search again
                </button>
              }
            >
              Try widening the distance, removing the insurance filter, or searching a broader term such as “primary care”.
            </Empty>
          ) : (
            results.map(({ doctor, next }) => (
              <DoctorCard
                key={doctor.slug}
                doctor={doctor}
                next={next}
                taken={care.takenFor(doctor.slug)}
                insurance={filters.insurance}
                onBook={(d, slot) => setBooking({ doctor: d, slot })}
                onWaitlist={(d) => care.joinWaitlist(d.slug)}
                waitlisted={care.waitlist.some((w) => w.doctorSlug === doctor.slug)}
              />
            ))
          )}
        </div>
      </div>

      {booking && <BookingModal doctor={booking.doctor} slot={booking.slot} onClose={() => setBooking(null)} />}
    </div>
  )
}
