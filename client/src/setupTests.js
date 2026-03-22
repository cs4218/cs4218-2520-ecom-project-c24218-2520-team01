// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from "util";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const originalConsoleError = console.error;
console.error = (...args) => {
	const firstArg = String(args[0] ?? "");
	if (firstArg.includes("ReactDOMTestUtils.act")) {
		return;
	}
	originalConsoleError(...args);
};

if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
	global.TextDecoder = TextDecoder;
}
