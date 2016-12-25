# VS Code - Github PR

[![](http://vsmarketplacebadge.apphb.com/version/jasonnutter.github-pr.svg)](https://marketplace.visualstudio.com/items?itemName=jasonnutter.github-pr)

VS Code extension for working with Github Pull Requests, supporting both Github.com and Github Enterprise servers.

## Features

* Supports both Github.com and Github Enterprise servers.
* Configurable default remote (e.g. `origin`) and branch (e.g. `master`).

### Create PR

Create an PR from VS Code by providing a branch name and commit message.

**Workflow**

1. Open the command palette and select **Github PR: Create PR**.
2. First, input the name of the branch you want created for this PR. If you are not on your default branch, the current branch name will be autofilled (providing a different branch name will result in a new branch).
3. Next, provide the commit message for the changes. If the branch is clean, the last commit message will be autofilled (providing a different commit message will only impact the PR).
4. If the new branch is different from your current branch, the new branch will be created and checked out.
5. If the current branch has uncommitted changes, all changed files will be committed with the provided commit message.
6. The branch will be pushed to the remote specified as `github-pr.targetRemote` (defaults to `origin`).
7. An PR will be created to the branch specified as `github-pr.targetBranch` (defaults to `master`) from the new branch.
8. A message will be shown in VS Code with a link to the PR.

### Checkout PR

Checkout out an existing PR from the current repo.

**Workflow**

1. Open the command palette and select **Github PR: Checkout PR**.
2. Select an PR from the list.
3. If the branch for the selected PR does not exist on your computer, it will be created and switched to.
4. If the branch for the selected PR does exist on your computer, it will be switched to.

### View PR

View an existing PR in your browser.

**Workflow**

1. Open the command palette and select **Github PR: View PR**.
2. Select an PR from the list.
3. The PR will be opened in your browser.

## Extension Settings

* `github-pr.accessToken`: Access token to use to connect to the Github.com API. Create one by going to Profile Settings -> Access Tokens.
* `github-pr.accessTokens`: Access token to use to connect to Github CE/EE APIs. Create one by going to Profile Settings -> Access Tokens.
* `github-pr.targetBranch`: Default target branch for PRs (defaults to `master`).
* `github-pr.targetRemote`: Default target remote for PRs (defaults to `origin`).
* `github-pr.autoOpenPr`: Automatically open a new PR in your browser.

### Access Tokens Example

```json
"github-pr.accessToken": "ACCESS_TOKEN_FOR_GITHUB.COM",
"github-pr.accessTokens": {
    "https://github.domain.com": "ACCESS_TOKEN_FOR_GITHUB.DOMAIN.COM"
}
```

## Links

* Visual Studio Marketplace: [https://marketplace.visualstudio.com/items?itemName=jasonnutter.github-pr](https://marketplace.visualstudio.com/items?itemName=jasonnutter.github-pr)
* Repo: [https://github.com/jasonnutter/vscode-github-pr](https://github.com/jasonnutter/vscode-github-pr)
* Known Issues: [https://github.com/jasonnutter/vscode-github-pr/issues](https://github.com/jasonnutter/vscode-github-pr/issues)
* Change Log: [https://github.com/jasonnutter/vscode-github-pr/blob/master/CHANGELOG.md](https://github.com/jasonnutter/vscode-github-pr/blob/master/CHANGELOG.md)
* Gitlab Plugin: [https://gitlab.com/jasonnutter/vscode-gitlab-mr](https://gitlab.com/jasonnutter/vscode-gitlab-mr)
