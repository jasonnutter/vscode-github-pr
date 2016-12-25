const sshParse = require('ssh-parse');
const url = require('url');
const trimStart = require('lodash.trimstart');

const parseRepoUrl = repoUrl => {
    const parsedRepoUrl = url.parse(repoUrl);
    const parsedRepoSshUrl = sshParse(repoUrl);

    const parsedUrl = parsedRepoUrl.protocol ? parsedRepoUrl : parsedRepoSshUrl;

    const repoHost = parsedUrl.hostname;
    const repoPath = parsedUrl.pathname;
    const repoId = trimStart(repoPath.split('.git')[0], '/');

    return {
        repoHost,
        repoId
    };
};

const parseRepoProtocol = (repoHost, githubHosts) => {
    const urlForHost = githubHosts.find(githubHost => url.parse(githubHost).hostname === repoHost || githubHost === repoHost);

    if (!urlForHost) {
        throw new Error(`github-pr.accessTokens does not contain an entry for ${repoHost} (e.g. github-pr.accessTokens["https://${repoHost}"]).`);
    }

    const parsedUrl = url.parse(urlForHost);

    if (!parsedUrl.protocol) {
        throw new Error(`github-pr.accessTokens["${repoHost}"] must have a protocol (e.g. github-pr.accessTokens["https://${repoHost}"]).`);
    }

    return parsedUrl.protocol;
};

const parseGithubHosts = githubEntAccessTokens => {
    const githubHosts = Object.keys(githubEntAccessTokens);
    githubHosts.push('https://github.com');

    return githubHosts;
};

module.exports = {
    parseRepoUrl,
    parseRepoProtocol,
    parseGithubHosts
};
