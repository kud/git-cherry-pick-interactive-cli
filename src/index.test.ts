import { beforeEach, describe, expect, it, vi } from "vitest"
import { cherryPick, commitsFromBranch, handleFatal } from "./index.js"

const { mockGit } = vi.hoisted(() => ({
  mockGit: { raw: vi.fn(), revparse: vi.fn(), show: vi.fn() },
}))
vi.mock("simple-git", () => ({ simpleGit: () => mockGit }))

beforeEach(() => {
  mockGit.raw.mockReset()
  mockGit.revparse.mockReset()
  mockGit.show.mockReset()
})

describe("commitsFromBranch", () => {
  it("returns commits in current..branch, oldest-first, split into hash + message", async () => {
    mockGit.revparse.mockResolvedValueOnce("main")
    mockGit.raw.mockResolvedValueOnce("1234567 Commit 1\n7654321 Commit 2")

    const commits = await commitsFromBranch("myBranch")

    expect(commits).toEqual([
      { hash: "7654321", message: "Commit 2" },
      { hash: "1234567", message: "Commit 1" },
    ])
    expect(mockGit.raw).toHaveBeenCalledWith([
      "log",
      "main..myBranch",
      "--oneline",
    ])
  })

  it("preserves multi-word commit messages", async () => {
    mockGit.revparse.mockResolvedValueOnce("main")
    mockGit.raw.mockResolvedValueOnce("abcdef0 feat: add a nice thing")

    const commits = await commitsFromBranch("feature")

    expect(commits).toEqual([
      { hash: "abcdef0", message: "feat: add a nice thing" },
    ])
  })

  it("returns [] when the range is empty", async () => {
    mockGit.revparse.mockResolvedValueOnce("main")
    mockGit.raw.mockResolvedValueOnce("")

    expect(await commitsFromBranch("feature")).toEqual([])
  })
})

describe("cherryPick", () => {
  it("cherry-picks in order and lists the known subjects without git show", async () => {
    mockGit.raw.mockResolvedValueOnce("")
    const log = vi.spyOn(console, "log").mockImplementation(() => {})

    await cherryPick([
      { hash: "7654321", message: "Commit 2" },
      { hash: "1234567", message: "Commit 1" },
    ])

    expect(mockGit.raw).toHaveBeenCalledTimes(1)
    expect(mockGit.raw).toHaveBeenCalledWith([
      "cherry-pick",
      "7654321",
      "1234567",
    ])
    expect(mockGit.show).not.toHaveBeenCalled()
    const lines = log.mock.calls.map(([line]) => String(line))
    expect(lines.at(-2)).toMatch(/\(7654321\).* Commit 2$/)
    expect(lines.at(-1)).toMatch(/\(1234567\).* Commit 1$/)

    log.mockRestore()
  })
})

describe("handleFatal", () => {
  const exitWith = () =>
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`)
    }) as never)

  it("exits quietly with 130 when the prompt is cancelled", () => {
    const exit = exitWith()
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {})
    const cancel = Object.assign(new Error("User force closed the prompt"), {
      name: "ExitPromptError",
    })

    expect(() => handleFatal(cancel)).toThrow("exit 130")
    expect(errorLog).not.toHaveBeenCalled()

    exit.mockRestore()
    errorLog.mockRestore()
  })

  it("prints the error and exits with 1 otherwise", () => {
    const exit = exitWith()
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => handleFatal(new Error("bad revision 'nope'"))).toThrow(
      "exit 1",
    )
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining("❌ Error: bad revision 'nope'"),
    )

    exit.mockRestore()
    errorLog.mockRestore()
  })
})
