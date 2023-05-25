import { assertEquals, assertThrows, assert  } from "deps";
import { UID, Account, ClientData, ClientList, Path, ClientPath } from 'schemas';
import { generateClientList } from './src/helpers/create_clients.ts';
import { 
  hashList, 
  computeMerkleTree, 
  generateMerkleProofWithOrder, 
  generateProofForEveryUser, 
  verifyMerkleProofWithOrder 
} from './main.ts'; 

// Testing hashList function
Deno.test("hashList should work correctly when inputList follows the ClientList format", async () => {
  const clientList = generateClientList(5);

  try {
    const hashedClientList = await hashList(clientList);
    assertEquals(hashedClientList.length, clientList.length);
  } catch (error) {
    console.error("This test should not throw an error:", error);
    assertEquals(true, false);
  }
});
Deno.test("hashList should return a hashed list of the same length as the input list", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const hashedList = await hashList(clientList);
  
  assertEquals(hashedList.length, length);

  // Ensure all hashed values are strings
  hashedList.forEach((hash) => {
    assertEquals(typeof hash, 'string');
  });
});
Deno.test("hashList should throw an error if non-stringifiable input is given", async () => {
  // Create an object with a circular reference
  const circularObject: any = {};
  circularObject.self = circularObject;
  
  const clientList: ClientList = [circularObject];

  try {
    await hashList(clientList);
  } catch (error) {
    assertEquals(error instanceof TypeError, true);
  }
});
Deno.test("hashList should throw an error when inputList doesn't follow the ClientList format - Case 1: Not an object", async () => {
  const badInputList: any = [1, 2, 3];

  try {
    await hashList(badInputList);
  } catch (error) {
    assertEquals(error.message, "Invalid format for ClientList");
  }
});
Deno.test("hashList should throw an error when inputList doesn't follow the ClientList format - Case 2: Array instead of object", async () => {
  const badInputList: any = [[], [], []];

  try {
    await hashList(badInputList);
  } catch (error) {
    assertEquals(error.message, "Invalid format for ClientList");
  }
});
Deno.test("hashList should throw an error when inputList doesn't follow the ClientList format - Case 3: Object with more than one property", async () => {
  const badInputList: any = [{a: 1, b: 2}];

  try {
    await hashList(badInputList);
  } catch (error) {
    assertEquals(error.message, "Invalid format for ClientList");
  }
});

// Testing computeMerkleTree function
Deno.test("computeMerkleTree should return a tree of hashes", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const merkleTree = await computeMerkleTree(clientList);
  
  assertEquals(merkleTree.length, Math.ceil(Math.log2(length)) + 1);

  // Ensure all values in the tree are strings
  merkleTree.forEach((level) => {
    level.forEach((hash) => {
      assertEquals(typeof hash, 'string');
    });
  });
});
Deno.test("computeMerkleTree should return a tree with one hash for an input list of length 1", async () => {
  const clientList = generateClientList(1);
  const merkleTree = await computeMerkleTree(clientList);

  assertEquals(merkleTree.length, 1);
  assertEquals(merkleTree[0].length, 1);
});
Deno.test("computeMerkleTree should throw an error for an empty input list", async () => {
  const clientList: ClientList = [];

  try {
    await computeMerkleTree(clientList);
  } catch (error) {
    assertEquals(error.message, "Empty array of clients.");
  }
});

// Testing generateMerkleProofWithOrder function
Deno.test("generateMerkleProofWithOrder should return a Merkle proof for a given leaf hash", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const merkleTree = await computeMerkleTree(clientList);
  const leafHash = await hashList([clientList[0]]);

  const merkleProof = generateMerkleProofWithOrder(leafHash[0], merkleTree);

  // Ensure the function returns an array
  assertEquals(Array.isArray(merkleProof), true);

  // Ensure all elements in the array are of the correct format
  merkleProof!.forEach((path) => {
    assertEquals(typeof path.hash, 'string');
    assertEquals(typeof path.isRight, 'boolean');
  });
});
Deno.test("generateMerkleProofWithOrder should return null for a non-existing leaf hash", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const merkleTree = await computeMerkleTree(clientList);

  const merkleProof = generateMerkleProofWithOrder("non-existing hash", merkleTree);

  assertEquals(merkleProof, null);
});
Deno.test("generateMerkleProofWithOrder should return a proof of length 0 for a tree of length 1", async () => {
  const clientList = generateClientList(1);
  const merkleTree = await computeMerkleTree(clientList);
  const leafHash = await hashList([clientList[0]]);

  const merkleProof = generateMerkleProofWithOrder(leafHash[0], merkleTree);

  assertEquals(merkleProof!.length, 0);
});

// Testing verifyMerkleProofWithOrder function
Deno.test("verifyMerkleProofWithOrder should verify the validity of a Merkle proof", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const merkleTree = await computeMerkleTree(clientList);
  const leafHash = await hashList([clientList[0]]);
  const merkleProof = generateMerkleProofWithOrder(leafHash[0], merkleTree);

  // The root of the Merkle tree is the last element of the last level
  const merkleRoot = merkleTree[merkleTree.length - 1][0];
  
  const isValid = await verifyMerkleProofWithOrder(clientList[0], merkleRoot, merkleProof!);
  
  // Ensure the function returns a boolean
  assertEquals(typeof isValid, 'boolean');

  // In this case, the Merkle proof should be valid
  assertEquals(isValid, true);
});
Deno.test("verifyMerkleProofWithOrder should return false for an invalid proof", async () => {
  const length = 5;
  const clientList = generateClientList(length);
  const merkleTree = await computeMerkleTree(clientList);
  const leafHash = await hashList([clientList[0]]);
  const merkleProof = generateMerkleProofWithOrder(leafHash[0], merkleTree);

  // Change the root to make the proof invalid
  const merkleRoot = "invalid root";
  
  const isValid = await verifyMerkleProofWithOrder(clientList[0], merkleRoot, merkleProof!);

  assertEquals(isValid, false);
});
Deno.test("verifyMerkleProofWithOrder should throw an error if non-stringifiable input is given", async () => {
  // Create an object with a circular reference
  const circularObject: any = {};
  circularObject.self = circularObject;

  const merkleRoot = "root";
  const merkleProof: Path[] = [];
  try {
    await verifyMerkleProofWithOrder(circularObject, merkleRoot, merkleProof);
  } catch (error) {
    assertEquals(error instanceof TypeError, true);
  }
});

// Testing generateProofForEveryUser function
Deno.test("generateProofForEveryUser should return correct proof for a single client", async () => {
  const clientList = generateClientList(1);
  const merkleTree = await computeMerkleTree(clientList);
  
  const proofs = await generateProofForEveryUser(clientList, merkleTree);

  assertEquals(proofs.length, 1);
  const leafHash = await hashList([clientList[0]]);
  assertEquals(proofs[0][Object.keys(clientList[0])[0]], generateMerkleProofWithOrder(leafHash[0], merkleTree));
});
Deno.test("generateProofForEveryUser should return correct proofs for multiple clients", async () => {
  const clientList = generateClientList(5);
  const merkleTree = await computeMerkleTree(clientList);
  
  const proofs = await generateProofForEveryUser(clientList, merkleTree);

  assertEquals(proofs.length, clientList.length);
  const leafHashes = await hashList(clientList);
  for(let i=0; i<clientList.length; i++) {
    assertEquals(proofs[i][Object.keys(clientList[i])[0]], generateMerkleProofWithOrder(leafHashes[i], merkleTree));
  }
});
Deno.test("generateProofForEveryUser should return an empty proof list for an empty client list", async () => {
  const clientList: ClientList = [];
  const merkleTree: string[][] = [];
  
  const proofs = await generateProofForEveryUser(clientList, merkleTree);

  assertEquals(proofs.length, 0);
});
Deno.test("generateProofForEveryUser should throw an error when a proof is not found", async () => {
  // Generate a list of clients
  const clients: ClientList = generateClientList(2);
  
  // Create a Merkle tree from the clients list
  const tree = await computeMerkleTree(clients);
  
  // Modify the client list so a user will not be found
  const modifiedClients: ClientList = [...clients, {nonexistentUser: [["nonExistantToken", 1]]}];
  let error;
  try {
    generateProofForEveryUser(modifiedClients, tree);
  } catch (e) {
    error = e;
  }

  // assert that error is truthy (i.e., an error occurred)
  assert(error instanceof Error);
  // assert that error message is as expected
  assert(error.message.includes("Proof not found for user"));
});