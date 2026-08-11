import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Accessibility, RotateCcw, SearchX, SlidersHorizontal, X } from 'lucide-react'
import SearchField from '../components/SearchField'
import DoctorCard from '../components/DoctorCard'
import BookingModal from '../components/BookingModal'
import { Empty } from '../components/Bits'
import { DEFAULT_FILTERS, searchDoctors, specialtyFor } from '../lib/search'
import { INSURANCE, LANGUAGES, SPECIALTIES } from '../data/directory'
import { useStore } from '../lib/store'
import { useReveal } from '../lib/motion'

const SORTS = [
  ['best', 'Best match'],
  ['soonest', 'Soonest available'],
  ['rating', 'Highest rated'],
  ['distance', 'Closest'],
  ['fee', 'Lowest fee'],
]

export default function FindCare() {
  const store = useStore()
  const [params, setParams] = useSearchParams()
  const [booking, setBooking] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = params.get('q') ?? ''
  const filters = { ...DEFAULT_FILTERS }
  Object.keys(DEFAULT_FILTERS).forEach((key) => {
    const value = params.get(key)
    if (value !== null) filters[key] = key === 'accessible' ? value === 'true' : value
  })

  const results = useMemo(() => searchDoctors(q, filters, store.takenFor), [q, params.toString(), store])
  const scope = useReveal([results.length, params.toString()])

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
              <label className="sort-select">
                <span className="sr-only">Sort results</span>
                <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
                  {SORTS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="container find-layout">
        <aside className={`filter-panel ${filtersOpen ? 'is-open' : ''}`} aria-label="Filter results">
          <div className="filter-head">
            <b>Filters</b>
            <button className="icon-btn filter-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <X size={18} />
            </button>
          </div>

          <div className="field">
            <label htmlFor="f-specialty">Specialty</label>
            <select id="f-specialty" value={filters.specialty} onChange={(e) => setFilter('specialty', e.target.value)}>
              <option value="">Any specialty</option>
              {SPECIALTIES.map((s) => (
                <option key={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-insurance">Insurance</label>
            <select id="f-insurance" value={filters.insurance} onChange={(e) => setFilter('insurance', e.target.value)}>
              <option value="">Any plan</option>
              {INSURANCE.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
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
            <select id="f-distance" value={filters.distance} onChange={(e) => setFilter('distance', e.target.value)}>
              <option value="">Any distance</option>
              <option value="2">Within 2 miles</option>
              <option value="5">Within 5 miles</option>
              <option value="10">Within 10 miles</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-language">Language spoken</label>
            <select id="f-language" value={filters.language} onChange={(e) => setFilter('language', e.target.value)}>
              <option value="">Any language</option>
              {LANGUAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
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
            <select id="f-rating" value={filters.rating} onChange={(e) => setFilter('rating', e.target.value)}>
              <option value="">Any rating</option>
              <option value="4.5">4.5 and above</option>
              <option value="4.8">4.8 and above</option>
            </select>
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
                taken={store.takenFor(doctor.slug)}
                insurance={filters.insurance}
                onBook={(d, slot) => setBooking({ doctor: d, slot })}
                onWaitlist={(d) => store.joinWaitlist(d.slug)}
                waitlisted={store.waitlist.some((w) => w.doctorSlug === doctor.slug)}
              />
            ))
          )}
        </div>
      </div>

      {booking && <BookingModal doctor={booking.doctor} slot={booking.slot} onClose={() => setBooking(null)} />}
    </div>
  )
}
