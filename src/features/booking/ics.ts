import { dayKey } from '../../domain/schedule'
import type { Appointment } from '../../domain/types'
import { bySlug } from '../directory/api/doctors'

const stamp = (d: Date): string => d.toISOString().replace(/[-:]|\.\d{3}/g, '')
const escape = (s: string): string => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

/** Build an .ics file in the browser — no dependency needed. */
export function downloadIcs(appointment: Appointment): void {
  const doctor = bySlug(appointment.doctorSlug)
  if (!doctor) return

  const start = new Date(appointment.at)
  const end = new Date(start.getTime() + 30 * 60000)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CareCompass//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@carecompass`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`${appointment.mode === 'video' ? 'Video visit' : 'Visit'} with Dr. ${doctor.name}`)}`,
    `DESCRIPTION:${escape(appointment.reason || 'CareCompass appointment')}`,
    `LOCATION:${escape(appointment.mode === 'video' ? 'Secure video link in CareCompass' : `${doctor.practice}, ${doctor.address}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `carecompass-${doctor.slug}-${dayKey(start)}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
