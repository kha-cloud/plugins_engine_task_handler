const fs = require("fs");
const utilsScope = () => {
  var initialized = false;
  var taskMetaData = {};

  const init = async (taskMetaData) => {
    taskMetaData = taskMetaData;
    initialized = true;
  }

  const loadJsonFile = (filePath, defaultData) => {
    try {
      const _data = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
      return {
        ...defaultData,
        ..._data
      };
    } catch (error) {
      return defaultData || {};
    }
  }
  
  const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
  
  const dataCaller = async (method, route, data = {}, _headers = {}) => {
    // `data` is only used for POST,PUT request
    // `_headers` will be added to the request headers
    // The token should be used from the taskMetaData.apiData.token.
    // axios wil be used
    var headers = {
      "Content-Type": "application/json",
      "_token": taskMetaData.apiData.token,
      ..._headers
    };
    try {
      const response = await axios({
        method,
        url: `https://api.${route}`,
        data,
        headers
      });
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }
  
  const downloadFileToPath = async (fileUrl, filePath) => {
    try {
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      console.error(error);
    }
  }
  
  const extractTarFile = async (tarFilePath, filePath) => {
  }

  return {
    init,
    loadJsonFile,
    writeJsonFile,
    dataCaller,
    downloadFileToPath,
    extractTarFile,
  };
}


module.exports = utilsScope();