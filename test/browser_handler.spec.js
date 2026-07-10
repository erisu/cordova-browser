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

const { describe, it, mock, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const tmp = require('tmp');
const { PluginInfo } = require('cordova-common');

const BrowserHandler = require('../lib/browser_handler');
const BrowserProject = require('../lib/BrowserProject');

tmp.setGracefulCleanup();

function makeTempDir () {
    const tempdir = tmp.dirSync({ unsafeCleanup: true });
    return path.join(tempdir.name, `cordova-browser-browser-handler-test-${Date.now()}`);
}

describe('Asset install tests', () => {
    let pluginInfo;
    let browserProject;

    before(() => {
        const testDir = makeTempDir();
        fs.cpSync(path.join(__dirname, 'fixtures', 'fakeBrowserPlatformProject'), testDir, { recursive: true });
        pluginInfo = new PluginInfo(path.join(__dirname, 'fixtures', 'fakePlugin'));
        browserProject = new BrowserProject(testDir);
    });

    it('if src is a file, should call cpSync with force', async () => {
        const cpSyncSpy = mock.method(fs, 'cpSync');
        const mkdirSyncSpy = mock.method(fs, 'mkdirSync');
        const assets = pluginInfo.getAssets('browser');
        const asset = assets.find(a => a.src.includes('ServiceWorker.txt'));

        const install = BrowserHandler.getInstaller('asset');
        await install(asset, pluginInfo, browserProject, {});

        assert.strictEqual(mkdirSyncSpy.mock.calls.length, 0);
        assert.ok(
            cpSyncSpy.mock.calls.some(({ arguments: args }) => (
                args[0].endsWith(path.join('fakePlugin', 'assets', 'ServiceWorker.txt')) &&
                args[1].endsWith(path.join('www', 'ServiceWorker.txt')) &&
                args[2]?.force === true
            ))
        );
    });

    it('if the target directory path does not exist, should call mkdirSync & cpSync', async () => {
        const cpSyncSpy = mock.method(fs, 'cpSync');
        const mkdirSyncSpy = mock.method(fs, 'mkdirSync');
        const assets = pluginInfo.getAssets('browser');
        const asset1 = assets.find(a => a.src.includes('reformat1.txt'));

        const install = BrowserHandler.getInstaller('asset');
        await install(asset1, pluginInfo, browserProject, {});

        assert.strictEqual(mkdirSyncSpy.mock.calls.length, 1);
        assert.ok(
            cpSyncSpy.mock.calls.some(({ arguments: args }) => (
                args[0].endsWith(path.join('fakePlugin', 'assets', 'reformat1.txt')) &&
                args[1].endsWith(path.join('www', 'js', 'deepdown', 'reformat1.txt')) &&
                args[2]?.force === true
            ))
        );

        // Test another upload
        const asset2 = assets.find(a => a.src.includes('reformat2.txt'));
        await install(asset2, pluginInfo, browserProject, {});

        // Should still be 1
        assert.strictEqual(mkdirSyncSpy.mock.calls.length, 1);
        assert.ok(
            cpSyncSpy.mock.calls.some(({ arguments: args }) => (
                args[0].endsWith(path.join('fakePlugin', 'assets', 'reformat2.txt')) &&
                args[1].endsWith(path.join('www', 'js', 'deepdown', 'reformat2.txt')) &&
                args[2]?.force === true
            ))
        );
    });

    it('if src is a directory, it should call cpSync with force and recursive', async () => {
        const cpSyncSpy = mock.method(fs, 'cpSync');
        const mkdirSyncSpy = mock.method(fs, 'mkdirSync');
        const assets = pluginInfo.getAssets('browser');
        const asset = assets.find(a => a.src.includes('folder'));

        const install = BrowserHandler.getInstaller('asset');
        await install(asset, pluginInfo, browserProject, {});

        assert.strictEqual(mkdirSyncSpy.mock.calls.length, 0);
        assert.ok(
            cpSyncSpy.mock.calls.some(({ arguments: args }) => (
                args[0].endsWith(path.join('fakePlugin', 'assets', 'folder')) &&
                args[1].endsWith(path.join('www', 'folder')) &&
                args[2]?.force === true &&
                args[2]?.recursive === true
            ))
        );
    });
});
