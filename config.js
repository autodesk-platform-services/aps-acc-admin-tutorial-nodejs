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
        PROJECT_USERS_URL:  "https://developer.api.autodesk.com/construction/admin/v1/projects/{0}/users",

        BUDGETS_URL:        "https://developer.api.autodesk.com/cost/v1/containers/{0}/budgets?include=attributes",
        BUDGET_URL:         "https://developer.api.autodesk.com/cost/v1/containers/{0}/budgets/{1}",

        CONTRACTS_URL:      "https://developer.api.autodesk.com/cost/v1/containers/{0}/contracts?include=attributes",
        CONTRACT_URL:       "https://developer.api.autodesk.com/cost/v1/containers/{0}/contracts/{1}",
        
        COSTITEMS_URL:      "https://developer.api.autodesk.com/cost/v1/containers/{0}/cost-items?include=attributes",
        COSTITEM_URL:       "https://developer.api.autodesk.com/cost/v1/containers/{0}/cost-items/{1}",
        
        CHANGEORDERS_URL:   "https://developer.api.autodesk.com/cost/v1/containers/{0}/change-orders/{1}?include=attributes",
        CHANGEORDER_URL:    "https://developer.api.autodesk.com/cost/v1/containers/{0}/change-orders/{1}/{2}",
    
        CUSTOM_ATTRIBUTE_URL: "https://developer.api.autodesk.com/cost/v1/containers/{0}/property-values:batch-update",

        COST_EVENTS_HOOKS:    "https://developer.api.autodesk.com/webhooks/v1/systems/{0}/events/{1}/hooks",
        COST_EVENTS_HOOK:     "https://developer.api.autodesk.com/webhooks/v1/systems/{0}/events/{1}/hooks/{2}",
        COST_HOOKS:           "https://developer.api.autodesk.com/webhooks/v1/systems/{0}/hooks"

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
