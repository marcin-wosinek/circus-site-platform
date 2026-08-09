# Merge a repository into this repository

Use this procedure to replace a Git submodule with ordinary files while
retaining the imported repository's commit history. Run every command from the
root of `circus-site-platform` unless a step says otherwise.

The procedure creates one merge commit with two parents: the current platform
commit and the exact commit previously referenced by the submodule gitlink. It
does not rewrite either repository's existing history.

Replace these example values throughout the instructions:

- `<site-path>`: the submodule path, such as `sites/example.com`
- `<temporary-remote>`: a short, unique Git remote name, such as
  `example-com-import`
- `<submodule-branch>`: the branch to fetch, normally `main`
- `<submodule-commit>`: the commit recorded by the parent repository
- `<backup-path>`: a new path outside the repository, such as
  `/private/tmp/example-com-submodule-backup-<submodule-commit>`

## 1. Check the starting state

Do not continue with uncommitted changes in either repository. Resolve or
commit them first; do not stash or discard someone else's work.

```sh
git status --short --branch
git submodule status -- <site-path>
git ls-files --stage <site-path>
git -C <site-path> status --short --branch
git -C <site-path> branch --show-current
git -C <site-path> rev-parse HEAD
```

Confirm all of the following:

- Both status commands report clean working trees.
- `git submodule status` does not start with `-`, `+`, or `U`.
- `git ls-files --stage` reports mode `160000`, which identifies a gitlink.
- The submodule `HEAD`, the gitlink object ID, and `<submodule-commit>` are the
  same commit.

The import should preserve the commit selected by the platform, even if the
submodule's remote branch has subsequently advanced.

## 2. Fetch the submodule history into the parent

Use the initialized local checkout as a temporary remote. This avoids changing
or pushing to the source repository.

```sh
git remote add <temporary-remote> <site-path>
git fetch <temporary-remote> <submodule-branch>
git rev-parse <temporary-remote>/<submodule-branch>
```

The fetched branch must contain `<submodule-commit>`:

```sh
git merge-base --is-ancestor <submodule-commit> <temporary-remote>/<submodule-branch>
```

An exit status of zero confirms the relationship. Import
`<submodule-commit>`, not a newer branch tip, when the two differ. The remaining
examples assume they are identical; substitute `<submodule-commit>` for the
remote-tracking branch when necessary.

## 3. Remove the submodule declaration

Edit `.gitmodules` and remove only the section whose `path` is `<site-path>`.
Preserve every other submodule entry, then stage the edit:

```sh
git add .gitmodules
```

Do not run `git submodule deinit`: the initialized checkout is still needed as
a temporary safety copy until verification succeeds.

## 4. Create the history-preserving merge

First move the checkout to a unique backup location outside the working tree.
Confirm that `<backup-path>` does not already exist before moving anything.

```sh
test ! -e <backup-path>
mv <site-path> <backup-path>
```

Start an `ours` merge without committing. This records the imported history as
a second parent without placing the source files at the platform root:

```sh
git merge --allow-unrelated-histories -s ours --no-commit <temporary-remote>/<submodule-branch>
```

Replace the gitlink in the index, then read the imported tree beneath its
existing site path:

```sh
git rm --cached <site-path>
git read-tree --prefix=<site-path>/ -u <temporary-remote>/<submodule-branch>
git status --short
```

At this point `.gitmodules` should be modified, the gitlink should be deleted,
and the files below `<site-path>` should appear as added. Do not use
`git add --force <site-path>`: `git read-tree` preserves the source tree's exact
tracked snapshot, including file modes and ignored tracked files.

## 5. Verify and commit

Confirm that no gitlink remains and that the source and staged file counts
match:

```sh
git ls-files --stage <site-path>
git ls-tree -r --name-only <temporary-remote>/<submodule-branch>
git ls-files <site-path>
```

The first column of `git ls-files --stage` must not contain `160000`. Compare
the two file lists after removing the `<site-path>/` prefix from the staged
list. For a byte-for-byte check, compare the object IDs and modes from
`git ls-tree -r` in the same way.

Commit the prepared merge:

```sh
git commit -m "Merge <site-path> into platform repository"
```

Verify that the commit has two parents and that the second parent is the
imported commit:

```sh
git show --no-patch --format='commit=%H%nparents=%P%nsubject=%s' HEAD
git status --short --branch
git config -f .gitmodules --get-regexp '^submodule\..*\.(path|url)$'
```

The local branch will appear ahead by the number of imported commits. That is
expected: those commits are now reachable from the platform's history.

## 6. Clean up

Only after the tree and merge parents have been verified, remove the temporary
remote:

```sh
git remote remove <temporary-remote>
```

The external `<backup-path>` is no longer needed after verification. Delete it
only after checking the path is exact and contains the expected former
submodule checkout.

The parent repository may retain administrative data below
`.git/modules/<site-path>`. It is not part of a clone and does not affect the
merged files. It can be removed separately after confirming no remaining
submodule configuration refers to that path.

## Recovery before the commit

If any command fails after `git merge --no-commit`, stop and inspect
`git status`. To abandon only this uncommitted merge, use:

```sh
git merge --abort
```

Then restore the checkout from `<backup-path>` if its original location is
empty. Do not use `git reset --hard` or recursively delete the site path as a
recovery shortcut.

## Origin of the approach

This workflow adapts the history-preserving merge technique described in
[Merge two Git repositories without breaking file history](https://stackoverflow.com/a/10548919),
using an `ours` merge plus `git read-tree --prefix` so imported files remain
under `sites/`.
