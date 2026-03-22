import { spawn } from "node:child_process";

const child = spawn("npm run server", {
	stdio: "inherit",
	shell: true,
	env: {
		...process.env,
		NODE_ENV: "test",
	},
});

child.on("exit", (code) => {
	process.exit(code ?? 0);
});
