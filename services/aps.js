const APS = require('forge-apis');
const axios = require('axios');

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, TOKEN_SCOPES, ACC_APIS } = require('../config.js');

const authClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, TOKEN_SCOPES);

const service = module.exports = {};

service.getAuthorizationUrl = () => authClient.generateAuthUrl();

service.authCallbackMiddleware = async (req, res, next) => {
    const credentials = await authClient.getToken(req.query.code);
    req.session.token = credentials.access_token;
    req.session.refresh_token = credentials.refresh_token;
    req.session.expires_at = Date.now() + credentials.expires_in * 1000;
    next();
};

service.authRefreshMiddleware = async (req, res, next) => {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const credentials = await authClient.refreshToken({ refresh_token });
        req.session.token = credentials.access_token;
        req.session.refresh_token = credentials.refresh_token;
        req.session.expires_at = Date.now() + credentials.expires_in * 1000;
    }
    req.oAuthToken = {
        access_token: req.session.token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
};

service.getUserProfile = async (token) => {
    const resp = await new APS.UserProfileApi().getUserProfile(authClient, token);
    return resp.body;
};

// Data Management APIs
service.getHubs = async (token) => {
    const resp = await new APS.HubsApi().getHubs(null, authClient, token);
    return resp.body.data.filter((item)=>{
        return item.id.startsWith('b.');
    })
};

service.getProjects = async (hubId, token) => {
    const resp = await new APS.ProjectsApi().getHubProjects(hubId, null, authClient, token);
    return resp.body.data.filter( (item)=>{
        return item.attributes.extension.data.projectType == 'ACC';
    } )
};

// ACC Admin APIs
service.getProjectsACC = async (accountId, token) => {

    let allProjects = [];
    let requestUrl = ACC_APIS.URL.PROJECTS_URL.format(accountId);
    while (requestUrl) {
        const response = await axios.get(requestUrl, { headers: { 'Authorization': 'Bearer ' + token } });
        allProjects = allProjects.concat(response.data.results);
        requestUrl = response.data.pagination.nextUrl;
    }
    return allProjects;
};

service.createProjectACC = async (accountId, projectInfo, token) =>{
    const requestUrl = ACC_APIS.URL.PROJECTS_URL.format(accountId);
    const response = await axios.post(requestUrl, projectInfo, { headers: { 'Authorization': 'Bearer ' + token } });
    return response.data;
}

service.getProjectACC = async (projectId, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_URL.format(projectId);
    let projectsList = [];
    const response = await axios.get(requestUrl, { headers: { 'Authorization': 'Bearer ' + token } });
    projectsList.push(response.data);
    return projectsList;
};

service.getProjectUsersACC = async (projectId, token) => {
    let requestUrl = ACC_APIS.URL.PROJECT_USERS_URL.format(projectId);
    let allUsers = [];
    while (requestUrl) {
        const response = await axios.get(requestUrl, { headers: { 'Authorization': 'Bearer ' + token } });
        allUsers = allUsers.concat(response.data.results);
        requestUrl = response.data.pagination.nextUrl;
    }
    return allUsers;
};

service.addProjectAdminACC = async (projectId, email, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_USERS_URL.format(projectId);
    const userBody = {
        "email": email,
        "products": [
            {
                "key": "projectAdministration",
                "access": "administrator"
            },
            {
                "key": "docs",
                "access": "administrator"
            }
        ]
    }
    const response = await axios.post(requestUrl, userBody, { headers: { 'Authorization': 'Bearer ' + token } });
    return response.data;
}

service.importProjectUsersACC = async (projectId, projectUsers, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_IMPORT_USERS_URL.format(projectId);
    let response = await axios.post( requestUrl, projectUsers, { headers: { 'Authorization': 'Bearer ' + token } });
    return response.data;
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}
