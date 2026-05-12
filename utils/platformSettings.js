import PlatformSettings from "../models/platformSettingsModel.js";
import Wallet from "../models/walletModel.js";

let cachedSettings = null;

const getPlatformSettings = async () => {
  if (!cachedSettings) {
    cachedSettings = await PlatformSettings.findOne();

    if (!cachedSettings) {
      cachedSettings = await PlatformSettings.create({});
    }

    if (!cachedSettings.platformWallet) {
      const wallet = await Wallet.create({
        owner: cachedSettings._id,
        ownerType: "Admin",
      });

      cachedSettings.platformWallet = wallet._id;
      await cachedSettings.save();
    }
  }

  return cachedSettings;
};

export default getPlatformSettings;
