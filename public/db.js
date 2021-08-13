// Different browsers can have different names for the indexedDB object, so we standardize that here
const indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;

// Tell indexedDb to open (or create) whatever database you want to work with
// I'd recommend naming the database something like "budget" and the object store 
// something like "pending" or "tba"
const request = indexedDB.open("budget", 1);

// Set up for the object store
request.onupgradeneeded = ({ target }) => {
  let db = target.result;
  db.createObjectStore("pendingObj", { autoIncrement: true });
};

// If the request was successful it means the Internet is back up, so we can query the real database.
request.onsuccess = ({ target }) => {
  db = target.result;
  // check if app is online before reading from db
  if (navigator.onLine) {
    checkDatabase();
  }
};

// Error handling
request.onerror = function(event) {
  console.log("Woops! " + event.target.errorCode);
};

// This function is called when it's time to save data to the indexedDb
function saveRecord(record) {
  const transaction = db.transaction(["pendingObj"], "readwrite");
  const store = transaction.objectStore("pendingObj");
  store.add(record);
}

// This function runs when we detect that the internet connection is working again. It sends a post request to the server with all the saved data so that the data can be synced with the server, and then it wipes out the existing indexedDb
function checkDatabase() {
  const transaction = db.transaction(["pendingObj"], "readwrite");
  const store = transaction.objectStore("pendingObj");
  const getAll = store.getAll();

  getAll.onsuccess = function() {
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        }
      })
      .then(response => {        
        return response.json();
      })
      .then(() => {
        // delete records if successful
        const transaction = db.transaction(["pendingObj"], "readwrite");
        const store = transaction.objectStore("pendingObj");
        store.clear();
      });
    }
  };
}

// Listen for app coming back online
window.addEventListener("online", checkDatabase);