# Worker standard

1. Workers are created by "worker.js", which for now statically import them using "worker-loader".
2. Workers are launched by the same script and are required to use "comlink" to expose a transferable object to said script. This object needs to meet these requirements:

```js
{
    init: async function (){...}, // A promise that "workers.js" will await for after the worker has exposed the transferable object
    shared: {...} // Memory that will be shared with window.internal for global access. The worker should store all relevant information about it's runtime here.

    // Adding any more values than this is allowed, but not recommended.
    // Exposing too much data to workers.js should also be avoided,
    // as this adds considerable overhead.
}
```

3. Workers should implement a messaging API for communicating with the main thread (of workers.js). Workers are required to follow this standard in messages sent to workers.js via the workers "comport":

```js
{ 
    type: "<command/task name>",
    content: {...} || "...", // Any data to be passed to the command/task.
    id: "<uuid>" // UUIDv4 that will be sent back to the worker in the execution confirmation message
}
```

Workers will be required to support these messages in their API:

- "callback", Execution confirmation message, which will include the command/task id

The workers.js script will implement these commands in it's API for workers to use:

- "callback", Worker command/task execution message, which will include the command/task id
- "error", Logs an error to the console as the main thread
- "log", Logs a message to the console as the main thread
- "confirm", Send a confirm dialog to the user
- "relay", This function will relay the message with this input `{ type: "relay", target: "<worker name>", content: "<data to be relayed>"}`. An ID will also be specified and to be sent back as "callback" with the same message type and structure (without the target specified)

# Filesystem standard
- Filesystem ID table:
    - 0: Local
    - 1.1: Google Drive
    - 1.2: One Drive Personal
    - 1.2.1: One Drive Corporate
    - 2: Private external

## Messaging API
The filesystem worker implements these base messaging API features:
<br>
Note: Location "true" is root!
<br>
- "init", creates a new filesystem instance. Returns ``{ instance: "<instance id>, index: <fs index> }``. Takes ``{ type: "<fs type>"}`` as input.
<br>
- "read", read data from a filesystem instance. Returns ``{ read: "<fs data>" }``. Takes ``{ instance: "<fs instance id>", id: "<fs entry id>"}`` as input.
<br>
- "write", write data to the database. Returns ```{ write: "<id of just written entry>" }. Takes ``{ instance: "<fs instance id>", id: "<fs entry id>", location: "<fs location>" }`` 

### Example usages
Start the filesystem:
```js
const instance = await window.internal.workers.api("Filesystem", "init", { fs_type: 0 })
```

Write to the filesystem:
<br>Note: "True" is the filesystem root

```js
const write_action = await window.internal.workers.api("Filesystem", "write", { id: "<file id, UUID v4>", write: {
    ?name: "<name>",
    ?data: "<data>",
    type: "<0/1>"
}, instance: "<instance ID, returned by instance creation>", location: "<id/true>" })
```

Read from the filesystem:
```js
const answer = await window.internal.workers.api("Filesystem", "write", { id: "<file id, UUID v4>", instance: "<instance ID, returned by instance creation>" })
```

Read the index:
```js
const index = await window.internal.workers.api("Filesystem", "index", { instance: "<instance ID, returned by instance creation>" })
```

## Storage format
Data is stored in 2 parts. In "the index" and in the "dump". The index contains the folder structure information of where files are located and the dump is a raw json tree with data fields with keys as uuids of folders/files referred by the index.

### Index
The index structure is minimal as making it as small as possible (while maintaining readability) for loading. The "t"-key is the type field, "0" means that it's a file, while "1" means it's a folder. The "i" field is the uuid referring to the raw data in the dump. Folders also contain the "d"-key, in which files and folders for that directory are stored

```js
[
    // Root - File
    { t: 0, i: "<uuid>" },
    // Root - Folder
    { t: 1, i: "<uuid>", d: [
        // Folders/files in this folder
    ]}
]
```

### Dump
Data in the dump will also be stored in a JSON tree. No type field for the entries is required, as it's stored in the index (as the app will only fetch the index and startup, and needs to know the type of the entries to show appropriate icons). Both files and folders contain the "name"-key, which is the entry name. They also share a "date"-key, which is the EPOCH time when the entry was last modified. The only difference between entry types is that files include the "data"-key where raw plaintext data of the document is stored.

```js
{   
    // Folder
    "<uuid>": {
        date: "<epoch time>",
        name: "<entry name>"
    },

    // File
    "<uuid>": {
        date: "<epoch time>",
        name: "<entry name>",
        data: "<raw document data>",
        checksum: "<sha1>"
    }
}
```

### Checksums and raw storage format
All forms of data storage are required to include checksums for both the index and the dump. For data validation and safety. The reason for this is to warn the user of possible tampering with their data and notify them that the data loaded may be corrupt and cause unexpected issues. The storage for these checksums will be type specific, but it's recommended to store the in the same place as the data itself.

# Upgrade standard
Upgrading of save versions to the latest version is handled by "upgrade.js". To create an upgrade handler, define a function with the current latest version name in "upgrade.js". Then modify the version field in window.internal

# Editor
### Answer save format
The answer data is to be an array, where each item is it's own line.
<br>
Math is to be embedded into the items as text along with normal text.
Math will begin with \<math\> and end with \</math\>. This "element" shall contain raw latex.