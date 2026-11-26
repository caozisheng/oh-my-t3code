import type { EnvironmentId, IssueListInput, ThreadId } from "@t3tools/contracts";
import { T, msg, useGT } from "gt-react";
import { useState } from "react";

import { useProjects } from "~/state/entities";
import { useIssueList } from "~/state/issues";
import { threadEnvironment } from "~/state/threads";
import { useDebouncedValue } from "~/state/queries";
import { useAtomCommand } from "~/state/use-atom-command";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { issueListTargets } from "../issue/issuesSearch.logic";
import { IssueRow } from "../issue/IssueRow";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toastManager } from "../ui/toast";
import { readableFailure } from "../pullRequest/pullRequestDetail.logic";
import { m } from "~/i18n/messages";

export function ThreadDetailsIssuePicker({
  environmentId,
  threadId,
  linkedKeys,
  pending,
  onPendingChange,
  onLinked,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  linkedKeys: ReadonlySet<string>;
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onLinked: () => void;
}) {
  const gt = useGT();
  const projects = useProjects().filter((project) => project.environmentId === environmentId);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const input: IssueListInput = {
    state: "all",
    involvement: "all",
    limit: 50,
    ...(debouncedQuery.trim() ? { query: debouncedQuery.trim() } : {}),
  };
  const targets = issueListTargets([environmentId], projects, undefined, input);
  const list = useIssueList(targets);
  const linkIssue = useAtomCommand(threadEnvironment.linkIssue, { reportFailure: false });
  const entries = list.answers.flatMap(([answerEnvironmentId, answer]) =>
    answer.entries.map((entry) => ({ ...entry, environmentId: answerEnvironmentId })),
  );
  const link = async (entry: (typeof entries)[number]) => {
    if (
      pending ||
      linkedKeys.has(`${entry.tracker}\u0000${entry.host}\u0000${entry.scope}\u0000${entry.key}`)
    )
      return;
    onPendingChange(true);
    const result = await linkIssue({
      environmentId,
      input: {
        threadId,
        projectId: entry.projectId,
        tracker: entry.tracker,
        host: entry.host,
        scope: entry.scope,
        key: entry.key,
        url: entry.url,
        displayKey: entry.displayKey,
        title: entry.title,
        source: "manual",
      },
    });
    onPendingChange(false);
    if (result._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: m(msg("Could not link the issue")),
        description: readableFailure(
          squashAtomCommandFailure(result),
          m(msg("The server refused it.")),
        ),
      });
      return;
    }
    onLinked();
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative p-2">
        <Input
          aria-label={gt("Search issues")}
          placeholder={gt("Search issues")}
          value={query}
          disabled={pending}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="max-h-80 overflow-y-auto px-2 pb-2">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {list.isPending ? gt("Loading issues...") : <T>No issues found.</T>}
          </p>
        ) : (
          entries.map((entry) => {
            const key = `${entry.tracker}\u0000${entry.host}\u0000${entry.scope}\u0000${entry.key}`;
            const linked = linkedKeys.has(key);
            return (
              <div key={key} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <IssueRow
                    entry={entry}
                    selected={false}
                    showScope
                    showTracker
                    onSelect={() => void link(entry)}
                  />
                </div>
                {linked ? (
                  <span className="shrink-0 px-2 text-xs text-muted-foreground">
                    <T context="issue is linked">Linked</T>
                  </span>
                ) : (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void link(entry)}
                  >
                    <T>Link</T>
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
