const Q = require('q');
const gitUtils = require('./git-utils');

module.exports = gitContext => {
    const checkStatus = targetBranch => {
        const deferred = Q.defer();

        gitContext.status((err, status) => {
            if (err) {
                return deferred.reject(err);
            }

            const currentBranch = status.current;
            const onMaster = currentBranch === targetBranch;
            const isConflicted = status.conflicted.length > 0;
            const cleanBranch = status.created.length === 0 &&
                                status.deleted.length === 0 &&
                                status.modified.length === 0 &&
                                status.not_added.length === 0 &&
                                status.renamed.length === 0;

            if (isConflicted) {
                return deferred.reject(new Error('Unresolved conflicts, please resolve before opening PR.'));
            }

            deferred.resolve({
                currentBranch,
                onMaster,
                cleanBranch
            });
        });

        return deferred.promise;
    };

    const lastCommitMessage = () => {
        const deferred = Q.defer();

        gitContext.log((err, log) => {
            if (err) {
                return deferred.reject(err);
            }

            const message = log.latest ? log.latest.message : '';

            // Commit messages are suffixed with message starting with '(HEAD -> )'
            deferred.resolve(message.split('(HEAD')[0].trim());
        });

        return deferred.promise;
    };

    const parseRemotes = targetRemote => {
        const deferred = Q.defer();

        gitContext.getRemotes(true, (err, remotes) => {
            // Remote error checking
            if (err) {
                return deferred.reject(new Error(err));
            }

            if (!remotes || remotes.length < 1) {
                return deferred.reject(new Error('No remotes configured.'));
            }

            // Determine which Github server this repo uses
            const foundRemote = remotes.find(remote => remote.name === targetRemote);
            if (!foundRemote) {
                return deferred.reject(new Error(`Target remote ${targetRemote} does not exist.`));
            }

            // Parse repo host and tokens
            const repoUrl = foundRemote.refs.push;

            const parsedRemote = gitUtils.parseRepoUrl(repoUrl);

            deferred.resolve(parsedRemote);
        });

        return deferred.promise;
    };

    const createBranch = branchName => {
        const deferred = Q.defer();

        gitContext.checkout([ '-b', branchName ], err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            deferred.resolve();
        });

        return deferred.promise;
    };

    const checkoutBranch = args => {
        const deferred = Q.defer();

        gitContext.checkout(args, err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            deferred.resolve();
        });

        return deferred.promise;
    };

    const addFiles = files => {
        const deferred = Q.defer();

        gitContext.add(files, err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            deferred.resolve();
        });

        return deferred.promise;
    };

    const commitFiles = commitMessage => {
        const deferred = Q.defer();

        gitContext.commit(commitMessage, err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            return deferred.resolve();
        });

        return deferred.promise;
    };

    const pushBranch = (targetRemote, branchName) => {
        const deferred = Q.defer();

        gitContext.push([ '-u', targetRemote, branchName ], err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            return deferred.resolve();
        });

        return deferred.promise;
    };

    const fetchRemote = (targetRemote, branchName) => {
        const deferred = Q.defer();

        gitContext.fetch(targetRemote, branchName, err => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            return deferred.resolve();
        });

        return deferred.promise;
    };

    const listBranches = () => {
        const deferred = Q.defer();

        gitContext.branch((err, branches) => {
            if (err) {
                return deferred.reject(new Error(err));
            }

            return deferred.resolve(branches);
        });

        return deferred.promise;
    };

    return {
        checkStatus,
        lastCommitMessage,
        parseRemotes,
        createBranch,
        checkoutBranch,
        listBranches,
        fetchRemote,
        addFiles,
        commitFiles,
        pushBranch
    };
};
