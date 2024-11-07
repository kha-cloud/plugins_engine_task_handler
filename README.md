# plugins_engine_task_handler

## Installation

### 1- Enable NodeJS Global Path

- Edit the `.bashrc` file
```bash
nano ~/.bashrc
```

- Add the following line to the `.bashrc` file
```bash
export NODE_PATH=$(npm root -g)
```

### 2- Clone this repository

- Go to the home folder
```bash
cd ~
```

- Clone the repository
```bash
git clone https://github.com/kha-cloud/plugins_engine_task_handler
```

### 3- Setup & Global Install

- Go to the `plugins_engine_task_handler` folder
```bash
cd plugins_engine_task_handler
```

- Install dependencies
```bash
npm install
```

- Global install
```bash
npm install -g ./
```

### 4- Work area

- Create the work folders
```bash
mkdir -p /var/plugins_engine_tasks
mkdir -p /var/plugins_engine_tasks/archive
mkdir -p /var/plugins_engine_tasks/work_dir
```

- Create the History file
```bash
touch /var/plugins_engine_tasks/tasks_history.list
```

## Usage

### 1- PETH Methods

```js
const PETH = require("kha_plugins_engine_task_handler");

// Get current Task data
PETH.getTaskData();

// Set Task Result
PETH.setTaskResult(TaskResult)
```

### 2- Utils Methods

```js
const PETH = require("kha_plugins_engine_task_handler");

// $dataCaller | Get API data
var data = await PETH.utils.$dataCaller("get", "@PA/get-data");

// loadJsonFile | Load JSON file
var defaultData = {};
var data = await PETH.utils.loadJsonFile("./test.json", defaultData);

// writeJsonFile | Write JSON file
var data = {
  "key": "value"
};
PETH.utils.writeJsonFile("./test.json", data);

// getCache | Get cache value (From the server)
var testCache = await PETH.utils.getCache("test-key");

// setCache | Set cache value (To the server)
var value = "test-value";
PETH.utils.setCache("test-key", 
  value,
  { group: "test-group", } // Optional
);

// downloadFileToPath | Download file to a local path
PETH.utils.downloadFileToPath("https://example.com/image.png", "./test.png");

// extractTarFile | Extract a tar file
PETH.utils.extractTarFile("/path/to/file.tar", "./test-folder"); // Folder "test-folder" should be created before extraction
```