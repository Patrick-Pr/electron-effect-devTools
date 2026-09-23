import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SplitPane } from "./SplitPane"

describe("SplitPane", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 400, width: 800, height: 400, toJSON: () => ({})
    })
  })

  afterEach(() => {
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  })

  it("exposes keyboard separator semantics and clamps to the container", async () => {
    const user = userEvent.setup()
    render(<SplitPane left={<div>left</div>} right={<div>right</div>} initialRightWidth={300} minRightWidth={200} maxRightWidth={500} />)
    const separator = screen.getByRole("separator", { name: "Resize details pane" })
    expect(separator).toHaveAttribute("aria-valuenow", "300")
    separator.focus()
    await user.keyboard("{End}")
    expect(separator).toHaveAttribute("aria-valuenow", "500")
    await user.keyboard("{Home}")
    expect(separator).toHaveAttribute("aria-valuenow", "200")
    await user.keyboard("{ArrowLeft}")
    expect(separator).toHaveAttribute("aria-valuenow", "216")
  })

  it("restores existing global styles on blur and unmount", () => {
    document.body.style.cursor = "wait"
    document.body.style.userSelect = "text"
    const { unmount } = render(<SplitPane left="left" right="right" />)
    const separator = screen.getByRole("separator")
    fireEvent.pointerDown(separator, { button: 0, pointerId: 7, clientX: 500 })
    expect(document.body.style.cursor).toBe("col-resize")
    expect(document.body.style.userSelect).toBe("none")
    fireEvent.blur(window)
    expect(document.body.style.cursor).toBe("wait")
    expect(document.body.style.userSelect).toBe("text")
    fireEvent.pointerDown(separator, { button: 0, pointerId: 8, clientX: 500 })
    unmount()
    expect(document.body.style.cursor).toBe("wait")
    expect(document.body.style.userSelect).toBe("text")
  })
})
