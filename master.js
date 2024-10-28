const fs = require("fs");

const runTask = async (taskMetaData) => {
  /* taskMetaData : {
    runAndGetResult, // Boolean
    taskKey,
    taskCodeUpdateCacheKey,
    taskVersion.
    taskChunksUrls: [
      {
        url,
      }
    ],
    taskConfig,
  }*/

  //TODO Check the cache if the task's code got an update

  //TODO Download the task's code as a TAR file and set the new version locally

  //TODO Extract the Task code Tar files to a new destination

  //TODO Merge the config from the run method with the task config folder

  //TODO Create the config file `_khap_task_config.json`

  //TODO Create the data file `_khap_task_data.json`

  //TODO Run the task (Wait for timeout then kill the process if it's still working)

  //TODO If runAndGetResult is used then wait for the task to finish, then get the result from `_khap_task_result.json`

  return {
    success: true,
    demoData: {
      counter: 0,
      data: "Hello World",
      wish: "Jannah",
    }
  };
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