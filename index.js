const fs = require("fs");

const taskConfig = JSON.parse(fs.readFileSync("./_khap_task_config.json", "utf8"));

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
  getTaskData,
  setTaskResult,
};