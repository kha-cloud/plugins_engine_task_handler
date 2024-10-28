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

## Usage

```js
const PETH = require("kha_plugins_engine_task_handler");

// Get current Task data
PETH.getTaskData();

// Set Task Result
PETH.setTaskResult(TaskResult)
```