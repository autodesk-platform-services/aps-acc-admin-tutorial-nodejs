require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, SERVER_SESSION_SECRET, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_CALLBACK_URL || !SERVER_SESSION_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const INTERNAL_TOKEN_SCOPES = ['data:read', 'account:read', 'account:write'];
const PUBLIC_TOKEN_SCOPES = ['viewables:read'];
PORT = PORT || 8080;

const ACC_APIS = {
    URL:{
        PROJECTS_URL:       "https://developer.api.autodesk.com/construction/admin/v1/accounts/{0}/projects",
        PROJECT_URL:        "https://developer.api.autodesk.com/construction/admin/v1/projects/{0}",
        PROJECT_USERS_URL:  "https://developer.api.autodesk.com/construction/admin/v1/projects/{0}/users"
    }
};


module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_CALLBACK_URL,
    SERVER_SESSION_SECRET,
    INTERNAL_TOKEN_SCOPES,
    PUBLIC_TOKEN_SCOPES,
    PORT,
    ACC_APIS
};
