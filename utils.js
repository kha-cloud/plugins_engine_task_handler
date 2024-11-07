const fs = require("fs");
const axios = require("axios");
const fetch = require("node-fetch");
const tar = require('tar');

const utilsScope = () => {
  var initialized = false;
  var taskMetaData = {};

  const init = async (_taskMetaData) => {
    taskMetaData = _taskMetaData;
    initialized = true;
  }

  const replaceInCode = (code, pluginKey) => {
    var newCode = code.replace(/@PS\//g, `/api/plugins_static/${pluginKey}/`);
    // Plugins Key
    newCode = newCode.replace(/@PK/g, `${pluginKey}`);
    // Plugins API links
    newCode = newCode.replace(/@PA\//g, `/api/plugin_api/${pluginKey}/`);
    // Plugins VueJS links
    newCode = newCode.replace(/@PV\//g, `/p/${pluginKey}/`);
    // Plugins VueJS public links
    newCode = newCode.replace(/@PVP\//g, `/public/${pluginKey}/`);
    return newCode;
  };

  const loadJsonFile = (filePath, defaultData) => {
    try {
      const _data = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
      return {
        ...(defaultData || {}),
        ..._data
      };
    } catch (error) {
      return defaultData || {};
    }
  }
  
  const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
  
  const $dataCaller = async (method, route, data = {}, _headers = {}) => {
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
      const baseUrl = "https://" + taskMetaData.apiData.host;
      const response = await axios({
        method,
        url: baseUrl + replaceInCode(route, taskMetaData.apiData.pluginKey),
        data,
        headers
      });
      return response.data;
    } catch (error) {
      console.error(error);
      return {
        __error__: error.message,
        success: false,
        status: 0
      };
    }
  }
  
  const getCache = (key) => {
    return $dataCaller("get", `/api/peth/get_cache/${key}`);
  }
  
  const setCache = (key, value, cacheData) => {
    return $dataCaller("post", `/api/peth/set_cache/${key}`, {
      value,
      cacheData
    });
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
  
  const extractTarFile = async (tarFilePath, extractFolderPath) => {
    try {
      return tar.extract({
        file: tarFilePath,
        cwd: extractFolderPath
      });
    } catch (error) {
      console.error(error);
    }
  }

  return {
    init,
    loadJsonFile,
    writeJsonFile,
    $dataCaller,
    getCache,
    setCache,
    downloadFileToPath,
    extractTarFile,
  };
}


module.exports = utilsScope();