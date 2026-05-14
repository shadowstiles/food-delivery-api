import PlatformSettings from "../models/platformSettingsModel.js";

let cachedSettings = null;

const getPlatformSettings = async () => {
  cachedSettings = await PlatformSettings.getSettings();

  return cachedSettings;
};

export default getPlatformSettings;
