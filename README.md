# ACC Admin Tutorial (Node.js)

![platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![node.js](https://img.shields.io/badge/Node.js-20.10-blue.svg)](https://nodejs.org)
[![npm](https://img.shields.io/badge/npm-10.2.3-blue.svg)](https://www.npmjs.com/)
[![license](https://img.shields.io/:license-mit-green.svg)](https://opensource.org/licenses/MIT)

[Autodesk Platform Services](https://aps.autodesk.com) application built by following
the [ACC Administractor](https://tutorials.autodesk.io/tutorials/acc-admin/) tutorial
from https://tutorials.autodesk.io.

![thumbnail](thumbnail.png)

## Development

### Prerequisites

- [APS credentials](https://aps.autodesk.com/en/docs/oauth/v2/tutorials/create-app)
- [Autodesk Construction Cloud](https://fieldofviewblog.wordpress.com/2017/08/31/bim-360-acc-account-for-development/)
- Provisioned access to [Autodesk Construction Cloud](https://tutorials.autodesk.io/#provision-access-in-other-products)
- [Node.js](https://nodejs.org) (Long Term Support version is recommended)
- Command-line terminal such as [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/overview)
or [bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) (should already be available on your system)

> We recommend using [Visual Studio Code](https://code.visualstudio.com) which, among other benefits,
> provides an [integrated terminal](https://code.visualstudio.com/docs/terminal/basics) as well.

### Setup & Run

- Clone this repository: `git clone https://github.com/autodesk-platform-services/aps-acc-admin-tutorial`
- Go to the project folder: `cd aps-acc-admin-tutorial`
- Install Node.js dependencies: `npm install`
- Open the project folder in a code editor of your choice
- Create a _.env_ file in the project folder, and populate it with the snippet below,
replacing `<client-id>` and `<client-secret>` with your APS Client ID and Client Secret,
and `<secret-phrase>` with an arbitrary string:

```bash
APS_CLIENT_ID="<client-id>"
APS_CLIENT_SECRET="<client-secret>"
APS_CALLBACK_URL="http://localhost:8080/api/auth/callback" # URL your users will be redirected to after logging in with their Autodesk account
SERVER_SESSION_SECRET="<secret-phrase>" # phrase used to encrypt/decrypt server session cookies
```

> For applications deployed to a custom domain, the callback URL will be `http://<your-domain>/api/auth/callback`
> or `https://<your-domain>/api/auth/callback`. Do not forget to update the callback URL for your application
> in https://aps.autodesk.com/myapps as well.

- Run the application, either from your code editor, or by running `npm start` in terminal
- Open http://localhost:8080

> When using [Visual Studio Code](https://code.visualstudio.com), you can run & debug
> the application by pressing `F5`.

## Troubleshooting

Please contact us via https://aps.autodesk.com/en/support/get-help.

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT).
Please see the [LICENSE](LICENSE) file for more details.
