const APS = require('forge-apis');
const { apiClientCallAsync } = require('./common.js');

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES, PUBLIC_TOKEN_SCOPES, ACC_APIS } = require('../config.js');

const internalAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);
const publicAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, PUBLIC_TOKEN_SCOPES);

const service = module.exports = {};

service.getAuthorizationUrl = () => internalAuthClient.generateAuthUrl();

service.authCallbackMiddleware = async (req, res, next) => {
    const internalCredentials = await internalAuthClient.getToken(req.query.code);
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
};

service.authRefreshMiddleware = async (req, res, next) => {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const internalCredentials = await internalAuthClient.refreshToken({ refresh_token });
        const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
        req.session.public_token = publicCredentials.access_token;
        req.session.internal_token = internalCredentials.access_token;
        req.session.refresh_token = publicCredentials.refresh_token;
        req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    }
    req.internalOAuthToken = {
        access_token: req.session.internal_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    req.publicOAuthToken = {
        access_token: req.session.public_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
};

service.getUserProfile = async (token) => {
    const resp = await new APS.UserProfileApi().getUserProfile(internalAuthClient, token);
    return resp.body;
};

// Data Management APIs
service.getHubs = async (token) => {
    const resp = await new APS.HubsApi().getHubs(null, internalAuthClient, token);
    return resp.body.data.filter((item)=>{
        return item.id.startsWith('b.');
    })
};

service.getProjects = async (hubId, token) => {
    const resp = await new APS.ProjectsApi().getHubProjects(hubId, null, internalAuthClient, token);
    return resp.body.data;
};

//////////////////////////////////////////////////////////////////////////////////////
// ACC Admin APIs
service.getAdminProjects = async (accountId, token) => {

    let allProjects = [];
    let requestUrl = ACC_APIS.URL.PROJECTS_URL.format(accountId);

    while(true){
        let response = await apiClientCallAsync('GET', requestUrl, token);
        allProjects = allProjects.concat(response.body.results);
        requestUrl = response.body.pagination.nextUrl;
        if( requestUrl == null )
            break;
    }
    return allProjects;
};


service.createAdminProject = async (accountId, projectInfo, token) =>{
    const requestUrl = ACC_APIS.URL.PROJECTS_URL.format(accountId);
    let projectsInfo = await apiClientCallAsync('POST', requestUrl, token, projectInfo);
    if(projectsInfo && projectsInfo.body ){
        return projectsInfo.body;
    }else
        return null;
}


service.getProjectInfo = async (projectId, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_URL.format(projectId);
    let projectInfo = await apiClientCallAsync('GET', requestUrl, token);
    if(projectInfo && projectInfo.body ){
        let projectsList = [];
        projectsList.push( projectInfo.body);
        return projectsList;
    }else
        return null;
};

service.getProjectUsers = async (projectId, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_USERS_URL.format(projectId);
    let projectUsersInfo = await apiClientCallAsync('GET', requestUrl, token);

    if(projectUsersInfo && projectUsersInfo.body && projectUsersInfo.body.results ){
        return projectUsersInfo.body.results;
    }else
        return null;
};


service.addProjectAdmin = async (projectId, email, token) => {
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
    let user = await apiClientCallAsync('POST', requestUrl, token, userBody);
    return user;
}


service.importProjectUsers = async (projectId, projectUsers, token) => {
    const requestUrl = ACC_APIS.URL.PROJECT_IMPORT_USERS_URL.format(projectId);
    let projectUsersRes = await apiClientCallAsync('POST', requestUrl, token, projectUsers);

    return (projectUsersRes && projectUsersRes.statusCode == 202);
}

