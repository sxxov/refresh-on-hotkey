import * as puppeteer from 'puppeteer-core';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import { Store } from '@sxxov/ut/store';
import chalk from 'chalk';
import { difference } from 'set-operations';
import { diffLines } from 'diff';
import * as cheerio from 'cheerio';
/** @import {Change} from 'diff' */

const browser = await puppeteer.launch({
	channel: 'chrome',
	defaultViewport: null,
	userDataDir: './.chrome',
	headless: false,
	args: ['--start-maximized', '--hide-crash-restore-bubble'],
	ignoreDefaultArgs: ['--enable-automation'],
});

const page = (await browser.pages())[0] ?? (await browser.newPage());
const content = new Store('');
page.setDefaultNavigationTimeout(0);

// collect the current page source
void (async () => {
	for (;;) {
		try {
			const resp = await page.waitForNavigation();
			if (!resp) {
				continue;
			}
			content.set(await resp.text());
		} catch {
			console.log('Lost connection to page, exiting.');
			process.exit(0);
		}
	}
})();

// setup scheduled reload
const scheduledReload = new Store(false);
scheduledReload.subscribe(async (reload) => {
	if (!reload) {
		return;
	}

	for (let i = 0; i < 3; i++) {
		const prevContent = content.get();

		const url = page.url();
		if (!url.startsWith('http')) {
			break;
		}

		/** @type {string | undefined} */
		let currContent;
		try {
			currContent = await page.evaluate(async () => {
				try {
					const resp = await fetch(location.href, {
						credentials: 'same-origin',
					});
					const text = await resp.text();
					return text;
				} catch (err) {
					console.error(err);
					return undefined;
				}
			});
		} catch {}
		if (!currContent) {
			continue;
		}

		const prev$ = cheerio.load(prevContent);
		const curr$ = cheerio.load(currContent);

		if (prevContent !== currContent) {
			const [prevBody, currBody] = /** @type {[string, string]} */ (
				/** @type {const} */ ([prev$, curr$]).map(($) => $.html('body'))
			);
			if (prevBody !== currBody) {
				console.log(chalk.bold('<body>'));
				const diff = diffLines(prevBody, currBody);
				for (let i = 0; i < diff.length; i++) {
					const {
						added,
						removed,
						value: raw,
					} = /** @type {Change} */ (diff[i]);
					const value = raw.replace(/^\n/, '').trimEnd();

					if (!value.trim()) {
						continue;
					}

					if (added) {
						console.log(chalk.green(value));
					} else if (removed) {
						console.log(chalk.red(value));
					} else {
						const lines = value.split('\n');
						if (lines.length <= 1) {
							console.log(chalk.grey(value));
						} else {
							console.log(
								chalk.grey(
									`${
										i === 0 ?
											`...\n${lines[lines.length - 1]}`
										: i === diff.length - 1 ?
											`${lines[0]}\n...`
										: lines.length > 2 ?
											`${lines[0]}\n...\n${lines[lines.length - 1]}`
										:	lines.join('\n')
									}`,
								),
							);
						}
					}
				}
				await page.reload();
				break;
			}

			const [prevHeadUrls, currHeadUrls] =
				/** @type {[string[], string[]]} */ (
					/** @type {const} */ ([prev$, curr$]).map(($) => [
						...new Set(
							[...$('head *:not([transient])')]
								.map(
									(el) =>
										el.attribs['src'] ||
										el.attribs['href'] ||
										undefined,
								)
								.filter((v) => v !== undefined),
						),
					])
				);
			const removedHeadUrls = /** @type {string[]} */ (
				difference(prevHeadUrls, currHeadUrls)
			);
			const addedHeadUrls = /** @type {string[]} */ (
				difference(currHeadUrls, prevHeadUrls)
			);
			if (removedHeadUrls.length > 0 || addedHeadUrls.length > 0) {
				console.log(chalk.bold('<head>'));
				for (const url of removedHeadUrls) {
					console.log(chalk.red(url));
				}
				for (const url of addedHeadUrls) {
					console.log(chalk.green(url));
				}
				await page.reload();
				break;
			}
		}

		await new Promise((resolve) => {
			// staggered backoff
			setTimeout(resolve, 1000 * i);
		});
	}

	scheduledReload.set(false);
});

// setup global keybind
const gkl = new GlobalKeyboardListener();
await gkl.addListener((e, down) => {
	if (
		e.state === 'DOWN' &&
		(process.platform === 'darwin' ?
			down['LEFT META'] || down['RIGHT META']
		:	down['LEFT CTRL'] || down['RIGHT CTRL']) &&
		down.S
	) {
		if (!scheduledReload.get()) {
			scheduledReload.set(true);
		}
	}
});
