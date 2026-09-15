export async function runCli(main) {
	try {
		await main();
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}
