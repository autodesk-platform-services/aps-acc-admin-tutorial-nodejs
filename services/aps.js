const { SdkManagerBuilder } = require('@aps_sdk/autodesk-sdkmanager');
const { AuthenticationClient, Scopes, ResponseType } = require('@aps_sdk/authentication');
const { DataManagementClient } = require('@aps_sdk/data-management');
const { AdminClient } = require('@aps_sdk/construction-account-admin');

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } = require('../config.js');

const service = module.exports = {};

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const dataManagementClient = new DataManagementClient(sdk);
const adminClient = new AdminClient(sdk);


service.getAuthorizationUrl = () => authenticationClient.authorize(APS_CLIENT_ID, ResponseType.Code, APS_CALLBACK_URL, [
    Scopes.DataRead,
    Scopes.AccountRead,
    Scopes.AccountWrite
]);

service.authCallbackMiddleware = async (req, res, next) => {
    const credentials = await authenticationClient.getThreeLeggedToken(APS_CLIENT_ID, req.query.code, APS_CALLBACK_URL,{clientSecret:APS_CLIENT_SECRET});
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
        const credentials = await authenticationClient.getRefreshToken(APS_CLIENT_ID, refresh_token, {
            clientSecret: APS_CLIENT_SECRET,
            scopes: [
                Scopes.DataRead,
                Scopes.AccountRead,
                Scopes.AccountWrite
            ]
        });
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
    const resp = await authenticationClient.getUserInfo(token.access_token);
    return resp;
};

// Data Management APIs
service.getHubs = async (token) => {
    const resp = await dataManagementClient.getHubs(token.access_token);
    return resp.data.filter((item)=>{
        return item.id.startsWith('b.');
    })
};

service.getProjects = async (hubId, token) => {
    const resp = await dataManagementClient.getHubProjects(token.access_token, hubId);
    return resp.data.filter( (item)=>{
        return item.attributes.extension.data.projectType == 'ACC';
    } )
};

// ACC Admin APIs
service.getProjectsACC = async (accountId, token) => {
    let allProjects = [];
    let offset = 0;
    let totalResults = 0;
    do {
        const resp = await adminClient.getProjects(token, accountId, {offset:offset});
        allProjects = allProjects.concat(resp.results);
        offset += resp.pagination.limit;
        totalResults = resp.pagination.totalResults;
    } while (offset < totalResults)
    return allProjects;
};

service.createProjectACC = async (accountId, projectInfo, token) =>{
    const resp = await adminClient.createProject( token, accountId, projectInfo );
    return resp;
}

service.getProjectACC = async (projectId, token) => {
    const resp = await adminClient.getProject( token, projectId );
    return resp;
};

service.getProjectUsersACC = async (projectId, token) => {
    let allUsers = [];
    let offset = 0;
    let totalResults = 0;
    do{
        const resp = await adminClient.getProjectUsers( token, projectId, {offset:offset});
        allUsers = allUsers.concat(resp.results);
        offset += resp.pagination.limit;
        totalResults = resp.pagination.totalResults;
    }while (offset < totalResults) 
    return allUsers;
};

service.addProjectAdminACC = async (projectId, email, token) => {
    const userBody = {
        "email": email,
        "products": [{
            "key": "projectAdministration",
            "access": "administrator"
        }, {
            "key": "docs",
            "access": "administrator"
        }]
    }
    const resp = await adminClient.assignProjectUser( token, projectId, userBody );
    return resp;
}

service.importProjectUsersACC = async (projectId, projectUsers, token) => {
    const resp = await adminClient.importProjectUsers( token, projectId, projectUsers )
    return resp;
}
