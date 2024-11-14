const fs = require("fs");
const utils = require("./utils");

var taskConfig = null;
var isProduction = true;

const init = async (_options) => {
  const options = {
    ...(_options || {}),
  };
  taskConfig = JSON.parse(fs.readFileSync("./_khap_task_config.json", "utf8"));
  isProduction = options.isProduction;

  await utils.init(taskConfig);
};

const isTestMode = () => {
  return !isProduction;
};

const getTaskData = () => {
  // Return the task data from the local file "_khap_task_data.json"
  return taskConfig?.data || {};
  // try {
  //   return JSON.parse(fs.readFileSync("./_khap_task_data.json", "utf8"));
  // } catch (error) {
  //   return {};
  // }
};

const setTaskResult = async (TaskResult) => {
  // Set the task data in the local file "_khap_task_result.json"
  try {
    fs.writeFileSync("./_khap_task_result.json", JSON.stringify(TaskResult));
  } catch (error) {
    fs.writeFileSync("./_khap_task_result.json", JSON.stringify({
      __task_result_error__: error.message,
    }));
  }
};

module.exports = {
  init,
  isTestMode,
  getTaskData,
  setTaskResult,
  utils,
};