import simpleGit from "simple-git"
import { mocked } from "ts-jest/utils"

import { getCommitsFromBranch } from "../index.js"

jest.mock("simple-git")

const mockGit = mocked(simpleGit(), true)

describe("getCommitsFromBranch", () => {
  it("should return the formatted commits from a given branch", async () => {
    mockGit.raw.mockResolvedValueOnce("1234567 Commit 1\n7654321 Commit 2")

    const commits = await getCommitsFromBranch("myBranch")

    expect(commits).toEqual([
      {
        name: "(7654321) Commit 2",
        value: "7654321",
      },
      {
        name: "(1234567) Commit 1",
        value: "1234567",
      },
    ])
  })

  // Add more tests as needed
})
