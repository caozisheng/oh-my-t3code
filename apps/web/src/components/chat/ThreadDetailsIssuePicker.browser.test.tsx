import { describe, expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";

const state = vi.hoisted(() => ({ link: vi.fn(async () => ({ _tag: "Success" })) }));

vi.mock("~/state/entities", () => ({ useProjects: () => [] }));
vi.mock("~/state/issues", () => ({
  useIssueList: () => ({
    answers: [
      [
        "env-1",
        {
          entries: [
            {
              tracker: "github",
              host: "github.com",
              scope: "owner/repo",
              key: "42",
              displayKey: "#42",
              title: "Broken thing",
              url: "https://github.com/owner/repo/issues/42",
              projectId: "project-1",
              state: { category: "open", name: "Open" },
              author: null,
              assignees: [],
              labels: [],
              commentCount: 0,
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ],
        },
      ],
    ],
    isPending: false,
  }),
}));
vi.mock("~/state/use-atom-command", () => ({ useAtomCommand: () => state.link }));
vi.mock("~/state/queries", () => ({ useDebouncedValue: (value: string) => value }));

import { ThreadDetailsIssuePicker } from "./ThreadDetailsIssuePicker";

describe("ThreadDetailsIssuePicker", () => {
  it("links the selected issue to the current thread", async () => {
    state.link.mockClear();
    await using screen = await render(
      <ThreadDetailsIssuePicker
        environmentId={"env-1" as never}
        threadId={"thread-1" as never}
        linkedKeys={new Set()}
        pending={false}
        onPendingChange={() => {}}
        onLinked={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Link" }));

    expect(state.link).toHaveBeenCalledWith({
      environmentId: "env-1",
      input: {
        threadId: "thread-1",
        projectId: "project-1",
        tracker: "github",
        host: "github.com",
        scope: "owner/repo",
        key: "42",
        url: "https://github.com/owner/repo/issues/42",
        displayKey: "#42",
        title: "Broken thing",
        source: "manual",
      },
    });
  });
});
