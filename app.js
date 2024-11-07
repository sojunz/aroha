var express = require('express');
var app = express();
var session = require('express-session');
var { conn, queryDatabase } = require('./dbConfig');

const bcrypt = require('bcrypt'); // bcrypt 모듈 가져오기
const flash = require('connect-flash');

app.set('view engine', 'ejs');
app.use(session({
    secret: 'yoursecrete',
    resave: true,
    saveUninitialized: true
}));

app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'yourSecret', resave: false, saveUninitialized: true })); 
app.use(flash());

app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    next();
});

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

const plainPassword = '55555'; // 새로운 비밀번호
const username = 'kim'; // 새로운 사용자 이름
const adminFlag = 1; // 관리자 플래그

bcrypt.hash(plainPassword, 10, function(err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    const sql = 'INSERT INTO adminlogin (username, password, admin) VALUES (?, ?, ?)';
    conn.query(sql, [username, hash, adminFlag], function(error, results) {
        if (error) {
            console.error('Database insert error:', error);
            return;
        }
        console.log('New admin user registered:', results);
    });
});

app.post('/admin/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {
        conn.query('SELECT * FROM adminlogin WHERE username = ?', [username], function (error, results) {
            if (error) {
                console.error('Database query error:', error);
                return res.status(500).send('An error occurred');
            }
            console.log('Query results:', results);

            if (results.length > 0) {
                const user = results[0];
                console.log('Stored password:', user.password);
                console.log('Entered password:', password);

                bcrypt.compare(password, user.password, function (err, result) {
                    if (err) {
                        console.error('bcrypt compare error:', err);
                        return res.status(500).send('An error occurred');
                    }
                    console.log('Password match:', result);

                    if (result) {
                        req.session.loggedin = true;
                        req.session.username = username;
                        req.session.admin = true;
                        res.redirect('/admin/dashboard');
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

app.get('/adminlogin', function (req, res) {
    res.render('adminlogin');
});

app.get('/adminlayout', function (req, res) {
    res.render('adminlayout');
});

app.get('/admin/dashboard', function (req, res) {
    if (req.session.loggedin && req.session.admin) {
        res.render('adminlayout', {
            pageTitle: 'Admin Dashboard',
            navItems: [
                { name: 'Message', url: '/viewmessages' },
                { name: 'Users', url: '/admin/users' },
                { name: 'Add Menu', url: '/admin/addmenu' },
                { name: 'Edit Menu', url: '/admin/editmenu' } // ID를 포함한 URL로 수정
            ],
            body: '<h2>Welcome to Admin Dashboard</h2>'
        });
    } else {
        res.redirect('/adminlogin');
    }
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
    const password = req.body.password || ''; // 기본값으로 빈 문자열 설정

    if (!username || !email) {
        console.error('Validation error: All fields are required!');
        return res.status(400).send('All fields are required!');
    }

    const checkSql = 'SELECT * FROM users WHERE email = ?';
    conn.query(checkSql, [email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Database query error:', checkErr);
            return res.status(500).send('An error occurred');
        }

        if (checkResult.length > 0 && checkResult[0].username !== username) {
            return res.status(400).send('Email is already registered with a different username');
        }

        const sql = `INSERT INTO users (username, email, password, subscribed, member) VALUES (?, ?, ?, 1, 0)
                     ON DUPLICATE KEY UPDATE subscribed = 1, username = VALUES(username), member = 0`;

        conn.query(sql, [username, email, password], (err, result) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).send('Failed to subscribe');
            }
            console.log('User subscribed:', result);
            res.redirect('/thanks');
        });
    });
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

    const checkSql = 'SELECT * FROM users WHERE email = ?';
    conn.query(checkSql, [email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Database query error:', checkErr);
            return res.status(500).send('An error occurred');
        }

        if (checkResult.length > 0 && checkResult[0].username !== username) {
            return res.status(400).send('Email is already registered with a different username');
        }

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

app.get('/menu', async (req, res) => {
    try {
        const categories = await queryDatabase({
            sql: 'SELECT * FROM categories',
            values: []
        });
        const menus = await queryDatabase({
            sql: 'SELECT * FROM menus',
            values: []
        });
        res.render('menu', { categories, menus });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Failed to retrieve data');
    }
});

app.get('/menu2', async (req, res) => { 
    try { 
    const categories = await queryDatabase({
    sql: 'SELECT * FROM categories', values: [] }); 
    const menus = await queryDatabase({ sql: 'SELECT * FROM menus', 
        values: [] 
    }); 
        res.render('menu2', { categories, menus }); 
        } catch (err) { 
            console.error('Database query error:', err); 
            res.status(500).send('Failed to retrieve data');
                    }
    });

app.get('/admin/addmenu', (req, res) => {
    const categories = [
        { id: 1, name: 'Coffee' },
        { id: 2, name: 'Food' },
        { id: 3, name: 'Dessert' }
    ];
    res.render('addmenu', { categories });
});

app.post('/admin/addmenu', async (req, res) => {
    const { name, description, price, category, status } = req.body;

    const query = {
        sql: 'INSERT INTO menus (name, description, price, category_id, status) VALUES (?, ?, ?, ?, ?)',
        values: [name, description, price, category, status]
    };

    try {
        await queryDatabase(query);
        console.log('New menu item added:', { name, description, price, category, status });
        req.flash('Menu item added successfully!'); // 성공 메시지 반환
        res.redirect('/admin/dashboard')
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).send('Error inserting data');
    }
});

// 관리자용 메뉴 페이지 (editmenu를 사용)
app.get('/admin/editmenu', async (req, res) => {
    try {
        const categories = await queryDatabase({
            sql: 'SELECT * FROM categories',
            values: []
        });
        const menus = await queryDatabase({
            sql: 'SELECT * FROM menus',
            values: []
        });
        res.render('editmenu', { categories, menus });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Failed to retrieve data');
    }
});

// 개별 메뉴 아이템 편집 페이지
app.get('/admin/editmenu/:id', async (req, res) => {
    const menuId = req.params.id;
    try {
        const item = await queryDatabase({
            sql: 'SELECT * FROM menus WHERE id = ?',
            values: [menuId]
        });
        if (item.length > 0) {
            res.render('editmenuitem', { item: item[0], categories: await queryDatabase({ sql: 'SELECT * FROM categories', values: [] }) });
        } else {
            res.status(404).send('Item not found');
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Failed to fetch menu item');
    }
});

// 메뉴 아이템 업데이트 라우트
app.post('/admin/editmenu/:id', async (req, res) => {
    const menuId = req.params.id;
    const { name, description, price, category_id, status } = req.body;
    try {
        await queryDatabase({
            sql: 'UPDATE menus SET name = ?, description = ?, price = ?, category_id = ?, status = ? WHERE id = ?',
            values: [name, description, price, category_id, status, menuId]
        });
        res.redirect('/admin/editmenu');
    } catch (err) {
        console.error('Database update error:', err);
        res.status(500).send('Failed to update menu item');
    }
});

// 메뉴 아이템 삭제 라우트
app.get('/admin/deletemenu/:id', async (req, res) => {
    const menuId = req.params.id;
    try {
        await queryDatabase({
            sql: 'DELETE FROM menus WHERE id = ?',
            values: [menuId]
        });
        res.redirect('/admin/editmenu');
    } catch (err) {
        console.error('Database delete error:', err);
        res.status(500).send('Failed to delete menu item');
    }
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

app.get('/viewmessages', function (req, res) {
    if (req.session.loggedin && req.session.admin) {
        // contactus 테이블에서 데이터 불러오기
        conn.query('SELECT * FROM contactus', function (error, results) {
            if (error) {
                console.error('Database query error:', error);
                return res.status(500).send('An error occurred');
            }

            res.render('viewmessages', {
                pageTitle: 'Customer Messages',
                messages: results
            });
        });
    } else {
        res.redirect('/adminlogin');
    }
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
