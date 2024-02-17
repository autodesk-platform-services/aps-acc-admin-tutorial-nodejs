const express = require('express');
var bodyParser = require('body-parser');

const { authRefreshMiddleware, getProjectsACC, getProjectACC, getProjectUsersACC, createProjectACC, importProjectUsersACC, addProjectAdminACC, getUserProfile } = require('../services/aps.js');

let router = express.Router();

router.use(authRefreshMiddleware);

router.get('/api/admin/projects', async function(req, res, next){
    try {
        const projects = await getProjectsACC( req.query.accountId, req.internalOAuthToken.access_token);
        res.json(projects);
    } catch (err) {
        next(err);
    }
});

router.get('/api/admin/project', async function(req, res, next){
    try {
        const projectInfo = await getProjectACC( req.query.projectId, req.internalOAuthToken.access_token);
        res.json(projectInfo);
    } catch (err) {
        next(err);
    }
});

router.post('/api/admin/projects', bodyParser.json(), async function (req, res, next) {
    const accountId = req.body.accountId;
    const projects = req.body.data;
    let projectsRes = [];
    // wait here until all the projects are created.
    await Promise.all(
        projects.map(async (project) => {
            try{
                const projectInfo = await createProjectACC(accountId, project, req.internalOAuthToken.access_token);
                projectsRes.push(projectInfo);
                // add a project admin
                const profile = await getUserProfile(req.internalOAuthToken);
                await addProjectAdminACC( projectInfo.id, profile.email, req.internalOAuthToken.access_token )
            }catch(err){
                console.warn("Failed to create project for: "+ project.name + "due to: "+ err.statusMessage )
            }
        })
    )
    res.json(projectsRes);
});


router.get('/api/admin/project/users', async function (req, res, next) {
    try {
        const users = await getProjectUsersACC(req.query.projectId, req.internalOAuthToken.access_token);
        res.json(users);
    } catch (err) {
        next(err);
    }
});


router.post('/api/admin/project/users', bodyParser.json(), async function (req, res, next) {
    const projectId = req.body.projectId;
    const users = { 
        'users': req.body.data 
    };
    try {
        const usersRes = await importProjectUsersACC(projectId, users, req.internalOAuthToken.access_token);
        res.json(usersRes);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
