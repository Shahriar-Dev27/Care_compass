import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * GSAP ScrollSmoother on the page shell. Fixed UI (header, chat launcher,
 * modals) must live outside #smooth-content or it will scroll with the page.
 */
export function useSmoothScroll(pathname) {
  const smoother = useRef(null)

  useLayoutEffect(() => {
    if (reducedMotion()) return undefined
    smoother.current = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.1,
      speed: 1,
      effects: true,
      normalizeScroll: false,
    })
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      smoother.current?.kill()
      smoother.current = null
    }
  }, [])

  // New route: start at the top and re-measure every trigger.
  useLayoutEffect(() => {
    if (smoother.current) smoother.current.scrollTo(0, false)
    else window.scrollTo(0, 0)
    ScrollTrigger.refresh()
  }, [pathname])
}

/** Freeze page scrolling while a dialog is open. */
export function lockScroll(locked) {
  const smoother = ScrollSmoother.get()
  if (smoother) smoother.paused(locked)
  document.body.classList.toggle('is-locked', locked)
}

/** Scroll to an element by selector, through the smoother when it is active. */
export function scrollToId(selector, offset = -84) {
  const target = document.querySelector(selector)
  if (!target) return
  const smoother = ScrollSmoother.get()
  if (smoother) smoother.scrollTo(target, true, `top ${offset}px`)
  else target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

/**
 * Scroll-linked entrances for anything marked `data-reveal` inside `scope`.
 * Honors reduced motion by simply leaving elements in their final state.
 */
export function useReveal(deps = []) {
  const scope = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('[data-reveal]')
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
