const fs = require("fs");
const utils = require("./utils");
const { exec, spawn } = require('child_process');
const kill = require('tree-kill');

const archiveFolder = "/var/plugins_engine_tasks/archive";
const tasksWorkDir = "/var/plugins_engine_tasks/work_dir";
const tasksDevLogFile = "/var/plugins_engine_tasks/dev.log";

const execute_PETH_runTask = async (workPath, pidCallback, isProduction = true) => {
  return new Promise((resolve, reject) => {
    const command = /*js*/`
      (async () => {
        const node_path = require('child_process').execSync('npm root -g').toString().trim();
        const PETH = require(node_path+'/kha_plugins_engine_task_handler');
        await PETH.init({
          isProduction: ${isProduction}
        });
        require('${workPath}/run.js');
      })();
    `;
    
    const shellCommand = `node -e "${command}"`;
    // const subprocess = spawn('node', ['-e', command], {
    const child = spawn('sh', ['-c', shellCommand], {
      cwd: workPath,
    });
    const pid = child.pid;
    pidCallback(pid);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('close', (code) => {
      if (code !== 0 || (stderr && !stdout)) {
        reject({
          pid,
          error: `Process exited with code ${code}`,
          stderr
        });
      } else {
        resolve({
          pid,
          success: true,
          stdout,
          pid: child.pid  // Provide the process ID
        });
      }
    });

    // Handle errors with the child process
    child.on('error', (err) => {
      reject({
        error: 'Failed to start child process',
        detail: err.message
      });
    });

    // exec(`node -e "${command}"`, (error, stdout, stderr) => {
    //   // resolve({
    //   //   stdout,
    //   //   stderr
    //   // });
    //   if (error || (stderr && !stdout)) {
    //     reject({
    //       error: `exec error`,
    //       // stdout,
    //       stderr
    //     });
    //     return;
    //   }
    //   resolve({
    //     success: true,
    //     // stdout,
    //   });
    //   // var regex = /#%PETH__TASK_SINGLE_RUN_RESULT_START__PETH%#([\s\S]*?)#%PETH__TASK_SINGLE_RUN_RESULT_END__PETH%#/;
    //   // var match = stdout.match(regex);
      
    //   // try {
    //   //   if (match && match[1]) {
    //   //     const result = JSON.parse(match[1]);
    //   //     resolve(result);
    //   //   } else {
    //   //     resolve();
    //   //   }
    //   // } catch (parseError) {
    //   //   console.log(stdout); 
    //   //   reject(`Error parsing JSON output: ${parseError.message}`);
    //   // }
    // });
  });
}

const devLog = (message) => {
  if(!fs.existsSync(tasksDevLogFile)) {
    fs.writeFileSync(tasksDevLogFile, "");
  }
  fs.appendFileSync(tasksDevLogFile, `${message}\n`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTask = async (taskMetaData, isProduction = true, testModeData = {}) => {
  // return {
  //   test: "test"
  // };
  try {
    /* taskMetaData : {
      runAndWait, // Boolean
      taskKey,
      appId,
      runId,
      taskCodeUpdateCacheKey,
      taskVersion.
      // taskChunksUrls: [
      //   {
      //     url,
      //   }
      // ],
      apiData: {
        route, // EXP: "cyberocean.net"
        token,
        pluginKey,
      },
      taskConfig,
    }*/

    const appPluginArchiveFolder = taskMetaData.apiData.appId + "/" + taskMetaData.apiData.pluginKey;
  
    await utils.init(taskMetaData);

    const logs = [];
  
    // Check the cache if the task's code got an update
    const taskArchiveFolder = `${archiveFolder}/${appPluginArchiveFolder}/${taskMetaData.taskKey}`;
    if(isProduction && !fs.existsSync(taskArchiveFolder)) {
      fs.mkdirSync(taskArchiveFolder, { recursive: true });
    }
    const taskCacheFilePath = `${taskArchiveFolder}/_cache.json`;
    var taskCacheData = null;
    if(isProduction) {
      taskCacheData = await utils.loadJsonFile(taskCacheFilePath, {
        production: isProduction,
        taskCodeUpdateCacheKey: null,
        tarFiles: [],
        config: {}
      });
    } else {
      taskCacheData = {
        production: isProduction,
        taskCodeUpdateCacheKey: null,
        tarFiles: [],
        config: taskMetaData.config,
      };
    }
    // logs.push({
    //   message: "taskCacheData",
    //   data: taskCacheData,
    //   taskCodeUpdateCacheKey: taskMetaData.taskCodeUpdateCacheKey
    // });
    // devLog(`TIME: ${new Date()}`);
    // devLog(`isProduction = ${isProduction}`);
    // devLog(`taskMetaData.taskCodeUpdateCacheKey = ${taskMetaData.taskCodeUpdateCacheKey}`);
    // devLog(`taskCacheData.taskCodeUpdateCacheKey = ${taskCacheData.taskCodeUpdateCacheKey}`);
    // devLog(`Check RES = ${(isProduction && (taskMetaData.taskCodeUpdateCacheKey !== taskCacheData.taskCodeUpdateCacheKey)) ? "YES" : "NO"}`);
    // devLog(`\n\n`);
    if(isProduction && (taskMetaData.taskCodeUpdateCacheKey !== taskCacheData.taskCodeUpdateCacheKey)) {
      // Get the Task's taskChunks
      const allTasks = await utils.$dataCaller(
        "get",
        "/api/peth/get_plugin_tasks_by_key/" + taskMetaData.apiData.pluginKey
      );
      const currentTask = allTasks.find((task) => task.key === taskMetaData.taskKey);
      // devLog(`currentTask: ${JSON.stringify(currentTask)}`);
      // devLog(`\n\n\n\n\n\n`);
      const taskConfig = currentTask.config;
      const taskChunks = currentTask.chunks;
      // logs.push({
      //   message: "currentTask",
      //   data: currentTask,
      // });
      // logs.push({
      //   message: "taskChunks",
      //   data: taskChunks,
      // });

      // Delete all in taskArchiveFolder without deleting the _cache.json
      const archive_old_files = fs.readdirSync(taskArchiveFolder);
      for(let i = 0; i < archive_old_files.length; i++) {
        const file = archive_old_files[i];
        if(file !== "_cache.json") {
          fs.unlinkSync(`${taskArchiveFolder}/${file}`);
        }
      }
      
      // Download the task's code as a TAR file and set the new version locally
      const downloadPromises = [];
      const tarFiles = [];
      const randomDownloadKey = Math.random().toString(36).substring(2, 15) + (new Date()).getTime().toString(36);
      for(let i = 0; i < taskChunks.length; i++) {
        const taskChunk = taskChunks[i];
        const taskChunkPath = `${taskArchiveFolder}/${taskChunk.name}.tar`;
        tarFiles.push(taskChunkPath);
        downloadPromises.push(utils.downloadFileToPath(taskChunk.url+"?random="+randomDownloadKey, taskChunkPath));
      }
      await Promise.all(downloadPromises);

      // Write tarFiles to _peth_cache.json
      taskCacheData.taskCodeUpdateCacheKey = taskMetaData.taskCodeUpdateCacheKey;
      taskCacheData.tarFiles = tarFiles;
      taskCacheData.config = taskConfig;
      utils.writeJsonFile(taskCacheFilePath, taskCacheData);
      // logs.push({
      //   message: "taskArchiveFolder",
      //   data: fs.readdirSync(taskArchiveFolder),
      // });
    }
  
    // Create a new folder for the task
    const randomKey = Math.random().toString(36).substring(2, 15) + (new Date()).getTime().toString(36);
    var taskTmpWorkDir = null;
    if(isProduction) {
      taskTmpWorkDir = `${tasksWorkDir}/${taskMetaData.taskKey}_${randomKey}`;
      fs.mkdirSync(taskTmpWorkDir);
    } else {
      taskTmpWorkDir = testModeData.taskTmpWorkDir;
    }
  
    // Extract the Task code Tar files to a new destination
    if(isProduction) {
      for(let i = 0; i < taskCacheData.tarFiles.length; i++) {
        const tarFile = taskCacheData.tarFiles[i];
        await utils.extractTarFile(tarFile, taskTmpWorkDir);
      }
    }
    // logs.push({
    //   message: "taskTmpWorkDir",
    //   data: fs.readdirSync(taskTmpWorkDir),
    // });
  
    // Merge the config from the run method with the task config folder
    const khap_task_config = {
      ...taskMetaData,
      config: {
        ...taskCacheData.config
      },
    };
  
    // Create the config file `_khap_task_config.json`
    utils.writeJsonFile(`${taskTmpWorkDir}/_khap_task_config.json`, khap_task_config);
    // logs.push({
    //   message: "khap_task_config",
    //   data: khap_task_config,
    // });
  
    // ---- DELETED because DATA already exists in `khap_task_config.data` ----
      // // Create the data file `_khap_task_data.json`
      // utils.writeJsonFile(`${taskTmpWorkDir}/_khap_task_data.json`, {
      //   ...taskMetaData.data,
      // });
      // logs.push({
      //   message: "khap_task_data",
      //   data: {
      //     ...taskMetaData.data,
      //   },
      // });
    // ------------------ 

    // TEST MODE DATA DELETION
    if(!isProduction && fs.existsSync(`${testModeData.taskDir}/kha-task-test-result.jsonc`)) {
      // fs.writeFileSync(`${testModeData.taskDir}/kha-task-test-result.jsonc`, "", "utf8");
      fs.unlinkSync(`${testModeData.taskDir}/kha-task-test-result.jsonc`);
    }
  
    // Run the task (Wait for timeout then kill the process if it's still working)
    const currentPid = process.pid;
    var killAll = false;
    var pid = 0;
    var childError = null;
    try {
      const runPromise = async () => {
        return execute_PETH_runTask(taskTmpWorkDir, (_pid) => { pid = _pid; }, isProduction).then((result) => {
          // pid = result.pid;
          // logs.push({
          //   message: "result",
          //   data: result,
          // });
        }).catch((error) => {
          childError = error;
        });
      };
      var isTimeout = false;
      var finishedRunning = false;
      const startTime = (new Date()).getTime();
      const timeoutCheckPromise = new Promise((resolve, reject) => {
        var waitedTime = 0;
        var timeToWait = taskCacheData?.config?.timeout || 30000;
        // var timeToWait = 5000;
        var interval = setInterval(() => {
          waitedTime += 100;
          if((waitedTime >= timeToWait) || finishedRunning) {
            clearInterval(interval);
            logs.push("sleep(30000)" + ((new Date()).getTime() - startTime));
            isTimeout = true;
            resolve();
          }
        }, 100);

        runPromise().then((result) => {
          finishedRunning = true;
          resolve();
          clearInterval(interval);
          logs.push("runPromise" + ((new Date()).getTime() - startTime));
        });
      });
      await timeoutCheckPromise;
      if (isTimeout) {
        killAll = true;
      }
    } catch (error) {
      // logs.push({
      //   message: "error",
      //   data: error,
      //   errorMessage: error.message,
      // });
      // pid = error.pid;
    }
    
    // Use `tree-kill` to kill the process and it's children
    if (pid > 0) {
      kill(pid, 'SIGKILL', function(err) {
        // Do things
      });
    } else {
      killAll = true;
    }

    //TODO Check tasksWorkDir and delete any folders created more than 7 days ago
  
    var finalResult = {};
    if(childError) {
      finalResult = {
        __ERROR__: "Error running task: [" + taskMetaData.taskKey + "]",
        __ERROR_DATA__: childError,
      };
    } else if(isTimeout) {
      finalResult = {
        __TIMEOUT__: "Timeout running task: [" + taskMetaData.taskKey + "] after " + (taskCacheData?.config?.timeout || 30000) + "ms",
      };
    } else {
      // Get the result from `_khap_task_result.json`
      finalResult = utils.loadJsonFile(`${taskTmpWorkDir}/_khap_task_result.json` || {});
      // logs.push({
      //   message: "_khap_task_result.json",
      //   data: fs.readFileSync(`${taskTmpWorkDir}/_khap_task_result.json`, "utf8"),
      // });
      // logs.push({
      //   message: "_khap_task_result.json",
      //   data: fs.readFileSync(`${taskTmpWorkDir}/_khap_task_result.json`, "utf8"),
      // });
      // finalResult = {
      //   wish: "Jannah", 
      //   // killAll,
      //   logs,
      //   // taskCacheData
      // };
    }

    // TEST MODE RETURN
    if(!isProduction) {
      fs.writeFileSync(`${testModeData.taskDir}/kha-task-test-result.jsonc`, JSON.stringify(finalResult, null, 2), "utf8");
      // process.exit(0);
      return finalResult;
    }
  
    const key = "plugins-engine-task-result-of-" + taskMetaData.taskKey + "-" + taskMetaData.runId;
    // Updating the task result WITHOUT WAITING
    utils.setCache(
      key,
      finalResult,
      { group: "tasks-results-by-date-" + (new Date()).toISOString().slice(0, 10), }
    );
    const stateKey = "plugins-engine-task-state-of-" + taskMetaData.taskKey + "-" + taskMetaData.runId;
    // Updating the task state WITHOUT WAITING
    utils.setCache(
      stateKey,
      (childError || isTimeout) ? "failed" : "finished",
      { group: "tasks-states-by-date-" + (new Date()).toISOString().slice(0, 10), }
    );
    
    // // If failed to kill child kill the whole family
    // if(killAll) {
    //   setTimeout(() => {
    //     kill(currentPid, 'SIGKILL');
    //   }, 5000);
    // }

    // Delete taskTmpWorkDir and all files in it
    fs.rmdirSync(taskTmpWorkDir, {
      recursive: true, 
    }); 
  
    return finalResult;
  
    // return {
    //   ...finalResult,
    //   logs
    // };
  
    return finalResult;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      taskMetaData,
      __ERROR__: "Error running task"
    };
  }
};

module.exports = {
  runTask,
  testCall: (data) => {
    // if(data.counter % 1000 === 0) {
    //   console.log("testCall 845623123");
    // }
    return 55555;
  },
}