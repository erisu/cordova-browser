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

const fs = require('node:fs');
const path = require('node:path');
const pluginHandlers = require('./browser_handler');

let projectFileCache = {};

class BrowserProject {
    constructor (projectDir) {
        this._dirty = false;
        this.projectDir = projectDir;
        this.platformWww = path.join(this.projectDir, 'platform_www');
        this.www = path.join(this.projectDir, 'www');
    }

    /**
     * Reads the package name out of the project's config.xml
     *
     * @param   {String}  projectDir  The absolute path to the directory containing the project
     * @return  {String}              The name of the package
     */
    getPackageName (projectDir) {
        // this method should the id from root config.xml => <widget id=xxx
        let pkgName = 'io.cordova.hellocordova';
        const widget_id_regex = /(?:<widget\s+id=['"])(\S+)(?:['"])/;

        const configPath = path.join(projectDir, 'config.xml');
        if (fs.existsSync(configPath)) {
            const configStr = fs.readFileSync(configPath, 'utf8');
            const res = configStr.match(widget_id_regex);
            if (res && res.length > 1) {
                pkgName = res[1];
            }
        }
        return pkgName;
    }

    getInstaller (type) {
        return pluginHandlers.getInstaller(type);
    }

    getUninstaller (type) {
        return pluginHandlers.getUninstaller(type);
    }

    static getProjectFile (projectDir) {
        if (!projectFileCache[projectDir]) {
            projectFileCache[projectDir] = new BrowserProject(projectDir);
        }

        return projectFileCache[projectDir];
    }

    static purgeCache (projectDir) {
        if (projectDir) {
            delete projectFileCache[projectDir];
        } else {
            projectFileCache = {};
        }
    }
}

module.exports = BrowserProject;
