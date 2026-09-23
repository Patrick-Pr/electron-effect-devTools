import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  if (typeof document !== "undefined") cleanup()
})

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this)
  }
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", { value: TestResizeObserver, configurable: true })
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => ({
      beginPath: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 6 })), moveTo: vi.fn(),
      lineTo: vi.fn(), setTransform: vi.fn(), stroke: vi.fn(), strokeRect: vi.fn(),
      fillStyle: "", strokeStyle: "", font: "", lineWidth: 1, globalAlpha: 1
    }))
  })
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: vi.fn(() => false) })

  Object.defineProperty(window, "electronAPI", {
    configurable: true,
    writable: true,
    value: {
      getSnapshot: vi.fn(),
      dispatch: vi.fn(() => Promise.resolve()),
      subscribe: vi.fn(() => () => {}),
      revealLocation: vi.fn(() => Promise.resolve())
    }
  })
}
