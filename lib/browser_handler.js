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

const path = require('node:path');
const fs = require('node:fs');

const { events } = require('cordova-common');

const handlers = {
    'js-module': {
        install: function (obj, plugin, project, options) {
            const destRoot = options && options.usePlatformWww
                ? project.platformWww
                : project.www;
            // Copy the plugin's files into the www directory.
            const moduleSource = path.resolve(plugin.dir, obj.src);
            // Get module name based on existing 'name' attribute or filename
            // Must use path.extname/path.basename instead of path.parse due to CB-9981
            const moduleName = plugin.id + '.' + (obj.name || path.basename(obj.src, path.extname(obj.src)));
            // Read in the file, prepend the cordova.define, and write it back out.
            let scriptContent = fs.readFileSync(moduleSource, 'utf-8').replace(/^\ufeff/, ''); // Window BOM

            if (moduleSource.match(/.*\.json$/)) {
                scriptContent = `module.exports = ${scriptContent}`;
            }
            scriptContent = `cordova.define("${moduleName}", function(require, exports, module) { ${scriptContent}\n});\n`;

            const moduleDestination = path.resolve(destRoot, 'plugins', plugin.id, obj.src);

            fs.mkdirSync(path.dirname(moduleDestination), { recursive: true });
            fs.writeFileSync(moduleDestination, scriptContent, 'utf-8');
        },
        uninstall: function (obj, plugin, project, options) {
            const destRoot = options && options.usePlatformWww
                ? project.platformWww
                : project.www;
            const pluginRelativePath = path.join('plugins', plugin.id, obj.src);

            fs.rmSync(path.join(destRoot, pluginRelativePath), { force: true });
        }
    },
    asset: {
        install: function (obj, plugin, project, options) {
            const destRoot = options && options.usePlatformWww
                ? project.platformWww
                : project.www;
            const src = path.join(plugin.dir, obj.src);
            const dest = path.join(destRoot, obj.target);
            const destDir = path.parse(dest).dir;

            if (destDir !== '' && !fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            if (fs.statSync(src).isDirectory()) {
                fs.cpSync(src, dest, { recursive: true, force: true });
            } else {
                fs.cpSync(src, dest, { force: true });
            }
        },
        uninstall: function (obj, plugin, project, options) {
            const destRoot = options && options.usePlatformWww
                ? project.platformWww
                : project.www;

            fs.rmSync(path.join(destRoot, obj.target), { recursive: true, force: true });
            fs.rmSync(path.join(destRoot, 'plugins', plugin.id), { recursive: true, force: true });
        }
    }
};

module.exports.getInstaller = function (type) {
    if (handlers[type] && handlers[type].install) {
        return handlers[type].install;
    }

    events.emit('verbose', '<' + type + '> is not supported for browser plugins');
};

module.exports.getUninstaller = function (type) {
    if (handlers[type] && handlers[type].uninstall) {
        return handlers[type].uninstall;
    }

    events.emit('verbose', '<' + type + '> is not supported for browser plugins');
};
