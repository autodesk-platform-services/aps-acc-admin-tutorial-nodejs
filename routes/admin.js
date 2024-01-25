const express = require('express');
const { authRefreshMiddleware, getAdminProjects, getProjectInfo, getProjectUsers } = require('../services/aps.js');

let router = express.Router();

router.use(authRefreshMiddleware);

router.get('/api/admin/projects', async function(req, res, next){
    try {
        const projects = await getAdminProjects( req.query.account_id, req.internalOAuthToken.access_token);
        res.json(projects);
    } catch (err) {
        next(err);
    }
});

router.get('/api/admin/project', async function(req, res, next){
    try {
        const projectInfo = await getProjectInfo( req.query.project_id, req.internalOAuthToken.access_token);
        res.json(projectInfo);
    } catch (err) {
        next(err);
    }
});

router.get('/api/admin/project/users', async function(req, res, next){
    try {
        const users = await getProjectUsers(req.query.project_id, req.internalOAuthToken.access_token);
        res.json(users);
    } catch (err) {
        next(err);
    }

} );

module.exports = router;
