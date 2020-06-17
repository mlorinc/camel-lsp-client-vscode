import { EditorView, TextEditor, ContentAssist, BottomBarPanel, MarkerType, ContentAssistItem } from 'vscode-extension-tester';
import { Dialog, WaitUntil, DefaultWait } from 'vscode-uitests-tooling';
import * as path from 'path';
import { assert } from 'chai';

describe('XML DSL support', function () {

	const RESOURCES: string = path.resolve('src', 'ui-test', 'resources');
	const CAMEL_CONTEXT_XML: string = 'camel-context.xml';
	const CAMEL_ROUTE_XML: string = 'camel-route.xml';
	const URI_POSITION: number = 33;

	let contentAssist: ContentAssist;

	const _setup = function (camel_xml: string) {
		return async function () {
			this.timeout(20000);
			await Dialog.openFile(path.join(RESOURCES, camel_xml));
		}
	};

	const _clean = async function () {
		await Dialog.closeFile(false);
	};

	describe('Camel URI code completion', function () {

		before(_setup(CAMEL_CONTEXT_XML));
		after(_clean);

		it('Open "camel-context.xml" file inside Editor View', async function () {
			this.timeout(20000);
			const editor = await new EditorView().openEditor(CAMEL_CONTEXT_XML);
			const editorName = await editor.getTitle();
			assert.equal(editorName, CAMEL_CONTEXT_XML);
		});

		it('Code completion is working for component schemes (the part before the ":")', async function () {
			this.timeout(20000);
			const editor = new TextEditor(new EditorView(), CAMEL_CONTEXT_XML);

			await editor.typeText(3, URI_POSITION, 'timer');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const timer = await contentAssist.getItem('timer');
			assert.equal(await getTextExt(timer), 'timer:timerName');
			await timer.click();

			assert.equal('<from id="_fromID" uri="timer:timerName"/>', (await editor.getTextAtLine(3)).trim());
		});

		it('Code completion is working for endpoint options (the part after the "?")', async function () {
			this.timeout(20000);
			const editor = new TextEditor(new EditorView(), CAMEL_CONTEXT_XML);

			await editor.typeText(3, URI_POSITION + 15, '?');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const delay = await contentAssist.getItem('delay');
			assert.equal(await getTextExt(delay), 'delay');
			await delay.click();

			assert.equal('<from id="_fromID" uri="timer:timerName?delay=1000"/>', (await editor.getTextAtLine(3)).trim());
		});

		it('Code completion is working for additional endpoint options (the part after "&")', async function () {
			this.timeout(45000);
			const editor = new TextEditor(new EditorView(), CAMEL_CONTEXT_XML);

			await editor.typeText(3, URI_POSITION + 26, '&amp;exchange');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const exchange = await contentAssist.getItem('exchange');
			assert.equal(await getTextExt(exchange), 'exchangePattern');
			await exchange.click();

			assert.equal('<from id="_fromID" uri="timer:timerName?delay=1000&amp;exchangePattern="/>', (await editor.getTextAtLine(3)).trim());

			await editor.typeText(3, URI_POSITION + 47, 'In');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const inOnly = await contentAssist.getItem('In');
			assert.equal(await getTextExt(inOnly), 'InOnly');
			await inOnly.click();

			assert.equal('<from id="_fromID" uri="timer:timerName?delay=1000&amp;exchangePattern=InOnly"/>', (await editor.getTextAtLine(3)).trim());
		});
	});

	describe('Endpoint options filtering', function () {

		before(_setup(CAMEL_CONTEXT_XML));
		after(_clean);

		it('Duplicate endpoint options are filtered out', async function () {
			this.timeout(30000);
			const editor = new TextEditor(new EditorView(), CAMEL_CONTEXT_XML);

			await editor.typeText(3, URI_POSITION, 'timer');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const timer = await contentAssist.getItem('timer');
			await timer.click();

			await editor.typeText(3, URI_POSITION + 15, '?');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const delay = await contentAssist.getItem('delay');
			await delay.click();

			await editor.typeText(3, URI_POSITION + 26, '&amp;de');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const filtered = await contentAssist.hasItem('delay');

			assert.isFalse(filtered);
			await editor.toggleContentAssist(false);
		});
	});

	describe('Diagnostics for Camel URIs', function () {

		const EXPECTED_ERROR_MESSAGE: string = 'Invalid integer value: 1000r';

		before(_setup(CAMEL_CONTEXT_XML));
		after(_clean);

		it('LSP diagnostics support for XML DSL', async function () {
			this.timeout(30000);
			const editor = new TextEditor(new EditorView(), CAMEL_CONTEXT_XML);

			await editor.typeText(3, URI_POSITION, 'timer');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const timer = await contentAssist.getItem('timer');
			await timer.click();

			await editor.typeText(3, URI_POSITION + 15, '?');
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			const delay = await contentAssist.getItem('delay');
			await delay.click();

			await editor.typeText(3, URI_POSITION + 26, 'r');
			const problemsView = await new BottomBarPanel().openProblemsView();
			const markers = await problemsView.getAllMarkers(MarkerType.Error);
			assert.isNotEmpty(markers, 'Problems view does not contains expected error');

			const marker = markers[0];
			const errorMessage = await marker.getText();
			assert.include(errorMessage, EXPECTED_ERROR_MESSAGE);
			await new BottomBarPanel().toggle(false); // close Problems View
		});
	});

	describe('Auto-completion for referenced components IDs', function () {

		const DIRECT_COMPONENT_NAME: string = 'direct:testName';
		const DIRECT_VM_COMPONENT_NAME: string = 'direct-vm:testName2';

		before(_setup(CAMEL_ROUTE_XML));
		after(_clean);

		it('Auto-completion for referenced ID of "direct" component', async function () {
			this.timeout(20000);
			const editor = new TextEditor(new EditorView(), CAMEL_ROUTE_XML);

			await editor.typeText(6, 29, DIRECT_COMPONENT_NAME);
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			assert.isTrue(await contentAssist.hasItem(DIRECT_COMPONENT_NAME));

			const direct = await contentAssist.getItem(DIRECT_COMPONENT_NAME);
			await direct.click();

			assert.equal('<to id="_toID" uri="direct:testName"/>', (await editor.getTextAtLine(6)).trim());
		});

		it('Auto-completion for referenced ID of "direct-vm" component', async function () {
			this.timeout(20000);
			const editor = new TextEditor(new EditorView(), CAMEL_ROUTE_XML);

			await editor.typeText(13, 30, DIRECT_VM_COMPONENT_NAME);
			contentAssist = await editor.toggleContentAssist(true) as ContentAssist;
			await new WaitUntil().assistHasItems(contentAssist, DefaultWait.TimePeriod.MEDIUM);
			assert.isTrue(await contentAssist.hasItem(DIRECT_VM_COMPONENT_NAME))

			const directVM = await contentAssist.getItem(DIRECT_VM_COMPONENT_NAME);
			await directVM.click();

			assert.equal('<to id="_toID2" uri="direct-vm:testName2"/>', (await editor.getTextAtLine(13)).trim());
		});
	});

	/**
	 * Workaround for issue with ContentAssistItem getText() method
	 * For more details please see https://github.com/djelinek/vscode-uitests-tooling/issues/17
	 *
	 * @param item ContenAssistItem
	 */
	async function getTextExt(item: ContentAssistItem): Promise<String> {
		let name: string = '';
		name = await item.getText();
		return name.split('\n')[0];
	}
});
