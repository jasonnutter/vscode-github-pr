/* global describe, it */
const expect = require('chai').expect;
const gitUtils = require('../src/git-utils');

describe('git-utils', () => {
    describe('parseRepoUrl', () => {
        it('https://', () => {
            const repoUrl = 'https://github.example.com/jasonnutter/test-repo.git';

            const idHost = gitUtils.parseRepoUrl(repoUrl);

            expect(idHost.repoHost).to.equal('github.example.com');
            expect(idHost.repoId).equal('jasonnutter/test-repo');
        });

        it('http://', () => {
            const repoUrl = 'http://localhost/jasonnutter/test-repo.git';

            const idHost = gitUtils.parseRepoUrl(repoUrl);

            expect(idHost.repoHost).to.equal('localhost');
            expect(idHost.repoId).to.equal('jasonnutter/test-repo');
        });

        it('git@', () => {
            const repoUrl = 'git@github.com:jasonnutter/vscode-github-pr-test.git';

            const idHost = gitUtils.parseRepoUrl(repoUrl);

            expect(idHost.repoHost).to.equal('github.com');
            expect(idHost.repoId).to.equal('jasonnutter/vscode-github-pr-test');
        });

        it('ssh://', () => {
            const repoUrl = 'ssh://git@github.example.com:22448/jasonnutter/test-repo.git';

            const idHost = gitUtils.parseRepoUrl(repoUrl);

            expect(idHost.repoHost).to.equal('github.example.com');
            expect(idHost.repoId).to.equal('jasonnutter/test-repo');
        });
    });

    describe('repoWebProtocol', () => {
        describe('parses protocol successfully', () => {
            const githubHosts = [
                'http://github.example.com',
                'https://github-test.example.com',
                'https://github.com'
            ];

            it('http (Github Enterprise)', () => {
                const repoHost = 'github.example.com';
                const protocol = gitUtils.parseRepoProtocol(repoHost, githubHosts);

                expect(protocol).to.equal('http:');
            });

            it('https (Github Enterprise)', () => {
                const repoHost = 'github-test.example.com';
                const protocol = gitUtils.parseRepoProtocol(repoHost, githubHosts);

                expect(protocol).to.equal('https:');
            });

            it('https (Github.com)', () => {
                const repoHost = 'github.com';
                const protocol = gitUtils.parseRepoProtocol(repoHost, githubHosts);

                expect(protocol).to.equal('https:');
            });
        });

        describe('throws when Github hosts are not properly configured', () => {
            it('Entry missing', () => {
                const githubHosts = [];

                const repoHost = 'github.example.com';

                const func = gitUtils.parseRepoProtocol.bind(null, repoHost, githubHosts);

                expect(func).to.throw(`github-pr.accessTokens does not contain an entry for ${repoHost} (e.g. github-pr.accessTokens["https://${repoHost}"]).`);
            });

            it('Protocol missing', () => {
                const githubHosts = [
                    'github.example.com'
                ];

                const repoHost = 'github.example.com';

                const func = gitUtils.parseRepoProtocol.bind(null, repoHost, githubHosts);

                expect(func).to.throw(`github-pr.accessTokens["${repoHost}"] must have a protocol (e.g. github-pr.accessTokens["https://${repoHost}"]).`);
            });
        });
    });

    describe('parseGithubHosts', () => {
        const githubCeAccessTokens = {
            'http://github.example.com': '',
            'https://github-test.example.com': ''
        };

        it('parses Github hosts correctly (including Github.com)', () => {
            const githubHosts = gitUtils.parseGithubHosts(githubCeAccessTokens);

            expect(githubHosts).to.deep.equal([
                'http://github.example.com',
                'https://github-test.example.com',
                'https://github.com'
            ]);
        });
    });
});
