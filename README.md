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

```js
const PETH = require("kha_plugins_engine_task_handler");

// Get current Task data
PETH.getTaskData();

// Set Task Result
PETH.setTaskResult(TaskResult)
```