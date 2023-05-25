export type UID = string;

export type Account = [string, number];
export type ClientData = {
	[key in UID]: Account[]; // Object type where the key is a UserId and the value is an array of NameValuePair tuples
};
export type ClientList = ClientData[];

export type Path = { hash: string; isRight: boolean };

export type ClientPath = {
	[ClientUID: string]: Path[];
};
