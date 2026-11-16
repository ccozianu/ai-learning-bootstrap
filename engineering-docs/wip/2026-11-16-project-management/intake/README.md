# `project-management` Intake Queue

This directory receives cross-workstream handovers and routing items addressed to `project-management` per `WORKFLOW.md` (*Workstream Intake*).

- Senders deliver items via `devcapsule workflow mail send project-management <file>` on the `coordination` branch.
- Only `project-management` takes, decides (`acknowledge` or `forward`/route), removes items from this directory, and logs every disposition in `../intake-dispositions.md`.
