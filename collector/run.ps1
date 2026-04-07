cd collector
$env:NODE_ENV = 'production'
$env:STORAGE_DIR = 'C:\Users\Nathan\Documents\Work\Repos\BCP\anything-llm-fd\Storeage'  # same path you configured for the server, no leading space
node index.js