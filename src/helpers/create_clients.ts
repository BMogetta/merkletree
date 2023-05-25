import { Account, ClientData, ClientList, UID } from 'schemas';
export function generateClientList(length: number): ClientList {
	const clientList: ClientList = [];

	for (let i = 0; i < length; i++) {
		const clientId: UID = `Client ${(i + 1)}`; // User IDs start from '1'
		const numAccounts = Math.floor(Math.random() * 10) + 1; // Generate a random number between 1 and 10

		const accounts: Account[] = [];

		for (let j = 0; j < numAccounts; j++) {
			const accountId = `Token ${j + 1}`;
			const accountTokens = (Math.random() * (1e9 - 1e-9)) + 1e-9; // Generate a random number between 1e-9 and 1e9

			accounts.push([accountId, accountTokens]);
		}

		const clientData: ClientData = {
			[clientId]: accounts,
		};

		clientList.push(clientData);
	}

	return clientList;
}
