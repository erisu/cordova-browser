/*
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const { styleText } = require('node:util');
const express = require('express');
const compression = require('compression');
const { default: open, apps: supportedBrowsers } = require('open');

// TODO: Replace with String.dedent once it's supported by our minimum Node.js version.
const dedent = require('string-dedent');

class CreateExpressApp {
    constructor () {
        this.app = express();

        // Attach this before anything else to provide status output
        this.app.use((req, res, next) => {
            res.on('finish', function () {
                const statusCode = styleText(
                    this.statusCode === 404 ? 'red' : 'green',
                    `${this.statusCode}`
                );

                let msg = `${statusCode} ${this.req.originalUrl}`;

                const encoding = this.getHeader('content-encoding');
                if (encoding) {
                    msg += styleText('gray', ` (${encoding})`);
                }
                console.log(msg);
            });
            next();
        });

        this.app.use(compression());
    }

    launchServer (projectLocations, serverOpts) {
        const isDarwin = process.platform === 'darwin';

        let httpsServOptions;
        try {
            httpsServOptions = {
                cert: fs.readFileSync(serverOpts['ssl-cert-file']),
                key: fs.readFileSync(serverOpts['ssl-key-file'])
            };
        } catch (e) {
            // If any one of them fails to read then we dont have what we need for HTTPS
            httpsServOptions = undefined;
        }

        let port = serverOpts.port || undefined;

        return new Promise((resolve, reject) => {
            this.server = httpsServOptions
                ? https.Server(httpsServOptions, this.app)
                : http.Server(this.app);

            const scheme = httpsServOptions ? 'https' : 'http';

            if (serverOpts.router) {
                this.app.use(serverOpts.router);
            }

            if (projectLocations.www) {
                this.app.use(express.static(projectLocations.www));
            }

            const listener = this.server.listen(port);
            // Store the actual used port or fallback to provided/undefined port.
            port = this.server?.address()?.port || port;

            listener.on('listening', () => {
                const serveUrl = new URL(`${scheme}://localhost:${port}/${serverOpts.startUrl}`).href;
                const developmentWarning = dedent`
                    This development server is for testing only. Do not use it in production.
                    For advanced debugging, use your own setup and serve the app content located at:

                    ${projectLocations.www}
                `;
                const message = dedent`
                    Static file server running on: ${styleText(['green', 'bold'], serveUrl)}

                    ${styleText(['yellow', 'bold'], developmentWarning)}

                    (${isDarwin ? 'Control' : 'CTRL'} + C to shut down)\n
                `;
                console.log(message);

                let target = serverOpts?.target?.toString().toLowerCase() ?? 'default';

                if (target !== 'none') {
                    const openOptions = { app: {} };

                    const filteredSupportedBrowsers = Object.keys(supportedBrowsers)
                        .filter(b => !['browser', 'browserPrivate'].includes(b));

                    if (target !== 'default') {
                        if (!filteredSupportedBrowsers.includes(target)) {
                            console.log(styleText('red', dedent`
                                Invalid target (${target}) was supplied and will fallback to default.
                                Valid targets: ${filteredSupportedBrowsers.join(', ')}\n
                            `));
                        } else {
                            openOptions.app.name = supportedBrowsers[target];
                        }
                    }

                    if (serverOpts.argv.length > 0) {
                        openOptions.app.arguments = serverOpts.argv;
                    }

                    open(serveUrl, openOptions);
                }

                resolve(message);
            });
            listener.on('error', e => {
                reject(e);
            });
        });
    }
}

module.exports = function () {
    return new CreateExpressApp();
};
