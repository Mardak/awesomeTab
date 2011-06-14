/**
 * Creates an AwesomeTab instance for one tab.
 * 
 * @constructor
 * @this {AwesomeTab}
 * @param {Element} doc the document to populate with results.
 * @param {Obect} utils an instance of the utilities class
 * @param {Object} central a GrandCentral instance
 * @param {Object} tagger an instance of the POSTagger
 */
function AwesomeTab(doc, utils, central, tagger) {
  let me = this;
  //me.tester = new Tester();
  try {
  me.utils = utils;
  me.pos = new POSTagger();
  reportError("getting visible places");
  let d = new Date();
  let t1 = d.getTime();
  let visiblePlaces = me.getVisiblePlaces();
  let currentPlaces = me.getLastKVisiblePlaces(visiblePlaces, 3);
  let t2 = d.getTime();
  let collector = new TagCollector(currentPlaces, me.utils, tagger);
  let collectedTags = collector.getResults();
  let collectedHosts = collector.getHosts();
  let t3 = d.getTime();
  let searcher1 = new BookmarkSearch(collectedTags, collectedHosts, visiblePlaces, me.utils, central);
  let rankedResults1 = searcher1.getResults();
  let t4 = d.getTime();
  let searcher2 = new AllSearch(collectedTags, collectedHosts, visiblePlaces, me.utils, central);
  let rankedResults2 = searcher2.getResults();
  let t5 = d.getTime();
  reportError("showing results");

  //let builder = new Builder(rankedResults2, doc, me.utils, me.collectedTitles);
  let mixer = new Mixer(searcher1.getResults(), searcher2.getResults(), me.collectedTitles, collectedHosts ,me.utils);
  let disp = new Display(mixer.getMixed(), doc);
  //builder.show();
  let t6 = d.getTime();

  reportError("getting visible places: " + (t1));
  reportError("collecting tags: " + (t2));
  reportError("bookmark searcher: " + (t4 - t3));
  reportError("all searcher: " + (t5 - t4));
  reportError("display: " + (t6 - t5));
  } catch (ex) { reportError(ex) }
}

AwesomeTab.prototype.getLastKVisiblePlaces = function(visiblePlaces, k) {
  let me = this;
  let condition = Object.keys(visiblePlaces).map(function(placeId) {
    return "place_id=" + placeId;
  }).join(" OR ");
  let sqlQuery = "SELECT place_id FROM moz_historyvisits WHERE " + condition +" GROUP BY "
    +"place_id ORDER BY id DESC LIMIT " + k;
  let params = {}
  let data =  me.utils.getDataQuery(sqlQuery, params, ["place_id"])
  let lastKPlaces = {};
  for (let i = 0; i < data.length; i++) {
    let placeId = data[i]["place_id"];
    lastKPlaces[placeId] = visiblePlaces[placeId];
  }
  return lastKPlaces;
};


AwesomeTab.prototype.getVisiblePlaces = function() {
  let me = this;
  let gBrowser = Services.wm.getMostRecentWindow("navigator:browser").gBrowser;
  let visibleTabs = gBrowser.visibleTabs;
  let places = {};
  me.collectedTitles = {};
  for (let i = 0; i < visibleTabs.length; i++) {
    let tab = visibleTabs[i];
    if (tab.pinned) {
      continue;
    }
    let uri = gBrowser.getBrowserForTab(tab).currentURI.spec;
    // reportError(uri);
    let placesData = me.utils.getData(["id", "title", "url", "rev_host", "frecency"], {
        "url": uri
      }, "moz_places")
    for (let j = 0; j < placesData.length; j++) {
      let place = placesData[j];
      places[place["id"]] = place;
      me.collectedTitles[place["title"]] = placesData[j]["title"];
    }
  }
  return places;
}
