import { spawn } from "node:child_process";

const child = spawn("npm start --prefix ./client", {
	stdio: "inherit",
	shell: true,
	env: {
		...process.env,
		REACT_APP_E2E_TEST: "true",
	},
});

child.on("exit", (code) => {
	process.exit(code ?? 0);
});
