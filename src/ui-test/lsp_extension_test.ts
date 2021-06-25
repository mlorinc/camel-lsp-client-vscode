import * as path from 'path';
import * as pjson from '../../package.json';
import { assert } from 'chai';
import {
	By,
	EditorView,
	ExtensionsViewItem,
	until,
	VSBrowser,
	WebDriver
} from 'vscode-extension-tester';
import {
	Dialog,
	Marketplace,
	StatusBarExt
} from 'vscode-uitests-tooling';

describe('Language Support for Apache Camel extension', function () {

	const RESOURCES: string = path.resolve('src', 'ui-test', 'resources');
	const CAMEL_CONTEXT_XML: string = 'camel-context.xml';
	const LSP_STATUS_BAR_MESSAGE: string = 'Apache Camel Language Server started';

	describe('Extensions view', function () {
		this.timeout(30000);
		let marketplace: Marketplace;
		let item: ExtensionsViewItem;

		before(async function () {
			marketplace = await Marketplace.open(this.timeout());
		});

		after(async function () {
			await marketplace.close();
			await new EditorView().closeAllEditors();
		});

		it('Find extension', async function () {
			item = await marketplace.findExtension(`@installed ${pjson.displayName}`);
		});

		it('Extension is installed', async function () {
			const installed = await item.isInstalled();
			assert.isTrue(installed);
		});

		it('Verify display name', async function () {
			const title = await item.getTitle();
			assert.equal(title, `${pjson.displayName}`);
		});

		it('Verify description', async function () {
			const desc = await item.getDescription();
			assert.equal(desc, `${pjson.description}`);
		});

		it('Verify version', async function () {
			const version = await item.getVersion();
			assert.equal(version, `${pjson.version}`);
		});
	});

	describe.skip('Status bar', function () {

		let driver: WebDriver;

		before(async function () {
			this.timeout(20000);
			driver = VSBrowser.instance.driver;
			await Dialog.openFile(path.join(RESOURCES, CAMEL_CONTEXT_XML));
		});

		after(async function () {
			await Dialog.closeFile(false);
		});

		it('Language Support for Apache Camel started', async function () {
			this.timeout(45000);
			await driver.wait(until.elementLocated(By.id('redhat.vscode-apache-camel')), 35000);
			const lsp = await new StatusBarExt().getLSPSupport();
			assert.equal(LSP_STATUS_BAR_MESSAGE, lsp);
		});
	});

});
