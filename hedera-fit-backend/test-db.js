const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.all('SELECT * FROM comments', [], (err, rows) => {
  if (err) throw err;
  console.log('📝 Commentaires stockés:');
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
