const fs = require("fs");
const utils = require("./utils");
const { exec, spawn } = require('child_process');
const kill = require('tree-kill');

const archiveFolder = "/var/plugins_engine_tasks/archive";
const tasksWorkDir = "/var/plugins_engine_tasks/work_dir";

const execute_PETH_runTask = async (workPath, pidCallback) => {
  return new Promise((resolve, reject) => {
    // const _data = JSON.stringify(data);
    const command = `
      (async () => {
        // const workPath = '${workPath}';
        // process.chdir(workPath);

        fs.writeFile('/root/banana-texto.txt', 'Non MASTER ' + (new Date()).toISOString(), (err) => {
          if (err) {
            console.log(err);
            return;
          }
          console.log('File created successfully.');
        });

        const PETH = require('kha_plugins_engine_task_handler');
        require('${workPath}/run.js');
      })();
    `;
    // try {
    //   const result = await PETH.runTask(${_data.replace(/"/g, '\\"')});
    //   console.log('#%PETH__TASK_SINGLE_RUN_RESULT_START__PETH%#');
    //   console.log(JSON.stringify(result));
    //   console.log('#%PETH__TASK_SINGLE_RUN_RESULT_END__PETH%#');
    // } catch (err) {
    //   console.error('Error in child process:', err);
    //   process.exit(1);
    // }
    
    const shellCommand = `node -e "${command}"`;
    // const subprocess = spawn('node', ['-e', command], {
    const child = spawn('sh', ['-c', shellCommand], {
      cwd: workPath, // Sets the child's current working directory
      shell: true    // Use shell to execute the command
      // detached: true,
      // stdio: 'ignore' // Ignore stdio to allow parent to exit independently
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTask = async (taskMetaData) => {
  try {
    /* taskMetaData : {
      runAndWait, // Boolean
      taskKey,
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
  
    await utils.init(taskMetaData);

    const logs = [];
  
    // Check the cache if the task's code got an update
    const taskArchiveFolder = `${archiveFolder}/${taskMetaData.taskKey}`;
    if(!fs.existsSync(taskArchiveFolder)) {
      fs.mkdirSync(taskArchiveFolder);
    }
    const taskCacheFilePath = `${taskArchiveFolder}/_cache.json`;
    var taskCacheData = await utils.loadJsonFile(taskCacheFilePath, {
      taskCodeUpdateCacheKey: null,
      tarFiles: [],
      config: {}
    });
    // logs.push({
    //   message: "taskCacheData",
    //   data: taskCacheData,
    //   taskCodeUpdateCacheKey: taskMetaData.taskCodeUpdateCacheKey
    // });
    if(taskMetaData.taskCodeUpdateCacheKey !== taskCacheData.taskCodeUpdateCacheKey) {
      // Get the Task's taskChunks
      const allTasks = await utils.$dataCaller(
        "get",
        "/api/peth/get_plugin_tasks_by_key/" + taskMetaData.apiData.pluginKey
      );
      const currentTask = allTasks.find((task) => task.key === taskMetaData.taskKey);
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
    const taskTmpWorkDir = `${tasksWorkDir}/${taskMetaData.taskKey}_${randomKey}`;
    fs.mkdirSync(taskTmpWorkDir);
  
    // Extract the Task code Tar files to a new destination
    for(let i = 0; i < taskCacheData.tarFiles.length; i++) {
      const tarFile = taskCacheData.tarFiles[i];
      await utils.extractTarFile(tarFile, taskTmpWorkDir);
    }
    logs.push({
      message: "taskTmpWorkDir",
      data: fs.readdirSync(taskTmpWorkDir),
    });
  
    // Merge the config from the run method with the task config folder
    const khap_task_config = {
      ...taskMetaData,
      config: {
        ...taskCacheData.config
      },
    };
  
    // Create the config file `_khap_task_config.json`
    utils.writeJsonFile(`${taskTmpWorkDir}/_khap_task_config.json`, khap_task_config);
    logs.push({
      message: "khap_task_config",
      data: khap_task_config,
    });
  
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
  
    // Run the task (Wait for timeout then kill the process if it's still working)
    const currentPid = process.pid;
    var killAll = false;
    var pid = 0;
    try {
      const runPromise = async () => {
        return execute_PETH_runTask(taskTmpWorkDir, (_pid) => { pid = _pid; }).then((result) => {
          // pid = result.pid;
          // logs.push({
          //   message: "result",
          //   data: result,
          // });
        }).catch((error) => {
          throw error;
        });
      };
      var isTimeout = false;
      var finishedRunning = false;
      const startTime = (new Date()).getTime();
      const timeoutCheckPromise = new Promise((resolve, reject) => {
        var waitedTime = 0;
        // var timeToWait = taskCacheData?.config?.timeout || 30000;
        var timeToWait = 5000;
        var interval = setInterval(() => {
          waitedTime += 100;
          if((waitedTime >= timeToWait) || finishedRunning) {
            clearInterval(interval);
            logs.push("sleep(30000)" + ((new Date()).getTime() - startTime));
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
    logs.push({
      message: "pid",
      data: pid,
    });
    // Use `tree-kill` to kill the process and it's children
    if (pid > 0) {
      kill(pid, 'SIGKILL', function(err) {
        // Do things
      });
    } else {
      killAll = true;
    }

    // Delete taskTmpWorkDir and all files in it
    fs.rmdirSync(taskTmpWorkDir, {
      recursive: true, 
    }); 

    //TODO Check tasksWorkDir and delete any folders created more than 7 days ago
  
    // // TODO If runAndWait is used then wait for the task to finish, then get the result from `_khap_task_result.json`
  
    const finalResult = {
      wish: "Jannah", 
      killAll,
      logs
      // taskCacheData
    };
  
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
      "finished",
      { group: "tasks-states-by-date-" + (new Date()).toISOString().slice(0, 10), }
    );
    
    // // If failed to kill child kill the whole family
    // if(killAll) {
    //   setTimeout(() => {
    //     kill(currentPid, 'SIGKILL');
    //   }, 5000);
    // }
  
    return {
      ...finalResult,
      logs
    };
  
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