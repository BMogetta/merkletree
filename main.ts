import { crypto, DigestAlgorithm, toHashString } from 'deps';
import type { ClientData, ClientList, ClientPath, Path } from 'schemas';
import { generateClientList } from './src/helpers/create_clients.ts';

// creates the hashed leaf nodes
export async function hashList(
	inputList: ClientList,
	algorithm: DigestAlgorithm = 'SHA-256',
): Promise<string[]> {
	// Runtime check for ClientList format
	inputList.forEach((client) => {
		if (
			typeof client !== 'object' || Array.isArray(client) ||
			Object.keys(client).length !== 1
		) {
			throw new Error('Invalid format for ClientList');
		}
	});

	const hashedList: string[] = [];
	for await (const item of inputList) {
		const hash = await crypto.subtle.digest(
			algorithm,
			new TextEncoder().encode(JSON.stringify(item)),
		);
		hashedList.push(toHashString(hash));
	}

	return hashedList;
}

// Create a full binary tree
export async function computeMerkleTree(
	inputList: ClientList,
	algorithm: DigestAlgorithm = 'SHA-256',
): Promise<string[][]> {
	if (inputList.length === 0) {
		throw new Error('Empty array of clients.');
	}

	let hashes = await hashList(inputList);
	if (hashes.length === 0) {
		throw new Error('Empty array of hashes.');
	}

	const fullTree: string[][] = [];
	fullTree.push(hashes);

	while (hashes.length > 1) {
		const nextLevel: string[] = [];

		for (let i = 0; i < hashes.length; i += 2) {
			const leftHash = hashes[i];
			const rightHash = (i + 1 < hashes.length) ? hashes[i + 1] : leftHash;
			const hash = await crypto.subtle.digest(
				algorithm,
				new TextEncoder().encode(leftHash + rightHash),
			);
			nextLevel.push(toHashString(hash));
		}
		// Ensure that every node has 2 children
		if (nextLevel.length % 2 !== 0 && hashes.length > 2) {
			const lastElement = nextLevel[nextLevel.length - 1];
			nextLevel.push(lastElement);
		}
		hashes = nextLevel;
		fullTree.push(hashes);
	}
	return fullTree;
}

// DEPRECATED, now it gives the path for every node
// Given the full tree and a leaf hash it will return the merkle path the verify the proof
export function generateMerkleProofWithOrder(
	leafHash: string,
	merkleTree: string[][],
): Path[] | null {
	const leafIndex = merkleTree[0].indexOf(leafHash);
	if (leafIndex === -1) {
		return null;
	}

	const proof: Path[] = [];
	let index = leafIndex;

	for (let i = 0; i < merkleTree.length - 1; i++) {
		const isIndexEven = index % 2 === 0;
		const siblingIndex = isIndexEven ? index + 1 : index - 1;

		if (siblingIndex >= 0 && siblingIndex < merkleTree[i].length) {
			proof.push({
				hash: merkleTree[i][siblingIndex],
				isRight: isIndexEven, // If the index is even, then the sibling node is on the right side
			});
		}

		index = Math.floor(index / 2);
	}

	return proof;
}

// Create proof path for every User
export function generateProofForEveryUser(
	inputList: ClientList,
	merkleTree: string[][],
): ClientPath[] {
	const path: ClientPath[] = [];
	let i = 0;
	for (const client of inputList) {
		const clientID = Object.keys(client);
		const proof = generateMerkleProofWithOrder(merkleTree[0][i], merkleTree);
		if (proof === null) {
			throw new Error(`Proof not found for user ${clientID[0]}`);
		}
		path.push({
			[clientID[0]]: proof,
		});
		i++;
	}
	return path;
}

// Verify that a given user was include in the tree
export async function verifyMerkleProofWithOrder(
	leafRawData: ClientData,
	merkleRoot: string,
	proof: Array<{ hash: string; isRight: boolean }>,
	algorithm: DigestAlgorithm = 'SHA-256',
): Promise<boolean> {
	// Compute the hash of the leaf data
	const leafHash = await crypto.subtle.digest(
		algorithm,
		new TextEncoder().encode(JSON.stringify(leafRawData)),
	);

	let computedHash = toHashString(leafHash);

	// Iterate over the proof hashes, hashing them together with the computed hash in the correct order
	for await (const proofHash of proof) {
		let stringToHash;
		proofHash.isRight
			? stringToHash = computedHash + proofHash.hash
			: stringToHash = proofHash.hash + computedHash;
		const combinedHash = await crypto.subtle.digest(
			algorithm,
			new TextEncoder().encode(stringToHash),
		);
		computedHash = toHashString(combinedHash);
	}

	// The computed hash should now be equal to the Merkle Root if the proof is valid
	return computedHash === merkleRoot;
}

export default async function main(
	number_of_test_users = 10000,
	verbose = true,
) {
	const randomUserList = generateClientList(number_of_test_users);
	const randomUser = Math.floor(Math.random() * number_of_test_users);
	const randomUserID = Object.keys(randomUserList[randomUser])[0];
	const tree = await computeMerkleTree(randomUserList);
	const depth = tree.length;
	const root = tree[tree.length - 1][0];
	const allPaths = generateProofForEveryUser(randomUserList, tree);
	const randomUserPathProof = allPaths.find((users) => randomUserID in users);
	if (randomUserPathProof) {
		const verifyWithOrder = await verifyMerkleProofWithOrder(
			randomUserList[randomUser],
			root,
			randomUserPathProof[randomUserID],
		);
		if (verbose) {
			//TODO: fix over-undeflow consider using decimals.js or similar
			console.log(
				'\n\x1b[37m\x1b[1m\x1b[4m' +
						`Random generated amount of users (${number_of_test_users}), tokens (1-10) and balances (1e-17 - 1e9)` +
						'\x1b[0m',
		);
			console.log(
				'\n\x1b[1m\x1b[4m' + 'Generated Merkle tree:' + '\x1b[0m',
			);
			console.log(
				'\x1b[0m' + '\n\tdepth' + '\x1b[36m',
				depth + '\x1b[0m\n',
				'\x1b[0m' + '\troot' + '\x1b[36m',
				root + '\x1b[0m\n',
			);

			console.log(
				'\x1b[1m\x1b[4m' + 'Random user account:' + '\x1b[0m' + '\x1b[32m',
				randomUserID,
				'\x1b[0m',
			);

			const coloredArray = randomUserList[randomUser][randomUserID].map(
				(item) => {
					return '\x1b[36m' + item[0] + '\x1b[0m: \x1b[95m' + item[1] +
						'\x1b[0m';
				},
			);
			console.log('\n\t' + coloredArray.join('\n\t'));
			console.log(
				'\n\x1b[1m\x1b[4m' + 'Generating proof for every user:' + '\x1b[0m',
			);

			console.log(
				'\n\t' +
					(allPaths.length === number_of_test_users
						? '\x1b[32m' + 'Success' + '\x1b[0m'
						: '\x1b[31m' + 'Fail' + '\x1b[0m'),
			);

			console.log(
				'\n\x1b[1m\x1b[4m' + 'Proof path for the user:' + '\x1b[0m' + ' '+
					'\x1b[32m' + randomUserID + '\x1b[0m'
			);
			// Get the maximum length of the hash
			const maxHashLength = Math.max(
				...randomUserPathProof[randomUserID].map((item) => item.hash.length),
			);

			// Prepare the header
			const header = '\n\t\x1b[37m\x1b[4m' + 'hash'.padEnd(maxHashLength) +
				'\tisRight\x1b[0m\n';

			console.log(header); // Print the header

			randomUserPathProof[randomUserID].forEach((item) => {
				console.log(
					'\t\x1b[36m' + item.hash.padEnd(maxHashLength) + '\x1b[0m\t\x1b[95m' +
						item.isRight + '\x1b[0m',
				);
			});

			console.log(
				'\n\x1b[1m\x1b[4m' + 'Was the user included in the tree:' + '\x1b[0m',
			);

			console.log(
				'\n\t' +
					(verifyWithOrder
						? '\x1b[32m' + verifyWithOrder + '\x1b[0m'
						: '\x1b[31m' + verifyWithOrder + '\x1b[0m'),
			);
		}
	}
}
// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
	// TODO: create flags to modify users, tokens, balances
	if (Number(Deno.args[0])) {
		main(Number(Deno.args[0]));
	} else {
		main();
	}
}
