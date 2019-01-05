const findReachableUrls = require("find-reachable-urls");
const readMeta = require("lets-get-meta");
const got = require("got");
const cache = require("../utils/cache");

const getGoMeta = async url => {
  const response = await got.get(url);
  const meta = readMeta(response.body);

  if (!meta["go-source"]) {
    throw new Error("go-source meta is missing");
  }

  const values = meta["go-source"].replace(/\s+/g, " ").split(" ");

  return {
    projectRoot: values[0],
    projectUrl: values[1],
    dirTemplate: values[2].replace("{/dir}", "")
  };
};

const resolveUrl = async url => {
  let goMetaConfig;

  const cacheKey = `go_${url}`;
  const cacheValue = await cache.get(cacheKey);
  if (cacheValue) {
    return cacheValue;
  }

  try {
    // Preferred with https
    goMetaConfig = await getGoMeta(`https://${url}?go-get=1`);
  } catch (err) {
    // Fallback insecure
    goMetaConfig = await getGoMeta(`http://${url}?go-get=1`);
  }

  const reachableUrl = await findReachableUrls(
    [
      url.replace(goMetaConfig.projectRoot, goMetaConfig.dirTemplate),
      goMetaConfig.projectUrl
    ],
    { firstMatch: true }
  );

  if (!reachableUrl) {
    throw new Error("No url is reachable");
  }

  await cache.set(cacheKey, reachableUrl);

  return reachableUrl;
};

module.exports = async function(pkg) {
  //   const eventData = {
  //     registry: "go",
  //     resourceId: `go:::${pkg}`,
  //     package: pkg,
  //     referer: request.headers.referer
  //   };

  try {
    return await resolveUrl(pkg);

    // eventData.url = url;
    // insight.trackEvent("resolved", eventData, request);
  } catch (err) {
    // const eventKey = (err.data || {}).eventKey;
    // insight.trackError(eventKey, err, eventData, request);
    return err;
  }
};
