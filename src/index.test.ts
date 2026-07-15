import { beforeEach, describe, expect, it, vi } from "vitest"
import { commitsFromBranch } from "./index.js"

const { mockGit } = vi.hoisted(() => ({
  mockGit: { raw: vi.fn(), revparse: vi.fn(), show: vi.fn() },
}))
vi.mock("simple-git", () => ({ simpleGit: () => mockGit }))

beforeEach(() => {
  mockGit.raw.mockReset()
  mockGit.revparse.mockReset()
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
