const vscode = require('vscode');
const open = require('opn');
const url = require('url');
const gitApi = require('simple-git');
const githubApi = require('github');
const Q = require('q');

const gitActions = require('./git');
const githubActions = require('./github');
const gitUtils = require('./git-utils');

const message = msg => `Github PR: ${msg}`;
const ERROR_STATUS = message('Unable to create PR.');
const STATUS_TIMEOUT = 10000;

const showErrorMessage = msg => {
    vscode.window.showErrorMessage(message(msg));
    vscode.window.setStatusBarMessage(ERROR_STATUS, STATUS_TIMEOUT);
};

const showAccessTokenErrorMessage = githubApiUrl => {
    const tokenUrl = `${githubApiUrl}/settings/tokens`;
    const errorMsg = githubApiUrl === 'https://github.com' ?
        'github-pr.accessToken preference not set.' :
        `github-pr.accessTokens["${githubApiUrl}"] preference not set.`;

    const generateTokenLabel = 'Generate Access Token';

    return vscode.window.showErrorMessage(message(errorMsg), generateTokenLabel).then(selected => {
        switch (selected) {
            case generateTokenLabel:
                open(tokenUrl);
                break;
        }
    });
};

const openPR = () => {
    const preferences = vscode.workspace.getConfiguration('github-pr');

    // Target branch and remote
    const targetBranch = preferences.get('targetBranch', 'master');
    const targetRemote = preferences.get('targetRemote', 'origin');

    // Access tokens
    const githubComAccessToken = preferences.get('accessToken');
    const githubEntAccessTokens = preferences.get('accessTokens') || {};

    // Auto-open PR
    const autoOpenPr = preferences.get('autoOpenPr', false);

    // Set git context
    const gitContext = gitApi(vscode.workspace.rootPath);
    const git = gitActions(gitContext);

    // Check repo status
    git.checkStatus(targetBranch)
    .then(status => {
        const currentBranch = status.currentBranch;
        const onMaster = status.onMaster;
        const cleanBranch = status.cleanBranch;

        return git.lastCommitMessage()
        .then(lastCommitMessage => {
            // Read remotes to determine where PR will go
            return git.parseRemotes(targetRemote)
            .then(result => {
                const repoId = result.repoId;
                const repoHost = result.repoHost;
                const repoOwner = repoId.split('/')[0];
                const repoName = repoId.split('/')[1];
                const githubHosts = gitUtils.parseGithubHosts(githubEntAccessTokens);
                const repoWebProtocol = gitUtils.parseRepoProtocol(repoHost, githubHosts);

                const githubApiUrl = url.format({
                    host: repoHost,
                    protocol: repoWebProtocol
                });
                const isGithubCom = repoHost === 'github.com';
                const accessToken = isGithubCom ? githubComAccessToken : githubEntAccessTokens[githubApiUrl];

                // Token not set for repo host
                if (!accessToken) {
                    return showAccessTokenErrorMessage(githubApiUrl);
                }

                const githubContext = new githubApi({
                    debug: true,
                    protocol: 'https',
                    host: isGithubCom ? 'api.github.com' : repoHost,
                    pathPrefix: isGithubCom ? '' : '/api/v3',
                    headers: {
                        'user-agent': 'vscode-github-pr'
                    }
                });

                githubContext.authenticate({
                    type: 'token',
                    token: accessToken
                });

                const github = githubActions(githubContext);

                // Prompt user for branch and commit message
                return vscode.window.showInputBox({
                    prompt: 'Branch Name:',
                    value: onMaster ? '' : currentBranch
                })
                .then(branch => {
                    // Validate branch name
                    if (!branch) {
                        return showErrorMessage('Branch name must be provided.');
                    }

                    if (branch.indexOf(' ') > -1) {
                        return showErrorMessage('Branch name must not contain spaces.');
                    }

                    if (branch === targetBranch) {
                        return showErrorMessage(`Branch name cannot be the default branch name (${targetBranch}).`);
                    }

                    return vscode.window.showInputBox({
                        prompt: 'Commit Message:',
                        value: cleanBranch ? lastCommitMessage : ''
                    })
                    .then(commitMessage => {
                        // Validate commit message
                        if (!commitMessage) {
                            return showErrorMessage('Commit message must be provided.');
                        }

                        const buildStatus = vscode.window.setStatusBarMessage(message(`Building PR to ${targetBranch} from ${branch}...`));

                        var gitPromises;
                        if (onMaster || (!onMaster && currentBranch !== branch)) {
                            if (cleanBranch) {
                                // On master, clean: create and push branch
                                gitPromises = git.createBranch(branch)
                                                .then(() => git.pushBranch(targetRemote, branch));
                            } else {
                                // On master, not clean: create branch, commit, push branch
                                gitPromises = git.createBranch(branch)
                                                .then(() => git.addFiles('./*'))
                                                .then(() => git.commitFiles(commitMessage))
                                                .then(() => git.pushBranch(targetRemote, branch));
                            }
                        } else {
                            if (cleanBranch) {
                                // Not on master, clean: push branch
                                gitPromises = git.pushBranch(targetRemote, branch);
                            } else {
                                // Not on master, not clean: Commit, push branch
                                gitPromises = git.addFiles('./*')
                                                .then(() => git.commitFiles(commitMessage))
                                                .then(() => git.pushBranch(targetRemote, branch));
                            }
                        }

                        gitPromises.catch(err => {
                            buildStatus.dispose();

                            showErrorMessage(err.message);
                        });

                        return gitPromises.then(() => {
                            return github.openPr({
                                owner: repoOwner,
                                repo: repoName,
                                title: commitMessage,
                                head: branch,
                                base: targetBranch
                            })
                            .then(pr => {
                                // Success message and prompt
                                const successMessage = message(`PR #${pr.number} created.`);
                                const successButton = 'Open PR';

                                buildStatus.dispose();
                                vscode.window.setStatusBarMessage(successMessage, STATUS_TIMEOUT);

                                if (autoOpenPr) {
                                    open(pr.html_url);
                                    return vscode.window.showInformationMessage(successMessage);
                                }

                                return vscode.window.showInformationMessage(successMessage, successButton).then(selected => {
                                    switch (selected) {
                                        case successButton: {
                                            open(pr.html_url);
                                            break;
                                        }
                                    }
                                });
                            })
                            .catch(() => {
                                buildStatus.dispose();

                                // Build url to create PR from web ui
                                const githubNewPrUrl = url.format({
                                    protocol: repoWebProtocol,
                                    host: repoHost,
                                    pathname: `/${repoOwner}/${repoName}/compare/${targetBranch}...${branch}`
                                });

                                const createButton = 'Create on Github';

                                vscode.window.setStatusBarMessage(ERROR_STATUS, STATUS_TIMEOUT);
                                vscode.window.showErrorMessage(ERROR_STATUS, createButton).then(selected => {
                                    switch (selected) {
                                        case createButton:
                                            open(githubNewPrUrl);
                                            break;
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    })
    .catch(err => {
        showErrorMessage(err.message);
    });
};

const listPRs = () => {
    const deferred = Q.defer();

    const preferences = vscode.workspace.getConfiguration('github-pr');

    // Target branch and remote
    const targetBranch = preferences.get('targetBranch', 'master');
    const targetRemote = preferences.get('targetRemote', 'origin');

    // Access tokens
    const githubComAccessToken = preferences.get('accessToken');
    const githubEntAccessTokens = preferences.get('accessTokens') || {};

    // Set git context
    const gitContext = gitApi(vscode.workspace.rootPath);
    const git = gitActions(gitContext);

    git.parseRemotes(targetRemote)
    .then(result => {
        const repoId = result.repoId;
        const repoOwner = repoId.split('/')[0];
        const repoName = repoId.split('/')[1];
        const repoHost = result.repoHost;
        const githubHosts = gitUtils.parseGithubHosts(githubEntAccessTokens);
        const repoWebProtocol = gitUtils.parseRepoProtocol(repoHost, githubHosts);

        const githubApiUrl = url.format({
            host: repoHost,
            protocol: repoWebProtocol
        });
        const isGithubCom = repoHost === 'github.com';
        const accessToken = isGithubCom ? githubComAccessToken : githubEntAccessTokens[githubApiUrl];

        // Token not set for repo host
        if (!accessToken) {
            return showAccessTokenErrorMessage(githubApiUrl);
        }

        const githubContext = new githubApi({
            debug: true,
            protocol: 'https',
            host: 'api.github.com',
            headers: {
                'user-agent': 'vscode-github-pr'
            }
        });

        githubContext.authenticate({
            type: 'token',
            token: accessToken
        });

        const github = githubActions(githubContext);

        return github.listPrs({
            owner: repoOwner,
            repo: repoName,
            state: 'open'
        })
        .then(prs => {
            const prList = prs.map(pr => {
                const label = `PR #${pr.number}: ${pr.title}`;
                const detail = pr.body;
                let description = `${pr.head.ref}`;

                if (pr.base.ref !== targetBranch) {
                    description += ` > ${pr.base.ref}`;
                }

                return {
                    pr,
                    label,
                    detail,
                    description
                };
            });

            return vscode.window.showQuickPick(prList, {
                matchOnDescription: true,
                placeHolder: 'Select PR'
            })
            .then(selected => {
                if (selected) {
                    deferred.resolve(selected.pr);
                }
            });
        });
    })
    .catch(err => {
        deferred.reject(err);
    });

    return deferred.promise;
};

const viewPR = () => {
    listPRs()
    .then(pr => {
        if (!pr) {
            return showErrorMessage('PR not selected.');
        }

        open(pr.html_url);
    })
    .catch(err => {
        showErrorMessage(err.message);
    });
};

const checkoutPR = () => {
    listPRs()
    .then(pr => {
        if (!pr) {
            return showErrorMessage('PR not selected.');
        }

        const branchName = pr.head.ref;

        // Preferences
        const preferences = vscode.workspace.getConfiguration('github-pr');
        const targetRemote = preferences.get('targetRemote', 'origin');

        // Git context
        const gitContext = gitApi(vscode.workspace.rootPath);
        const git = gitActions(gitContext);

        const checkoutStatus = vscode.window.setStatusBarMessage(message(`Checking out PR #${pr.number}...`));

        return git.listBranches()
        .then(branches => {
            const targetBranch = branches.branches[branchName];

            if (targetBranch) {
                // Switch to existing branch
                return git.checkoutBranch([ branchName ]);
            }

            // Fetch and switch to remote branch
            return git.fetchRemote(targetRemote, branchName)
            .then(() => {
                return git.checkoutBranch([ '-b', branchName, `${targetRemote}/${branchName}` ]);
            });
        })
        .then(() => {
            checkoutStatus.dispose();
            vscode.window.setStatusBarMessage(message(`Switched to PR #${pr.number}.`), STATUS_TIMEOUT);
        })
        .catch(err => {
            checkoutStatus.dispose();
            showErrorMessage(err.message);
        });
    })
    .catch(err => {
        showErrorMessage(err.message);
    });
};

module.exports = {
    listPRs,
    viewPR,
    checkoutPR,
    openPR
};
