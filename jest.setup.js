/**
 * This file configures global polyfills required for Jest
 * to execute backend unit tests properly in a Node environment.
 *
 * This setup resolves: "ReferenceError: TextEncoder is not defined"
 *
 * This error occurred as some dependencies (whatwg-url, mongoose) 
 * expect Web APIs like TextEncoder, which are not available in Jest's runtime 
 * by default.
 *
 * ---
 * AI Usage Declaration
 *
 * Tool Used: ChatGPT
 *
 * Prompt: Help me configure a Jest setup file to fix TextEncoder is
 * not defined error and include comments declaring AI usage.
 *
 * How the AI Output Was Used:
 * - Generated initial polyfill implementation
 * - Reviewed and adapted for project compatibility
 *
 * The final file was reviewed and integrated manually.
 */

import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
