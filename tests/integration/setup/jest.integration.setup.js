import dotenv from "dotenv";
import { TextEncoder, TextDecoder } from "util";

dotenv.config({ path: ".env.test" });

// env flag to silence jsdom warning noise in Jest
process.env.SUPPRESS_JEST_WARNINGS = "1";

if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
	global.TextDecoder = TextDecoder;
}

// Polyfill localStorage for Node environment (jsdom provides it natively)
if (!global.localStorage) {
	global.localStorage = {
		getItem: (_key) => null,
		setItem: () => {},
		removeItem: () => {},
		clear: () => {},
	};
}
