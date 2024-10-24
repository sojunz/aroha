var express = require('express');
var app = express();
var session = require('express-session');
var conn = require('./dbconfig');
const bcrypt = require('bcrypt'); // bcrypt 모듈 가져오기

function queryDatabase(sql) {
    return new Promise((resolve, reject) => {
        conn.query(sql, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

app.set('view engine', 'ejs');
app.use(session({
    secret: 'yoursecrete',
    resave: true,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render("home");
});

app.get('/mainhome', function (req, res) {
    res.render("mainhome")
});

app.get('/login', function (req, res) {
    res.render("login");
});

app.post('/auth', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {
        conn.query('SELECT * FROM users WHERE username = ?', [username], function (error, results) {
            if (error) {
                console.error('Database query error:', error);
                return res.status(500).send('An error occurred');
            }

            if (results.length > 0) {
                const user = results[0];
                bcrypt.compare(password, user.password, function (err, result) {
                    if (result) {
                        req.session.loggedin = true;
                        req.session.username = username;
                        res.redirect('/youinmember'); // 로그인 후 멤버 페이지로 이동
                    } else {
                        res.send('Incorrect Username and/or Password!');
                    }
                });
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});

app.get('/youinmember', function (req, res, next){
    console.log('Reached /youinmember route');
    if (req.session.loggedin) {
        res.render('youinmember', {username: req.session.username });
    } else {
        res.send('Please login to view this page!')
    }
});

app.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('An error occurred');
        }
        res.redirect('/');
    });
});

app.get('/register', function (req, res) {
    res.render('register');
});

app.post('/register', async function (req, res) {
    const { username, email, password } = req.body;
    console.log('Received data:', { username, email, password });

    if (!username || !email || !password) {
        console.error('Validation error: All fields are required!');
        return res.status(400).send('All fields are required!');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if the email already exists
        const checkSql = 'SELECT * FROM users WHERE email = ?';
        conn.query(checkSql, [email], (checkErr, checkResult) => {
            if (checkErr) {
                console.error('Database query error:', checkErr);
                return res.status(500).send('An error occurred');
            }

            if (checkResult.length > 0) {
                // Email already exists, check subscription and member status
                const existingUser = checkResult[0];
                if (existingUser.subscribed === 1 && existingUser.member === 0) {
                    // Update the existing user
                    const updateSql = 'UPDATE users SET username = ?, password = ?, member = ? WHERE email = ?';
                    conn.query(updateSql, [username, hashedPassword, 1, email], (updateErr, updateResult) => {
                        if (updateErr) {
                            console.error('Database update error:', updateErr);
                            return res.status(500).send('Failed to update user');
                        }
                        console.log('User updated:', updateResult);
                        res.redirect('/thank-you');
                    });
                } else {
                    // Email is already registered with a different status
                    return res.status(400).send('Email is already registered with a different status');
                }
            } else {
                // Insert a new user and set subscribed = 1
                const insertSql = 'INSERT INTO users (username, email, password, member, subscribed) VALUES (?, ?, ?, 1, 1)';
                conn.query(insertSql, [username, email, hashedPassword], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error('Database error:', insertErr.message);
                        return res.status(500).send('Failed to register user');
                    }
                    console.log('User registered:', insertResult);
                    res.redirect('/thank-you');
                });
            }
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).send('Failed to register user');
    }
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/admin', function (req, res) {
    res.render('admin');
});

app.get('/admin/users', function (req, res) {
    conn.query('SELECT * FROM users', function (error, results) {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('An error occurred');
        }
        console.log('Fetched users:', results); // 사용자 목록을 로그로 확인
        res.render('admin', { users: results });
    });
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/thanks', function (req, res) {
    res.render('thanks');
});

app.get('/thanks2' , function (req, res) {
    res.render('thanks2');
});

app.get('/admin', function (req, res) {
    res.render('admin');
});

app.get('/admin/users', function (req, res) {
    conn.query('SELECT * FROM users', function (error, results) {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('An error occurred');
        }
        console.log('Fetched users:', results); // 사용자 목록을 로그로 확인
        res.render('admin', { users: results });
    });
});

app.get('/admin/edit/:id', function (req, res) {
    const userId = req.params.id;
    conn.query('SELECT * FROM users WHERE id = ?', [userId], function (error, results) {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('An error occurred');
        }
        console.log('Fetched user for editing:', results);
        res.render('edit', { user: results[0] });
    });
});

app.post('/admin/edit/:id', function (req, res) {
    const userId = req.params.id;
    const { username, email, member, subscribed } = req.body;
    console.log('Received data:', req.body); // 로그 확인
    const memberStatus = member === '1' ? 1 : 0;
    const subscribedStatus = subscribed === '1' ? 1 : 0;
    const sql = 'UPDATE users SET username = ?, email = ?, member = ?, subscribed = ? WHERE id = ?';
    conn.query(sql, [username, email, memberStatus, subscribedStatus, userId], function (error, results) {
        if (error) {
            console.error('Database update error:', error);
            return res.status(500).send('Failed to update user');
        }
        console.log('User updated:', results);
        res.redirect('/admin/users');
    });
});

app.get('/admin/delete/:id', function (req, res) {
    const userId = req.params.id;
    console.log('Deleting user with ID:', userId); // 디버그용 로그 추가
    conn.query('DELETE FROM users WHERE id = ?', [userId], function (error, results) {
        if (error) {
            console.error('Database delete error:', error);
            return res.status(500).send('Failed to delete user');
        }
        console.log('User deleted:', results);
        res.redirect('/admin/users'); // 슬래시를 추가해 경로 수정
    });
});

app.get('/newsletter', function (req, res) {
    res.render("newsletter");
});

app.post('/newsletter', function (req, res) {
    const { username, email } = req.body;

    if (!username || !email) {
        console.error('Validation error: All fields are required!');
        return res.status(400).send('All fields are required!');
    }

    // Check if the email already exists with a different username
    const checkSql = 'SELECT * FROM users WHERE email = ?';
    conn.query(checkSql, [email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Database query error:', checkErr);
            return res.status(500).send('An error occurred');
        }

        if (checkResult.length > 0 && checkResult[0].username !== username) {
            return res.status(400).send('Email is already registered with a different username');
        }

        // Proceed with inserting or updating the user
        const sql = `INSERT INTO users (username, email, subscribed, member) VALUES (?, ?, 1, 0)
                     ON DUPLICATE KEY UPDATE subscribed = 1, username = VALUES(username), member = 0`;

        conn.query(sql, [username, email], (err, result) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).send('Failed to subscribe');
            }
            console.log('User subscribed:', result);
            res.redirect('/thanks');
        });
    });
});

app.get('/thanks', function (req, res) {
    res.render('thanks');
});

app.get('/newsletter2', function (req, res) {
    res.render("newsletter2");
});

app.post('/newsletter2', function (req, res) {
    const { username, email } = req.body;

    if (!username || !email) {
        console.error('Validation error: All fields are required!');
        return res.status(400).send('All fields are required!');
    }

    // Check if the email already exists with a different username
    const checkSql = 'SELECT * FROM users WHERE email = ?';
    conn.query(checkSql, [email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Database query error:', checkErr);
            return res.status(500).send('An error occurred');
        }

        if (checkResult.length > 0 && checkResult[0].username !== username) {
            return res.status(400).send('Email is already registered with a different username');
        }

        // Proceed with inserting or updating the user
        const sql = `INSERT INTO users (username, email, subscribed, member) VALUES (?, ?, 1, 0)
                     ON DUPLICATE KEY UPDATE subscribed = 1, username = VALUES(username), member = 1`;
        conn.query(sql, [username, email], (err, result) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).send('Failed to subscribe');
            }
            console.log('User subscribed:', result);
            res.redirect('/thanks2');
        });
    });
});

app.get('/thanks2' , function (req, res) {
    res.render('thanks2');
});

app.get('/menu' ,  async (req, res) => {
    try {
        const categories = await queryDatabase('SELECT * FROM categories');
        const menus = await queryDatabase('SELECT * FROM menus');

        res.render('menu', { categories, menus });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Failed to retrieve data');
    }
});

app.get('/menu2' ,  async (req, res) => {
    try {
        const categories = await queryDatabase('SELECT * FROM categories');
        const menus = await queryDatabase('SELECT * FROM menus');

        res.render('menu2', { categories, menus });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Failed to retrieve data');
    }
});

app.get('/admin/add-menu', (req, res) => {
    res.render('admin-add');
});

app.post('/admin/add-menu', (req, res) => {
    const { name, description, price, category } = req.body;
    const sql = 'INSERT INTO menus (name, description, price, category) VALUES (?,?,?,?)';
    conn.query(sql, [name, description || 'No description provided', price, category || 'general'], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Failed to add menu item');
        }
        res.redirect('/menu2');
    });
});

app.get('/contact', function (req, res) {
    res.render("contact");
});

app.get('/contact2', function (req, res) {
    res.render("contact2");
});

app.get('/reply', function (req, res) {
    res.render("reply");
});

app.post(['/contact', '/contact2'], function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;

    if (!name || !email || !message) {
        return res.status(400).send('All fields are required!');
    
    }
    const sql = `INSERT INTO contactus(name,email,message) VALUES (?, ?, ?)`;
    console.log(sql);

    conn.query(sql, [name, email, message], function (err, result) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send('Failed to submit message');
            return;
        }
        console.log('Message saved:', result);
        res.redirect('/reply');
    });
});

app.get('/viewmessages', (req, res) => {
    conn.query('SELECT * FROM contactus', (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            res.status(500).send('An error occurred');
            return;
        }
        res.render('viewmessages', { messages: results });
    });
});

app.post('/deletemessage', (req, res) => {
    const messageId = req.body.id;
    const deleteQuery = 'DELETE FROM contactus WHERE id = ?';

    conn.query(deleteQuery, [messageId], (error, results) => {
        if (error) {
            console.error('Database delete error:', error); // 여기서 에러 정보를 출력합니다.
            return res.status(500).send('Error deleting message');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Message not found'); // 삭제할 메시지를 찾지 못했을 때
        }
        console.log('Message deleted successfully:', results);
        res.redirect('/viewmessages');
    });
});

app.get('/deletemessage', function (req, res) {
    conn.query('SELECT * FROM contactus', (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            res.status(500).send('An error occurred');
            return;
        }
        res.render('deletemessage', { messages: results });
    });
});

app.get('/special-event', function (req, res) {
    res.render("special-event");
});

app.get('/aboutus', function (req, res) {
    res.render("aboutus");
});

app.get('/gallery', function (req, res) {
    res.render("gallery");

});

app.listen(4000, function () {
    console.log('Node app is running on port 4000');
});
