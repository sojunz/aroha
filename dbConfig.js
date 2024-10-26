var mysql = require('mysql');
var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'arohacafedb'
});

conn.connect(function(err) {
    if (err) throw err;
    console.log('Database connected');
});

function queryDatabase(query) {
    return new Promise((resolve, reject) => {
        console.log('Executing query:', query); // 쿼리 로그 추가
        conn.query(query.sql, query.values, (err, results) => {
            if (err) {
                console.error('Query execution error:', err); // 오류 로그 추가
                reject(err);
            } else {
                console.log('Query results:', results); // 결과 로그 추가
                resolve(results);
            }
        });
    });
}

module.exports = { conn, queryDatabase };
