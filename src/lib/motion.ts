import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * New route: start at the top and re-measure every trigger, then jump to the
 * hash if there is one.
 */
export function useRouteScroll(pathname: string, hash = ''): void {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    ScrollTrigger.refresh()
    if (!hash) return undefined
    // One frame later, so the new route has laid out and its own reveals have
    // registered; re-measure once more before jumping or the target overshoots.
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      scrollToId(hash)
    })
    return () => cancelAnimationFrame(id)
  }, [pathname, hash])
}

/** Freeze page scrolling while a dialog is open. */
export function lockScroll(locked: boolean): void {
  document.body.classList.toggle('is-locked', locked)
}

/**
 * Scroll to an element by selector. `offset` is how far below the viewport top
 * the element should land — enough to clear the sticky header (72px) and still
 * show some space above it.
 */
export function scrollToId(selector: string, offset = 96): void {
  const target = document.querySelector(selector)
  if (!target) return
  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

/**
 * Scroll-linked entrances for anything marked `data-reveal` inside `scope`.
 * Honors reduced motion by simply leaving elements in their final state.
 */
export function useReveal(deps: unknown[] = []) {
  const scope = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      if (reducedMotion()) {
        gsap.set(items, { clearProps: 'all' })
        return
      }
      items.forEach((el) => {
        gsap.fromTo(
          el,
          { y: Number(el.dataset.revealY ?? 26), opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            ease: 'power2.out',
            delay: Number(el.dataset.revealDelay ?? 0),
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        )
      })
    }, scope)

    ScrollTrigger.refresh()
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scope
}

export { gsap, ScrollTrigger }
