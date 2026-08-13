// Prints the SQL that mirrors src/data/directory.js into public.doctors.
// The bundled directory stays the editing surface (search and availability read
// it synchronously); this keeps the database copy in step for referential
// integrity and anything server-side. Re-run after editing the directory:
//
//   npm run doctors:sql > doctors.sql
//
// then apply it to the project (Supabase SQL editor, CLI, or MCP migration).

import { DOCTORS } from '../src/data/directory.js'

const text = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const arr = (v = []) => `array[${v.map(text).join(', ')}]::text[]`
const nums = (v = []) => `array[${v.join(', ')}]::smallint[]`
const json = (v) => `${text(JSON.stringify(v))}::jsonb`
const bool = (v) => (v ? 'true' : 'false')

const COLUMNS = [
  'id', 'slug', 'name', 'credential', 'specialty', 'focus', 'gender', 'years',
  'board_certified', 'education', 'philosophy', 'languages', 'insurance', 'rating',
  'review_count', 'fee', 'practice', 'address', 'distance', 'accessibility',
  'clinic_days', 'hours', 'tint', 'ai_fit', 'telehealth', 'in_person', 'reviews',
]

const row = (d) =>
  `  (${[
    d.id, text(d.slug), text(d.name), text(d.credential), text(d.specialty), arr(d.focus),
    text(d.gender), d.years, text(d.boardCertified), text(d.education), text(d.philosophy),
    arr(d.languages), arr(d.insurance), d.rating, d.reviewCount, d.fee, text(d.practice),
    text(d.address), d.distance, arr(d.accessibility), nums(d.clinicDays), arr(d.hours),
    text(d.tint), text(d.aiFit), bool(d.telehealth), bool(d.inPerson), json(d.reviews),
  ].join(', ')})`

process.stdout.write(
  `insert into public.doctors (${COLUMNS.join(', ')})\nvalues\n${DOCTORS.map(row).join(',\n')}\non conflict (id) do update set\n${COLUMNS
    .filter((c) => c !== 'id')
    .map((c) => `  ${c} = excluded.${c}`)
    .join(',\n')};\n`,
)
