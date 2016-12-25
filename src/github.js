module.exports = githubContext => {
    const openPr = params => githubContext.pullRequests.create(params);

    const listPrs = params => githubContext.pullRequests.getAll(params);

    return {
        openPr,
        listPrs
    };
};
