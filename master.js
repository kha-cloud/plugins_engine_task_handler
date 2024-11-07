const fs = require("fs");
const utils = require("./utils");

const archiveFolder = "/var/plugins_engine_tasks/archive";
const tasksWorkDir = "/var/plugins_engine_tasks/work_dir";

const execute_PETH_Master_runTask = async (data) => {
  return new Promise((resolve, reject) => {
    const _data = JSON.stringify(data);
    const command = `
      (async () => {
        const PETH = require('kha_plugins_engine_task_handler/master');
        try {
          const result = await PETH.runTask(${_data.replace(/"/g, '\\"')});
          console.log('#%PETH__TASK_SINGLE_RUN_RESULT_START__PETH%#');
          console.log(JSON.stringify(result));
          console.log('#%PETH__TASK_SINGLE_RUN_RESULT_END__PETH%#');
        } catch (err) {
          console.error('Error in child process:', err);
          process.exit(1);
        }
      })();
    `;
    
    exec(`node -e "${command}"`, (error, stdout, stderr) => {
      // resolve({
      //   stdout,
      //   stderr
      // });
      if (error || (stderr && !stdout)) {
        reject(`exec error: ${stderr}`);
        return;
      }
      var regex = /#%PETH__TASK_SINGLE_RUN_RESULT_START__PETH%#([\s\S]*?)#%PETH__TASK_SINGLE_RUN_RESULT_END__PETH%#/;
      var match = stdout.match(regex);
      
      try {
        if (match && match[1]) {
          const result = JSON.parse(match[1]);
          resolve(result);
        } else {
          resolve();
        }
      } catch (parseError) {
        console.log(stdout); 
        reject(`Error parsing JSON output: ${parseError.message}`);
      }
    });
  });
}

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
    });
    logs.push({
      message: "taskCacheData",
      data: taskCacheData,
      taskCodeUpdateCacheKey: taskMetaData.taskCodeUpdateCacheKey
    });
  
    if(taskMetaData.taskCodeUpdateCacheKey !== taskCacheData.taskCodeUpdateCacheKey) {
      // Get the Task's taskChunksUrls
      const allTasks = await utils.$dataCaller(
        "get",
        "/api/peth/get_plugin_tasks_by_key/" + taskMetaData.apiData.pluginKey
      );
      const taskChunksUrls = allTasks.find((task) => task.key === taskMetaData.taskKey).chunks;
      logs.push({
        message: "taskChunksUrls",
        data: taskChunksUrls,
      });
      
      // Download the task's code as a TAR file and set the new version locally
      const downloadPromises = [];
      const tarFiles = [];
      const randomDownloadKey = Math.random().toString(36).substring(2, 15) + (new Date()).getTime().toString(36);
      for(let i = 0; i < taskChunksUrls.length; i++) {
        const taskChunkUrl = taskChunksUrls[i];
        const taskChunkPath = `${taskArchiveFolder}/${taskChunkUrl.name}.tar`;
        tarFiles.push(taskChunkPath);
        downloadPromises.push(utils.downloadFileToPath(taskChunkUrl.url+"?random="+randomDownloadKey, taskChunkPath));
      }
      await Promise.all(downloadPromises);
      // Write tarFiles to _peth_cache.json
      taskCacheData.taskCodeUpdateCacheKey = taskMetaData.taskCodeUpdateCacheKey;
      taskCacheData.tarFiles = tarFiles;
      utils.writeJsonFile(taskCacheFilePath, taskCacheData);
      logs.push({
        message: "taskArchiveFolder",
        data: fs.readdirSync(taskArchiveFolder),
      });
    }
  
    // // Create a new folder for the task
    // const randomKey = Math.random().toString(36).substring(2, 15) + (new Date()).getTime().toString(36);
    // const taskTmpWorkDir = `${tasksWorkDir}/${taskMetaData.taskKey}_${randomKey}`;
  
    // // Extract the Task code Tar files to a new destination
    // for(let i = 0; i < taskCacheData.tarFiles.length; i++) {
    //   const tarFile = taskCacheData.tarFiles[i];
    //   await utils.extractTarFile(tarFile, taskTmpWorkDir);
    // }
  
    //TODO Merge the config from the run method with the task config folder
  
    //TODO Create the config file `_khap_task_config.json`
  
    //TODO Create the data file `_khap_task_data.json`
  
    //TODO Run the task (Wait for timeout then kill the process if it's still working)
    //TODO Use `tree-kill` to kill the process and it's children (npm install tree-kill)
  
    // // TODO If runAndWait is used then wait for the task to finish, then get the result from `_khap_task_result.json`
  
    const finalResult = {
      wish: "Jannah", 
      taskCacheData
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